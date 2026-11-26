import "fake-indexeddb/auto";
import { describe, expect, it, vi } from "vitest";
import source from "../../assets/maps/towns.ldtk?raw";
import { importLdtkTowns } from "../../src/game/world/ldtk-town";
import { GameSession } from "../../src/game/core/session";
import { arrive, newProfile, type Profile } from "../../src/game/core/profile";
import { GameDatabase, SaveService } from "../../src/game/persistence";
import { createTown, walkable } from "../../src/game/world/world";

const project = () => JSON.parse(source);
const terrain = (level: ReturnType<typeof project>["levels"][number]) =>
  level.layerInstances.find((layer: { __identifier: string }) => layer.__identifier === "Terrain");
const entities = (level: ReturnType<typeof project>["levels"][number]) =>
  level.layerInstances.find((layer: { __identifier: string }) => layer.__identifier === "Entities").entityInstances;

describe("LDtk towns", () => {
  it("loads both authored towns through the normal world entry point with independent map instances", () => {
    const towns = importLdtkTowns(source);
    expect([...towns.keys()].sort()).toEqual(["lantern_rest", "spindle_hollow"]);
    for (const level of project().levels) {
      const id = level.fieldInstances.find(
        (field: { __identifier: string }) => field.__identifier === "TownId",
      ).__value;
      const grid = terrain(level);
      const map = createTown(id);
      expect(map).toEqual(towns.get(id));
      expect([map.width, map.height]).toEqual([grid.__cWid, grid.__cHei]);
      expect(map.tiles).toEqual(grid.intGridCsv.map((value: number) => [0, 0, 1, 2, 3, 5, 6, 7, 8][value]));
      expect(map.enemies).toEqual([]);
      expect(map.generator).toMatch(/^ldtk-town-v1-/);
      const originalTile = map.tiles[0];
      map.tiles[0] = originalTile === 1 ? 0 : 1;
      expect(createTown(id).tiles[0]).toBe(originalTile);
    }
  });

  it("applies authored terrain, spawn and service moves independently of editor metadata", () => {
    const edited = project();
    const level = edited.levels[0];
    const grid = terrain(level);
    grid.intGridCsv[2 * grid.__cWid + 2] = 3;
    const spawn = entities(level).find((entity: { __identifier: string }) => entity.__identifier === "PlayerStart");
    spawn.__grid = [2, 2];
    spawn.px = [48, 48];
    const school = entities(level).find((entity: { fieldInstances: { __identifier: string; __value: string }[] }) =>
      entity.fieldInstances.some((field) => field.__identifier === "ServiceId" && field.__value === "school"),
    );
    school.__grid = [3, 2];
    school.px = [72, 48];
    school.fieldInstances.find((field: { __identifier: string }) => field.__identifier === "DisplayName").__value =
      "Teacher Elian";
    const original = importLdtkTowns(source);
    const maps = importLdtkTowns(JSON.stringify(edited));
    const map = maps.get("lantern_rest")!;
    expect(map.entry).toEqual({ x: 2, y: 2 });
    expect(map.tiles[2 * map.width + 2]).toBe(2);
    expect(map.landmarks.find((place) => place.id === "school")).toMatchObject({ name: "Teacher Elian", x: 3, y: 2 });
    expect(map.generator).not.toBe(original.get("lantern_rest")!.generator);
    expect(maps.get("spindle_hollow")).toEqual(original.get("spindle_hollow"));
    edited.appBuildId++;
    expect(importLdtkTowns(JSON.stringify(edited)).get("lantern_rest")!.generator).toBe(map.generator);
  });

  it("imports blank cells and grass as walkable terrain and preserves painted barriers", () => {
    const edited = project();
    const grid = terrain(edited.levels[0]);
    const values = [0, 2, 5, 6, 7, 8];
    for (const [index, value] of values.entries()) grid.intGridCsv[2 * grid.__cWid + index + 2] = value;
    const map = importLdtkTowns(JSON.stringify(edited)).get("lantern_rest")!;
    expect(map.tiles.slice(2 * map.width + 2, 2 * map.width + 8)).toEqual([0, 1, 5, 6, 7, 8]);
    expect(values.map((_, index) => walkable(map, index + 2, 2))).toEqual([true, false, false, true, false, true]);
  });

  it("rejects broken authored maps with missing spawns or invalid terrain", () => {
    const missingSpawn = project();
    const layer = missingSpawn.levels[0].layerInstances.find(
      (item: { __identifier: string }) => item.__identifier === "Entities",
    );
    layer.entityInstances = layer.entityInstances.filter(
      (entity: { __identifier: string }) => entity.__identifier !== "PlayerStart",
    );
    expect(() => importLdtkTowns(JSON.stringify(missingSpawn))).toThrow(/exactly one PlayerStart/);
    const invalidTerrain = project();
    terrain(invalidTerrain.levels[0]).intGridCsv[0] = 99;
    expect(() => importLdtkTowns(JSON.stringify(invalidTerrain))).toThrow(/Terrain must use values/);
    expect(() => importLdtkTowns("{")).toThrow(/valid JSON/);
  });
});

const makeProfile = () =>
  newProfile(
    {
      name: "LDtk Traveler",
      race: 0,
      gender: 0,
      age: 17,
      talent: 0,
      body: 1,
      skin: 1,
      hair: 0,
      hairColor: 0,
      eyes: 0,
      eyeColor: 0,
      face: 0,
    },
    42,
  );

it("refreshes an old active town durably without changing progression or a saved dungeon", async () => {
  const profile = makeProfile();
  arrive(profile, "threshold");
  profile.layouts["threshold-preserved"] = structuredClone(profile.map!);
  arrive(profile, "lantern_rest");
  profile.map!.generator = "rot-web-v1";
  profile.map!.tiles[0] = 0;
  profile.position = { x: 0, y: 0 };
  profile.layouts.lantern_rest = structuredClone(profile.map!);
  profile.quest = 2;
  profile.gold = 321;
  const db = new GameDatabase(`ldtk-resume-${crypto.randomUUID()}`);
  const saves = new SaveService<Profile>(db);
  try {
    const original = await saves.save({ id: "town", name: profile.form.name, snapshot: profile }, 0, true);
    const session = new GameSession(saves);
    await session.initialize();
    expect(session.store.getState().view.error).toBe("");
    const migrated = (await saves.load("town"))!;
    expect(migrated.revision).toBe(original.revision + 1);
    expect(migrated.snapshot.map).toEqual(createTown("lantern_rest"));
    expect(migrated.snapshot.position).toEqual(createTown("lantern_rest").entry);
    expect(migrated.snapshot.layouts["threshold-preserved"]).toEqual(profile.layouts["threshold-preserved"]);
    expect([migrated.snapshot.quest, migrated.snapshot.gold]).toEqual([2, 321]);
    const resumed = new GameSession(saves);
    await resumed.initialize();
    expect((await saves.load("town"))!.revision).toBe(migrated.revision);
  } finally {
    await db.delete();
  }
});

it("travels to the authored Moon Gate when the saved destination has an obsolete gate", async () => {
  const profile = makeProfile();
  arrive(profile, "spindle_hollow");
  const oldDestination = structuredClone(profile.map!);
  const oldGate = oldDestination.landmarks.find((place) => place.id === "gate")!;
  oldGate.x = 1;
  oldGate.y = 1;
  oldDestination.generator = "rot-web-v1";
  profile.layouts.spindle_hollow = oldDestination;
  arrive(profile, "lantern_rest");
  profile.gates = ["lantern_rest", "spindle_hollow"];
  const db = new GameDatabase(`ldtk-gate-${crypto.randomUUID()}`);
  const saves = new SaveService<Profile>(db);
  try {
    await saves.save({ id: "gate", name: profile.form.name, snapshot: profile }, 0, true);
    const session = new GameSession(saves);
    await session.initialize();
    session.actions.panel("gates");
    session.actions.choose("travel:spindle_hollow");
    await vi.waitFor(() => expect(session.store.getState().view.busy).toBe(false), { interval: 1 });
    expect(session.store.getState().view.error).toBe("");
    const saved = (await saves.load("gate"))!.snapshot;
    const actual = createTown("spindle_hollow");
    const gate = actual.landmarks.find((place) => place.id === "gate")!;
    expect(saved.map).toEqual(actual);
    expect(Math.abs(saved.position.x - gate.x) + Math.abs(saved.position.y - gate.y)).toBe(1);
  } finally {
    await db.delete();
  }
});
