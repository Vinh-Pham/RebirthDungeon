import { afterEach, describe, expect, it } from 'vitest';
import { loadGameContent } from '../../data/content';
import { ContentRegistry } from '../../engine/data/ContentRegistry';
import { addItem, heroStats, itemCount } from '../../engine/rpg/Character';
import { shopOffers } from '../../engine/world/Shop';
import { JourneySession } from '../../game/JourneySession';
import { encodeSave, parseSave } from '../../persistence/SaveSchema';

const content = loadGameContent();
const sessions: JourneySession[] = [];
const stock = [
  ['wooden-stick', 'Wooden Stick', 1, 50],
  ['gathering-knife', 'Gathering Knife', 1, 50],
  ['arrow', 'Arrow', 20, 15],
  ['arrow', 'Arrow', 100, 75],
  ['gathering-axe', 'Gathering Axe', 1, 170],
  ['short-bow', 'Short Bow', 1, 400],
  ['wooden-blade', 'Wooden Blade', 1, 500],
  ['wooden-club', 'Wooden Club', 1, 600],
  ['dagger', 'Dagger', 1, 1500],
  ['pickaxe', 'Pickaxe', 1, 750],
  ['short-sword', 'Short Sword', 1, 2000],
  ['round-shield', 'Round Shield', 1, 11600],
] as const;

function smith(gold: number, arrows = 0, armor = false) {
  const initial = new JourneySession(content);
  const state = initial.toSave();
  initial.dispose();
  state.worldId = 'blacksmith-interior';
  const keeper = content.data.worlds
    .find((world) => world.id === state.worldId)!
    .objects.find((object) => object.id === 'blacksmith-keeper')!;
  state.position = { x: keeper.x, y: keeper.y + 1 };
  state.hero.gold = gold;
  if (arrows) addItem(state.hero, 'arrow', arrows, content);
  if (armor) {
    addItem(state.hero, 'moss-mail', 1, content);
    state.hero.equipment.armor = 'armor-1';
  }
  const session = new JourneySession(content, state);
  sessions.push(session);
  session.dispatch({ type: 'INTERACT', objectId: 'blacksmith-keeper' });
  return session;
}
afterEach(() => sessions.splice(0).forEach((session) => session.dispose()));

describe('expanded blacksmith stock', () => {
  it.each(stock)(
    'sells %s (%s): %i units for %i gold and saves the received items',
    (id, name, quantity, price) => {
      const session = smith(price);
      const before = session.toSave();
      const shop = content.data.shops.find((shop) => shop.id === 'blacksmith')!;
      expect(shopOffers(shop, content)).toContainEqual({ itemId: id, quantity, price });
      expect(content.item(id).name).toBe(name);
      session.dispatch({
        type: 'BUY_ITEM',
        objectId: 'blacksmith-keeper',
        itemId: id,
        quantity,
        ...(quantity > 1 ? { bundleSize: quantity } : {}),
      });
      const purchased = session.toSave();
      expect(purchased.hero.gold).toBe(0);
      expect(itemCount(purchased.hero, id)).toBe(quantity);
      expect(purchased.randomState).toEqual(before.randomState);
      expect([
        purchased.hero.health,
        purchased.hero.mana,
        purchased.hero.stamina,
        purchased.hero.fullness,
      ]).toEqual([before.hero.health, before.hero.mana, before.hero.stamina, before.hero.fullness]);
      if (content.item(id).kind === 'weapon')
        expect(Object.values(purchased.hero.weapons)).toEqual([
          { itemId: id, durability: content.item(id).maxDurability },
        ]);
      expect(parseSave(JSON.parse(encodeSave(purchased, content)), content).campaign).toEqual(
        purchased,
      );
    },
  );

  it('combines both arrow bundle sizes into the same saved inventory stack', () => {
    const session = smith(105);
    session.dispatch({
      type: 'BUY_ITEM',
      objectId: 'blacksmith-keeper',
      itemId: 'arrow',
      quantity: 40,
      bundleSize: 20,
    });
    session.dispatch({
      type: 'BUY_ITEM',
      objectId: 'blacksmith-keeper',
      itemId: 'arrow',
      quantity: 100,
      bundleSize: 100,
    });
    expect(session.toSave().hero).toMatchObject({ gold: 0, inventory: { arrow: 140 } });
    expect(content.item('arrow').battleUsable).toBe(false);
    expect(() =>
      session.dispatch({ type: 'SET_ITEM_HOTBAR', itemId: 'arrow', assigned: true }),
    ).toThrow('battle consumables');
  });

  it('rejects partial, forged, unaffordable and overflowing bundles without charges or RNG changes', () => {
    const session = smith(74, 900);
    const before = session.toSave();
    for (const [quantity, bundleSize] of [
      [20, undefined],
      [20, 10],
      [21, 20],
      [100, 100],
      [1000, 100],
      [20, 0],
      [20, 1.5],
    ] as const) {
      expect(() =>
        session.dispatch({
          type: 'BUY_ITEM',
          objectId: 'blacksmith-keeper',
          itemId: 'arrow',
          quantity,
          bundleSize,
        }),
      ).toThrow();
      expect(session.toSave()).toEqual(before);
    }
    const overflow = smith(75, 900);
    const overflowBefore = overflow.toSave();
    expect(() =>
      overflow.dispatch({
        type: 'BUY_ITEM',
        objectId: 'blacksmith-keeper',
        itemId: 'arrow',
        quantity: 100,
        bundleSize: 100,
      }),
    ).toThrow('stack');
    expect(overflow.toSave()).toEqual(overflowBefore);
    const boundary = smith(75, 899);
    boundary.dispatch({
      type: 'BUY_ITEM',
      objectId: 'blacksmith-keeper',
      itemId: 'arrow',
      quantity: 100,
      bundleSize: 100,
    });
    expect(boundary.toSave().hero).toMatchObject({ gold: 0, inventory: { arrow: 999 } });
  });

  it('equips the shield in the supported armor slot and retains the replaced armor copy', () => {
    const session = smith(11600, 0, true);
    session.dispatch({
      type: 'BUY_ITEM',
      objectId: 'blacksmith-keeper',
      itemId: 'round-shield',
      quantity: 1,
    });
    const before = session.toSave();
    session.dispatch({ type: 'EQUIP_ARMOR', armorId: 'armor-2' });
    const equipped = session.toSave();
    expect(equipped.hero.equipment.armor).toBe('armor-2');
    expect(equipped.hero.armors).toEqual(before.hero.armors);
    expect(heroStats(equipped.hero, content).combatant.defense).toBe(
      heroStats(before.hero, content).combatant.defense - 1,
    );
    expect(equipped.hero.health).toBe(before.hero.health);
    expect(content.item('short-bow').weaponTags).not.toContain('melee');
    for (const id of [
      'wooden-stick',
      'gathering-knife',
      'gathering-axe',
      'wooden-blade',
      'wooden-club',
      'dagger',
      'pickaxe',
      'short-sword',
    ])
      expect(content.item(id).weaponTags).toContain('melee');
  });

  it('rejects malformed or unresolved bundle catalogs', () => {
    for (const patch of ['unknown', 'duplicate', 'overlap', 'quantity', 'price']) {
      const raw = structuredClone(content.data);
      const shop = raw.shops.find((shop) => shop.id === 'blacksmith')!;
      if (patch === 'unknown') shop.bundles[0].itemId = 'missing';
      if (patch === 'duplicate') shop.bundles.push({ ...shop.bundles[0] });
      if (patch === 'overlap') shop.items.push('arrow');
      if (patch === 'quantity') shop.bundles[0].quantity = 0;
      if (patch === 'price') shop.bundles[0].price = -1;
      expect(() => new ContentRegistry(raw)).toThrow();
    }
  });
});
