import "fake-indexeddb/auto";
import { expect, it, vi } from "vitest";
import { arrive, newProfile, type Profile } from "../../src/game/core/profile";
import { GameSession } from "../../src/game/core/session";
import { GameDatabase, SaveService } from "../../src/game/persistence";
import { residentRoamSeconds, roamTownResidents } from "../../src/game/world/town-residents";
import { createTown, key, occupied, type TownResident } from "../../src/game/world/world";

it("roams all ten residents deterministically on free exterior tiles near their homes", () => {
  const town = createTown("lantern_rest");
  const homes = town.residentSpawns!;
  expect(homes).toHaveLength(10);
  expect(new Set(homes.map(({ id }) => id)).size).toBe(10);
  expect(homes.every((home) => !occupied(town, home))).toBe(true);
  expect(createTown("spindle_hollow").residentSpawns).toBeUndefined();

  let residents: readonly TownResident[] = homes;
  const moved = new Set<string>();
  for (let step = 1; step <= 30; step++) {
    const next = roamTownResidents(town, residents, town.entry, 42, step);
    expect(next).toEqual(roamTownResidents(town, residents, town.entry, 42, step));
    expect(new Set(next.map(({ x, y }) => key(x, y))).size).toBe(10);
    for (const [index, resident] of next.entries()) {
      const previous = residents[index];
      const home = homes[index];
      const stride = Math.abs(resident.x - previous.x) + Math.abs(resident.y - previous.y);
      expect(resident.id).toBe(home.id);
      expect(stride).toBeLessThanOrEqual(1);
      expect(Math.abs(resident.x - home.x) + Math.abs(resident.y - home.y)).toBeLessThanOrEqual(7);
      expect(occupied(town, resident)).toBe(false);
      expect(resident).not.toMatchObject(town.entry);
      expect([0, 2, 6, 8]).toContain(town.tiles[resident.y * town.width + resident.x]);
      if (stride) moved.add(resident.id);
    }
    residents = next;
  }
  expect(moved.size).toBe(10);
  expect(homes).toEqual(createTown("lantern_rest").residentSpawns);
});

it("shows and moves ambient residents without saving their positions or blocking player interaction", async () => {
  const profile = newProfile(
    {
      name: "Town Walker",
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
  arrive(profile, "lantern_rest");
  const db = new GameDatabase(`town-residents-${crypto.randomUUID()}`);
  const saves = new SaveService<Profile>(db);
  try {
    await saves.save({ id: "walker", name: profile.form.name, snapshot: profile }, 0, true);
    const session = new GameSession(saves);
    await session.initialize();
    const state = session.store.getState;
    const spawns = state().townResidents;
    expect(spawns).toEqual(profile.map!.residentSpawns);
    session.actions.interact();
    expect(state().view.panel).toBeUndefined();
    session.travelTo(spawns[0]);
    session.tick(0.2);
    await vi.waitFor(() => expect(state().view.busy).toBe(false), { interval: 1 });
    expect(state().mapView?.position).toMatchObject({ x: spawns[0].x, y: spawns[0].y });
    expect(state().view.encounter).toBeUndefined();
    expect(state().view.panel).toBeUndefined();
    const saved = await saves.load("walker");

    session.tick(residentRoamSeconds);
    expect(state().townResidents).not.toEqual(spawns);
    expect(await saves.load("walker")).toEqual(saved);
    const reopened = new GameSession(saves);
    await reopened.initialize();
    expect(reopened.store.getState().townResidents).toEqual(spawns);
  } finally {
    await db.delete();
  }
});
