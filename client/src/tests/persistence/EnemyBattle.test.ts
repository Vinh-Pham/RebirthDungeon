import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadGameContent } from '../../data/content';
import { ContentRegistry } from '../../engine/data/ContentRegistry';
import { JourneySession } from '../../game/JourneySession';
import { JourneyHost } from '../../game/JourneyHost';
import { encodeSave, parseSave } from '../../persistence/SaveSchema';
import type { SaveRow, SaveStorage } from '../../persistence/SaveRepository';
import type { BattleSession } from '../../game/BattleSession';

const raw = structuredClone(loadGameContent().data);
raw.maps[0].spawns[1].definitionId = 'black-spider';
const content = new ContentRegistry(raw);
const cleanups: (() => void)[] = [];
async function settle() {
  for (let i = 0; i < 80; i++) await Promise.resolve();
}
afterEach(async () => {
  cleanups.splice(0).forEach((c) => c());
  await settle();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
function playerAttack(battle: BattleSession) {
  battle.dispatch({ type: 'SELECT_ACTION', action: 'attack' });
  battle.dispatch({ type: 'SELECT_TARGET', targetId: 'slime-1' });
  battle.dispatch({ type: 'CONFIRM_ACTION' });
}
function poisonTurn(battle: BattleSession) {
  vi.spyOn(battle.engine.random, 'chance').mockImplementation((p) => p === 0.05 || p >= 0.9);
  vi.spyOn(battle.engine.random, 'int').mockImplementation((min) => min);
  playerAttack(battle);
  battle.advanceEnemyTurns();
  expect(battle.engine.getEntity('player')!.statuses?.some((s) => s.id === 'poison')).toBe(true);
}
function enter(session: JourneySession) {
  session.dispatch({ type: 'TRAVEL_TO', x: 7, y: 3 });
  session.dispatch({ type: 'INTERACT', objectId: 'east' });
  session.dispatch({ type: 'TRAVEL_TO', x: 5, y: 3 });
}

describe('enemy encounters and durable checkpoints', () => {
  it('restarts an unfinished spider encounter from its entry checkpoint and replays its actions', () => {
    const journey = new JourneySession(content);
    cleanups.push(() => journey.dispose());
    enter(journey);
    const checkpoint = journey.toSave();
    const first = journey.createBattle();
    cleanups.push(() => first.dispose());
    const initial = first.getSnapshot();
    poisonTurn(first);
    const resolved = first.getSnapshot(),
      random = first.engine.random.snapshot();
    expect(journey.toSave()).toEqual(checkpoint);
    const envelope = JSON.parse(encodeSave(checkpoint, content));
    expect(envelope.version).toBe(13);
    const resumed = new JourneySession(content, parseSave(envelope, content).campaign);
    cleanups.push(() => resumed.dispose());
    const second = resumed.createBattle();
    cleanups.push(() => second.dispose());
    expect(second.getSnapshot()).toEqual(initial);
    expect(second.engine.getEntity('player')!.statuses ?? []).toEqual([]);
    poisonTurn(second);
    expect(second.getSnapshot()).toEqual(resolved);
    expect(second.engine.random.snapshot()).toEqual(random);
  });
  it('banks poisoned resources once and retries the exact failed settlement without replaying combat', async () => {
    vi.useFakeTimers();
    const rows = new Map<string, SaveRow>();
    const storage: SaveStorage = {
      async read(id) {
        return rows.get(id);
      },
      async list() {
        return [...rows.values()];
      },
      async write(row) {
        rows.set(row.id, row);
      },
      async close() {},
    };
    const host = new JourneyHost(content, async () => storage);
    cleanups.push(host.subscribe(vi.fn()));
    await settle();
    const journey = host.getSnapshot().session!;
    enter(journey);
    await host.flush();
    const checkpoint = journey.toSave(),
      battle = host.getSnapshot().battle!;
    poisonTurn(battle);
    battle.engine.getEntity('slime-1')!.health!.current = 1;
    playerAttack(battle);
    expect(battle.combat.result).toBe('victory');
    const health = battle.engine.getEntity('player')!.health!.current;
    const random = battle.engine.random.snapshot(),
      actions = battle.combat.completedActions;
    const write = vi.spyOn(storage, 'write').mockRejectedValueOnce(new Error('Disk full'));
    expect(await host.returnFromBattle()).toBe(false);
    expect(journey.toSave()).toEqual(checkpoint);
    expect(host.getSnapshot().battle).toBe(battle);
    const payload = write.mock.calls[0][0].payload;
    const candidate = parseSave(JSON.parse(payload), content).campaign;
    expect(candidate.pending).toBeUndefined();
    expect(candidate.hero.health).toBe(health);
    expect(candidate.hero.learnedSkills['poison-attack']).toBeUndefined();
    expect(await host.retryProgression()).toBe(true);
    expect(write.mock.calls[1][0].payload).toBe(payload);
    expect(host.getSnapshot().session!.toSave()).toEqual(candidate);
    expect(battle.engine.random.snapshot()).toEqual(random);
    expect(battle.combat.completedActions).toBe(actions);
    expect(await host.returnFromBattle()).toBe(false);
    expect(write).toHaveBeenCalledTimes(2);
  });
});
