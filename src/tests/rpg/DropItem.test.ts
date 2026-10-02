import { afterEach, describe, expect, it } from 'vitest';
import { loadGameContent } from '../../data/content';
import { validateCommand, type GameCommand } from '../../engine/commands';
import { addItem, createHero, dropOwnedItem, validateHero } from '../../engine/rpg/Character';
import { acceptQuest, questReady, reconcileQuests } from '../../engine/rpg/Quests';
import { insertSkillPage } from '../../engine/rpg/Skills';
import { JourneySession } from '../../game/JourneySession';
import { encodeSave, parseSave } from '../../persistence/SaveSchema';

const content = loadGameContent(), sessions: JourneySession[] = [];
function setup() { const session = new JourneySession(content); sessions.push(session); return session; }
afterEach(() => sessions.splice(0).forEach((s) => s.dispose()));

describe('inventory drops', () => {
  it('drops the exact stack quantity with no resources, rewards, tick or random draw, and survives reload', () => {
    const initial = setup(), saved = initial.toSave();
    Object.assign(saved.hero, { health: 20, mana: 3, stamina: 5, fullness: 60, itemHotbar: ['potion'] });
    const journey = new JourneySession(content, saved); sessions.push(journey);
    journey.dispatch({ type: 'DROP_ITEM', item: { itemId: 'potion' }, quantity: 1 });
    const expected = structuredClone(saved); expected.hero.inventory.potion--;
    expect(journey.toSave()).toEqual(expected);
    expect(parseSave(JSON.parse(encodeSave(expected, content)), content).campaign).toEqual(expected);
    journey.dispatch({ type: 'DROP_ITEM', item: { itemId: 'potion' }, quantity: 1 });
    delete expected.hero.inventory.potion;
    expect(journey.toSave()).toEqual(expected); expect(expected.hero.itemHotbar).toEqual(['potion']);
    const twin = new JourneySession(content, saved); sessions.push(twin);
    twin.dispatch({ type: 'DROP_ITEM', item: { itemId: 'potion' }, quantity: 2 }); expect(twin.toSave()).toEqual(expected);
  });
  it('rejects malformed, excessive, missing, locked and equipped drops without changing the pack', () => {
    const hero = createHero(content); addItem(hero, 'iron-blade', 2, content); addItem(hero, 'moss-mail', 2, content);
    hero.equipment.weapon = 'weapon-1'; hero.armors['armor-1'].locked = true;
    const before = structuredClone(hero);
    for (const [item, quantity] of [[{ itemId: 'potion' }, 3], [{ itemId: 'missing' }, 1], [{ weaponId: 'weapon-1' }, 1], [{ armorId: 'armor-1' }, 1], [{ weaponId: 'weapon-99' }, 1], [{ itemId: 'potion' }, 0], [{ itemId: 'potion' }, 1.5]] as const) {
      expect(() => dropOwnedItem(hero, item, quantity, content)).toThrow(); expect(hero).toEqual(before);
    }
    for (const command of [{ type: 'DROP_ITEM', item: {}, quantity: 1 }, { type: 'DROP_ITEM', item: { itemId: 'potion', weaponId: 'weapon-1' }, quantity: 1 }, { type: 'DROP_ITEM', item: { itemId: 'potion' }, quantity: 1000 }]) expect(() => validateCommand(command as GameCommand)).toThrow('Invalid');
    hero.weapons['weapon-2'].durability = 7;
    dropOwnedItem(hero, { weaponId: 'weapon-2' }, 1, content); dropOwnedItem(hero, { armorId: 'armor-2' }, 1, content);
    expect(hero.weapons['weapon-1']).toEqual(before.weapons['weapon-1']); expect(hero.armors['armor-1']).toEqual(before.armors['armor-1']);
    expect(hero.weapons['weapon-2']).toBeUndefined(); expect(hero.armors['armor-2']).toBeUndefined(); expect(hero.nextWeaponId).toBe(before.nextWeaponId);
    expect(validateHero(hero, content)).toEqual(hero);
  });
  it('discards the inserted pages belonging to an unfinished manual, leaving unrelated progress intact', () => {
    const recipe = content.data.skillBookRecipes[0]; let hero = createHero(content);
    addItem(hero, recipe.incompleteItemId, 1, content); addItem(hero, recipe.pages[0].itemId, 1, content);
    hero = insertSkillPage(hero, recipe.id, recipe.pages[0].itemId, content);
    const before = structuredClone(hero); dropOwnedItem(hero, { itemId: recipe.incompleteItemId }, 1, content);
    delete before.inventory[recipe.incompleteItemId]; delete before.bookCollections[recipe.id];
    expect(hero).toEqual(before); expect(validateHero(hero, content)).toEqual(hero);
  });
  it('updates held-item quest readiness after dropping and rejects drops in a pending encounter', () => {
    const base = setup(), saved = base.toSave(), quest = content.data.quests[2];
    reconcileQuests(saved.hero, content, quest.offerNpc); saved.hero = acceptQuest(saved.hero, quest, content);
    addItem(saved.hero, 'apple', 2, content); const journey = new JourneySession(content, saved); sessions.push(journey);
    expect(questReady(journey.toSave().hero, quest)).toBe(true);
    journey.dispatch({ type: 'DROP_ITEM', item: { itemId: 'apple' }, quantity: 1 }); expect(questReady(journey.toSave().hero, quest)).toBe(false);
    journey.dispatch({ type: 'TRAVEL_TO', x: 7, y: 3 }); journey.dispatch({ type: 'INTERACT', objectId: 'east' }); journey.dispatch({ type: 'TRAVEL_TO', x: 5, y: 3 });
    const checkpoint = journey.toSave(); expect(() => journey.dispatch({ type: 'DROP_ITEM', item: { itemId: 'potion' }, quantity: 1 })).toThrow('Finish'); expect(journey.toSave()).toEqual(checkpoint);
  });
});
