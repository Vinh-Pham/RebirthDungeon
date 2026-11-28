import "fake-indexeddb/auto";
import { expect, it, vi } from "vitest";
import { GameSession } from "../../src/game/core/session";
import { arrive, newProfile, validateProfile, type Profile } from "../../src/game/core/profile";
import { GameDatabase, SaveService } from "../../src/game/persistence";
import { Combat } from "../../src/game/systems/combat";
import { spawnTownWolves } from "../../src/game/world/town-wolves";
import { occupied, walkable } from "../../src/game/world/world";

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
    const afterFirst = (await saves.load("slots"))!.snapshot.battle?.enemies[0].health ?? 100;
    expect(afterFirst).toBeLessThan(100);
    expect(resumed.actions.useSkillSlot(9)).toBe(true);
    await resumedIdle();
    const afterSecond = (await saves.load("slots"))!.snapshot.battle?.enemies[0].health ?? 100;
    expect(afterSecond).toBeLessThan(afterFirst);
    expect(resumed.actions.useSkillSlot(0)).toBe(true);
    await resumedIdle();
    expect(resumedView().loadedSkill).toBe("defend");
    expect(resumedView().encounter?.queued).toBe("defend");
    expect((await saves.load("slots"))!.snapshot.battle?.enemies[0].health).toBe(afterSecond);
  } finally {
    await db.delete();
  }
});

it("loads skills out of combat, navigates and attacks clicked enemies, and counts down cooldowns", async () => {
  const db = new GameDatabase(`realtime-${crypto.randomUUID()}`);
  try {
    const saves = new SaveService<Profile>(db);
    const profile = newProfile(
      {
        name: "Realtime Signal",
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
      12,
    );
    profile.skills.smash = { rank: "F", training: {} };
    profile.skills.defense = { rank: "F", training: {} };
    profile.skills.windmill = { rank: "9", training: {} };
    profile.skillSlots = profile.skillSlots ?? Array(10).fill(null);
    profile.skillSlots[1] = "smash";
    profile.skillSlots[0] = "defense";
    arrive(profile, "lantern_rest");
    await saves.save({ id: "rt", name: profile.form.name, snapshot: profile }, 0, true);

    const session = new GameSession(saves);
    await session.initialize();
    const view = () => session.store.getState().view;
    const idle = async () => {
      await vi.waitFor(() => expect(view().busy).toBe(false), { interval: 1 });
      expect(view().error).toBe("");
    };

    // Verify out-of-combat skill cooldown metadata follows current skill rank.
    expect(view().skills.find((skill) => skill.id === "smash")?.cooldown).toBe(3);
    expect(view().skills.find((skill) => skill.id === "defense")?.cooldown).toBe(7);
    expect(view().skills.find((skill) => skill.id === "windmill")?.cooldown).toBe(3.5);

    // Load Smash out of combat.
    expect(session.actions.useSkillSlot(1)).toBe(true);
    await idle();
    expect(view().loadedSkill).toBe("smash");

    // Click a distant wolf to navigate and execute loaded Smash on arrival.
    const wolf = session.store.getState().mapView!.map.enemies.find((enemy) => enemy.sprite === "gray_wolf")!;
    expect(wolf).toBeDefined();
    session.actions.attackEnemy(wolf.id);
    for (let i = 0; i < 250 && (view().skillCooldowns.smash ?? 0) === 0; i++) {
      session.tick(0.11);
      await idle();
    }
    expect(Math.ceil(view().skillCooldowns.smash ?? 0)).toBe(3);
    expect(view().loadedSkill).toBeUndefined();
    // Cannot load Smash while cooling down.
    expect(session.actions.useSkillSlot(1)).toBe(false);

    // Finish countdown: 3 -> 2 -> 1 -> ready.
    session.tick(1);
    await idle();
    expect(Math.ceil(view().skillCooldowns.smash ?? 0)).toBe(2);
    session.tick(1);
    await idle();
    expect(Math.ceil(view().skillCooldowns.smash ?? 0)).toBe(1);
    session.tick(1);
    await idle();
    expect(view().skillCooldowns.smash).toBeUndefined();
    expect(session.actions.useSkillSlot(1)).toBe(true);
    await idle();

    // Load Defense in combat: cooldown stays 0 until blocking an enemy attack.
    if (view().encounter) {
      expect(session.actions.useSkillSlot(0)).toBe(true);
      await idle();
      expect(view().loadedSkill).toBe("defend");
      expect(view().skillCooldowns.defend).toBeUndefined();
      for (let i = 0; i < 60 && view().skillCooldowns.defend === undefined && view().encounter; i++) {
        session.tick(0.25);
        await idle();
      }
      expect(Math.ceil(view().skillCooldowns.defend ?? 0)).toBe(7);
    }
  } finally {
    await db.delete();
  }
});

it("persists out-of-combat Smash cooldowns across reload, enforces Windmill/Counterattack cooldowns, and keeps cooldown across dungeon movement", async () => {
  const db = new GameDatabase(`cooldown-regression-${crypto.randomUUID()}`);
  try {
    const saves = new SaveService<Profile>(db);
    const profile = newProfile(
      {
        name: "Cooldown Signal",
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
      77,
    );
    profile.skills.smash = { rank: "F", training: {} };
    profile.skills.windmill = { rank: "F", training: {} };
    profile.skills.counterattack = { rank: "F", training: {} };
    profile.skillSlots = ["combat_mastery", "defense", "smash", "counterattack", "windmill", null, null, null, null, null];
    arrive(profile, "lantern_rest");
    profile.map!.enemies = spawnTownWolves(profile.map!, profile.position, profile.wolfRespawns ?? {}, Date.now());
    const wolf = profile.map!.enemies.find((enemy) => enemy.sprite === "gray_wolf")!;
    expect(wolf).toBeDefined();
    const adjacentToWolf = [
      { x: wolf.x - 1, y: wolf.y },
      { x: wolf.x + 1, y: wolf.y },
      { x: wolf.x, y: wolf.y - 1 },
      { x: wolf.x, y: wolf.y + 1 },
    ].find((pt) => walkable(profile.map!, pt.x, pt.y) && !occupied(profile.map!, pt))!;
    expect(adjacentToWolf).toBeDefined();
    profile.position = adjacentToWolf;
    await saves.save({ id: "cd", name: profile.form.name, snapshot: profile }, 0, true);

    const session = new GameSession(saves);
    await session.initialize();
    const view = () => session.store.getState().view;
    const idle = async () => {
      await vi.waitFor(() => expect(view().busy).toBe(false), { interval: 1 });
      expect(view().error).toBe("");
    };
    await idle();

    // Adjacent out-of-combat Smash attack immediately puts Smash on a 3s cooldown and blocks reuse.
    expect(session.actions.useSkillSlot(2)).toBe(true);
    await idle();
    expect(view().loadedSkill).toBe("smash");
    session.actions.attackEnemy(wolf.id);
    await idle();
    expect(Math.ceil(view().skillCooldowns.smash ?? 0)).toBe(3);
    expect(view().loadedSkill).toBeUndefined();
    expect(session.actions.useSkillSlot(2)).toBe(false);

    // Windmill immediately triggers its 4s cooldown at rank F (Human) and blocks reuse.
    if (view().encounter) {
      expect(session.actions.useSkillSlot(4)).toBe(true);
      await idle();
      expect(Math.ceil(view().skillCooldowns.windmill ?? 0)).toBe(4);
      expect(session.actions.useSkillSlot(4)).toBe(false);

      // Finish the wolf so we test out-of-combat cooldown persistence across reload.
      for (let i = 0; i < 20 && view().encounter; i++) {
        session.actions.attackEnemy(wolf.id);
        await idle();
      }
      expect(view().encounter).toBeUndefined();
      expect((view().skillCooldowns.smash ?? 0) + (view().skillCooldowns.windmill ?? 0)).toBeGreaterThan(0);

      // Reopen character via a new GameSession and verify out-of-combat cooldowns survived and tick down.
      const reloaded = new GameSession(saves);
      await reloaded.initialize();
      const reloadedView = () => reloaded.store.getState().view;
      await vi.waitFor(() => expect(reloadedView().busy).toBe(false), { interval: 1 });
      expect((reloadedView().skillCooldowns.smash ?? 0) + (reloadedView().skillCooldowns.windmill ?? 0)).toBeGreaterThan(0);
      if ((reloadedView().skillCooldowns.smash ?? 0) > 0) {
        expect(reloaded.actions.useSkillSlot(2)).toBe(false);
      }
      reloaded.tick(4.1);
      expect(reloadedView().skillCooldowns.smash).toBeUndefined();
      expect(reloadedView().skillCooldowns.windmill).toBeUndefined();
      expect(reloaded.actions.useSkillSlot(2)).toBe(true);
      await vi.waitFor(() => expect(reloadedView().busy).toBe(false), { interval: 1 });
      // Toggle Smash back off before dungeon check.
      expect(reloaded.actions.useSkillSlot(2)).toBe(true);
      await vi.waitFor(() => expect(reloadedView().busy).toBe(false), { interval: 1 });
    }

    // Verify Threshold multi-enemy combat preserves Smash cooldown when moving during combat.
    const dungeonDb = new GameDatabase(`dungeon-cd-${crypto.randomUUID()}`);
    try {
      const dungeonSaves = new SaveService<Profile>(dungeonDb);
      const dProfile = newProfile(profile.form, 99);
      dProfile.hp = 500;
      dProfile.stamina = 200;
      dProfile.skills.smash = { rank: "F", training: {} };
      dProfile.skills.counterattack = { rank: "F", training: {} };
      dProfile.skillSlots = ["combat_mastery", "defense", "smash", "counterattack", null, null, null, null, null, null];
      arrive(dProfile, "threshold", 1);
      const multiRoom =
        dProfile.map!.enemies.find(
          (entry) => dProfile.map!.enemies.filter((other) => other.room === entry.room).length >= 2,
        )?.room ?? 1;
      if (multiRoom !== 1) arrive(dProfile, "threshold", multiRoom);
      const roomList = dProfile.map!.enemies.filter((entry) => entry.room === multiRoom);
      const firstEnemy = roomList[0];
      const secondEnemy = roomList[1];
      const adj = [
        { x: firstEnemy.x - 1, y: firstEnemy.y },
        { x: firstEnemy.x + 1, y: firstEnemy.y },
        { x: firstEnemy.x, y: firstEnemy.y - 1 },
        { x: firstEnemy.x, y: firstEnemy.y + 1 },
      ].find((pt) => walkable(dProfile.map!, pt.x, pt.y) && !occupied(dProfile.map!, pt))!;
      expect(adj).toBeDefined();
      dProfile.position = adj;
      await dungeonSaves.save({ id: "dun", name: dProfile.form.name, snapshot: dProfile }, 0, true);

      const dungeonSession = new GameSession(dungeonSaves);
      await dungeonSession.initialize();
      const dView = () => dungeonSession.store.getState().view;
      const dIdle = async () => {
        await vi.waitFor(() => expect(dView().busy).toBe(false), { interval: 1 });
        expect(dView().error).toBe("");
      };
      await dIdle();

      expect(dungeonSession.actions.useSkillSlot(2)).toBe(true);
      await dIdle();
      dungeonSession.actions.attackEnemy(firstEnemy.id);
      await dIdle();
      expect(Math.ceil(dView().skillCooldowns.smash ?? 0)).toBe(3);
      expect(secondEnemy).toBeDefined();
      expect(dView().encounter).toBeDefined();

      // Test Counterattack 7s cooldown on counter in combat BEFORE finishing remaining enemy.
      expect(dungeonSession.actions.useSkillSlot(3)).toBe(true);
      await dIdle();
      for (let i = 0; i < 60 && dView().skillCooldowns.counterattack === undefined && dView().encounter; i++) {
        dungeonSession.tick(0.25);
        await dIdle();
      }
      expect(Math.ceil(dView().skillCooldowns.counterattack ?? 0)).toBe(7);
      expect(dungeonSession.actions.useSkillSlot(3)).toBe(false);

      // Re-arm Smash once cooled down, engage remaining enemy, and verify stepping in Threshold during active combat keeps cooldown intact.
      if (dView().encounter) {
        const remaining = dView().encounter!.enemies[0];
        dungeonSession.tick(3.1);
        await dIdle();
        expect(dungeonSession.actions.useSkillSlot(2)).toBe(true);
        await dIdle();
        dungeonSession.actions.attackEnemy(remaining.mapEnemyId ?? remaining.id);
        await dIdle();
        expect(Math.ceil(dView().skillCooldowns.smash ?? 0)).toBe(3);
        const beforeCd = dView().skillCooldowns.smash ?? 0;
        dungeonSession.tick(0.25);
        await dIdle();
        expect(dView().skillCooldowns.smash ?? 0).toBeLessThan(beforeCd);
      }
    } finally {
      await dungeonDb.delete();
    }
  } finally {
    await db.delete();
  }
});
