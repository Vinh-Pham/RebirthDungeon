import { describe, expect, it } from 'vitest';
import { loadGameContent } from '../../data/content';
import { createDungeonRun, dungeonObjectClaimed, generateDungeon, projectDungeonMap } from '../../engine/dungeon/Dungeon';
import { worldObjectSprite } from '../../renderer/WorldObjectArt';
import { projectWorldMap } from '../../engine/world/TileMap';

const content = loadGameContent().data;

describe('exploration object art', () => {
  it('resolves both Moss Halls encounters from the authored battle maps', () => {
    const halls = content.worlds.find((world) => world.id === 'halls')!;
    const encounters = halls.objects.filter((object) => object.kind === 'encounter');
    expect(encounters).toHaveLength(2);
    for (const object of encounters) {
      const enemyId = object.id === 'slime-guard' ? 'slime' : 'elder-slime';
      expect(worldObjectSprite(object, content)).toEqual(content.enemies.find((enemy) => enemy.id === enemyId)!.sprite);
    }
  });

  it('resolves generated spider rooms and keeps the giant spider as the boss marker', () => {
    const run = createDungeonRun(generateDungeon(content.dungeons[0], 7), { worldId: 'refuge', position: { x: 7, y: 5 } });
    for (const object of projectDungeonMap(run).objects.filter((object) => object.kind === 'encounter')) {
      const encounter = run.blueprint.encounters.find((entry) => entry.objectId === object.id)!;
      const sprite = worldObjectSprite(object, content, run);
      expect(sprite).toEqual(content.enemies.find((enemy) => enemy.id === encounter.map.spawns.find((spawn) => spawn.kind === 'enemy')!.definitionId)!.sprite);
      if (encounter.kind === 'boss') expect(sprite).toMatchObject({ atlas: 'giant-black-spider', frame: 0 });
    }
  });

  it('keeps ambushes disguised until revealed, then resolves their monster without an encounterMap field', () => {
    const run = createDungeonRun(generateDungeon(content.dungeons[0], 7), { worldId: 'refuge', position: { x: 7, y: 5 } });
    const ambush = run.blueprint.encounters.find((entry) => entry.kind === 'mimic')!;
    const disguised = projectDungeonMap(run).objects.find((object) => object.id === ambush.objectId)!;
    expect(disguised.kind).toBe('chest');
    expect(worldObjectSprite(disguised, content, run)).toEqual({ atlas: 'dungeon-chest', frame: 0 });
    const ordinary = projectDungeonMap(run).objects.find((object) => object.kind === 'chest' && object.id !== ambush.objectId)!;
    expect(worldObjectSprite(disguised, content, run)).toEqual(worldObjectSprite(ordinary, content, run));
    run.revealedMimics.push(ambush.objectId);
    const revealed = projectDungeonMap(run).objects.find((object) => object.id === ambush.objectId)!;
    expect(revealed.encounterMap).toBeUndefined();
    expect(worldObjectSprite(revealed, content, run)).toMatchObject({ atlas: 'black-spider', frame: 0 });
  });

  it('preserves dedicated town sprites and gives authored dungeon props art', () => {
    const town = content.worlds.find((world) => world.id === 'refuge')!;
    const keeper = town.objects.find((object) => object.id === 'keeper')!;
    expect(worldObjectSprite(keeper, content)).toEqual(keeper.sprite);
    const halls = content.worlds.find((world) => world.id === 'halls')!;
    expect(worldObjectSprite(halls.objects.find((object) => object.kind === 'portal')!, content)).toEqual({ atlas: 'dungeon-exit', frame: 0 });
    const chest = halls.objects.find((object) => object.kind === 'chest')!;
    expect(worldObjectSprite(chest, content)).toEqual({ atlas: 'dungeon-chest', frame: 0 });
    expect(worldObjectSprite(chest, content, undefined, true)).toEqual({ atlas: 'dungeon-chest-open', frame: 0 });
    const encounter = halls.objects.find((object) => object.kind === 'encounter')!;
    expect(worldObjectSprite({ ...encounter, encounterMap: 'missing' }, content)).toBeUndefined();
  });

  it('covers every generated prop, including dropped keys, without altering saved blueprints', () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 20; seed++) {
      const run = createDungeonRun(generateDungeon(content.dungeons[0], seed), { worldId: 'refuge', position: { x: 7, y: 5 } });
      const before = structuredClone(run.blueprint);
      run.bossKey = { status: 'dropped', position: { x: 1, y: 1 } };
      run.treasureKey = { status: 'dropped', position: { x: 2, y: 1 } };
      for (const object of projectDungeonMap(run).objects) {
        const sprite = worldObjectSprite(object, content, run);
        expect(sprite, `${seed}: ${object.kind}`).toBeDefined();
        const atlas = content.atlases.find((entry) => entry.id === sprite!.atlas)!;
        expect(atlas).toBeDefined();
        expect(sprite!.frame).toBeLessThan(atlas.columns * atlas.rows);
        seen.add(object.kind);
        if (object.kind === 'key') expect(sprite!.atlas).toBe(`dungeon-${object.keyType}-key`);
      }
      expect(run.blueprint).toEqual(before);
    }
    expect(seen).toEqual(new Set(['statue', 'encounter', 'chest', 'fountain', 'gate', 'finalChest', 'key']));
  });

  it('changes gate art when progression unlocks each room', () => {
    const run = createDungeonRun(generateDungeon(content.dungeons[0], 7), { worldId: 'refuge', position: { x: 7, y: 5 } });
    const gateArt = () => projectDungeonMap(run).objects.filter((object) => object.kind === 'gate').map((object) => worldObjectSprite(object, content, run)!.atlas);
    expect(gateArt()).toEqual(['dungeon-boss-gate', 'dungeon-treasure-gate']);
    run.bossDoorOpened = true;
    expect(gateArt()).toEqual(['dungeon-boss-gate-open', 'dungeon-treasure-gate']);
    run.cleared.push(run.blueprint.encounters.find((entry) => entry.kind === 'boss')!.objectId);
    expect(gateArt()).toEqual(['dungeon-boss-gate-open', 'dungeon-treasure-gate-open']);
  });

  it('shows a sealed passage in Moss Halls and an open gate after both saved victories', () => {
    const halls = content.worlds.find((world) => world.id === 'halls')!;
    const art = (cleared: string[]) => worldObjectSprite(projectWorldMap(halls, cleared).objects.find((object) => object.id === 'depths-passage')!, content);
    expect(art([])).toEqual({ atlas: 'dungeon-boss-gate', frame: 0 });
    expect(art(['halls/slime-guard'])).toEqual({ atlas: 'dungeon-boss-gate', frame: 0 });
    expect(art(['halls/slime-guard', 'halls/elder-guard'])).toEqual({ atlas: 'dungeon-boss-gate-open', frame: 0 });
  });

  it('opens only the chosen final reward, even though all alternatives become claimed', () => {
    const run = createDungeonRun(generateDungeon(content.dungeons[0], 7), { worldId: 'refuge', position: { x: 7, y: 5 } });
    const chests = projectDungeonMap(run).objects.filter((object) => object.kind === 'finalChest');
    run.selectedChest = chests[0].id;
    run.opened.push(chests[0].id);
    for (const chest of chests) {
      expect(dungeonObjectClaimed(run, chest.id)).toBe(true);
      expect(worldObjectSprite(chest, content, run, true)!.atlas).toBe(chest.id === run.selectedChest ? 'sealed-treasure-chest-open' : 'sealed-treasure-chest');
    }
    const ordinary = projectDungeonMap(run).objects.find((object) => object.kind === 'chest')!;
    run.opened.push(ordinary.id);
    expect(worldObjectSprite(ordinary, content, run)!.atlas).toBe('dungeon-chest-open');
  });
});
