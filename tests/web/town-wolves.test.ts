import "fake-indexeddb/auto";
import { expect, it, vi } from "vitest";
import { GameSession } from "../../src/game/core/session";
import { xpForLevel } from "../../src/game/content/level-experience";
import { arrive, newProfile, type Profile } from "../../src/game/core/profile";
import { GameDatabase, SaveService } from "../../src/game/persistence";
import { GRASS } from "../../src/game/world/world";

it("populates a legacy town, roams on grass, and retains an independent wolf respawn through reload", async () => {
  let now = 1_800_000_000_000;
  const profile = newProfile(
    {
      name: "Wolf Ranger",
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
    now,
  );
  profile.level = 150;
  profile.xp = xpForLevel(151) - 50;
  profile.hp = 850;
  profile.cleared = [1];
  profile.run = 2;
  arrive(profile, "lantern_rest");
  profile.map!.enemies = [];
  const db = new GameDatabase(`wolves-${crypto.randomUUID()}`);
  const saves = new SaveService<Profile>(db);
  try {
    await saves.save({ id: "ranger", name: profile.form.name, snapshot: profile }, 0, true);
    let session = new GameSession(saves, () => now);
    const idle = async () => {
      await vi.waitFor(() => expect(session.store.getState().view.busy).toBe(false), { interval: 1 });
      expect(session.store.getState().view.error).toBe("");
    };
    await session.initialize();
    await idle();
    const state = async () => (await saves.load("ranger"))!.snapshot;
    for (let i = 0; i < 30; i++) {
      session.tick(0.1);
      await idle();
    }
    const populated = await state();
    expect(populated.map!.enemies).toHaveLength(4);
    expect(new Set(populated.map!.enemies.map((wolf) => wolf.sprite))).toEqual(new Set(["gray_wolf", "white_wolf"]));
    const positions = populated.map!.enemies.map(({ x, y }) => `${x},${y}`);
    now += 2500;
    for (let i = 0; i < 30; i++) {
      session.tick(0.1);
      await idle();
    }
    const roaming = await state();
    expect(roaming.map!.enemies.map(({ x, y }) => `${x},${y}`)).not.toEqual(positions);
    expect(new Set(roaming.map!.enemies.map(({ x, y }) => `${x},${y}`)).size).toBe(4);
    for (const wolf of roaming.map!.enemies)
      expect(roaming.map!.tiles[wolf.y * roaming.map!.width + wolf.x]).toBe(GRASS);
    const wolf = roaming.map!.enemies.find((enemy) => enemy.sprite === "gray_wolf")!;
    roaming.position = { x: wolf.x - 1, y: wolf.y };
    const record = (await saves.load("ranger"))!;
    await saves.save({ id: record.id, name: record.name, snapshot: roaming }, record.revision);
    session = new GameSession(saves, () => now);
    await session.initialize();
    session.step(1, 0);
    await idle();
    expect(session.store.getState().view.encounter?.enemies[0].maxHp).toBe(90);
    for (let i = 0; i < 300 && session.store.getState().view.encounter; i++) {
      session.actions.combat("attack");
      await idle();
      session.tick(0.25);
      await idle();
    }
    expect(session.store.getState().view.encounter).toBeUndefined();
    const killed = await state();
    expect(killed.wolfRespawns?.[wolf.id]).toBe(now + 120_000);
    expect(killed.xp - profile.xp).toBe(93);
    expect([killed.level, killed.ap]).toEqual([151, profile.ap + 1]);
    expect(killed.pending.gold).toBeGreaterThanOrEqual(11);
    expect(killed.pending.gold).toBeLessThanOrEqual(50);
    expect(killed.map!.enemies).toHaveLength(3);
    expect(killed.cleared).toEqual(profile.cleared);
    expect(killed.run).toBe(profile.run);
    session = new GameSession(saves, () => now);
    await session.initialize();
    expect((await state()).map!.enemies.some((enemy) => enemy.id === wolf.id)).toBe(false);
    now += 119_999;
    session.actions.panel(undefined);
    session.tick(2);
    await idle();
    expect((await state()).map!.enemies.some((enemy) => enemy.id === wolf.id)).toBe(false);
    now++;
    for (let i = 0; i < 30; i++) {
      session.tick(0.1);
      await idle();
    }
    const respawned = await state();
    expect(respawned.map!.enemies).toHaveLength(4);
    expect(respawned.map!.enemies.some((enemy) => enemy.id === wolf.id)).toBe(true);

    const white = respawned.map!.enemies.find((enemy) => enemy.sprite === "white_wolf")!;
    session.travelTo(white);
    for (let i = 0; i < 200 && !session.store.getState().view.encounter; i++) {
      session.tick(0.11);
      await idle();
    }
    expect(session.store.getState().view.encounter?.enemies).toMatchObject([{ name: "White Wolf", hp: 160 }]);
    expect((await state()).wolfOpponent).toBe(white.id);
    session = new GameSession(saves, () => now);
    await session.initialize();
    expect(session.store.getState().view.encounter?.enemies).toMatchObject([{ name: "White Wolf", hp: 160 }]);
  } finally {
    await db.delete();
  }
});
