import { describe, expect, it, vi } from 'vitest';
import { loadGameContent } from '../../data/content';
import { SKILL_RANKS } from '../../data/schemas/skillRank';
import { ContentRegistry } from '../../engine/data/ContentRegistry';
import { createGameRandom } from '../../engine/Random';
import { addItem, applyHero, clampHeroResources, createHero, heroStats, itemCount, removeOwnedItem, validateHero, type Hero } from '../../engine/rpg/Character';
import { applicationChance, applyEnchant, burnEquipment, previewBurn, previewEnchant, rollSucceeds } from '../../engine/rpg/Enchants';
import { equipmentEnchantEffects } from '../../engine/rpg/EnchantEffects';
import { EncounterTraining, learnSkill, rankUpSkill, resolveLearnedSkill, trainingPoints } from '../../engine/rpg/Skills';
import { calculateCharacterStats } from '../../engine/rpg/Stats';
import { BattleSession } from '../../game/BattleSession';
import { JourneySession } from '../../game/JourneySession';
import { encodeSave, parseSave } from '../../persistence/SaveSchema';
import { versionSevenHero } from '../persistence/legacyFixture';
import { inventoryRows } from '../../ui/journey/inventoryRows';

const content = loadGameContent();
function prepared(): Hero {
  const hero = learnSkill(createHero(content), 'enchant', content);
  addItem(hero, 'iron-blade', 2, content); addItem(hero, 'moss-mail', 2, content);
  for (const id of ['keen-scroll', 'studious-scroll', 'vigor-scroll', 'resilience-scroll', 'enchant-powder', 'mana-herb', 'holy-water']) addItem(hero, id, 30, content);
  hero.equipment = { weapon: 'weapon-1', armor: 'armor-1' }; return hero;
}
function request(hero: Hero, scrollId = 'keen-scroll', target = { weaponId: 'weapon-1' }) { return { target, scrollId, powderId: 'enchant-powder', revision: 1, operationId: `enchant-${hero.enchanting.nextOperationId}` }; }
function seedFor(hero: Hero, predicate: (random: ReturnType<typeof createGameRandom>) => boolean) {
  for (let seed = 0; seed < 10000; seed++) if (predicate(createGameRandom(seed))) {
    hero.enchanting.seed = seed; hero.enchanting.state = createGameRandom(seed).snapshot(); return;
  }
  throw new Error('No matching test seed');
}
function successSeed(hero: Hero, scrollId = 'keen-scroll') {
  const chance = previewEnchant(hero, request(hero, scrollId), content).chanceBp;
  seedFor(hero, (r) => r.int(0, 9999) < chance);
}
function installed(hero: Hero) {
  hero.weapons['weapon-1'].prefix = { enchantId: 'keen', values: { edge: 2 } };
  hero.weapons['weapon-1'].suffix = { enchantId: 'resilience', values: { guard: 3, resolve: 2 } }; return hero;
}

describe('enchant definitions and integer chance', () => {
  it('uses strict less-than, fractional INT flooring, clamps and explicit ordinal ranks', () => {
    expect(applicationChance(40.9, 6000, 500, 100, 10)).toBe(6900);
    expect(rollSucceeds(6899, 6900)).toBe(true); expect(rollSucceeds(6900, 6900)).toBe(false);
    expect(applicationChance(-1, 6000, 500, 100, 10)).toBe(6500);
    expect(applicationChance(1500, 6000, 500, 100, 10)).toBe(7500);
    expect(applicationChance(1500, 10000, 1000, 1500, 10)).toBe(9000);
    expect(applicationChance(0, 0, 0, 100, 10)).toBe(0);
    expect(SKILL_RANKS.indexOf('9')).toBeGreaterThan(SKILL_RANKS.indexOf('A'));
    expect(SKILL_RANKS.indexOf('1')).toBeGreaterThan(SKILL_RANKS.indexOf('5'));
  });
  it('publishes a town-only F/E skill with reachable training, one powder and fully validated clauses', () => {
    expect(content.skill('enchant')).toMatchObject({ kind: 'life', battleUsable: false });
    expect(createHero(content).learnedSkills.enchant).toBeUndefined();
    const hero = prepared(); expect(hero.learnedSkills.enchant).toEqual({ rank: 'F', objectiveCounts: {} });
    expect(() => resolveLearnedSkill(content, hero.learnedSkills, 'enchant')).toThrow('battle');
    expect(Object.keys(content.data.enchantingRules!.powderBonusBp)).toHaveLength(1);
    for (const mutate of [
      (r: typeof content.data) => { r.enchants[0].clauses[0].max = 1; },
      (r: typeof content.data) => { r.enchants[0].clauses.push(r.enchants[0].clauses[0]); },
      (r: typeof content.data) => { r.enchants[0].rank = 'D'; },
      (r: typeof content.data) => { r.enchantingRules!.recipes.F!.burnChanceBp = 10001; },
      (r: typeof content.data) => { delete r.enchantingRules!.baseChanceBp.E; },
      (r: typeof content.data) => { delete r.enchantingRules!.recipes.F; },
      (r: typeof content.data) => { r.enchantingRules!.holyWaterId = 'potion'; },
      (r: typeof content.data) => { r.items.find((i) => i.enchantId)!.enchantId = 'missing'; },
    ]) { const raw = structuredClone(content.data); mutate(raw); expect(() => new ContentRegistry(raw)).toThrow(); }
  });
  it('permits E scrolls at learned F and requires all weapon tags', () => {
    const hero = prepared(); expect(previewEnchant(hero, request(hero, 'studious-scroll'), content).enchant.rank).toBe('E');
    const raw = structuredClone(content.data); raw.items.push({ ...content.item('iron-blade'), id: 'staff', name: 'Staff', weaponTags: [] });
    const registry = new ContentRegistry(raw); addItem(hero, 'staff', 1, registry);
    expect(() => previewEnchant(hero, request(hero, 'keen-scroll', { weaponId: 'weapon-3' }), registry)).toThrow('incompatible');
    expect(previewEnchant(hero, request(hero, 'studious-scroll', { weaponId: 'weapon-3' }), registry).enchant.id).toBe('studious');
  });
});

describe('atomic protected application and fixed saved values', () => {
  it('previews without RNG/resources/training and rejects locks, missing materials, MP, ownership or incompatible targets', () => {
    const hero = prepared(), before = structuredClone(hero); previewEnchant(hero, request(hero), content); expect(hero).toEqual(before);
    for (const mutate of [
      (h: Hero) => { h.weapons['weapon-1'].locked = true; },
      (h: Hero) => { delete h.learnedSkills.enchant; },
      (h: Hero) => { delete h.inventory['keen-scroll']; },
      (h: Hero) => { delete h.inventory['enchant-powder']; },
      (h: Hero) => { h.mana = 5; },
      (h: Hero) => { delete h.weapons['weapon-1']; },
      (h: Hero) => { h.weapons['weapon-1'].itemId = 'moss-mail'; },
    ]) { const copy = structuredClone(hero); mutate(copy); const rejected = structuredClone(copy); expect(() => applyEnchant(copy, request(copy), content)).toThrow(); expect(copy).toEqual(rejected); }
    expect(() => applyEnchant(hero, { ...request(hero), powderId: 'potion' }, content)).toThrow(); expect(hero).toEqual(before);
  });
  it('replaces only the chosen slot, preserves durability, consumes costs and awards one capped success', () => {
    const hero = installed(prepared()); hero.weapons['weapon-1'].durability = 11; hero.health = 17; hero.stamina = 113; successSeed(hero, 'studious-scroll');
    const before = structuredClone(hero), rng = createGameRandom(hero.enchanting.seed); rng.int(0, 9999);
    const result = applyEnchant(hero, request(hero, 'studious-scroll'), content); const next = result.hero;
    expect(hero).toEqual(before); expect(result.receipt.success).toBe(true);
    expect(next.weapons['weapon-1']).toEqual({ ...before.weapons['weapon-1'], prefix: { enchantId: 'studious', values: { spell: 3, cost: -2 } } });
    expect(next).toMatchObject({ mana: before.mana - 6, health: 17, stamina: 111, ap: 0, gold: 0, experience: 0, learnedSkills: { enchant: { objectiveCounts: { success: 1 } } } });
    expect(next.inventory['studious-scroll']).toBe(29); expect(next.inventory['enchant-powder']).toBe(29); expect(next.enchanting.state).toEqual(rng.snapshot());
    expect(heroStats(next, content).combatant.magicAttack).toBe(heroStats(before, content).combatant.magicAttack);
    expect(validateHero(next, content)).toEqual(next);
  });
  it('consumes the whole recipe on failure while preserving both installed slots, wear and base gear', () => {
    const hero = installed(prepared()); const chance = previewEnchant(hero, request(hero), content).chanceBp; seedFor(hero, (r) => r.int(0, 9999) >= chance);
    const result = applyEnchant(hero, request(hero), content);
    expect(result.receipt).toMatchObject({ success: false }); expect(result.receipt.message).toContain('preserved');
    expect(result.hero.weapons).toEqual(hero.weapons); expect(result.hero.inventory['keen-scroll']).toBe(29); expect(result.hero.inventory['enchant-powder']).toBe(29); expect(result.hero.mana).toBe(hero.mana - 6);
    expect(result.hero.learnedSkills.enchant.objectiveCounts).toEqual({ failure: 1 });
  });
  it('rolls variable clauses even when inactive, in stable order, saves them and never rerolls on eligibility/equipping/loading', () => {
    const hero = prepared(); successSeed(hero, 'resilience-scroll'); const rng = createGameRandom(hero.enchanting.seed); rng.int(0, 9999);
    const expected = { guard: rng.int(1, 3), resolve: rng.int(1, 2) };
    const result = applyEnchant(hero, request(hero, 'resilience-scroll'), content).hero;
    expect(result.weapons['weapon-1'].suffix!.values).toEqual(expected); expect(result.enchanting.state).toEqual(rng.snapshot());
    const beforeDefense = heroStats(result, content).combatant.defense; result.level = 2;
    expect(heroStats(result, content).combatant.defense).toBe(beforeDefense + expected.guard);
    const campaign = new JourneySession(content); const state = campaign.toSave(); campaign.dispose(); state.hero = result;
    const restored = parseSave(JSON.parse(encodeSave(state, content)), content).campaign.hero;
    expect(restored).toEqual(result); const session = new JourneySession(content, { ...state, hero: restored });
    try { session.dispatch({ type: 'UNEQUIP_ITEM', slot: 'weapon' }); session.dispatch({ type: 'EQUIP_WEAPON', weaponId: 'weapon-1' }); expect(session.toSave().hero.weapons).toEqual(restored.weapons); expect(session.toSave().hero.enchanting.state).toEqual(restored.enchanting.state); } finally { session.dispose(); }
  });
  it('reapplying explicitly can roll lower values and recovers no overwritten scroll', () => {
    const hero = installed(prepared()); successSeed(hero, 'resilience-scroll');
    seedFor(hero, (r) => r.int(0, 9999) < previewEnchant(hero, request(hero, 'resilience-scroll'), content).chanceBp && r.int(1, 3) === 1);
    const preview = previewEnchant(hero, request(hero, 'resilience-scroll'), content); expect(preview.overwritten!.values).toEqual({ guard: 3, resolve: 2 });
    const next = applyEnchant(hero, request(hero, 'resilience-scroll'), content).hero;
    expect(next.weapons['weapon-1'].suffix!.values.guard).toBe(1); expect(next.weapons['weapon-1'].prefix).toEqual(hero.weapons['weapon-1'].prefix); expect(next.inventory['resilience-scroll']).toBe(29);
  });
  it('increases maxima without refill and clamps wound-limited HP when enchanted armor is removed', () => {
    const hero = prepared(); hero.health = 100; hero.wounds = 10;
    const selection = { ...request(hero, 'vigor-scroll'), target: { armorId: 'armor-1' } };
    const chance = previewEnchant(hero, selection, content).chanceBp; seedFor(hero, (r) => r.int(0, 9999) < chance);
    const next = applyEnchant(hero, selection, content).hero; expect(heroStats(next, content).maxHealth).toBe(123); expect(next.health).toBe(100);
    next.health = 113; delete next.equipment.armor; clampHeroResources(next, content); expect(next.health).toBe(108); expect(next.wounds).toBe(10);
    expect(next.armors['armor-1'].suffix).toEqual({ enchantId: 'vigor', values: { health: 5 } });
  });
  it('attributes each source once and keeps conditional benefits distinct from unconditional penalties', () => {
    const hero = prepared(); hero.weapons['weapon-1'].prefix = { enchantId: 'studious', values: { spell: 3, cost: -2 } };
    const before = heroStats(hero, content); expect(before.maxStamina).toBe(111);
    hero.learnedSkills.icebolt.rank = 'E'; const after = heroStats(hero, content); expect(after.combatant.magicAttack).toBe(before.combatant.magicAttack! + 3); expect(after.maxStamina).toBe(111);
    const entity = { id: 'player' }; applyHero(entity, hero, content); const source = (entity as { statSource?: Parameters<typeof calculateCharacterStats>[0] }).statSource!;
    expect(calculateCharacterStats({ ...source, enchantments: [...source.enchantments!, ...source.enchantments!] }, content)).toEqual(calculateCharacterStats(source, content));
    const talent = content.data.enchants[3].clauses[0];
    expect(equipmentEnchantEffects('weapon-1', hero.weapons['weapon-1'], hero, content)[0].active).toBe(true); expect(talent.conditions[0]).toMatchObject({ kind: 'level' });
  });
  it('bounds receipts to 100 and rejects evicted operation IDs without replaying their costs or rolls', () => {
    let hero = prepared(); hero.inventory['keen-scroll'] = 150; hero.inventory['enchant-powder'] = 150;
    for (let i = 0; i < 105; i++) { hero.mana = 98; hero = applyEnchant(hero, request(hero), content).hero; }
    expect(hero.enchanting.receipts).toHaveLength(100); expect(hero.enchanting.nextOperationId).toBe(106);
    expect(hero.enchanting.receipts[0].id).toBe('enchant-6'); expect(hero.inventory['keen-scroll']).toBe(45);
    const before = structuredClone(hero); expect(() => applyEnchant(hero, { ...request(hero), operationId: 'enchant-1' }, content)).toThrow('expired'); expect(hero).toEqual(before); expect(validateHero(hero, content)).toEqual(hero);
  });
  it('never retrains or recharges a recorded operation, including after saving', () => {
    const hero = prepared(), command = request(hero); const accepted = applyEnchant(hero, command, content);
    expect(applyEnchant(accepted.hero, command, content).hero).toEqual(accepted.hero);
    expect(() => applyEnchant(accepted.hero, { ...command, operationId: 'enchant-99' }, content)).toThrow('expired');
    expect(() => burnEquipment(accepted.hero, command, content)).toThrow('another action');
  });
});

describe('destructive burning with reserved output capacity', () => {
  it.each([0, 1, 2])('returns %i scrolls independently in prefix/suffix order, spends the sacrifice once and trains one burn', (outputs) => {
    const hero = installed(prepared()); seedFor(hero, (r) => [r.int(0, 9999), r.int(0, 9999)].filter((n) => n < 5000).length === outputs);
    const rng = createGameRandom(hero.enchanting.seed), expected = ['keen-scroll', 'resilience-scroll'].filter(() => rng.int(0, 9999) < 5000);
    const command = { ...request(hero), target: { weaponId: 'weapon-1' } }, before = structuredClone(hero), preview = previewBurn(hero, command.target, content);
    expect(preview.outputs.map((o) => o.slot)).toEqual(['prefix', 'suffix']); expect(hero).toEqual(before);
    const result = burnEquipment(hero, command, content), next = result.hero;
    expect(result.receipt.recovered).toEqual(expected); expect(next.weapons['weapon-1']).toBeUndefined(); expect(next.equipment.weapon).toBeUndefined(); expect(next.weapons['weapon-2']).toEqual(hero.weapons['weapon-2']);
    expect(next.inventory['mana-herb']).toBe(29); expect(next.inventory['holy-water']).toBe(29); expect(next.mana).toBe(hero.mana - 8); expect(next.enchanting.state).toEqual(rng.snapshot());
    expect(next.learnedSkills.enchant.objectiveCounts).toEqual({ burn: 1, ...(outputs ? { recover: outputs } : {}) });
    expect(next.ap).toBe(0); expect(next.gold).toBe(0); expect(next.experience).toBe(0); expect(hero).toEqual(before);
    expect(burnEquipment(next, command, content).hero).toEqual(next); expect(validateHero(next, content)).toEqual(next);
  });
  it('draws only for occupied slots and recovers the definition without installed values', () => {
    const hero = prepared(); hero.armors['armor-1'].suffix = { enchantId: 'vigor', values: { health: 5 } };
    seedFor(hero, (r) => r.int(0, 9999) < 5000); const random = createGameRandom(hero.enchanting.seed); random.int(0, 9999);
    const next = burnEquipment(hero, { ...request(hero), target: { armorId: 'armor-1' } }, content).hero;
    expect(next.enchanting.state).toEqual(random.snapshot()); expect(next.inventory['vigor-scroll']).toBe(31); expect(next.equipment.armor).toBeUndefined();
  });
  it('rejects worst-case output overflow before destroying gear, consuming inputs, training or RNG', () => {
    const hero = installed(prepared()); hero.inventory['resilience-scroll'] = 999; const before = structuredClone(hero);
    expect(() => burnEquipment(hero, request(hero), content)).toThrow('room'); expect(hero).toEqual(before);
    for (const mutate of [(h: Hero) => { h.weapons['weapon-1'].locked = true; }, (h: Hero) => { h.mana = 7; }, (h: Hero) => { delete h.inventory['mana-herb']; }, (h: Hero) => { delete h.inventory['holy-water']; }]) {
      const copy = installed(prepared()); mutate(copy); const saved = structuredClone(copy); expect(() => burnEquipment(copy, request(copy), content)).toThrow(); expect(copy).toEqual(saved);
    }
    expect(() => previewBurn(prepared(), { weaponId: 'weapon-1' }, content)).toThrow('at least one');
  });
  it('uses skill rank recovery only, has capped training and resets training with authored AP advancement', () => {
    const hero = installed(prepared()); hero.learnedSkills.enchant.objectiveCounts = { failure: 20, burn: 20, recover: 20 };
    expect(trainingPoints(content.skill('enchant'), hero.learnedSkills.enchant)).toBe(300); expect(() => rankUpSkill(hero, 'enchant', content)).toThrow('AP');
    hero.ap = 2; const upgraded = rankUpSkill(hero, 'enchant', content); expect(upgraded.learnedSkills.enchant).toEqual({ rank: 'E', objectiveCounts: {} }); expect(upgraded.ap).toBe(0);
    expect(previewBurn(hero, { weaponId: 'weapon-1' }, content).chanceBp).toBe(5000); expect(previewBurn(upgraded, { weaponId: 'weapon-1' }, content).chanceBp).toBe(6500);
    const next = burnEquipment(hero, request(hero), content).hero; expect(next.learnedSkills.enchant.objectiveCounts.burn).toBe(20); expect(next.learnedSkills.enchant.objectiveCounts.recover).toBe(20);
  });
});

describe('unique armor migration, locks and encounter snapshots', () => {
  it('migrates v7 armor losslessly, preserves depleted resources, AP, ranks, weapon wear and generation RNG', () => {
    const journey = new JourneySession(content, undefined, 345); const state = journey.toSave(); journey.dispose();
    addItem(state.hero, 'moss-mail', 999, content); addItem(state.hero, 'iron-blade', 2, content); state.hero.equipment = { armor: 'armor-42', weapon: 'weapon-2' }; state.hero.weapons['weapon-2'].durability = 13;
    Object.assign(state.hero, { health: 14, mana: 3, stamina: 7, wounds: 16, fullness: 60, ap: 23 });
    const old = versionSevenHero(state.hero), migrated = parseSave({ version: 7, savedAt: new Date().toISOString(), campaign: { ...state, hero: old } }, content).campaign;
    expect(migrated.hero).toMatchObject({ health: 14, mana: 3, stamina: 7, wounds: 16, fullness: 60, ap: 23, nextArmorId: 1000, equipment: { armor: 'armor-1', weapon: 'weapon-2' } });
    expect(itemCount(migrated.hero, 'moss-mail')).toBe(999); expect(migrated.hero.inventory['moss-mail']).toBeUndefined(); expect(migrated.hero.weapons).toEqual(state.hero.weapons); expect(migrated.hero.learnedSkills).toEqual(state.hero.learnedSkills);
    expect(migrated.randomState).toEqual(state.randomState); expect(migrated.hero.learnedSkills.enchant).toBeUndefined();
    expect(parseSave(JSON.parse(encodeSave(migrated, content)), content).campaign).toEqual(migrated);
    const rows = inventoryRows(migrated.hero, content).filter((r) => r.item.kind === 'armor'); expect(rows).toHaveLength(999); expect(rows.filter((r) => r.equipped)).toHaveLength(1);
    expect(() => addItem(migrated.hero, 'moss-mail', 1, content)).toThrow('full');
  });
  it('keeps equipped/locked instances protected from sale, offerings and bulk quest delivery while retaining equipped bonuses', () => {
    const hero = installed(prepared()); hero.armors['armor-2'].locked = true; hero.weapons['weapon-2'].locked = true;
    for (const target of [{ armorId: 'armor-1' }, { armorId: 'armor-2' }, { weaponId: 'weapon-1' }, { weaponId: 'weapon-2' }, { itemId: 'moss-mail' }]) expect(() => removeOwnedItem(hero, target, 1)).toThrow('unlocked');
    hero.weapons['weapon-1'].locked = true; expect(heroStats(hero, content).combatant.attack).toBe(40);
  });
  it('captures eligible enchant facts at encounter entry and separates training/RNG from battle actions', () => {
    const hero = prepared(); hero.weapons['weapon-1'].prefix = { enchantId: 'studious', values: { spell: 3, cost: -2 } }; hero.stamina = 111;
    const battle = new BattleSession(content, 9, 'chamber', hero);
    try {
      const before = battle.getSnapshot().character!.stats; hero.learnedSkills.icebolt.rank = 'E';
      expect(battle.getSnapshot().character!.stats).toEqual(before); expect(heroStats(hero, content).combatant.magicAttack).toBe(before.combatant.magicAttack! + 3);
      const training = new EncounterTraining('test', hero.learnedSkills, content, true); training.record({ encounterId: 'test', actionId: 1, sourceId: 'player', skillId: 'enchant', rank: 'F', action: 'skill', tags: [], origin: 'direct', targets: [{ targetId: 'slime', hostile: true, hit: true, critical: false, damage: 4, healing: 0, defeated: true }] });
      expect(training.snapshot().enchant).toBeUndefined();
      const player = battle.engine.getEntity('player')!, stream = structuredClone(hero.enchanting);
      expect(() => battle.dispatch({ type: 'SELECT_ACTION', action: 'skill', skillId: 'enchant' })).toThrow('battle'); expect(hero.enchanting).toEqual(stream); expect(player.mana!.current).toBe(hero.mana);
    } finally { battle.dispose(); }
  });
  it.each(['victory', 'defeat'] as const)('retains installed values and item locks through %s while committing the same weapon wear', (result) => {
    const initial = new JourneySession(content), state = initial.toSave(); initial.dispose(); state.hero = installed(prepared()); state.hero.weapons['weapon-1'].locked = true;
    const journey = new JourneySession(content, state);
    try {
      journey.dispatch({ type: 'TRAVEL_TO', x: 7, y: 3 }); journey.dispatch({ type: 'INTERACT', objectId: 'east' }); journey.dispatch({ type: 'TRAVEL_TO', x: 5, y: 3 });
      const battle = journey.createBattle();
      try {
        vi.spyOn(battle.engine.random, 'chance').mockReturnValue(true);
        const player = battle.engine.getEntity('player')!, enemy = battle.engine.getEntity('slime-1')!;
        if (result === 'victory') enemy.health!.current = 1;
        else { player.health!.current = 1; Object.assign(enemy.combatant!, { attack: 1000, minDamage: 1000, maxDamage: 1000 }); }
        battle.dispatch({ type: 'SELECT_ACTION', action: 'attack' }); battle.dispatch({ type: 'SELECT_TARGET', targetId: 'slime-1' }); battle.dispatch({ type: 'CONFIRM_ACTION' });
        if (result === 'defeat') battle.advanceEnemyTurns(); expect(battle.combat.result).toBe(result);
        const worn = player.weapon!.durability; journey.finishBattle(battle);
        expect(journey.toSave().hero.weapons['weapon-1']).toEqual({ ...state.hero.weapons['weapon-1'], durability: worn }); expect(journey.toSave().hero.armors).toEqual(state.hero.armors); expect(journey.toSave().hero.enchanting).toEqual(state.hero.enchanting);
      } finally { battle.dispose(); }
    } finally { journey.dispose(); vi.restoreAllMocks(); }
  });
  it('keeps installed values, locks and the enchant stream through an early dungeon return', () => {
    const initial = new JourneySession(content), state = initial.toSave(); initial.dispose(); state.hero = installed(prepared()); state.hero.armors['armor-1'].suffix = { enchantId: 'vigor', values: { health: 5 } };
    const journey = new JourneySession(content, state);
    try { const altar = journey.map.objects.find((o) => o.id === 'dungeon-entrance')!; journey.dispatch({ type: 'TRAVEL_TO', x: altar.x, y: altar.y + 1 }); journey.dispatch({ type: 'INTERACT', objectId: altar.id }); journey.dispatch({ type: 'OFFER_ITEM', objectId: altar.id, item: { itemId: 'potion' } });
      const entered = journey.toSave(); journey.dispatch({ type: 'INTERACT', objectId: 'goddess-statue' });
      expect(journey.toSave().hero).toEqual(entered.hero); expect(journey.toSave().hero.enchanting).toEqual(state.hero.enchanting);
    } finally { journey.dispose(); }
  });
  it('rejects corrupt installed values, slots, compatibility, RNG and receipt IDs on load', () => {
    for (const mutate of [
      (h: Hero) => { h.weapons['weapon-1'].prefix!.values.edge = 3; },
      (h: Hero) => { h.weapons['weapon-1'].prefix!.values.unexpected = 2; },
      (h: Hero) => { h.weapons['weapon-1'].prefix!.enchantId = 'vigor'; },
      (h: Hero) => { h.enchanting.state = [0, 0, 0, 0]; },
      (h: Hero) => { h.nextArmorId = 1; },
      (h: Hero) => { h.enchanting.receipts = [{ id: 'enchant-1', kind: 'apply', success: true, message: 'accepted', recovered: [] }]; },
    ]) { const hero = installed(prepared()); mutate(hero); expect(() => validateHero(hero, content)).toThrow(); }
  });
});
