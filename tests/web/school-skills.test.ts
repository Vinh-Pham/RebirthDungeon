import "fake-indexeddb/auto";
import { readFile } from "node:fs/promises";
import { Compiler } from "inkjs/full";
import { expect, it, vi } from "vitest";
import { arrive, newProfile, validateProfile, type Profile } from "../../src/game/core/profile";
import { GameDatabase, SaveService } from "../../src/game/persistence";
import { GameSession } from "../../src/game/core/session";
import { Combat } from "../../src/game/systems/combat";

const travelerForm = {
  name: "School Candidate",
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
};

function setupHelpers(session: GameSession) {
  const view = () => session.store.getState().view;
  const idle = async () => {
    await vi.waitFor(() => expect(view().busy).toBe(false), { interval: 1 });
    expect(view().error).toBe("");
  };
  return { view, idle };
}

it("teaches Counterattack & Windmill at School, locks Smash behind 5 Gray Wolves quest, and rejects direct mastery learns", async () => {
  const profile = newProfile(travelerForm, 501);
  arrive(profile, "lantern_rest");
  const school = profile.map!.landmarks.find((place) => place.id === "school")!;
  profile.position = { x: school.x, y: school.y + 1 };

  const db = new GameDatabase(`school-${crypto.randomUUID()}`);
  const saves = new SaveService<Profile>(db);
  try {
    await saves.save({ id: "school", name: profile.form.name, snapshot: profile }, 0, true);
    let session = new GameSession(saves);
    await session.initialize();
    let { view, idle } = setupHelpers(session);

    session.actions.interact();
    await idle();
    session.actions.choose("study");
    const optionIds = view().details.options.map((entry) => entry.id);
    expect(optionIds).toEqual(["learn:windmill", "learn:counterattack", "quest:smash-accept"]);

    // Direct learn of masteries, critical_hit, or smash is ignored.
    for (const forbidden of [
      "learn:smash",
      "learn:critical_hit",
      "learn:light_armor_mastery",
      "learn:heavy_armor_mastery",
      "learn:shield_mastery",
      "learn:sword_mastery",
      "learn:dual_wield_mastery",
    ]) {
      session.actions.choose(forbidden);
      await idle();
    }
    expect(Object.keys(profile.skills)).toEqual(["combat_mastery", "defense"]);

    // Learn Counterattack at the School.
    session.actions.choose("learn:counterattack");
    await idle();
    expect(view().skills.find((skill) => skill.id === "counterattack")?.rank).toBe("F");

    // Accept the Smash Trial quest and verify Journal progress.
    session.actions.choose("quest:smash-accept");
    await idle();
    expect(view().details.options.find((entry) => entry.id === "quest:smash-claim")).toMatchObject({
      disabled: true,
      label: "Learn Smash · Gray Wolves (0/5)",
    });

    session.actions.panel("journal");
    expect(view().details.body).toContain("Smash Trial (0/5 Gray Wolves)");
    session.actions.panel();

    // Defeating a White Wolf does not progress Smash Trial; defeating 5 Gray Wolves does.
    const saved = (await saves.load("school"))!;
    const wolves = saved.snapshot.map!.enemies;
    const gray = wolves.find((enemy) => enemy.sprite === "gray_wolf")!;
    const white = wolves.find((enemy) => enemy.sprite === "white_wolf")!;
    expect(gray).toBeDefined();
    expect(white).toBeDefined();

    // Fight White Wolf first: should remain 0/5.
    saved.snapshot.wolfOpponent = white.id;
    const whiteBattle = new Combat(
      { ...saved.snapshot.battle?.player, name: "Tester", health: 200, damage_min: 250, damage_max: 250 },
      [{ name: "White Wolf", health: 50, damage_min: 1, damage_max: 1 }],
    );
    whiteBattle.executeAttack(0, "attack");
    saved.snapshot.battle = whiteBattle.snapshot();
    // Apply via GameSession resume + finish tick or simulate 5 gray defeats in sequence cleanly.
    const winWolf = async (wolfId: string, name: string) => {
      const current = (await saves.load("school"))!;
      if (!current.snapshot.map!.enemies.some((e) => e.id === wolfId)) {
        current.snapshot.map!.enemies.push({
          id: wolfId,
          name,
          sprite: wolfId.includes("white") ? "white_wolf" : "gray_wolf",
          x: school.x,
          y: school.y + 1,
          speed: 1,
        });
      }
      const wolf = current.snapshot.map!.enemies.find((e) => e.id === wolfId)!;
      current.snapshot.position = { x: wolf.x, y: wolf.y };
      const battle = new Combat(
        { name: "Tester", health: 200, stamina: 100, damage_min: 300, damage_max: 300 },
        [{ name, health: 10, damage_min: 1, damage_max: 1 }],
      );
      current.snapshot.wolfOpponent = wolfId;
      current.snapshot.battle = battle.snapshot();
      await saves.save(current, current.revision, true);
      session = new GameSession(saves);
      await session.initialize();
      ({ view, idle } = setupHelpers(session));
      session.actions.combat("attack");
      await idle();
      if (view().panel === "loot") {
        session.actions.takeLoot();
        await idle();
      }
    };

    await winWolf(white.id, "White Wolf");
    expect((await saves.load("school"))!.snapshot.quests?.smash?.grayWolvesDefeated).toBe(0);

    for (let kill = 1; kill <= 5; kill++) {
      await winWolf(`wolf_spawn_gray_${kill}`, "Gray Wolf");
      expect((await saves.load("school"))!.snapshot.quests?.smash?.grayWolvesDefeated).toBe(kill);
    }

    // Move back next to school, interact, and claim Smash.
    const ready = (await saves.load("school"))!;
    ready.snapshot.position = { x: school.x, y: school.y + 1 };
    expect(validateProfile(ready.snapshot)).toBe(true);
    await saves.save(ready, ready.revision, true);
    session = new GameSession(saves);
    await session.initialize();
    ({ view, idle } = setupHelpers(session));

    session.actions.panel("journal");
    expect(view().details.body).toContain("Smash Trial (5/5 Gray Wolves)");
    session.actions.panel();

    session.actions.interact();
    await idle();
    session.actions.choose("study");
    expect(view().details.options.find((entry) => entry.id === "quest:smash-claim")?.disabled).toBe(false);
    session.actions.choose("quest:smash-claim");
    await idle();

    expect(view().skills.find((skill) => skill.id === "smash")?.rank).toBe("F");
    session.actions.panel("journal");
    expect(view().details.body).toBe("No active quests.");

    // Reload persistence check.
    const reloaded = new GameSession(saves);
    await reloaded.initialize();
    expect(reloaded.store.getState().view.skills.find((skill) => skill.id === "counterattack")?.rank).toBe("F");
    expect(reloaded.store.getState().view.skills.find((skill) => skill.id === "smash")?.rank).toBe("F");
  } finally {
    await db.delete();
  }
});

it("unlocks Critical Hit on first critical hit and unlocks equipment masteries on first equip", async () => {
  vi.stubGlobal("fetch", async (url: string) => {
    const source = url.replace("/assets/", "assets/").replace(/\.json$/, ".ink");
    const compiled = new Compiler(await readFile(source, "utf8")).Compile().ToJson();
    if (typeof compiled !== "string") throw new Error("Ink compilation produced no story.");
    return new Response(compiled);
  });
  const profile = newProfile(travelerForm, 502);
  arrive(profile, "lantern_rest");
  profile.gold = 4_000;
  profile.inventory.items.push(
    {
      id: "studded_cuirassier",
      name: "Studded Cuirassier",
      width: 2,
      height: 3,
      x: 0,
      y: 0,
      quantity: 1,
      stackLimit: 1,
      slot: "armor",
      durability: 15000,
    },
    {
      id: "round_shield",
      name: "Round Shield",
      width: 2,
      height: 3,
      x: 2,
      y: 0,
      quantity: 1,
      stackLimit: 1,
      slot: "off_hand",
      durability: 15000,
    },
  );
  const blacksmith = profile.map!.landmarks.find((place) => place.id === "blacksmith")!;
  profile.position = { x: blacksmith.x, y: blacksmith.y + 1 };

  const db = new GameDatabase(`unlocks-${crypto.randomUUID()}`);
  const saves = new SaveService<Profile>(db);
  try {
    await saves.save({ id: "unlocks", name: profile.form.name, snapshot: profile }, 0, true);
    let session = new GameSession(saves);
    await session.initialize();
    let { view, idle } = setupHelpers(session);

    const hasSkill = (id: string) => view().skills.some((skill) => skill.id === id);
    expect(hasSkill("sword_mastery")).toBe(false);
    expect(hasSkill("light_armor_mastery")).toBe(false);
    expect(hasSkill("heavy_armor_mastery")).toBe(false);
    expect(hasSkill("shield_mastery")).toBe(false);
    expect(hasSkill("dual_wield_mastery")).toBe(false);
    expect(hasSkill("critical_hit")).toBe(false);

    // Blacksmith starter gear unlocks Sword Mastery and Light Armor Mastery.
    session.actions.interact();
    await idle();
    session.actions.choose("starter-sword");
    await idle();
    expect(hasSkill("sword_mastery")).toBe(true);
    session.actions.choose("starter-armor");
    await idle();
    expect(hasSkill("light_armor_mastery")).toBe(true);

    // Buy a second 1H sword (Dagger) + Short Sword for dual wield test.
    session.actions.choose("shop");
    for (const item of ["dagger", "short_sword"]) {
      session.actions.choose(`buy:${item}`);
      await idle();
    }
    session.actions.panel();

    // Equip Heavy Armor -> Heavy Armor Mastery.
    session.actions.choose("equip:studded_cuirassier");
    await idle();
    expect(hasSkill("heavy_armor_mastery")).toBe(true);

    // Equip Round Shield -> Shield Mastery.
    session.actions.choose("equip:round_shield");
    await idle();
    expect(hasSkill("shield_mastery")).toBe(true);
    expect(view().inventory.equipment.off_hand?.id).toBe("round_shield");
    expect(hasSkill("dual_wield_mastery")).toBe(false);

    // Unequip shield, then equip Dagger into empty off_hand while Ashen Arcblade (1H sword) is in main_hand -> Dual Wield Mastery.
    session.actions.choose("equip:round_shield");
    await idle();
    session.actions.choose("equip:dagger");
    await idle();
    expect(view().inventory.equipment.main_hand?.id).toBe("ashen_arcblade");
    expect(view().inventory.equipment.off_hand?.id).toBe("dagger");
    expect(hasSkill("dual_wield_mastery")).toBe(true);

    // Explicitly replace offhand with Short Sword via equip-offhand.
    session.actions.choose("equip-offhand:short_sword");
    await idle();
    expect(view().inventory.equipment.off_hand?.id).toBe("short_sword");
    expect(validateProfile((await saves.load("unlocks"))!.snapshot)).toBe(true);

    // Score first critical hit in combat -> unlocks Critical Hit at rank F.
    const saved = (await saves.load("unlocks"))!;
    const enemy = saved.snapshot.map!.enemies.find((candidate) => candidate.sprite === "gray_wolf")!;
    saved.snapshot.wolfOpponent = enemy.id;
    const critBattle = new Combat(
      {
        name: "Crit Tester",
        health: 200,
        stamina: 100,
        damage_min: 100,
        damage_max: 100,
        critical: 100,
        critical_cap: 100,
        critical_enabled: true,
        critical_multiplier: 1.5,
      },
      [{ name: "Gray Wolf", health: 500, damage_min: 1, damage_max: 1 }],
    );
    critBattle.enemies[0].intent = "counterattack";
    saved.snapshot.battle = critBattle.snapshot();
    await saves.save(saved, saved.revision, true);

    session = new GameSession(saves);
    await session.initialize();
    ({ view, idle } = setupHelpers(session));

    session.actions.combat("attack");
    await idle();
    expect(view().skills.find((skill) => skill.id === "critical_hit")?.rank).toBe("F");
  } finally {
    await db.delete();
    vi.unstubAllGlobals();
  }
});
