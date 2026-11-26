import "fake-indexeddb/auto";
import { expect, it, vi } from "vitest";
import { arrive, newProfile, type Profile } from "../../src/game/core/profile";
import { GameSession } from "../../src/game/core/session";
import { GameDatabase, SaveService } from "../../src/game/persistence";

it("ages once per week and retains wound-limited recovery through reload", async () => {
  const created = Date.parse("2026-11-21T20:00:00Z");
  const now = Date.parse("2026-12-05T20:00:00Z");
  const profile = newProfile(
    {
      name: "Returning Delver",
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
    17,
    created,
  );
  arrive(profile, "spindle_hollow");
  Object.assign(profile, { hp: 107, wounds: 10, mp: 70, stamina: 80 });
  const db = new GameDatabase(`character-vitals-${crypto.randomUUID()}`);
  const saves = new SaveService<Profile>(db);
  const id = "delver";
  const load = async () => (await saves.load(id))!;
  try {
    await saves.save({ id, name: profile.form.name, snapshot: profile }, 0, true);
    let session = new GameSession(saves, () => now);
    const idle = () => vi.waitFor(() => expect(session.store.getState().view.busy).toBe(false), { interval: 1 });
    await session.initialize();
    expect((await load()).snapshot).toMatchObject({ age: 19, ap: 15, hp: 107, mp: 70, stamina: 80, wounds: 10 });
    expect(session.store.getState().view.player?.maxHp).toBe(120);

    session.tick(20);
    await idle();
    expect((await load()).snapshot).toMatchObject({ hp: 109, mp: 71, stamina: 88, wounds: 10 });
    session.tick(20);
    await idle();
    const recovered = await load();
    expect(recovered.snapshot).toMatchObject({ hp: 110, mp: 72, stamina: 96, wounds: 10 });

    session = new GameSession(saves, () => now);
    await session.initialize();
    expect(await load()).toEqual(recovered);
    session.actions.choose("heal");
    await idle();
    expect((await load()).snapshot).toMatchObject({ age: 19, ap: 15, hp: 120, mp: 72, stamina: 96, wounds: 0 });
  } finally {
    await db.delete();
  }
});
