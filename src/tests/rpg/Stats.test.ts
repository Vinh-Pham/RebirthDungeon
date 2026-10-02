import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadGameContent } from '../../data/content';
import { ContentRegistry } from '../../engine/data/ContentRegistry';
import { addItem, applyHero, createHero, heroStats, restoreHero, validateHero } from '../../engine/rpg/Character';
import { calculateCharacterStats, protectionReduction, TALENTS } from '../../engine/rpg/Stats';
import { resourceTick, staminaCost } from '../../engine/rpg/Resources';
import { tickStatuses } from '../../engine/rpg/StatusEffects';
import { createGameRandom } from '../../engine/Random';
import { resolveAttack, sampleDamage } from '../../engine/battle/AttackResolver';
import { prepareSkill } from '../../engine/battle/SkillResolver';
import { BattleSession } from '../../game/BattleSession';
import { JourneySession } from '../../game/JourneySession';
import { encodeSave, parseSave } from '../../persistence/SaveSchema';
import { versionSevenHero, legacyCampaign } from '../persistence/legacyFixture';
import type { Entity } from '../../engine/ecs/Entity';

const content = loadGameContent(); const battles: BattleSession[] = []; const journeys: JourneySession[] = [];
function battle(seed = 17) { const session = new BattleSession(content, seed); battles.push(session); return session; }
function act(session: BattleSession, action: 'attack' | 'skill' | 'rest', targetId: string, id?: string) {
  session.dispatch({ type: 'SELECT_ACTION', action, skillId: action === 'skill' ? id : undefined });
  session.dispatch({ type: 'SELECT_TARGET', targetId }); session.dispatch({ type: 'CONFIRM_ACTION' });
}
afterEach(() => { battles.splice(0).forEach((session) => session.dispose()); journeys.splice(0).forEach((session) => session.dispose()); vi.useRealTimers(); });

describe('Mabinogi stat projection', () => {
  it.each(TALENTS)('applies %s allocation, known skill bonuses, and fractional level growth', (talent) => {
    const hero = createHero(content, talent); const stats = heroStats(hero, content);
    const key = talent === 'warrior' ? 'strength' : talent === 'mage' ? 'intelligence' : 'dexterity';
    expect(stats.base).toEqual({ strength: talent === 'warrior' ? 75 : 55, intelligence: talent === 'mage' ? 62 : 52, dexterity: talent === 'archery' ? 68 : 58, will: 57, luck: 47 });
    expect([hero.health, hero.mana, hero.stamina]).toEqual([talent === 'archery' ? 123 : 118, talent === 'mage' ? 108 : 98, talent === 'archery' ? 118 : 113]);
    hero.level = 2; hero.cumulativeLevel = 2; expect(heroStats(hero, content).base[key]).toBe(stats.base[key] + .5);
    hero.level = 200; hero.cumulativeLevel = 200; expect(heroStats(hero, content).base[key]).toBe(stats.base[key] + 99.5);
    expect(content.skill('combat-mastery').statBonuses).toBeUndefined();
  });
  it('uses first-ten attribute exclusions, inverse dexterity balance, equipment and caps', () => {
    const hero = createHero(content); const bare = heroStats(hero, content);
    expect(bare.combatant).toMatchObject({ minDamage: 21, maxDamage: 34, defense: 6, magicDefense: 4, magicAttack: 8, magicProtection: 2, armorPierce: 3 });
    expect(bare.combatant.magicBalance).toBeCloseTo(.405); expect(bare.combatant.criticalRating).toBeCloseTo(.221);
    expect(bare.combatant.balance).toBeCloseTo(.3 + 8.728944 * Math.log2((48 + 9.814582) / 20.34565) / 100);
    addItem(hero, 'iron-blade', 1, content); addItem(hero, 'moss-mail', 1, content); hero.equipment = { weapon: 'weapon-1', armor: 'armor-1' };
    expect(heroStats(hero, content).combatant).toMatchObject({ minDamage: 25, maxDamage: 38, defense: 9, protection: 2 });
    hero.weapons['weapon-1'].durability = 0; expect(heroStats(hero, content).combatant.maxDamage).toBe(34);
    const raw = structuredClone(content.data); raw.items.find((item) => item.id === 'moss-mail')!.statBonuses = { strength: 1500, intelligence: 1500, dexterity: 1500 };
    const capped = heroStats(hero, new ContentRegistry(raw)); expect(capped.effective.strength).toBe(1500); expect(capped.combatant.balance).toBe(.8); expect(capped.combatant.magicBalance).toBe(1); expect(capped.combatant.criticalChance).toBeLessThanOrEqual(.3);
    expect(protectionReduction(0)).toBe(0); expect(protectionReduction(50)).toBeCloseTo(.4646, 3); expect(protectionReduction(100000)).toBe(.9);
  });
  it('aggregates effect bonuses before clamping, regardless of effect order', () => {
    const raw = structuredClone(content.data); raw.statusEffects.find((s) => s.id === 'weakness')!.modifier = -1000; const registry = new ContentRegistry(raw);
    const hero = createHero(content); const source = { classId: hero.classId, learnedSkills: hero.learnedSkills, level: 1, growthTalent: hero.growthTalent, effects: [{ statusId: 'focus', stacks: 1 }, { statusId: 'weakness', stacks: 1 }] };
    expect(calculateCharacterStats(source, registry)).toEqual(calculateCharacterStats({ ...source, effects: [...source.effects].reverse() }, registry));
    expect(calculateCharacterStats(source, registry).combatant).toMatchObject({ attack: 0, minDamage: 0, maxDamage: 0 });
  });
  it('identifies attribute contributions once at the current learned rank and rejects mismatched equipment sources', () => {
    const hero = createHero(content, 'mage'); hero.level = 2; hero.cumulativeLevel = 2;
    const raw = structuredClone(content.data);
    const firebolt = raw.skills.find((s) => s.id === 'firebolt')!;
    firebolt.gameRanks!.E = { ...firebolt.gameRanks!.F!, statBonuses: { intelligence: 7 } };
    const registry = new ContentRegistry(raw); hero.learnedSkills.firebolt.rank = 'E';
    const stats = heroStats(hero, registry);
    expect(stats.attributeSources).toMatchObject({ starting: { intelligence: 48 }, talent: { intelligence: 10 }, levels: { intelligence: 0.5 }, skills: { intelligence: 10 } });
    expect(stats.base.intelligence).toBe(68.5);
    expect(heroStats(hero, registry)).toEqual(stats);
    const source = { classId: hero.classId, learnedSkills: hero.learnedSkills, level: hero.level, growthTalent: hero.growthTalent, effects: [] };
    expect(() => calculateCharacterStats({ ...source, weaponItemId: 'potion' }, registry)).toThrow('equipment stat source');
    expect(() => calculateCharacterStats({ ...source, armorItemId: 'iron-blade' }, registry)).toThrow('equipment stat source');
  });
  it('rolls reproducible bounded triangular damage and reduces critical chance with target protection', () => {
    const a = createGameRandom(12), b = createGameRandom(12); const values = Array.from({ length: 100 }, () => sampleDamage(a, 3, 30, .8));
    expect(values).toEqual(Array.from({ length: 100 }, () => sampleDamage(b, 3, 30, .8))); expect(values.every((n) => n >= 3 && n <= 30)).toBe(true);
    const session = battle(); const player = session.engine.getEntity('player')!, enemy = session.engine.getEntity('slime-1')!;
    Object.assign(player.combatant!, { minDamage: 20, maxDamage: 20, criticalRating: .3, hitChance: 1, armorPierce: 0 });
    Object.assign(enemy.combatant!, { defense: 2, protection: 50, evasion: 0 });
    const random = createGameRandom(1); const chance = vi.spyOn(random, 'chance'); resolveAttack({ attacker: player, target: enemy, random }); expect(chance.mock.calls[1][0]).toBe(0);
  });
});

describe('resource and action rules', () => {
  it('limits regeneration by wounds and hunger and gives rest its own stamina recovery', () => {
    const entity: Entity = { id: 'player', player: true }; const hero = createHero(content); applyHero(entity, hero, content);
    entity.health!.current = 80; entity.wounds = 30; entity.mana!.current = 20; entity.stamina!.current = 30; entity.fullness = 50;
    resourceTick(entity, true); expect([entity.health!.current, entity.mana!.current, entity.stamina!.current, entity.fullness]).toEqual([81, 21, 40, 50]);
    entity.health!.current = 88; entity.stamina!.current = 60; resourceTick(entity); expect(entity.health!.current).toBe(88); expect(entity.stamina!.current).toBe(60); expect(staminaCost(entity, 2)).toBe(3);
    entity.stamina!.current = 55; resourceTick(entity, true); expect(entity.stamina!.current).toBe(56);
    entity.dead = true; const before = structuredClone(entity); resourceTick(entity); expect(entity).toEqual(before);
  });
  it('charges stamina on misses, uses bare hands when exhausted, and never wears an exhausted weapon', () => {
    const hero = createHero(content); addItem(hero, 'iron-blade', 1, content); hero.equipment.weapon = 'weapon-1';
    const session = new BattleSession(content, 5, 'chamber', hero); battles.push(session); const player = session.engine.getEntity('player')!, enemy = session.engine.getEntity('slime-1')!;
    player.stamina!.current = 50; player.combatant!.hitChance = 0; act(session, 'attack', enemy.id); expect(player.stamina!.current).toBe(49); expect(player.weapon!.durability).toBe(60);
    session.advanceEnemyTurns(); player.stamina!.current = 0;
    const fresh = heroStats(createHero(content), content).combatant; const random = createGameRandom(1); session.engine.random.restore(random.snapshot());
    const expected = resolveAttack({ attacker: { ...player, combatant: fresh }, target: enemy, random });
    const before = enemy.health!.current; act(session, 'attack', enemy.id); expect(before - enemy.health!.current).toBe(expected.damage); expect(player.weapon!.durability).toBe(60); expect(player.stamina!.current).toBe(1);
  });
  it('rejects insufficient stamina before spending mana, advancing the turn, or rolling', () => {
    const session = battle(); const player = session.engine.getEntity('player')!; player.stamina!.current = 0;
    const random = session.engine.random.snapshot(), mana = player.mana!.current;
    expect(() => prepareSkill({ source: player, targets: [player], skill: content.skill('healing'), random: session.engine.random })).toThrow('stamina');
    expect(session.engine.random.snapshot()).toEqual(random); expect(player.mana!.current).toBe(mana);
    expect(() => act(session, 'skill', 'player', 'healing')).toThrow('stamina'); expect(session.battle.phase).toBe('selectingTarget');
  });
  it('caps healing at the wounded maximum; rest changes live projection without changing selection on reads', () => {
    const session = battle(); const player = session.engine.getEntity('player')!; player.wounds = 40; player.health!.current = 70; player.stamina!.current = 10;
    act(session, 'skill', 'player', 'healing'); expect(player.health!.current).toBe(78); expect(session.getSnapshot().character!.wounds).toBe(40);
    session.advanceEnemyTurns(); session.dispatch({ type: 'SELECT_ACTION', action: 'rest' }); session.dispatch({ type: 'SELECT_TARGET', targetId: 'player' });
    const random = session.engine.random.snapshot(), before = structuredClone(session.getSnapshot()); session.getSnapshot(); session.getSnapshot(); expect(session.getSnapshot()).toEqual(before); expect(session.engine.random.snapshot()).toEqual(random);
    const stamina = player.stamina!.current; session.dispatch({ type: 'CONFIRM_ACTION' }); expect(session.getSnapshot().character!.stamina).toBe(stamina + 10);
  });
  it('applies wounds on physical damage, but not magic or damage over time', () => {
    const session = battle(); const player = session.engine.getEntity('player')!, enemy = session.engine.getEntity('slime-1')!;
    player.combatant!.hitChance = 1; player.combatant!.criticalRating = 0; player.combatant!.minInjury = player.combatant!.maxInjury = .5;
    act(session, 'attack', enemy.id); expect(enemy.wounds).toBeGreaterThan(0); session.advanceEnemyTurns(); const wounds = enemy.wounds;
    act(session, 'skill', enemy.id, 'icebolt'); expect(enemy.wounds).toBe(wounds);
    enemy.statuses = [{ id: 'burn', sourceId: player.id, remainingTurns: 3, stacks: 1 }]; tickStatuses(enemy, 'turnStart', content, []); expect(enemy.wounds).toBe(wounds);
  });
  it('shares a critical roll using selected target protection even when that target misses', () => {
    const session = battle(); const player = session.engine.getEntity('player')!, target = session.engine.getEntity('slime-1')!;
    const other = content.spawn('slime', 'other', 'enemy', 0, 0); target.combatant!.magicProtection = 50; player.combatant!.magicCriticalChance = .3;
    const random = createGameRandom(2); let calls = 0; const chance = vi.spyOn(random, 'chance').mockImplementation((probability) => ++calls === 1 ? false : probability > 0);
    const skill = { ...content.skill('firebolt'), target: 'allEnemies' as const };
    const results = prepareSkill({ source: player, targets: [other, target], selectedTargetId: target.id, skill, random }).resolve();
    expect(results[1].result.hit).toBe(false); expect(results[0].result).toMatchObject({ hit: true, critical: false });
    expect(chance.mock.calls.map(([probability]) => probability)).toEqual([1, 0, 1]);
  });
  it('never ticks on rejected movement, equipment review, service cancellation or item use', () => {
    const base = new JourneySession(content); journeys.push(base); const state = base.toSave(); state.hero.health = 10; state.hero.mana = 10; state.hero.stamina = 10; state.hero.fullness = 60; state.hero.inventory.bread = 1;
    const session = new JourneySession(content, state); journeys.push(session); const before = session.toSave();
    expect(() => session.dispatch({ type: 'MOVE', entityId: 'player', dx: 0, dy: -1 })).toThrow(); expect(session.toSave()).toEqual(before);
    session.dispatch({ type: 'USE_ITEM', sourceId: 'player', targetId: 'player', itemId: 'bread' }); expect(session.toSave().hero).toMatchObject({ health: 18, mana: 10, stamina: 35, fullness: 85 });
    session.dispatch({ type: 'REST', entityId: 'player' }); expect(session.toSave().hero).toMatchObject({ health: 19, mana: 11, stamina: 45, fullness: 84.9 });
  });
});

describe('stat save migration', () => {
  it.each([1, 2, 3, 4])('restores v%i once with the selected talent while preserving progress and RNG', (version) => {
    const journey = new JourneySession(content); journeys.push(journey); const current = journey.toSave(); current.hero.gold = 71; addItem(current.hero, 'iron-blade', 1, content); current.hero.equipment.weapon = 'weapon-1'; current.hero.weapons['weapon-1'].durability = 11;
    let campaign: object = legacyCampaign(current);
    if (version === 4) { const { growthTalent, stamina, wounds, fullness, ap, learnedSkills, discoveredSkills, bookCollections, claimedMilestones, quests, earnedTitles, questFlags, trackedObjectives, ...hero } = versionSevenHero(current.hero); void ap; void learnedSkills; void discoveredSkills; void bookCollections; void claimedMilestones; void quests; void earnedTitles; void questFlags; void trackedObjectives; void growthTalent; void stamina; void wounds; void fullness; hero.health = 10; hero.mana = 2; campaign = { ...current, hero }; }
    if (version === 1) { const { audio, ...rest } = campaign as ReturnType<typeof legacyCampaign>; void audio; campaign = rest; }
    const save = parseSave({ version, savedAt: new Date().toISOString(), campaign }, content, 'mage'); expect(save.version).toBe(11);
    expect(save.campaign.hero).toMatchObject({ growthTalent: 'mage', health: 118, mana: 108, stamina: 113, wounds: 0, fullness: 100, gold: 71 }); expect(save.campaign.randomState).toEqual(current.randomState);
    if (version === 4) expect(save.campaign.hero.weapons['weapon-1'].durability).toBe(11);
    const hero = save.campaign.hero; hero.health = 40; hero.mana = 3; hero.stamina = 15; hero.wounds = 20; hero.fullness = 60;
    expect(parseSave(JSON.parse(encodeSave(save.campaign, content)), content, 'mage').campaign.hero).toEqual(hero);
    expect(() => parseSave(save, content, 'warrior')).toThrow('talent');
  });
  it('rejects malformed resource fields and fully restores wounds and hunger on recovery', () => {
    const hero = createHero(content); hero.health = 1; hero.mana = 0; hero.stamina = 0; hero.wounds = 50; hero.fullness = 50; restoreHero(hero, content);
    expect(hero).toMatchObject({ health: 118, mana: 98, stamina: 113, wounds: 0, fullness: 100 });
    for (const mutate of [(h: typeof hero) => { h.wounds = 118; }, (h: typeof hero) => { h.stamina = 114; }, (h: typeof hero) => { h.fullness = 49; }, (h: typeof hero) => { h.fullness = 60.05; }, (h: typeof hero) => { h.wounds = 10; }]) { const copy = structuredClone(hero); mutate(copy); expect(() => validateHero(copy, content)).toThrow(); }
  });
});

describe('seeded encounter balance', () => {
  it.each(TALENTS)('records %s basic-attack encounter outcomes across 100 seeds without battle consumables', (talent) => {
    vi.useFakeTimers(); const wins = [0, 0];
    for (let scenario = 0; scenario < 2; scenario++) for (let seed = 0; seed < 100; seed++) {
      const hero = createHero(content, talent); const map = structuredClone(content.data.maps[scenario]);
      if (scenario) { hero.level = 5; hero.cumulativeLevel = 5; addItem(hero, 'iron-blade', 1, content); hero.equipment.weapon = 'weapon-1'; addItem(hero, 'moss-mail', 1, content); hero.equipment.armor = 'armor-1'; restoreHero(hero, content); map.spawns.push({ ...content.data.maps[0].spawns[1], entityId: 'slime-2', y: 2 }, { ...content.data.maps[0].spawns[1], entityId: 'slime-3', y: 4 }); }
      const session = new BattleSession(content, seed, map, hero);
      try {
        for (let turn = 0; turn < 200 && !session.combat.result; turn++) {
          if (session.battle.phase === 'enemyTurn') { session.advanceEnemyTurns(); continue; }
          const target = session.engine.world.entities.filter((e) => e.enemy && !e.dead).sort((a, b) => a.health!.current - b.health!.current)[0];
          act(session, 'attack', target.id);
        }
        if (session.combat.result === 'victory') wins[scenario]++;
      } finally { session.dispose(); }
    }
    expect(wins[0]).toBeGreaterThanOrEqual(95);
    // The old equipped-encounter policy used eight potions. Removing battle items
    // deliberately removes that strategy, without changing enemy or attack balance.
    expect(wins[1]).toBe({ warrior: 4, archery: 0, mage: 0 }[talent]);
  });
});
