import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fc from 'fast-check';
import { loadGameContent } from '../../data/content';
import { ContentRegistry } from '../../engine/data/ContentRegistry';
import { JourneySession } from '../../game/JourneySession';
import { addItem, heroStats, itemCount, repairPrice, type Hero } from '../../engine/rpg/Character';
import { distance, findPath, isWalkable } from '../../engine/world/TileMap';
import { encodeSave, parseSave, validateCampaign } from '../../persistence/SaveSchema';
import { legacyCampaign } from '../persistence/legacyFixture';
import * as Dungeon from '../../engine/dungeon/Dungeon';

const content = loadGameContent();
const sessions: JourneySession[] = [];
function create(edit?: (hero: Hero) => void) {
  const base = new JourneySession(content);
  sessions.push(base);
  if (!edit) return base;
  const state = base.toSave();
  edit(state.hero);
  const session = new JourneySession(content, state);
  sessions.push(session);
  return session;
}
function approach(session: JourneySession, id: string) {
  const object = session.map.objects.find((entry) => entry.id === id)!;
  if (distance(session.toSave().position, object) > 1) {
    const choices = [
      [0, -1],
      [-1, 0],
      [1, 0],
      [0, 1],
    ]
      .map(([dx, dy]) => ({ x: object.x + dx, y: object.y + dy }))
      .filter((point) => isWalkable(session.map, point))
      .map((point) => ({ point, path: findPath(session.map, session.toSave().position, point) }))
      .filter((choice) => choice.path.length)
      .sort((a, b) => a.path.length - b.path.length);
    expect(choices.length).toBeGreaterThan(0);
    session.dispatch({ type: 'TRAVEL_TO', ...choices[0].point });
  }
  session.dispatch({ type: 'INTERACT', objectId: id });
}
function visit(session: JourneySession, shop: string) {
  approach(session, `${shop}-door`);
  approach(session, `${shop}-keeper`);
}
function resume(session: JourneySession) {
  const restored = new JourneySession(
    content,
    parseSave(JSON.parse(encodeSave(session.toSave(), content)), content).campaign,
  );
  sessions.push(restored);
  return restored;
}
afterEach(() => {
  sessions.splice(0).forEach((session) => session.dispose());
  vi.restoreAllMocks();
});

describe('town maps and services', () => {
  it('places the Combat School instructor outside its footprint and learns Smash only through an open nearby lesson', () => {
    const session = create();
    const school = session.map.decorations.find((d) => d.sprite.atlas === 'combat-school')!;
    const instructor = session.map.objects.find((o) => o.id === 'combat-instructor')!;
    expect(
      instructor.x < school.x ||
        instructor.x >= school.x + school.size ||
        instructor.y < school.y ||
        instructor.y >= school.y + school.size,
    ).toBe(true);
    expect(
      session.map.objects
        .find((o) => o.id === 'keeper')!
        .lessons.some((l) => l.skillId === 'smash'),
    ).toBe(false);
    const before = session.getSnapshot();
    expect(() =>
      session.dispatch({ type: 'LEARN_SKILL', objectId: instructor.id, skillId: 'smash' }),
    ).toThrow();
    expect(session.getSnapshot()).toBe(before);
    approach(session, instructor.id);
    expect(session.getSnapshot().activeService).toBe(instructor.id);
    session.dispatch({ type: 'LEARN_SKILL', objectId: instructor.id, skillId: 'smash' });
    expect(session.getSnapshot().state.hero.learnedSkills.smash).toEqual({
      rank: 'F',
      objectiveCounts: {},
    });
    const learned = session.getSnapshot();
    expect(() =>
      session.dispatch({ type: 'LEARN_SKILL', objectId: instructor.id, skillId: 'smash' }),
    ).toThrow('already');
    expect(session.getSnapshot()).toBe(learned);
    expect(resume(session).getSnapshot().state.hero.learnedSkills.smash).toEqual({
      rank: 'F',
      objectiveCounts: {},
    });
  });

  it('renders every town object with dedicated art or its associated building sprite', () => {
    const town = content.data.worlds.find((world) => world.id === 'refuge')!;
    for (const object of town.objects) {
      const decoration = town.decorations.find((entry) => entry.objectId === object.id);
      const sprite = object.sprite ?? decoration?.sprite;
      expect(sprite, object.id).toBeDefined();
      const atlas = content.data.atlases.find((entry) => entry.id === sprite!.atlas)!;
      expect(atlas).toMatchObject({ frameWidth: 32, frameHeight: 32 });
      expect(sprite!.frame).toBeLessThan(atlas.columns * atlas.rows);
    }
  });
  it('gives every NPC a valid dedicated sprite and rejects missing art or frames', () => {
    const npcs = content.data.worlds.flatMap((map) =>
      map.objects.filter((object) => ['npc', 'merchant', 'healer'].includes(object.kind)),
    );
    expect(npcs).toHaveLength(6);
    for (const npc of npcs) {
      expect(npc.sprite).toBeDefined();
      expect(content.data.atlases.find((atlas) => atlas.id === npc.sprite!.atlas)).toMatchObject({
        columns: 1,
        rows: 1,
        frameWidth: 32,
        frameHeight: 32,
      });
    }
    for (const sprite of [
      { atlas: 'missing', frame: 0 },
      { atlas: 'npc-keeper', frame: 1 },
    ]) {
      const raw = structuredClone(content.data);
      raw.worlds[0].objects[0].sprite = sprite;
      expect(() => new ContentRegistry(raw)).toThrow('Unknown world object sprite');
    }
  });
  it.each(['grocery', 'blacksmith', 'healer', 'general'])(
    'enters %s, reloads inside, and exits to the matching doorstep',
    (shop) => {
      const session = create();
      const door = session.map.objects.find((object) => object.id === `${shop}-door`)!;
      visit(session, shop);
      expect(session.toSave().worldId).toBe(`${shop}-interior`);
      expect(session.getSnapshot().activeService).toBe(`${shop}-keeper`);
      const restored = resume(session);
      expect(restored.toSave()).toEqual(session.toSave());
      expect(restored.getSnapshot().activeService).toBeUndefined();
      approach(restored, 'exit');
      expect(restored.toSave()).toMatchObject({
        worldId: 'refuge',
        position: { x: door.x, y: door.y + 1 },
      });
    },
  );
  it('keeps all original refuge floor coordinates walkable and every town door reachable', () => {
    const map = content.data.worlds[0];
    for (let y = 1; y <= 5; y++)
      for (let x = 1; x <= 8; x++) {
        if ((x === 2 && y === 2) || (x === 4 && y === 3)) continue;
        expect(isWalkable(map, { x, y })).toBe(true);
      }
    for (const object of map.objects.filter((object) => object.kind === 'portal'))
      expect(findPath(map, map.entry, object).length).toBeGreaterThan(0);
    expect(map.objects.some((object) => object.kind === 'rest')).toBe(false);
  });
  it('blocks solid town props while keeping every service and collectible approachable', () => {
    const map = content.data.worlds[0];
    for (const decoration of map.decorations.filter((entry) => entry.blocking)) {
      for (let y = decoration.y; y < decoration.y + decoration.size; y++)
        for (let x = decoration.x; x < decoration.x + decoration.size; x++) {
          expect(isWalkable(map, { x, y })).toBe(false);
        }
    }
    for (const object of map.objects) {
      const neighbors = [
        [0, -1],
        [-1, 0],
        [1, 0],
        [0, 1],
      ].map(([dx, dy]) => ({ x: object.x + dx, y: object.y + dy }));
      expect(
        neighbors.some(
          (point) =>
            isWalkable(map, point) &&
            (distance(map.entry, point) === 0 || findPath(map, map.entry, point).length > 0),
        ),
      ).toBe(true);
    }
    expect(
      map.decorations
        .filter((entry) => entry.objectId)
        .map((entry) => entry.objectId)
        .sort(),
    ).toEqual(['blacksmith-door', 'general-door', 'grocery-door', 'healer-door']);
  });
  it('rejects unknown decoration art, invalid footprints, and obstructed entrances or arrivals', () => {
    for (const mutate of [
      (raw: typeof content.data) => {
        raw.worlds[0].decorations[0].sprite.atlas = 'missing';
      },
      (raw: typeof content.data) => {
        raw.worlds[0].decorations[0].sprite.frame = 1;
      },
      (raw: typeof content.data) => {
        raw.worlds[0].decorations[0].x = 19;
      },
      (raw: typeof content.data) => {
        raw.worlds[0].decorations[0].objectId = 'missing';
      },
      (raw: typeof content.data) => {
        raw.worlds[0].decorations[0].blocking = true;
      },
      (raw: typeof content.data) => {
        raw.worlds[0].decorations.push({
          id: 'bad-entry',
          ...raw.worlds[0].entry,
          size: 1,
          blocking: true,
          sprite: { atlas: 'oak-tree', frame: 0 },
        });
      },
      (raw: typeof content.data) => {
        raw.worlds[0].decorations.push({
          id: 'bad-arrival',
          x: 5,
          y: 10,
          size: 1,
          blocking: true,
          sprite: { atlas: 'oak-tree', frame: 0 },
        });
      },
    ]) {
      const raw = structuredClone(content.data);
      mutate(raw);
      expect(() => new ContentRegistry(raw)).toThrow();
    }
  });
  it('requires speaking to the current nearby service and closes it on movement', () => {
    const session = create((hero) => {
      hero.gold = 100;
    });
    const initial = session.toSave();
    expect(() =>
      session.dispatch({
        type: 'BUY_ITEM',
        objectId: 'grocery-keeper',
        itemId: 'bread',
        quantity: 1,
      }),
    ).toThrow('Approach');
    expect(session.toSave()).toEqual(initial);
    visit(session, 'grocery');
    const saved = session.toSave();
    expect(() => session.dispatch({ type: 'MOVE', entityId: 'player', dx: 0, dy: -1 })).toThrow(
      'blocked',
    );
    expect(session.toSave()).toEqual(saved);
    session.dispatch({ type: 'MOVE', entityId: 'player', dx: 0, dy: 1 });
    expect(session.getSnapshot().activeService).toBeUndefined();
    expect(() =>
      session.dispatch({
        type: 'BUY_ITEM',
        objectId: 'grocery-keeper',
        itemId: 'bread',
        quantity: 1,
      }),
    ).toThrow('Approach');
  });
  it('rejects malformed catalogs, missing services, invalid arrival tiles, and incomplete weapon definitions', () => {
    for (const mutate of [
      (raw: typeof content.data) => {
        raw.shops[0].items.push('missing');
      },
      (raw: typeof content.data) => {
        raw.shops[0].items.push(raw.shops[0].items[0]);
      },
      (raw: typeof content.data) => {
        raw.shops[0].buysItems = true;
      },
      (raw: typeof content.data) => {
        raw.worlds[2].objects[0].shopId = 'missing';
      },
      (raw: typeof content.data) => {
        raw.worlds[2].objects[1].destinationPosition = { x: 0, y: 0 };
      },
      (raw: typeof content.data) => {
        delete raw.items.find((item) => item.kind === 'weapon')!.maxDurability;
      },
    ]) {
      const raw = structuredClone(content.data);
      mutate(raw);
      expect(() => new ContentRegistry(raw)).toThrow();
    }
  });
});

describe('town transactions', () => {
  it('purchases with exact funds and restores food outside combat', () => {
    const session = create((hero) => {
      hero.gold = 8;
      hero.health = 20;
    });
    visit(session, 'grocery');
    session.dispatch({
      type: 'BUY_ITEM',
      objectId: 'grocery-keeper',
      itemId: 'bread',
      quantity: 2,
    });
    expect(session.toSave().hero).toMatchObject({ gold: 0, inventory: { bread: 2 } });
    const healthBeforeFood = session.toSave().hero.health;
    session.dispatch({ type: 'CLOSE_SERVICE' });
    session.dispatch({ type: 'USE_ITEM', sourceId: 'player', targetId: 'player', itemId: 'bread' });
    expect(session.toSave().hero).toMatchObject({
      health: healthBeforeFood + 8,
      inventory: { bread: 1 },
    });
    expect(resume(session).toSave()).toEqual(session.toSave());
  });
  it('rejects insufficient funds, wrong catalogs, bad quantities, and stack overflow without mutations or RNG use', () => {
    const session = create((hero) => {
      hero.gold = 100;
      hero.inventory.bread = 999;
    });
    visit(session, 'grocery');
    const before = session.toSave();
    for (const [itemId, quantity] of [
      ['bread', 1],
      ['apple', 51],
      ['apple', 0],
      ['apple', 1.5],
      ['apple', 1000],
      ['potion', 1],
    ] as const) {
      expect(() =>
        session.dispatch({ type: 'BUY_ITEM', objectId: 'grocery-keeper', itemId, quantity }),
      ).toThrow();
      expect(session.toSave()).toEqual(before);
      expect(session.engine.random.snapshot()).toEqual(before.randomState);
    }
    expect(() =>
      session.dispatch({
        type: 'SELL_ITEM',
        objectId: 'grocery-keeper',
        item: { itemId: 'potion' },
        quantity: 1,
      }),
    ).toThrow('does not buy');
  });
  it('buys distinct full-durability weapons and allocates stable IDs after a reload and sale', () => {
    const session = create((hero) => {
      hero.gold = 90;
    });
    visit(session, 'blacksmith');
    session.dispatch({
      type: 'BUY_ITEM',
      objectId: 'blacksmith-keeper',
      itemId: 'iron-blade',
      quantity: 2,
    });
    const restored = resume(session);
    approach(restored, 'blacksmith-keeper');
    restored.dispatch({
      type: 'BUY_ITEM',
      objectId: 'blacksmith-keeper',
      itemId: 'iron-blade',
      quantity: 1,
    });
    expect(restored.toSave().hero).toMatchObject({
      gold: 0,
      nextWeaponId: 4,
      weapons: {
        'weapon-1': { itemId: 'iron-blade', durability: 60 },
        'weapon-2': { durability: 60 },
        'weapon-3': { durability: 60 },
      },
    });
    expect(itemCount(restored.toSave().hero, 'iron-blade')).toBe(3);
  });
  it('sells only spare weapon and armor copies, preserves equipment, and rejects gold overflow', () => {
    const session = create((hero) => {
      addItem(hero, 'iron-blade', 2, content);
      hero.weapons['weapon-2'].durability = 0;
      hero.equipment.weapon = 'weapon-1';
      addItem(hero, 'moss-mail', 2, content);
      hero.equipment.armor = 'armor-1';
    });
    visit(session, 'general');
    const before = session.toSave();
    expect(() =>
      session.dispatch({
        type: 'SELL_ITEM',
        objectId: 'general-keeper',
        item: { weaponId: 'weapon-1' },
        quantity: 1,
      }),
    ).toThrow('unequipped');
    expect(() =>
      session.dispatch({
        type: 'SELL_ITEM',
        objectId: 'general-keeper',
        item: { armorId: 'armor-1' },
        quantity: 2,
      }),
    ).toThrow('unequipped');
    expect(session.toSave()).toEqual(before);
    session.dispatch({
      type: 'SELL_ITEM',
      objectId: 'general-keeper',
      item: { weaponId: 'weapon-2' },
      quantity: 1,
    });
    session.dispatch({
      type: 'SELL_ITEM',
      objectId: 'general-keeper',
      item: { armorId: 'armor-2' },
      quantity: 1,
    });
    expect(session.toSave().hero).toMatchObject({
      gold: 32,
      equipment: { weapon: 'weapon-1', armor: 'armor-1' },
      armors: { 'armor-1': { itemId: 'moss-mail' } },
    });
    expect(session.toSave().hero.weapons['weapon-2']).toBeUndefined();
    const rich = create((hero) => {
      hero.gold = 1000000;
    });
    visit(rich, 'general');
    const richBefore = rich.toSave();
    expect(() =>
      rich.dispatch({
        type: 'SELL_ITEM',
        objectId: 'general-keeper',
        item: { itemId: 'potion' },
        quantity: 1,
      }),
    ).toThrow('purse');
    expect(rich.toSave()).toEqual(richBefore);
  });
  it('repairs an equipped broken weapon, restores its bonus, and does not heal the character', () => {
    const session = create((hero) => {
      hero.gold = 15;
      hero.health = 10;
      hero.mana = 0;
      addItem(hero, 'iron-blade', 2, content);
      hero.weapons['weapon-1'].durability = 0;
      hero.equipment.weapon = 'weapon-1';
    });
    visit(session, 'blacksmith');
    expect(session.engine.getEntity('player')!.combatant!.attack).toBe(34);
    expect(repairPrice(session.toSave().hero.weapons['weapon-1'], content)).toBe(15);
    const resourcesBeforeRepair = session.toSave().hero;
    session.dispatch({
      type: 'REPAIR_WEAPON',
      objectId: 'blacksmith-keeper',
      weaponId: 'weapon-1',
    });
    expect(session.toSave().hero).toMatchObject({
      gold: 0,
      health: resourcesBeforeRepair.health,
      mana: resourcesBeforeRepair.mana,
      weapons: { 'weapon-1': { durability: 60 }, 'weapon-2': { durability: 60 } },
    });
    expect(session.engine.getEntity('player')!.combatant!.attack).toBe(38);
    const before = session.toSave();
    expect(() =>
      session.dispatch({
        type: 'REPAIR_WEAPON',
        objectId: 'blacksmith-keeper',
        weaponId: 'weapon-1',
      }),
    ).toThrow('no repairs');
    expect(session.toSave()).toEqual(before);
  });
  it('requires funds for healing and repair and rejects full-resource treatment', () => {
    const session = create((hero) => {
      hero.health = 1;
      hero.mana = 0;
      addItem(hero, 'iron-blade', 1, content);
      hero.weapons['weapon-1'].durability = 1;
    });
    visit(session, 'blacksmith');
    const smithBefore = session.toSave();
    expect(() =>
      session.dispatch({
        type: 'REPAIR_WEAPON',
        objectId: 'blacksmith-keeper',
        weaponId: 'weapon-1',
      }),
    ).toThrow('gold');
    expect(session.toSave()).toEqual(smithBefore);
    approach(session, 'exit');
    visit(session, 'healer');
    const before = session.toSave();
    expect(() => session.dispatch({ type: 'HEAL', objectId: 'healer-keeper' })).toThrow('gold');
    expect(session.toSave()).toEqual(before);
    const funded = create((hero) => {
      hero.health = 1;
      hero.mana = 0;
      hero.gold = 10;
    });
    visit(funded, 'healer');
    funded.dispatch({ type: 'HEAL', objectId: 'healer-keeper' });
    expect(funded.toSave().hero).toMatchObject({
      health: 118,
      mana: 98,
      stamina: 113,
      wounds: 0,
      fullness: 100,
      gold: 0,
    });
    const healed = funded.toSave();
    expect(() => funded.dispatch({ type: 'HEAL', objectId: 'healer-keeper' })).toThrow('already');
    expect(funded.toSave()).toEqual(healed);
  });
  it('preserves gold and inventory over varied buy/sell quantities', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 99 }), (quantity) => {
        const session = create((hero) => {
          hero.gold = quantity * 4;
        });
        visit(session, 'grocery');
        session.dispatch({
          type: 'BUY_ITEM',
          objectId: 'grocery-keeper',
          itemId: 'bread',
          quantity,
        });
        approach(session, 'exit');
        visit(session, 'general');
        session.dispatch({
          type: 'SELL_ITEM',
          objectId: 'general-keeper',
          item: { itemId: 'bread' },
          quantity,
        });
        expect(session.toSave().hero.gold).toBe(quantity * 2);
        expect(session.toSave().hero.inventory.bread).toBeUndefined();
        session.dispose();
      }),
      { numRuns: 30 },
    );
  });
});

describe('goddess offerings and save migration', () => {
  it('opens a chooser without entering, cancels freely, and consumes one item only on confirmed entry', () => {
    const session = create();
    approach(session, 'dungeon-entrance');
    const before = session.toSave();
    expect(before.dungeon).toBeUndefined();
    session.dispatch({ type: 'CLOSE_SERVICE' });
    expect(session.toSave()).toEqual(before);
    approach(session, 'dungeon-entrance');
    session.dispatch({
      type: 'OFFER_ITEM',
      objectId: 'dungeon-entrance',
      item: { itemId: 'potion' },
    });
    const entered = session.toSave();
    expect(entered.hero.inventory.potion).toBe(1);
    expect(entered.dungeon).toBeDefined();
    expect(entered.dungeon!.returnTo.position).toEqual(before.position);
    expect(resume(session).toSave()).toEqual(entered);
    expect(() =>
      session.dispatch({
        type: 'OFFER_ITEM',
        objectId: 'dungeon-entrance',
        item: { itemId: 'potion' },
      }),
    ).toThrow();
    expect(session.toSave()).toEqual(entered);
    session.dispatch({ type: 'INTERACT', objectId: 'goddess-statue' });
    expect(session.toSave()).toMatchObject({
      worldId: 'refuge',
      position: before.position,
      hero: entered.hero,
    });
  });
  it('accepts a broken spare weapon, reserves equipped armor, and rejects missing or equipped offerings', () => {
    const session = create((hero) => {
      addItem(hero, 'iron-blade', 2, content);
      hero.weapons['weapon-2'].durability = 0;
      hero.equipment.weapon = 'weapon-1';
      addItem(hero, 'moss-mail', 1, content);
      hero.equipment.armor = 'armor-1';
    });
    approach(session, 'dungeon-entrance');
    const before = session.toSave();
    for (const item of [
      { weaponId: 'weapon-1' },
      { itemId: 'moss-mail' },
      { itemId: 'bread' },
      { weaponId: 'missing' },
    ]) {
      expect(() =>
        session.dispatch({ type: 'OFFER_ITEM', objectId: 'dungeon-entrance', item }),
      ).toThrow();
      expect(session.toSave()).toEqual(before);
    }
    session.dispatch({
      type: 'OFFER_ITEM',
      objectId: 'dungeon-entrance',
      item: { weaponId: 'weapon-2' },
    });
    expect(session.toSave().hero.weapons['weapon-2']).toBeUndefined();
    expect(session.toSave().hero.equipment.weapon).toBe('weapon-1');
  });
  it('preserves the offering, live RNG, and campaign when generation fails', () => {
    const session = create();
    approach(session, 'dungeon-entrance');
    const before = session.toSave();
    vi.spyOn(Dungeon, 'generateDungeon').mockImplementationOnce(() => {
      throw new Error('Generation failed');
    });
    expect(() =>
      session.dispatch({
        type: 'OFFER_ITEM',
        objectId: 'dungeon-entrance',
        item: { itemId: 'potion' },
      }),
    ).toThrow('Generation failed');
    expect(session.toSave()).toEqual(before);
    expect(session.engine.random.snapshot()).toEqual(before.randomState);
    session.dispatch({
      type: 'OFFER_ITEM',
      objectId: 'dungeon-entrance',
      item: { itemId: 'potion' },
    });
    expect(session.toSave().dungeon).toBeDefined();
  });
  it('has no free offering fallback for an empty pack', () => {
    const session = create((hero) => {
      hero.inventory = {};
    });
    approach(session, 'dungeon-entrance');
    const before = session.toSave();
    expect(() =>
      session.dispatch({
        type: 'OFFER_ITEM',
        objectId: 'dungeon-entrance',
        item: { itemId: 'potion' },
      }),
    ).toThrow();
    expect(session.toSave()).toEqual(before);
  });
  it.each([1, 2, 3])(
    'migrates version %i stacked copies at full durability without changing gold, flags, or RNG',
    (version) => {
      const session = create((hero) => {
        hero.gold = 37;
        addItem(hero, 'iron-blade', 3, content);
        hero.equipment.weapon = 'weapon-2';
      });
      const campaign = legacyCampaign(session.toSave());
      campaign.opened = ['refuge/supply-chest'];
      const { audio, ...withoutAudio } = campaign;
      void audio;
      const save = parseSave(
        {
          version,
          savedAt: new Date().toISOString(),
          campaign: version === 1 ? withoutAudio : campaign,
        },
        content,
      );
      expect(save.version).toBe(12);
      expect(save.campaign.hero).toMatchObject({
        gold: 37,
        nextWeaponId: 4,
        equipment: { weapon: 'weapon-1' },
      });
      expect(Object.values(save.campaign.hero.weapons)).toEqual(
        Array(3).fill({ itemId: 'iron-blade', durability: 60 }),
      );
      expect(save.campaign.hero.inventory['iron-blade']).toBeUndefined();
      expect(save.campaign.opened).toEqual(campaign.opened);
      expect(save.campaign.randomState).toEqual(campaign.randomState);
    },
  );
  it('migrates an active v3 dungeon and rejects corrupt instance ownership, durability, counters, and future versions', () => {
    const session = create((hero) => {
      addItem(hero, 'iron-blade', 1, content);
      hero.equipment.weapon = 'weapon-1';
    });
    approach(session, 'dungeon-entrance');
    session.dispatch({
      type: 'OFFER_ITEM',
      objectId: 'dungeon-entrance',
      item: { itemId: 'potion' },
    });
    const original = session.toSave();
    const save = parseSave(
      { version: 3, savedAt: new Date().toISOString(), campaign: legacyCampaign(original) },
      content,
    );
    expect(save.campaign.dungeon).toEqual(original.dungeon);
    expect(save.campaign.hero.equipment.weapon).toBe('weapon-1');
    for (const mutate of [
      (hero: Hero) => {
        hero.weapons['weapon-1'].durability = 61;
      },
      (hero: Hero) => {
        hero.equipment.weapon = 'missing';
      },
      (hero: Hero) => {
        hero.nextWeaponId = 1;
      },
      (hero: Hero) => {
        hero.weapons['weapon-1'].itemId = 'potion';
      },
      (hero: Hero) => {
        hero.inventory['iron-blade'] = 1;
      },
    ]) {
      const state = session.toSave();
      mutate(state.hero);
      expect(() => validateCampaign(state, content)).toThrow();
    }
    expect(() => parseSave({ ...save, version: 13 }, content)).toThrow();
    expect(heroStats(save.campaign.hero, content).combatant.attack).toBe(38);
  });
});
