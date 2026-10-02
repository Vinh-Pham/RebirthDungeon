import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadGameContent } from '../../data/content';
import { ContentRegistry } from '../../engine/data/ContentRegistry';
import { addItem, createHero, heroStats } from '../../engine/rpg/Character';
import { learnSkill } from '../../engine/rpg/Skills';
import { applyStatus } from '../../engine/rpg/StatusEffects';
import { BattleSession } from '../../game/BattleSession';
import { JourneySession } from '../../game/JourneySession';
import { parseSave, encodeSave } from '../../persistence/SaveSchema';
const content = loadGameContent();
const journeys: JourneySession[] = [],
  battles: BattleSession[] = [];
function trainedHero() {
  let hero = createHero(content);
  for (const id of ['smash', 'combat-mastery', 'sword-mastery'])
    hero = learnSkill(hero, id, content);
  addItem(hero, 'iron-blade', 1, content);
  hero.equipment.weapon = 'weapon-1';
  return hero;
}
function battle(hero = trainedHero(), registry = content) {
  const session = new BattleSession(
    registry,
    7,
    'chamber',
    hero,
    [],
    undefined,
    'test-authored',
    true,
  );
  battles.push(session);
  session.engine.getEntity('slime-1')!.health = { current: 1000, max: 1000 };
  return session;
}
function act(
  session: BattleSession,
  action: 'attack' | 'skill' | 'defend',
  skillId = 'smash',
  targetId = 'slime-1',
) {
  session.dispatch({ type: 'SELECT_ACTION', action, skillId });
  session.dispatch({ type: 'SELECT_TARGET', targetId: action === 'defend' ? 'player' : targetId });
  session.dispatch({ type: 'CONFIRM_ACTION' });
}
function encounter() {
  const base = new JourneySession(content);
  journeys.push(base);
  const state = base.toSave();
  state.hero = trainedHero();
  const session = new JourneySession(content, state);
  journeys.push(session);
  session.dispatch({ type: 'TRAVEL_TO', x: 7, y: 3 });
  session.dispatch({ type: 'INTERACT', objectId: 'east' });
  session.dispatch({ type: 'TRAVEL_TO', x: 5, y: 3 });
  const fight = session.createBattle();
  battles.push(fight);
  return { session, fight };
}
afterEach(() => {
  battles.splice(0).forEach((b) => b.dispose());
  journeys.splice(0).forEach((j) => j.dispose());
  vi.restoreAllMocks();
});
describe('rank-aware skill actions and authoritative practice', () => {
  it('selection, cancellation and previews spend no cost, turn, RNG or training', () => {
    const session = battle();
    const player = session.engine.getEntity('player')!;
    const before = structuredClone(player),
      random = session.engine.random.snapshot();
    session.dispatch({ type: 'SELECT_ACTION', action: 'skill', skillId: 'smash' });
    session.dispatch({ type: 'SELECT_TARGET', targetId: 'slime-1' });
    const preview = session.combat.previewSkill('player', 'slime-1', 'smash');
    expect(preview).toMatchObject({ manaCost: 0, staminaCost: 4, area: false });
    expect(preview.targets[0].min).toBeGreaterThan(0);
    session.dispatch({ type: 'CANCEL_ACTION' });
    expect(player).toEqual(before);
    expect(session.engine.random.snapshot()).toEqual(random);
    expect(session.training.snapshot()).toEqual({});
    expect(session.combat.completedActions).toBe(0);
  });
  it('uses saved rank values without mutating the catalog or changing the fixed queue', () => {
    const f = battle(),
      upgraded = trainedHero();
    upgraded.learnedSkills.smash.rank = 'E';
    const e = battle(upgraded),
      catalog = structuredClone(content.skill('smash'));
    const fp = f.combat.previewSkill('player', 'slime-1', 'smash'),
      ep = e.combat.previewSkill('player', 'slime-1', 'smash');
    expect(ep.targets[0].min - fp.targets[0].min).toBe(4);
    expect(ep.targets[0].max - fp.targets[0].max).toBe(6);
    const order = e.combat.turnOrder;
    act(e, 'skill');
    expect(e.combat.turnOrder).toEqual(order);
    expect(content.skill('smash')).toEqual(catalog);
    expect(e.training.snapshot().smash).toBeUndefined();
  });
  it('revalidates equipment, MP and target-dependent SP before RNG or mutation', () => {
    const session = battle(),
      player = session.engine.getEntity('player')!;
    session.dispatch({ type: 'SELECT_ACTION', action: 'skill', skillId: 'smash' });
    session.dispatch({ type: 'SELECT_TARGET', targetId: 'slime-1' });
    player.weapon!.durability = 0;
    const before = structuredClone(player),
      random = session.engine.random.snapshot();
    expect(() => session.dispatch({ type: 'CONFIRM_ACTION' })).toThrow('usable');
    expect(player).toEqual(before);
    expect(session.engine.random.snapshot()).toEqual(random);
    expect(session.training.snapshot()).toEqual({});
    expect(session.battle.phase).toBe('selectingTarget');
    session.dispatch({ type: 'CANCEL_ACTION' });
    player.stamina!.current = 0;
    session.dispatch({ type: 'SELECT_ACTION', action: 'skill', skillId: 'healing' });
    session.dispatch({ type: 'SELECT_TARGET', targetId: 'player' });
    expect(() => session.dispatch({ type: 'CONFIRM_ACTION' })).toThrow('stamina');
    expect(player.stamina!.current).toBe(0);
    expect(session.combat.completedActions).toBe(0);
  });
  it('an accepted miss spends one skill cost and turn, trains use but not damage/defeats, and causes no wear', () => {
    const session = battle(),
      player = session.engine.getEntity('player')!;
    vi.spyOn(session.engine.random, 'chance').mockReturnValue(false);
    act(session, 'skill');
    expect(session.combat.completedActions).toBe(1);
    expect(player.stamina!.current).toBe(110); // 113 - 4 + normal regeneration 1
    expect(player.weapon!.durability).toBe(60);
    expect(session.training.snapshot()).toEqual({
      smash: { uses: 1 },
      'combat-mastery': { uses: 1 },
    });
  });
  it('trains the breaking sword hit but excludes exhausted fallback and subsequent broken-weapon actions', () => {
    const hero = trainedHero();
    hero.weapons['weapon-1'].durability = 1;
    const session = battle(hero),
      player = session.engine.getEntity('player')!;
    vi.spyOn(session.engine.random, 'chance').mockReturnValue(true);
    act(session, 'attack');
    expect(player.weapon!.durability).toBe(0);
    expect(session.training.snapshot()['sword-mastery']).toEqual({ hits: 1 });
    session.advanceEnemyTurns();
    act(session, 'attack');
    expect(session.training.snapshot()['sword-mastery']).toEqual({ hits: 1 });
    const exhausted = battle();
    exhausted.engine.getEntity('player')!.stamina!.current = 0;
    const preview = exhausted.combat.previewBasic('player', 'slime-1');
    const bare = structuredClone(trainedHero());
    delete bare.equipment.weapon;
    expect(preview.targets[0].max).toBe(heroStats(bare, content).combatant.maxDamage);
    act(exhausted, 'attack');
    expect(exhausted.engine.getEntity('player')!.weapon!.durability).toBe(60);
    expect(exhausted.training.snapshot()['sword-mastery']).toBeUndefined();
  });
  it('banks practice before a throwing listener and does not allow the committed action to replay', () => {
    const session = battle();
    session.engine.events.on('DAMAGE_DEALT', () => {
      throw new Error('Presentation failed');
    });
    session.dispatch({ type: 'SELECT_ACTION', action: 'skill', skillId: 'smash' });
    session.dispatch({ type: 'SELECT_TARGET', targetId: 'slime-1' });
    vi.spyOn(session.engine.random, 'chance').mockReturnValue(true);
    expect(() => session.dispatch({ type: 'CONFIRM_ACTION' })).toThrow('already committed');
    expect(session.training.snapshot().smash).toEqual({ uses: 1, hits: 1 });
    expect(session.combat.completedActions).toBe(1);
    expect(session.battle.phase).toBe('enemyTurn');
    expect(() => session.dispatch({ type: 'CONFIRM_ACTION' })).toThrow('unavailable');
    expect(session.training.snapshot().smash.uses).toBe(1);
  });
  it('a cooldown of one blocks the next owner turn and clears after another completed owner action', () => {
    const raw = structuredClone(content.data);
    raw.skills.find((s) => s.id === 'smash')!.gameRanks!.F!.cooldown = 1;
    const session = battle(trainedHero(), new ContentRegistry(raw));
    act(session, 'skill');
    session.advanceEnemyTurns();
    expect(() =>
      session.dispatch({ type: 'SELECT_ACTION', action: 'skill', skillId: 'smash' }),
    ).toThrow('cooldown');
    const random = session.engine.random.snapshot();
    act(session, 'defend');
    expect(session.engine.random.snapshot()).toEqual(random);
    session.advanceEnemyTurns();
    expect(session.engine.getEntity('player')!.cooldowns?.smash).toBeUndefined();
    act(session, 'skill');
  });
  it.each(['victory', 'defeat'] as const)(
    'merges completed %s training once while restart discards unfinished practice',
    (result) => {
      const { session, fight } = encounter();
      const checkpoint = session.toSave(),
        enemy = fight.engine.getEntity('slime-1')!;
      vi.spyOn(fight.engine.random, 'chance').mockReturnValue(true);
      if (result === 'victory') enemy.health!.current = 1;
      else {
        fight.engine.getEntity('player')!.health!.current = 1;
        Object.assign(enemy.combatant!, { attack: 1000, minDamage: 1000, maxDamage: 1000 });
      }
      act(fight, 'skill');
      expect(session.toSave().hero.learnedSkills.smash.objectiveCounts).toEqual({});
      if (result === 'defeat') fight.advanceEnemyTurns();
      expect(fight.combat.result).toBe(result);
      const reloaded = new JourneySession(
        content,
        parseSave(JSON.parse(encodeSave(checkpoint, content)), content).campaign,
      );
      journeys.push(reloaded);
      const restarted = reloaded.createBattle();
      battles.push(restarted);
      expect(restarted.training.snapshot()).toEqual({});
      session.finishBattle(fight);
      expect(session.toSave().hero.learnedSkills.smash.objectiveCounts).toMatchObject({
        uses: 1,
        hits: 1,
      });
      expect(() => session.finishBattle(fight)).toThrow('ready');
      if (result === 'defeat') expect(session.toSave().hero.ap).toBe(checkpoint.hero.ap);
    },
  );
  it.each(['F', 'E'] as const)(
    'keeps pilot rank %s melee pacing viable against authored enemies across 100 seeds',
    (rank) => {
      let wins = 0,
        actions = 0;
      for (let seed = 0; seed < 100; seed++) {
        const hero = trainedHero();
        for (const id of ['smash', 'combat-mastery', 'sword-mastery'])
          hero.learnedSkills[id] = { rank, objectiveCounts: {} };
        const session = new BattleSession(content, seed, 'chamber', hero);
        try {
          for (let turn = 0; turn < 50 && !session.combat.result; turn++) {
            if (session.battle.phase === 'enemyTurn') {
              session.advanceEnemyTurns();
              continue;
            }
            const player = session.engine.getEntity('player')!;
            act(
              session,
              player.stamina!.current >= 4 && player.weapon!.durability > 0 ? 'skill' : 'attack',
            );
            actions++;
          }
          if (session.combat.result === 'victory') wins++;
          expect(session.engine.getEntity('player')!.mana!.current).toBe(98);
        } finally {
          session.dispose();
        }
      }
      expect(wins).toBeGreaterThanOrEqual(95);
      expect(actions / 100).toBeLessThanOrEqual(3);
    },
  );
  it('status damage and status defeats do not receive direct Smash or sword defeat credit', () => {
    const session = battle();
    const enemy = session.engine.getEntity('slime-1')!;
    const status = content.data.statusEffects.find((s) => s.effect === 'damage')!;
    enemy.health!.current = 1;
    applyStatus(enemy, status.id, 'player', content, []);
    vi.spyOn(session.engine.random, 'chance').mockReturnValue(false);
    act(session, 'skill');
    // Whichever status boundary the author chose, no direct defeat was recorded.
    if (!session.combat.result && session.battle.phase === 'enemyTurn') session.advanceEnemyTurns();
    expect(session.training.snapshot().smash).toEqual({ uses: 1 });
    expect(session.training.snapshot()['sword-mastery']).toBeUndefined();
  });
});
