import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadGameContent } from '../../data/content';
import {
  addItem,
  createHero,
  heroStats,
  applyHero,
  previewEquipment,
  validateHero,
} from '../../engine/rpg/Character';
import { learnSkill } from '../../engine/rpg/Skills';
import { cloneData } from '../../engine/cloneData';
import { prepareBasicAttack } from '../../engine/battle/BasicAttack';
import { resolveAttack } from '../../engine/battle/AttackResolver';
import { createGameRandom } from '../../engine/Random';
import { BattleSession } from '../../game/BattleSession';
import { battleHotbarActions } from '../../ui/battle/battleActionDetails';
import { inventoryRows } from '../../ui/journey/inventoryRows';
import type { Entity } from '../../engine/ecs/Entity';

const content = loadGameContent(),
  sessions: BattleSession[] = [];
function archer(arrows = 2, equipped = true) {
  const hero = createHero(content, 'archery');
  addItem(hero, 'short-bow', 1, content);
  if (arrows) addItem(hero, 'arrow', arrows, content);
  hero.equipment.weapon = 'weapon-1';
  if (equipped && arrows) hero.equipment.secondaryHand = 'arrow';
  return hero;
}
function battle(hero = archer(), seed = 17) {
  const session = new BattleSession(
    content,
    seed,
    'chamber',
    hero,
    [],
    undefined,
    'ranged-test',
    true,
  );
  sessions.push(session);
  for (const entity of session.engine.world.entities)
    if (entity.enemy) entity.health = { current: 1000, max: 1000 };
  return session;
}
function attack(session: BattleSession) {
  session.dispatch({ type: 'SELECT_ACTION', action: 'attack' });
  session.dispatch({ type: 'SELECT_TARGET', targetId: 'slime-1' });
  session.dispatch({ type: 'CONFIRM_ACTION' });
}
afterEach(() => {
  sessions.splice(0).forEach((s) => s.dispose());
  vi.restoreAllMocks();
});

describe('bow ammunition and basic attack damage', () => {
  it.each([0, 2])(
    'uses exactly fist stats with %s unequipped arrows, including previews and seeded resolution',
    (arrows) => {
      const hero = archer(arrows, false),
        bare = { ...hero, equipment: {} };
      expect(heroStats(hero, content)).toEqual(heroStats(bare, content));
      const session = battle(hero),
        player = session.engine.getEntity('player')!,
        target = session.engine.getEntity('slime-1')!;
      const fists: Entity = { id: 'player', player: true };
      applyHero(fists, bare, content);
      const random = createGameRandom(0);
      random.restore(session.engine.random.snapshot());
      const expected = resolveAttack({ attacker: fists, target, random });
      const before = target.health!.current;
      expect(session.combat.previewBasic('player', 'slime-1')).toMatchObject({
        staminaCost: 2,
        ammunitionCost: 0,
      });
      attack(session);
      expect(before - target.health!.current).toBe(expected.damage);
      expect(session.engine.random.snapshot()).toEqual(random.snapshot());
      expect(player.weapon!.durability).toBe(40);
      expect(player.inventory!.arrow).toBe(arrows || undefined);
    },
  );
  it('derives ranged damage from Dexterity, bow and Human F without granting a rank or melee bonuses', () => {
    const hero = archer(),
      before = structuredClone(hero);
    expect(heroStats(hero, content).combatant).toMatchObject({ minDamage: 19, maxDamage: 39 });
    const meleeHero = cloneData(learnSkill(hero, 'combat-mastery', content));
    expect(heroStats(meleeHero, content).combatant.minDamage).toBe(19);
    expect(heroStats(meleeHero, content).combatant.maxDamage).toBe(39);
    const session = battle(hero),
      player = session.engine.getEntity('player')!;
    const random = session.engine.random.snapshot(),
      original = structuredClone(player);
    const plan = prepareBasicAttack(player, content);
    expect(plan).toMatchObject({
      skillId: 'human-ranged-attack',
      rank: 'F',
      cost: 1,
      ammunitionItemId: 'arrow',
      usesWeapon: true,
    });
    expect(battleHotbarActions(session, 'combat')[0].skill.id).toBe('human-ranged-attack');
    session.combat.previewBasic('player', 'slime-1');
    expect(player).toEqual(original);
    expect(hero).toEqual(before);
    expect(session.engine.random.snapshot()).toEqual(random);
    expect(player.learnedSkills!['human-ranged-attack']).toBeUndefined();
  });
  it.each(['human-ranged-attack', 'elf-ranged-attack'] as const)(
    'uses owned %s E rank through Attack and keeps it out of skill casts',
    (id) => {
      const hero = cloneData(learnSkill(archer(), id, content));
      hero.learnedSkills[id].rank = 'E';
      expect(validateHero(hero, content).learnedSkills[id].rank).toBe('E');
      expect(heroStats(hero, content).combatant).toMatchObject({ minDamage: 20, maxDamage: 41 });
      const session = battle(hero),
        player = session.engine.getEntity('player')!;
      expect(prepareBasicAttack(player, content)).toMatchObject({ skillId: id, rank: 'E' });
      expect(battleHotbarActions(session, 'combat')[0]).toMatchObject({ rank: 'E', skill: { id } });
      expect(player.skills).not.toContain(id);
    },
  );
  it('consumes one arrow and wears the bow once on a hit without giving melee training', () => {
    const hero = cloneData(learnSkill(archer(), 'combat-mastery', content));
    const session = battle(hero),
      player = session.engine.getEntity('player')!;
    const before = session.getSnapshot().entities.find((entity) => entity.id === 'player')!;
    vi.spyOn(session.engine.random, 'chance').mockReturnValueOnce(true).mockReturnValueOnce(false);
    attack(session);
    expect(player.inventory!.arrow).toBe(1);
    expect(player.weapon!.durability).toBe(39);
    expect(session.getSnapshot().entities.find((entity) => entity.id === 'player')).toMatchObject({
      weapon: { itemId: 'short-bow', durability: 39 },
      secondaryHand: { itemId: 'arrow', name: 'Arrow', quantity: 1 },
    });
    expect(before.secondaryHand?.quantity).toBe(2);
    expect(before.weapon?.durability).toBe(40);
    expect(session.training.snapshot()).toEqual({});
    expect(hero.inventory.arrow).toBe(2);
    expect(hero.weapons['weapon-1'].durability).toBe(40);
  });
  it('consumes the last arrow on a miss, clears the secondary hand and previews fists for the next attack', () => {
    const hero = archer(1),
      session = battle(hero),
      player = session.engine.getEntity('player')!;
    vi.spyOn(session.engine.random, 'chance').mockReturnValue(false);
    attack(session);
    expect(player.inventory!.arrow).toBeUndefined();
    expect(player.ammunitionItemId).toBeUndefined();
    expect(
      session.getSnapshot().entities.find((entity) => entity.id === 'player')?.secondaryHand,
    ).toBeUndefined();
    expect(player.weapon!.durability).toBe(40);
    expect(player.combatant).toEqual(heroStats({ ...hero, equipment: {} }, content).combatant);
    expect(session.combat.previewBasic('player', 'slime-1')).toMatchObject({
      staminaCost: 2,
      ammunitionCost: 0,
    });
    expect(
      inventoryRows(hero, content, session.getSnapshot().inventory).some(
        (r) => r.item.kind === 'ammunition',
      ),
    ).toBe(false);
    expect(prepareBasicAttack(player, content).fallbackReason).toContain('No equipped arrows');
  });
  it('fires the final arrow with ranged damage before switching to fists', () => {
    const hero = archer(1),
      session = battle(hero),
      player = session.engine.getEntity('player')!,
      target = session.engine.getEntity('slime-1')!;
    const random = createGameRandom(0);
    random.restore(session.engine.random.snapshot());
    const expected = resolveAttack({ attacker: player, target, random });
    const before = target.health!.current;
    attack(session);
    expect(before - target.health!.current).toBe(expected.damage);
    expect(session.engine.random.snapshot()).toEqual(random.snapshot());
    expect(player.combatant!.maxDamage).toBe(26);
  });
  it('resolves a breaking bow hit with ranged stats, retains remaining arrows and then falls back to fists', () => {
    const hero = archer(2);
    hero.weapons['weapon-1'].durability = 1;
    const session = battle(hero),
      player = session.engine.getEntity('player')!,
      target = session.engine.getEntity('slime-1')!;
    player.combatant!.hitChance = 1;
    target.combatant!.evasion = 0;
    const random = createGameRandom(0);
    random.restore(session.engine.random.snapshot());
    const expected = resolveAttack({ attacker: player, target, random });
    const before = target.health!.current;
    attack(session);
    expect(before - target.health!.current).toBe(expected.damage);
    expect(expected.hit).toBe(true);
    expect(player.weapon!.durability).toBe(0);
    expect(player.inventory!.arrow).toBe(1);
    expect(player.ammunitionItemId).toBe('arrow');
    expect(prepareBasicAttack(player, content)).toMatchObject({
      usesWeapon: false,
      ammunitionItemId: undefined,
    });
    expect(player.combatant!.maxDamage).toBe(26);
  });
  it.each(['exhausted', 'broken'] as const)(
    'retains ammunition and uses fists for a %s bow attack',
    (condition) => {
      const hero = archer();
      if (condition === 'broken') hero.weapons['weapon-1'].durability = 0;
      const session = battle(hero),
        player = session.engine.getEntity('player')!;
      if (condition === 'exhausted') player.stamina!.current = 0;
      expect(prepareBasicAttack(player, content).attacker.combatant).toEqual(
        heroStats({ ...hero, equipment: {} }, content).combatant,
      );
      vi.spyOn(session.engine.random, 'chance').mockReturnValue(true);
      attack(session);
      expect(player.inventory!.arrow).toBe(2);
      expect(player.weapon!.durability).toBe(condition === 'broken' ? 0 : 40);
    },
  );
  it('spends no arrows for cancellation, invalid targets, Defend, or spells', () => {
    const session = battle(),
      player = session.engine.getEntity('player')!,
      random = session.engine.random.snapshot();
    session.dispatch({ type: 'SELECT_ACTION', action: 'attack' });
    expect(() => session.dispatch({ type: 'SELECT_TARGET', targetId: 'player' })).toThrow();
    session.dispatch({ type: 'CANCEL_ACTION' });
    expect(session.engine.random.snapshot()).toEqual(random);
    session.dispatch({ type: 'SELECT_ACTION', action: 'defend' });
    session.dispatch({ type: 'SELECT_TARGET', targetId: 'player' });
    session.dispatch({ type: 'CONFIRM_ACTION' });
    session.advanceEnemyTurns();
    session.dispatch({ type: 'SELECT_ACTION', action: 'skill', skillId: 'firebolt' });
    session.dispatch({ type: 'SELECT_TARGET', targetId: 'slime-1' });
    session.dispatch({ type: 'CONFIRM_ACTION' });
    expect(player.inventory!.arrow).toBe(2);
    expect(player.weapon!.durability).toBe(40);
  });
  it('previews ammunition and displaced secondary-hand equipment without mutation', () => {
    const hero = archer(2, false);
    addItem(hero, 'iron-blade', 1, content);
    const before = structuredClone(hero);
    expect(() => previewEquipment(hero, { itemId: 'potion' }, content)).toThrow();
    expect(() =>
      previewEquipment({ ...hero, equipment: {} }, { itemId: 'arrow' }, content),
    ).toThrow();
    expect(previewEquipment(hero, { itemId: 'arrow' }, content).after.combatant.maxDamage).toBe(39);
    hero.equipment.secondaryHand = 'arrow';
    expect(
      previewEquipment(hero, { weaponId: 'weapon-2' }, content).after.combatant.maxDamage,
    ).toBeGreaterThan(26);
    expect(previewEquipment(hero, { slot: 'weapon' }, content).after.combatant.maxDamage).toBe(26);
    delete hero.equipment.secondaryHand;
    expect(hero).toEqual(before);
  });
});
