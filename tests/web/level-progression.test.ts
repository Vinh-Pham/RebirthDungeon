import "fake-indexeddb/auto";
import { expect, it, vi } from "vitest";
import { maxExperience, maxLevel } from "../../src/game/content/level-experience";
import { arrive, maxHealth, newProfile, type Profile } from "../../src/game/core/profile";
import { GameSession } from "../../src/game/core/session";
import { GameDatabase, SaveService } from "../../src/game/persistence";

it.each([
  {
    name: "a legacy character",
    level: 1,
    xp: 50,
    version: undefined,
    initialProgress: [200, 400],
    finalLevel: 2,
    finalXp: 600,
    finalProgress: [200, 700],
  },
  {
    name: "a character approaching the cap",
    level: maxLevel - 1,
    xp: maxExperience - 50,
    version: 1 as const,
    initialProgress: [6_824_950, 6_825_000],
    finalLevel: maxLevel,
    finalXp: maxExperience,
    finalProgress: [0, 0],
  },
])("commits quest XP and one AP at level-up for $name", async (scenario) => {
  const profile = newProfile(
    {
      name: "Signal Keeper",
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
  profile.xpCurveVersion = scenario.version;
  profile.level = scenario.level;
  profile.xp = scenario.xp;
  profile.ap = 3;
  profile.hp = maxHealth(profile.form, profile.level, profile.skills) - 10;
  profile.wounds = 5;
  profile.mp = 0;
  profile.stamina = 0;
  arrive(profile, "spindle_hollow");
  profile.quest = 2;
  const warden = profile.map!.landmarks.find((place) => place.id === "warden")!;
  profile.position = { x: warden.x, y: warden.y + 1 };
  const db = new GameDatabase(`level-progression-${crypto.randomUUID()}`);
  const saves = new SaveService<Profile>(db);
  const id = "keeper";
  try {
    const original = await saves.save({ id, name: profile.form.name, snapshot: profile }, 0, true);
    let session = new GameSession(saves);
    const progress = () => {
      const player = session.store.getState().view.player!;
      return [player.xpInLevel, player.xpToAdvance];
    };
    await session.initialize();
    expect(progress()).toEqual(scenario.initialProgress);
    expect((await saves.load(id))!.revision).toBe(original.revision + (scenario.version === undefined ? 1 : 0));
    session.actions.interact();
    expect(session.store.getState().view.details.options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "quest-reward", label: "Complete Quest · 32 Gold · 400 XP" }),
      ]),
    );
    session.actions.choose("quest-reward");
    await vi.waitFor(() => expect(session.store.getState().view.busy).toBe(false), { interval: 1 });
    const completed = (await saves.load(id))!;
    expect(completed.snapshot).toMatchObject({
      xpCurveVersion: 1,
      xp: scenario.finalXp,
      level: scenario.finalLevel,
      ap: 4,
      hp: maxHealth(profile.form, scenario.finalLevel, profile.skills),
      wounds: 0,
      mp: 98,
      stamina: 113,
      quest: 3,
      gold: profile.gold + 32,
    });
    expect(session.store.getState().view.log).toContain(`You reached level ${scenario.finalLevel}. +1 AP.`);
    session = new GameSession(saves);
    await session.initialize();
    expect(progress()).toEqual(scenario.finalProgress);
    expect((await saves.load(id))!.revision).toBe(completed.revision);
  } finally {
    await db.delete();
  }
});
