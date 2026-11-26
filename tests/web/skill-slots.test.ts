import "fake-indexeddb/auto";
import { expect, it, vi } from "vitest";
import { GameSession } from "../../src/game/core/session";
import { arrive, newProfile, validateProfile, type Profile } from "../../src/game/core/profile";
import { GameDatabase, SaveService } from "../../src/game/persistence";
import { Combat } from "../../src/game/systems/combat";

it("keeps legacy skill bars empty and persists assigned, swapped skills through combat reload", async () => {
  const profile = newProfile(
    {
      name: "Slot Signal",
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
  expect(profile.skillSlots).toEqual(Array(10).fill(null));
  delete profile.skillSlots;
  arrive(profile, "lantern_rest");
  expect(validateProfile(profile)).toBe(true);
  const db = new GameDatabase(`skill-slots-${crypto.randomUUID()}`);
  const saves = new SaveService<Profile>(db);
  const session = new GameSession(saves);
  const view = () => session.store.getState().view;
  const idle = async () => {
    await vi.waitFor(() => expect(view().busy).toBe(false), { interval: 1 });
    expect(view().error).toBe("");
  };
  try {
    await saves.save({ id: "slots", name: profile.form.name, snapshot: profile }, 0, true);
    await session.initialize();
    await idle();
    expect(view().skillSlots).toEqual(Array(10).fill(null));
    expect(session.actions.useSkillSlot(0)).toBe(false);
    session.actions.assignSkillSlot(0, "combat_mastery");
    await idle();
    session.actions.assignSkillSlot(9, "defense");
    await idle();
    session.actions.assignSkillSlot(1, "smash");
    await idle();
    expect(view().skillSlots[1]).toBeNull();
    session.actions.moveSkillSlot(0, 9);
    await idle();
    expect(view().skillSlots[0]).toBe("defense");
    expect(view().skillSlots[9]).toBe("combat_mastery");

    const saved = (await saves.load("slots"))!;
    const battle = new Combat(
      {
        name: "Slot Signal",
        health: 100,
        stamina: 50,
        damage_min: 10,
        damage_max: 10,
        learned_skills: ["combat_mastery", "defense"],
      },
      [{ name: "Training creature", health: 100, damage_min: 2, damage_max: 2 }],
    );
    saved.snapshot.battle = battle.snapshot();
    await saves.save(saved, saved.revision);
    const resumed = new GameSession(saves);
    await resumed.initialize();
    const resumedView = () => resumed.store.getState().view;
    const resumedIdle = async () => {
      await vi.waitFor(() => expect(resumedView().busy).toBe(false), { interval: 1 });
      expect(resumedView().error).toBe("");
    };
    expect(resumedView().skillSlots).toEqual(view().skillSlots);
    expect(resumed.actions.useSkillSlot(9)).toBe(true);
    await resumedIdle();
    expect(resumedView().encounter?.queued).toBe("attack");
    expect(resumed.actions.useSkillSlot(0)).toBe(true);
    await resumedIdle();
    expect(resumedView().encounter?.queued).toBe("defend");
    expect((await saves.load("slots"))!.snapshot.battle?.playerGauge).toBe(0);
    expect((await saves.load("slots"))!.snapshot.battle?.enemies[0].health).toBe(100);
  } finally {
    await db.delete();
  }
});
