import "fake-indexeddb/auto";
import { afterEach, expect, test } from "vitest";
import {
  GameDatabase,
  SaveService,
  SaveConflictError,
} from "../../src/game/persistence";

const databases: GameDatabase[] = [];
function service() {
  const db = new GameDatabase("test-" + crypto.randomUUID());
  databases.push(db);
  return new SaveService<{ gold: number }>(db);
}
afterEach(async () => {
  await Promise.all(databases.splice(0).map((db) => db.delete()));
});
test("a stale writer cannot overwrite a committed character", async () => {
  const store = service();
  await store.save({ id: "hero", name: "Hero", snapshot: { gold: 5 } }, 0);
  await expect(
    store.save({ id: "hero", name: "Hero", snapshot: { gold: 99 } }, 0),
  ).rejects.toBeInstanceOf(SaveConflictError);
  expect((await store.load("hero"))?.snapshot.gold).toBe(5);
});
test("the current save database starts fresh and resumes its new character", async () => {
  const previousDb = new GameDatabase("rebirth-dungeon-web");
  const currentDb = new GameDatabase();
  databases.push(previousDb, currentDb);
  const previous = new SaveService<{ gold: number }>(previousDb);
  const current = new SaveService<{ gold: number }>(currentDb);
  await previous.save(
    { id: "old", name: "Old traveler", snapshot: { gold: 5 } },
    0,
    true,
  );

  expect(await current.list()).toEqual([]);
  expect(await current.getSetting("active", null)).toBeNull();
  await current.save(
    { id: "new", name: "New traveler", snapshot: { gold: 24 } },
    0,
    true,
  );
  currentDb.close();

  const reopenedDb = new GameDatabase();
  const reopened = new SaveService<{ gold: number }>(reopenedDb);
  try {
    expect(await reopened.getSetting("active", null)).toBe("new");
    expect((await reopened.load("new"))?.snapshot.gold).toBe(24);
    expect(await reopened.load("old")).toBeUndefined();
    expect((await previous.load("old"))?.snapshot.gold).toBe(5);
  } finally {
    reopenedDb.close();
  }
});
