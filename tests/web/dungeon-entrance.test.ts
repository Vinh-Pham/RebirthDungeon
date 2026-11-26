import "fake-indexeddb/auto";
import { expect, it, vi } from "vitest";
import { GameSession } from "../../src/game/core/session";
import { arrive, newProfile, type Profile } from "../../src/game/core/profile";
import { GameDatabase, SaveService } from "../../src/game/persistence";

it.each([undefined, 2, 3] as const)(
  "leaves an uncleared dungeon and persists settlement return with layout version %s",
  async (version) => {
    const profile = newProfile(
      {
        name: "Door Signal",
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
      412,
    );
    profile.thresholdVersion = version;
    arrive(profile, "lantern_rest");
    profile.origin = "lantern_rest";
    arrive(profile, "threshold");
    const entrance = profile.map!.landmarks.find((place) => place.id === "return")!;
    entrance.name = "Return passage";
    profile.position = { x: entrance.x + 1, y: entrance.y };
    const db = new GameDatabase(`entrance-${crypto.randomUUID()}`);
    const saves = new SaveService<Profile>(db);
    try {
      await saves.save({ id: "door", name: profile.form.name, snapshot: profile }, 0, true);
      const session = new GameSession(saves);
      await session.initialize();
      session.actions.interact();
      const view = () => session.store.getState().view;
      expect(view().details.title).toBe("Dungeon Entrance");
      expect(view().details.options.some((option) => option.id === "retreat")).toBe(true);
      session.actions.choose("retreat");
      await vi.waitFor(() => expect(view().busy).toBe(false), { interval: 1 });
      expect(view().error).toBe("");
      expect(view().location).toBe("Lantern Rest");
      expect(view().panel).toBeUndefined();
      const saved = (await saves.load("door"))!.snapshot;
      expect(saved.location).toBe("lantern_rest");
      expect(saved.cleared).toEqual([]);
      const outside = saved.map!.landmarks.find((place) => place.id === "dungeon")!;
      expect(saved.position).toEqual({ x: outside.x - 1, y: outside.y });
      const resumed = new GameSession(saves);
      await resumed.initialize();
      expect(resumed.store.getState().view.location).toBe("Lantern Rest");
    } finally {
      await db.delete();
    }
  },
);

it("reenters a completed legacy route from Spindle Hollow with no repeated rewards", async () => {
  const profile = newProfile(
    {
      name: "Return Signal",
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
    412,
  );
  delete profile.thresholdVersion;
  profile.completions = 1;
  profile.cleared = [1, 2, 3, 4, 5, 6, 7, 8];
  profile.treasure = true;
  profile.quest = 3;
  arrive(profile, "spindle_hollow");
  const door = profile.map!.landmarks.find((place) => place.id === "dungeon")!;
  profile.position = { x: door.x - 1, y: door.y };
  const db = new GameDatabase(`legacy-return-${crypto.randomUUID()}`);
  const saves = new SaveService<Profile>(db);
  try {
    await saves.save({ id: "return", name: profile.form.name, snapshot: profile }, 0, true);
    const session = new GameSession(saves);
    await session.initialize();
    const view = () => session.store.getState().view;
    session.actions.interact();
    session.actions.choose("enter");
    await vi.waitFor(() => expect(view().busy).toBe(false), { interval: 1 });
    expect(view().error).toBe("");
    const saved = (await saves.load("return"))!.snapshot;
    expect(saved.thresholdVersion).toBe(3);
    expect(saved.room).toBe(6);
    expect(saved.map!.id).toBe("threshold-floor");
    expect(saved.map!.width).toBe(38);
    expect(saved.map!.tiles).not.toContain(4);
    expect(saved.map!.enemies).toEqual([]);
    expect(saved.cleared).toEqual([1, 2, 3, 4, 5, 6]);
    expect(saved.treasure).toBe(true);
    expect(saved.completions).toBe(1);
    expect(saved.quest).toBe(profile.quest);
    expect(saved.gold).toBe(profile.gold);
    expect(saved.xp).toBe(profile.xp);
    expect(saved.tonics).toBe(profile.tonics);
    expect(saved.pending).toEqual(profile.pending);
  } finally {
    await db.delete();
  }
});
