import "fake-indexeddb/auto";
import { expect, it, vi } from "vitest";
import { GameSession } from "../../src/game/core/session";
import { arrive, newProfile, type Profile } from "../../src/game/core/profile";
import { GameDatabase, SaveService } from "../../src/game/persistence";
import { Combat } from "../../src/game/systems/combat";

it.each([undefined, "novice"])("learns rank F Windmill from the school with prior rank %s", async (priorRank) => {
  const profile = newProfile(
    {
      name: "Windmill Student",
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
  if (priorRank) profile.skills.windmill = { rank: priorRank, training: { windmill_attack: 1 } };
  arrive(profile, "lantern_rest");
  const school = profile.map!.landmarks.find((place) => place.id === "school")!;
  profile.position = { x: school.x, y: school.y + 1 };
  const db = new GameDatabase(`windmill-${crypto.randomUUID()}`);
  const saves = new SaveService<Profile>(db);
  try {
    await saves.save({ id: "lesson", name: profile.form.name, snapshot: profile }, 0, true);
    const session = new GameSession(saves);
    await session.initialize();
    const view = () => session.store.getState().view;
    const idle = async () => {
      await vi.waitFor(() => expect(view().busy).toBe(false), { interval: 1 });
      expect(view().error).toBe("");
    };
    session.actions.interact();
    await idle();
    session.actions.choose("study");
    expect(view().details.options.find((option) => option.id === "learn:windmill")?.label).toContain("Rank F");
    session.actions.choose("learn:windmill");
    await idle();
    expect(view().skills.find((skill) => skill.id === "windmill")?.rank).toBe("F");
    expect(view().details.options.some((option) => option.id === "learn:windmill")).toBe(false);
    session.actions.choose("learn:windmill");
    await idle();
    const saved = (await saves.load("lesson"))!.snapshot;
    expect(saved.skills.windmill).toEqual({ rank: "F", training: {} });
    expect(saved.ap).toBe(profile.ap);
    expect(view().skillSlots.every((slot) => slot === null)).toBe(true);
    const resumed = new GameSession(saves);
    await resumed.initialize();
    expect(resumed.store.getState().view.skills.find((skill) => skill.id === "windmill")?.rank).toBe("F");
  } finally {
    await db.delete();
  }
});

it("Windmill hits every living enemy with one stamina cost", () => {
  const battle = new Combat(
    {
      name: "Student",
      health: 100,
      stamina: 30,
      damage_min: 10,
      damage_max: 10,
      learned_skills: ["windmill"],
      skill_effects: { windmill: { human_giant_damage: 170, stamina_use: 2 } },
    },
    [
      { name: "First", health: 100, damage_min: 0, damage_max: 0 },
      { name: "Second", health: 100, damage_min: 0, damage_max: 0 },
      { name: "Defeated", health: 100, damage_min: 0, damage_max: 0 },
    ],
  );
  battle.enemies[2].health = 0;
  expect(battle.queue("windmill")).toBe(true);
  const events = battle.advance(2.5);
  expect(battle.enemies[0].health).toBeLessThan(100);
  expect(battle.enemies[1].health).toBeLessThan(100);
  expect(battle.enemies[2].health).toBe(0);
  expect(battle.stamina).toBe(28);
  expect(events.find((event) => event.action === "windmill")?.message).toMatch(
    /^Windmill hits 2 enemies for \d+ damage\.$/,
  );
});
