import "fake-indexeddb/auto";
import { readFile } from "node:fs/promises";
import { Compiler } from "inkjs/full";
import { expect, it, vi } from "vitest";
import { GameSession } from "../../src/game/core/session";
import { arrive, newProfile, type Profile } from "../../src/game/core/profile";
import { GameDatabase, SaveService } from "../../src/game/persistence";
import type { Point } from "../../src/app/contracts";
import { mapKey } from "../../src/game/core/profile";
import { walkable } from "../../src/game/world/world";

it("crosses the six-room Threshold in both directions with quest, gates and durable reload", async () => {
  vi.stubGlobal("fetch", async (url: string) => {
    const source = url.replace("/assets/", "assets/").replace(/\.json$/, ".ink");
    const compiled = new Compiler(await readFile(source, "utf8")).Compile().ToJson();
    if (typeof compiled !== "string") throw new Error("Ink compilation produced no story.");
    return new Response(compiled);
  });
  const db = new GameDatabase(`journey-${crypto.randomUUID()}`);
  const saves = new SaveService<Profile>(db);
  const profile = newProfile(
    {
      name: "Journey Signal",
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
  // A durable high-level fixture makes the journey about routing and transaction integration.
  profile.level = 200;
  profile.hp = 911;
  profile.tonics = 10;
  arrive(profile, "lantern_rest");
  await saves.save({ id: "journey", name: profile.form.name, snapshot: profile }, 0);
  await saves.setSetting("active", "journey");
  const session = new GameSession(saves);
  const view = () => session.store.getState().view;
  const state = async () => (await saves.load("journey"))!.snapshot;
  const idle = async () => {
    await vi.waitFor(() => expect(view().busy).toBe(false), { interval: 1 });
    expect(view().error).toBe("");
  };
  const choose = async (id: string) => {
    expect(view().details.options.some((option) => option.id === id && !option.disabled)).toBe(true);
    session.actions.choose(id);
    await idle();
  };
  const settleCombat = async () => {
    for (let turn = 0; view().encounter && turn < 300; turn++) {
      session.actions.combat("attack");
      await idle();
      session.tick(0.25);
      await idle();
    }
    expect(view().encounter).toBeUndefined();
    if (view().panel === "loot") {
      session.actions.takeLoot();
      await idle();
    }
  };
  const travel = async (point: Point, interact = false) => {
    session.actions.navigate("world");
    session.travelTo(point);
    for (let step = 0; step < 600; step++) {
      session.tick(0.11);
      await idle();
      if (view().encounter) {
        await settleCombat();
        session.travelTo(point);
      }
      const position = session.store.getState().mapView!.position;
      if (Math.abs(point.x - position.x) + Math.abs(point.y - position.y) <= (interact ? 1 : 0)) break;
    }
    const position = session.store.getState().mapView!.position;
    expect(Math.abs(point.x - position.x) + Math.abs(point.y - position.y)).toBeLessThanOrEqual(interact ? 1 : 0);
    if (interact) {
      session.actions.interact();
      await idle();
    }
  };
  const visit = async (id: string) => {
    const landmark = session.store.getState().mapView!.map.landmarks.find((place) => place.id === id)!;
    expect(landmark).toBeDefined();
    await travel(landmark, true);
  };
  try {
    await session.initialize();
    await idle();
    await visit("warden");
    await choose("quest-accept");
    await visit("gate");
    await choose("gate-register");
    await visit("dungeon");
    await choose("enter");
    const initial = await state();
    const floorKey = mapKey(initial);
    expect(initial.map!.id).toBe("threshold-floor");
    expect(initial.map!.doors).toBeUndefined();
    expect(initial.map!.gates).toHaveLength(5);
    for (const gate of initial.map!.gates!) expect(walkable(initial.map!, gate.x, gate.y)).toBe(false);
    for (const room of [1, 2, 3, 4, 5, 6]) {
      const map = session.store.getState().mapView!.map;
      const enemy = map.enemies.find((enemy) => enemy.room === room)!;
      expect(enemy).toBeDefined();
      await travel(enemy);
      await settleCombat();
      const cleared = await state();
      expect(cleared.room).toBe(room);
      expect(cleared.cleared).toContain(room);
      expect(cleared.map!.id).toBe("threshold-floor");
      expect(mapKey(cleared)).toBe(floorKey);
      expect(cleared.map!.enemies.some((enemy) => enemy.room === room)).toBe(false);
      for (const gate of cleared.map!.gates!) {
        expect(walkable(cleared.map!, gate.x, gate.y)).toBe(gate.room <= room);
      }
      if (room === 1) {
        expect(cleared.map!.enemies.map((enemy) => enemy.id)).toEqual(
          initial.map!.enemies.filter((enemy) => enemy.room !== 1).map((enemy) => enemy.id),
        );
        const restored = new GameSession(saves);
        await restored.initialize();
        expect(restored.store.getState().mapView!.map.tiles).toEqual(cleared.map!.tiles);
        expect(restored.store.getState().mapView!.explored).toEqual(cleared.explored[floorKey]);
      }
      session.actions.navigate("world");
    }
    expect((await state()).cleared).toHaveLength(6);
    expect((await state()).room).toBe(6);
    await visit("treasure");
    await choose("treasure");
    const beforeLoot = await state();
    expect(view().loot.map(({ id }) => id)).toEqual(["gold", "tonic"]);
    session.actions.takeLoot(["gold"]);
    await idle();
    const partialLoot = await state();
    expect(partialLoot.gold).toBe(beforeLoot.gold + 60);
    expect(partialLoot.pending).toEqual({ tonic: 3 });
    expect(partialLoot.tonics).toBe(beforeLoot.tonics);
    expect(view().panel).toBe("loot");
    session.actions.panel();
    session.actions.interact();
    expect(view().panel).toBe("loot");
    session.actions.takeLoot();
    await idle();
    expect((await state()).pending).toEqual({});
    expect((await state()).tonics).toBe(beforeLoot.tonics + 3);
    await visit("far-exit");
    await choose("complete");
    expect((await state()).location).toBe("spindle_hollow");
    await visit("warden");
    await choose("quest-reward");
    await visit("gate");
    await choose("gate-register");
    const completed = await state();
    await visit("dungeon");
    await choose("enter");
    expect((await state()).room).toBe(6);
    expect((await state()).run).toBe(completed.run);
    expect((await state()).cleared).toEqual(completed.cleared);
    expect((await state()).treasure).toBe(true);
    const reverseReload = new GameSession(saves);
    await reverseReload.initialize();
    expect(reverseReload.store.getState().view.location).toBe("The Threshold");
    expect(reverseReload.store.getState().mapView!.map.id).toBe("threshold-floor");
    expect(session.store.getState().mapView!.map.enemies).toEqual([]);
    for (const room of [...session.store.getState().mapView!.map.rooms!].reverse()) {
      await travel({ x: room.x + 1, y: room.y + 2 });
      expect((await state()).room).toBe(room.id);
      expect(view().encounter).toBeUndefined();
      expect(mapKey(await state())).toBe(floorKey);
    }
    await visit("return");
    await choose("retreat");
    expect((await state()).location).toBe("lantern_rest");
    expect((await state()).pending).toEqual(completed.pending);
    expect((await state()).completions).toBe(completed.completions);
    session.actions.panel("gates");
    await choose("travel:spindle_hollow");
    session.actions.panel("gates");
    await choose("travel:lantern_rest");
    expect((await state()).location).toBe("lantern_rest");
    const reloaded = new GameSession(saves);
    await reloaded.initialize();
    expect(reloaded.store.getState().view.screen).toBe("world");
    expect((await state()).quest).toBe(3);
    expect((await state()).gates).toEqual(["lantern_rest", "spindle_hollow"]);
  } finally {
    db.close();
    await db.delete();
    vi.unstubAllGlobals();
  }
}, 30000);

it("wins the first encounter with a new character and takes its loot", async () => {
  const db = new GameDatabase(`novice-${crypto.randomUUID()}`);
  const saves = new SaveService<Profile>(db);
  const profile = newProfile(
    {
      name: "Novice Signal",
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
    411,
  );
  arrive(profile, "threshold");
  // Start at the room's central approach without changing any character stats.
  const enemy = profile.map!.enemies[0];
  profile.position = { x: enemy.x - 2, y: enemy.y };
  await saves.save({ id: "novice", name: profile.form.name, snapshot: profile }, 0);
  await saves.setSetting("active", "novice");
  const session = new GameSession(saves);
  const view = () => session.store.getState().view;
  const idle = async () => {
    await vi.waitFor(() => expect(view().busy).toBe(false), { interval: 1 });
    expect(view().error).toBe("");
  };
  try {
    await session.initialize();
    session.step(1, 0);
    await idle();
    expect(view().encounter).toBeDefined();
    for (let turn = 0; view().encounter && turn < 300; turn++) {
      session.actions.combat("attack");
      await idle();
      session.tick(0.25);
      await idle();
    }
    expect(view().encounter).toBeUndefined();
    expect(view().panel).toBe("loot");
    expect(view().player!.hp).toBeGreaterThan(0);
    const before = (await saves.load("novice"))!.snapshot;
    expect(before.cleared).toEqual([1]);
    session.actions.takeLoot();
    await idle();
    const after = (await saves.load("novice"))!.snapshot;
    expect(after.pending).toEqual({});
    expect(after.gold).toBe(before.gold + (before.pending.gold ?? 0));
    expect(after.materials.cobweb).toBe(before.materials.cobweb + (before.pending.cobweb ?? 0));
    const restored = new GameSession(saves);
    await restored.initialize();
    expect(restored.store.getState().view.player!.hp).toBe(after.hp);
  } finally {
    db.close();
    await db.delete();
  }
});
