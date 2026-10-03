import { afterEach, expect, it, vi } from 'vitest';
import { RemoteBattle } from '../../online/RemoteBattle';
import {
  newOnlineState,
  execute,
  publicView,
  gameContent,
} from '@rebirth/game-core/online/Runtime';
import { GAME_CONTENT_VERSION } from '@rebirth/game-core/online/Contracts';
import { battleActionDetails } from '../../ui/battle/battleActionDetails';
function encounter() {
  let state = newOnlineState(12345, 'Player', 'warrior');
  for (const command of [
    { type: 'TRAVEL_TO', x: 7, y: 3 },
    { type: 'INTERACT', objectId: 'east' },
    { type: 'TRAVEL_TO', x: 5, y: 3 },
  ] as const)
    state = execute(state, 'Player', command, 1000).state;
  const meta = {
    id: 'hero',
    name: 'Player',
    talent: 'warrior' as const,
    age: 12,
    revision: 4,
    contentVersion: GAME_CONTENT_VERSION,
    createdAt: 0,
    updatedAt: 0,
  };
  return { state, meta, view: publicView(state, meta) };
}
afterEach(() => vi.useRealTimers());
it('submits confirmed actions without advancing a local engine, including after timers', () => {
  vi.useFakeTimers();
  const f = encounter(),
    submit = vi.fn();
  const battle = new RemoteBattle(f.view, gameContent, () => true, submit, vi.fn());
  const before = JSON.stringify(f.view),
    sequence = battle.getSnapshot().actionCount;
  const quote = battleActionDetails(battle, { action: 'attack' });
  expect(quote.previews).toEqual(
    f.view.encounter!.actions.find((a) => a.action.action === 'attack')!.previews,
  );
  battle.executePlayerAction(
    { action: 'attack' },
    battle.validTargetIds({ action: 'attack' })[0],
    sequence,
  );
  expect(submit).toHaveBeenCalledOnce();
  battle.advanceEnemyTurns();
  vi.advanceTimersByTime(30000);
  expect(battle.getSnapshot().actionCount).toBe(sequence);
  expect(JSON.stringify(f.view)).toBe(before);
  expect(battle).not.toHaveProperty('engine');
  battle.dispose();
});
it('plays a committed receipt once, skips restart/duplicate/later-view animations, and freezes prior logs', () => {
  vi.useFakeTimers();
  const f = encounter(),
    battle = new RemoteBattle(f.view, gameContent, () => true, vi.fn(), vi.fn());
  const execution = execute(
    f.state,
    'Player',
    {
      type: 'BATTLE_ACTION',
      action: { action: 'attack' },
      targetId: battle.validTargetIds({ action: 'attack' })[0],
    },
    2000,
  );
  const next = publicView(execution.state, { ...f.meta, revision: 5 });
  const receipt = {
    commandId: crypto.randomUUID(),
    characterId: 'hero',
    baseRevision: 4,
    committedRevision: 5,
    createdAt: 2000,
    outcome: execution.outcome,
  };
  battle.update(next);
  const old = battle.getSnapshot();
  battle.present({ view: next, receipt }, 4);
  expect(battle.presentation.getSnapshot().busy).toBe(true);
  expect(old.log).toHaveLength(0);
  const chronicle = battle.getSnapshot().log;
  vi.advanceTimersByTime(30000);
  battle.present({ view: next, receipt }, 4);
  expect(battle.presentation.getSnapshot().busy).toBe(false);
  expect(battle.getSnapshot().log).toBe(chronicle);
  const restarted = new RemoteBattle(next, gameContent, () => true, vi.fn(), vi.fn());
  restarted.present({ view: next, receipt }, 5);
  expect(restarted.presentation.getSnapshot().busy).toBe(false);
  battle.update({ ...next, character: { ...next.character, revision: 6 } });
  battle.present({ view: next, receipt: { ...receipt, commandId: crypto.randomUUID() } }, 4);
  expect(battle.presentation.getSnapshot().busy).toBe(false);
  battle.dispose();
  restarted.dispose();
});
it('rejects target and offline input without submitting, and cancels presentation on disposal', () => {
  const f = encounter(),
    submit = vi.fn(),
    battle = new RemoteBattle(f.view, gameContent, () => true, submit, vi.fn());
  expect(() =>
    battle.executePlayerAction({ action: 'attack' }, 'player', battle.getSnapshot().actionCount),
  ).toThrow('target');
  expect(submit).not.toHaveBeenCalled();
  battle.dispose();
  const offline = new RemoteBattle(f.view, gameContent, () => false, submit, vi.fn());
  expect(offline.selectPlayerAction({ action: 'defend' }, offline.getSnapshot().actionCount)).toBe(
    false,
  );
  offline.dispose();
});
