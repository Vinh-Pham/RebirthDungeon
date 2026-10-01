import { describe, expect, it } from 'vitest';
import { loadGameContent } from '../../data/content';
import { addItem, createHero, heroStats, previewEquipment } from '../../engine/rpg/Character';
import { learnSkill } from '../../engine/rpg/Skills';
import { BattleSession } from '../../game/BattleSession';
import { JourneySession } from '../../game/JourneySession';
import { encodeSave, parseSave } from '../../persistence/SaveSchema';
import { inventoryRows } from '../../ui/journey/inventoryRows';

const content = loadGameContent();

describe('inventory inspection and ownership boundaries', () => {
  it('previews the actual eligible loadout without changing supplies, pools, durability or learned bonuses', () => {
    const hero = learnSkill(createHero(content), 'sword-mastery', content);
    addItem(hero, 'iron-blade', 2, content); addItem(hero, 'moss-mail', 2, content);
    Object.assign(hero, { health: 20, mana: 4, stamina: 9, wounds: 15, fullness: 60 });
    hero.weapons['weapon-2'].durability = 0;
    const before = structuredClone(hero);
    const armed = previewEquipment(hero, { weaponId: 'weapon-1' }, content);
    expect(armed.before.combatant).toMatchObject({ minDamage: 21, maxDamage: 34 });
    expect(armed.after.combatant).toMatchObject({ minDamage: 25, maxDamage: 40 });
    const broken = previewEquipment(hero, { weaponId: 'weapon-2' }, content);
    expect(broken.after).toEqual(broken.before);
    const armored = previewEquipment(hero, { armorId: 'armor-1' }, content);
    expect(armored.after.combatant.defense).toBe(armored.before.combatant.defense + 3);
    expect(hero).toEqual(before);
    hero.equipment.weapon = 'weapon-1';
    expect(previewEquipment(hero, { slot: 'weapon' }, content).after.combatant).toEqual(armed.before.combatant);
    expect(hero.equipment.weapon).toBe('weapon-1');
    for (const reference of [{ weaponId: 'weapon-99' }, { armorId: 'potion' }, { armorId: 'missing' }]) {
      expect(() => previewEquipment(hero, reference, content)).toThrow();
    }
  });

  it('shows battle consumption and wear from a detached snapshot while preserving the campaign entry pack', () => {
    const hero = createHero(content); addItem(hero, 'iron-blade', 2, content); hero.equipment.weapon = 'weapon-1';
    const session = new BattleSession(content, 7, 'chamber', hero);
    try {
      const player = session.engine.getEntity('player')!; player.health!.current = 50;
      session.dispatch({ type: 'SELECT_ACTION', action: 'item', itemId: 'potion' });
      session.dispatch({ type: 'SELECT_TARGET', targetId: 'player' }); session.dispatch({ type: 'CONFIRM_ACTION' });
      const snapshot = session.getSnapshot().inventory!;
      expect(inventoryRows(hero, content, snapshot).find((row) => row.key === 'item:potion')!.quantity).toBe(1);
      expect(hero.inventory.potion).toBe(2);
      snapshot.items.potion = 999; snapshot.weapon!.durability = 0;
      expect(player.inventory!.potion).toBe(1); expect(player.weapon!.durability).toBe(60);
      session.advanceEnemyTurns(); player.combatant!.hitChance = 1; session.engine.getEntity('slime-1')!.combatant!.evasion = 0;
      session.dispatch({ type: 'SELECT_ACTION', action: 'attack' }); session.dispatch({ type: 'SELECT_TARGET', targetId: 'slime-1' }); session.dispatch({ type: 'CONFIRM_ACTION' });
      const rows = inventoryRows(hero, content, session.getSnapshot().inventory);
      expect(rows.find((row) => row.key === 'weapon:weapon-1')!.durability).toBe(59);
      expect(rows.find((row) => row.key === 'weapon:weapon-2')!.durability).toBe(60);
      expect(hero.weapons['weapon-1'].durability).toBe(60);
    } finally { session.dispose(); }
  });

  it('preserves 999 individually owned weapons through reload and rejects a full chest before claiming it', () => {
    const initial = new JourneySession(content); const state = initial.toSave(); initial.dispose();
    addItem(state.hero, 'iron-blade', 999, content); state.hero.equipment.weapon = 'weapon-1'; state.hero.weapons['weapon-1'].durability = 7;
    Object.assign(state.hero, { health: 20, mana: 4, stamina: 9, wounds: 15, fullness: 60 });
    const restored = parseSave(JSON.parse(encodeSave(state, content)), content).campaign;
    expect(restored.hero).toEqual(state.hero); expect(Object.keys(restored.hero.weapons)).toHaveLength(999);
    const session = new JourneySession(content, restored);
    try {
      session.dispatch({ type: 'MOVE', entityId: 'player', dx: 1, dy: 0 });
      const before = session.toSave();
      expect(() => session.dispatch({ type: 'INTERACT', objectId: 'supply-chest' })).toThrow('full');
      expect(session.isClaimed('supply-chest')).toBe(false); expect(session.toSave()).toEqual(before);
      expect(heroStats(session.toSave().hero, content).combatant.maxDamage).toBe(38);
    } finally { session.dispose(); }
  });
});
