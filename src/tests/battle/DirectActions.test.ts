import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadGameContent } from '../../data/content';
import { ContentRegistry } from '../../engine/data/ContentRegistry';
import type { BattleAction } from '../../engine/battle/BattleMachine';
import { BattleSession } from '../../game/BattleSession';

const sessions: BattleSession[] = [];
function create(content = loadGameContent()) {
  vi.useFakeTimers();
  const session = new BattleSession(content, 12345, 'chamber', undefined, [], undefined, 'direct-test', true);
  sessions.push(session); return session;
}
afterEach(() => { sessions.splice(0).forEach((session) => session.dispose()); vi.useRealTimers(); });

describe('direct player actions', () => {
  it.each<[BattleAction, string]>([
    [{ action: 'attack' }, 'slime-1'],
    [{ action: 'skill', skillId: 'firebolt' }, 'slime-1'],
    [{ action: 'skill', skillId: 'healing' }, 'player'],
    [{ action: 'defend' }, 'player'],
  ])('matches the existing combat outcomes for %j', (action, targetId) => {
    const direct = create(), legacy = create();
    for (const session of [direct, legacy]) session.engine.getEntity('player')!.health!.current = 40;
    expect(direct.executePlayerAction(action, targetId, 0)).toBe(true);
    legacy.dispatch({ type: 'SELECT_ACTION', ...action });
    legacy.dispatch({ type: 'SELECT_TARGET', targetId });
    legacy.dispatch({ type: 'CONFIRM_ACTION' });
    expect(direct.getSnapshot()).toEqual(legacy.getSnapshot());
    expect(direct.engine.random.snapshot()).toEqual(legacy.engine.random.snapshot());
    expect(direct.combat.completedActions).toBe(1);
    expect(direct.training.snapshot()).toEqual(legacy.training.snapshot());
  });

  it('executes a basic attack without any prior selection and ignores duplicate taps', () => {
    const session = create();
    session.engine.getEntity('player')!.weapon = { id: 'weapon-1', itemId: 'iron-blade', durability: 60 };
    const before = session.engine.getEntity('player')!.weapon!.durability;
    session.engine.getEntity('player')!.combatant!.hitChance = 1;
    expect(session.getSnapshot().selectedAction).toBeUndefined();
    expect(session.executePlayerAction({ action: 'attack' }, 'slime-1', 0)).toBe(true);
    const random = session.engine.random.snapshot();
    expect(session.executePlayerAction({ action: 'attack' }, 'slime-1', 0)).toBe(false);
    expect(session.combat.completedActions).toBe(1);
    expect(session.engine.getEntity('player')!.weapon!.durability).toBe(before - 1);
    expect(session.engine.random.snapshot()).toEqual(random);
    session.advanceEnemyTurns();
    expect(session.canAcceptPlayerInput(session.combat.completedActions)).toBe(false);
    vi.runAllTimers();
    expect(session.canAcceptPlayerInput(session.combat.completedActions)).toBe(true);
    expect(session.executePlayerAction({ action: 'attack' }, 'slime-1', 0)).toBe(false);
    expect(session.getSnapshot().selectedAction).toBeUndefined();
  });

  it.each<BattleAction>([{ action: 'defend' }, { action: 'skill', skillId: 'healing' }])(
    'executes self-only selection immediately: %j', (action) => {
      const session = create();
      session.engine.getEntity('player')!.health!.current = 40;
      expect(session.selectPlayerAction(action, 0)).toBe(true);
      expect(session.combat.completedActions).toBe(1);
      expect(session.selectPlayerAction(action, 0)).toBe(false);
    });

  it.each<BattleAction>([{ action: 'attack' }, { action: 'skill', skillId: 'firebolt' }])(
    'automatically confirms the sole enemy with identical costs, outcomes and RNG: %j', (action) => {
      const automatic = create(), manual = create();
      expect(automatic.selectPlayerAction(action, 0)).toBe(true);
      manual.dispatch({ type: 'SELECT_ACTION', ...action });
      manual.dispatch({ type: 'SELECT_TARGET', targetId: 'slime-1' }); manual.dispatch({ type: 'CONFIRM_ACTION' });
      expect(automatic.getSnapshot()).toEqual(manual.getSnapshot());
      expect(automatic.engine.random.snapshot()).toEqual(manual.engine.random.snapshot());
      expect(automatic.training.snapshot()).toEqual(manual.training.snapshot());
      expect(automatic.combat.completedActions).toBe(1);
      const before = automatic.getSnapshot(), random = automatic.engine.random.snapshot();
      expect(automatic.selectPlayerAction(action, 0)).toBe(false);
      expect(automatic.getSnapshot()).toEqual(before); expect(automatic.engine.random.snapshot()).toEqual(random);
    });

  it.each<BattleAction>([{ action: 'attack' }, { action: 'skill', skillId: 'firebolt' }])(
    'still waits for a canvas target while multiple enemies are alive: %j', (action) => {
      const data = structuredClone(loadGameContent().data);
      data.maps[0].spawns.push({ entityId: 'slime-2', definitionId: 'slime', kind: 'enemy', x: 7, y: 4 });
      const session = create(new ContentRegistry(data)), player = session.engine.getEntity('player')!;
      const before = structuredClone(player), random = session.engine.random.snapshot();
      expect(session.selectPlayerAction(action, 0)).toBe(true);
      expect(session.getSnapshot().targets).toEqual(['slime-1', 'slime-2']);
      expect(session.battle.phase).toBe('selectingTarget'); expect(session.combat.completedActions).toBe(0);
      expect(player).toEqual(before); expect(session.engine.random.snapshot()).toEqual(random);
    });

  it('automatically targets the survivor after another enemy dies and handles a sole area target', () => {
    const data = structuredClone(loadGameContent().data);
    data.skills.find((skill) => skill.id === 'firebolt')!.target = 'allEnemies';
    data.maps[0].spawns.push({ entityId: 'slime-2', definitionId: 'slime', kind: 'enemy', x: 7, y: 4 });
    const session = create(new ContentRegistry(data));
    // Membership and living state, rather than spawn count, define the last target.
    session.engine.getEntity('slime-1')!.health!.current = 1;
    vi.spyOn(session.engine.random, 'chance').mockReturnValue(true);
    session.executePlayerAction({ action: 'attack' }, 'slime-1', 0);
    expect(session.engine.getEntity('slime-1')!.dead).toBe(true);
    session.advanceEnemyTurns(); vi.runAllTimers();
    const count = session.combat.completedActions;
    expect(session.selectPlayerAction({ action: 'skill', skillId: 'firebolt' }, count)).toBe(true);
    expect(session.combat.completedActions).toBe(count + 1);
    expect(session.presentation.getSnapshot().active!.targetId).toBe('slime-2');
    expect(session.presentation.getSnapshot().active!.impacts.map((impact) => impact.targetId)).toEqual(['slime-2']);
  });

  it('rejects an unaffordable automatically targeted skill before resources, training or RNG change', () => {
    const session = create(), player = session.engine.getEntity('player')!;
    player.mana!.current = 0;
    const before = structuredClone(player), random = session.engine.random.snapshot();
    expect(() => session.selectPlayerAction({ action: 'skill', skillId: 'firebolt' }, 0)).toThrow('mana');
    expect(player).toEqual(before); expect(session.engine.random.snapshot()).toEqual(random);
    expect(session.training.snapshot()).toEqual({}); expect(session.combat.completedActions).toBe(0);
    expect(session.battle.phase).toBe('selectingAction');
  });

  it('supports explicitly self-targeted skills and ally selection when more than one ally is available', () => {
    const data = structuredClone(loadGameContent().data);
    data.skills.find((skill) => skill.id === 'healing')!.target = 'self';
    const self = create(new ContentRegistry(data));
    self.engine.getEntity('player')!.health!.current = 40;
    expect(self.selectPlayerAction({ action: 'skill', skillId: 'healing' }, 0)).toBe(true);
    expect(self.combat.completedActions).toBe(1);
    const partyData = structuredClone(loadGameContent().data);
    partyData.maps[0].spawns.push({ entityId: 'ally', definitionId: 'warden', kind: 'player', x: 2, y: 3 });
    const party = create(new ContentRegistry(partyData));
    party.engine.getEntity('ally')!.health!.current = 40;
    expect(party.selectPlayerAction({ action: 'skill', skillId: 'healing' }, 0)).toBe(true);
    expect(party.combat.completedActions).toBe(0);
    expect(party.battle.validTargetIds()).toEqual(['player', 'ally']);
    expect(party.executePlayerAction({ action: 'skill', skillId: 'healing' }, 'ally', 0)).toBe(true);
    expect(party.engine.getEntity('ally')!.health!.current).toBeGreaterThan(40);
  });

  it('waits for an enemy tap for single-target and area skills, then affects all area targets once', () => {
    const data = structuredClone(loadGameContent().data);
    data.skills.find((skill) => skill.id === 'firebolt')!.target = 'allEnemies';
    data.maps[0].spawns.push({ entityId: 'slime-2', definitionId: 'slime', kind: 'enemy', x: 7, y: 4 });
    const session = create(new ContentRegistry(data));
    expect(session.selectPlayerAction({ action: 'skill', skillId: 'firebolt' }, 0)).toBe(true);
    expect(session.combat.completedActions).toBe(0);
    const mana = session.engine.getEntity('player')!.mana!.current;
    expect(session.executePlayerAction({ action: 'skill', skillId: 'firebolt' }, 'slime-2', 0)).toBe(true);
    expect(session.engine.getEntity('player')!.mana!.current).toBeLessThan(mana);
    expect(session.presentation.getSnapshot().active!.impacts.map((impact) => impact.targetId).sort()).toEqual(['slime-1', 'slime-2']);
    expect(session.combat.completedActions).toBe(1);
  });

  it('does not spend resources or advance a turn for invalid targets or resource failures', () => {
    const session = create();
    const random = session.engine.random.snapshot();
    expect(() => session.executePlayerAction({ action: 'attack' }, 'player', 0)).toThrow('valid target');
    expect(() => session.executePlayerAction({ action: 'attack' }, 'missing', 0)).toThrow('valid target');
    session.dispatch({ type: 'SELECT_ACTION', action: 'skill', skillId: 'firebolt' });
    session.engine.getEntity('player')!.mana!.current = 0;
    expect(() => session.executePlayerAction({ action: 'skill', skillId: 'firebolt' }, 'slime-1', 0)).toThrow('mana');
    expect(session.combat.completedActions).toBe(0);
    expect(session.getSnapshot().selectedAction?.skillId).toBe('firebolt');
    expect(session.engine.random.snapshot()).toEqual(random);
    session.dispatch({ type: 'CANCEL_ACTION' });
    expect(session.getSnapshot().selectedAction).toBeUndefined();
    expect(session.battle.validTargetIds({ action: 'attack' })).toEqual(['slime-1']);
  });

  it('rejects dead targets, enemy-turn input, and all input after the final enemy dies', () => {
    const session = create();
    session.engine.getEntity('slime-1')!.health!.current = 0;
    expect(() => session.executePlayerAction({ action: 'attack' }, 'slime-1', 0)).toThrow('valid target');
    session.engine.getEntity('slime-1')!.health!.current = 1;
    session.engine.getEntity('player')!.combatant!.hitChance = 1;
    expect(session.executePlayerAction({ action: 'attack' }, 'slime-1', 0)).toBe(true);
    expect(session.battle.phase).toBe('victory');
    vi.runAllTimers();
    expect(session.executePlayerAction({ action: 'attack' }, 'slime-1', 1)).toBe(false);
    const data = structuredClone(loadGameContent().data);
    data.enemies[0].combatant.speed = 100;
    const enemyFirst = create(new ContentRegistry(data));
    expect(enemyFirst.battle.phase).toBe('enemyTurn');
    expect(enemyFirst.selectPlayerAction({ action: 'defend' }, 0)).toBe(false);
  });
});
