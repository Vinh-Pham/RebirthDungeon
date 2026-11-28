import "fake-indexeddb/auto";
import { expect, it, vi } from "vitest";
import { maxExperience, maxLevel } from "../../src/game/content/level-experience";
import { arrive, maxHealth, newProfile, type Profile, type SavedProfile } from "../../src/game/core/profile";
import { GameSession } from "../../src/game/core/session";
import { GameDatabase, SaveService } from "../../src/game/persistence";
import { walkable } from "../../src/game/world/world";

it.each([
  {
    name: "a legacy character",
    level: 1,
    xp: 98,
    version: undefined,
    initialProgress: [392, 400],
    finalLevel: 2,
    finalXp: 408,
    earnedXp: 16,
    finalProgress: [8, 700],
  },
  {
    name: "a character approaching the cap",
    level: maxLevel - 1,
    xp: maxExperience - 10,
    version: 1 as const,
    initialProgress: [6_824_990, 6_825_000],
    finalLevel: maxLevel,
    finalXp: maxExperience,
    earnedXp: 10,
    finalProgress: [0, 0],
  },
])("commits combat XP and one AP at level-up for $name", async (scenario) => {
  const now = Date.UTC(2026, 10, 26, 12);
  const profile = newProfile(
    {
      name: "Threshold Delver",
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
    now,
  );
  profile.xpCurveVersion = scenario.version;
  profile.level = scenario.level;
  profile.xp = scenario.xp;
  profile.ap = 3;
  profile.hp = maxHealth(profile.form, profile.level, profile.skills) - 10;
  profile.wounds = 5;
  profile.mp = 0;
  profile.stamina = 20;
  arrive(profile, "threshold", 1);
  const mite = profile.map!.enemies.find((enemy) => enemy.room === 1)!;
  mite.sprite = "glass_mite";
  profile.map!.enemies = [mite];
  const step = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ].find(([dx, dy]) => walkable(profile.map!, mite.x + dx, mite.y + dy))!;
  profile.position = { x: mite.x + step[0], y: mite.y + step[1] };
  const db = new GameDatabase(`level-progression-${crypto.randomUUID()}`);
  const saves = new SaveService<Profile>(db);
  const id = "delver";
  try {
    const original = await new SaveService<SavedProfile>(db).save(
      { id, name: profile.form.name, snapshot: { ...profile, log: ["You descend into the Threshold."] } },
      0,
      true,
    );
    let session = new GameSession(saves, () => now);
    const progress = () => {
      const player = session.store.getState().view.player!;
      return [player.xpInLevel, player.xpToAdvance];
    };
    const idle = async () => {
      await vi.waitFor(() => expect(session.store.getState().view.busy).toBe(false), { interval: 1 });
      expect(session.store.getState().view.error).toBe("");
    };
    await session.initialize();
    expect(progress()).toEqual(scenario.initialProgress);
    expect(session.store.getState().view.log).toEqual([
      { id: 1, message: "You descend into the Threshold.", category: "general" },
    ]);
    expect((await saves.load(id))!.revision).toBe(original.revision + (scenario.version === undefined ? 1 : 0));
    session.step(-step[0], -step[1]);
    await idle();
    for (let i = 0; i < 120 && session.store.getState().view.encounter; i++) {
      session.actions.combat("attack");
      await idle();
      session.tick(0.25);
      await idle();
    }
    expect(session.store.getState().view.encounter).toBeUndefined();
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
    });
    expect(session.store.getState().view.log.slice(-3)).toEqual([
      { id: expect.any(Number), message: "Chamber 1 cleared.", category: "combat", timestamp: now },
      { id: expect.any(Number), message: `You gain ${scenario.earnedXp} XP.`, category: "character", timestamp: now },
      {
        id: expect.any(Number),
        message: `You reached level ${scenario.finalLevel}. +1 AP.`,
        category: "character",
        timestamp: now,
      },
    ]);
    session = new GameSession(saves, () => now + 60_000);
    await session.initialize();
    expect(progress()).toEqual(scenario.finalProgress);
    expect(session.store.getState().view.log).toEqual(completed.snapshot.log);
    expect((await saves.load(id))!.revision).toBe(completed.revision);
  } finally {
    await db.delete();
  }
});
