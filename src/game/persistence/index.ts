import Dexie, { type Table } from "dexie";

export interface SaveRecord<T extends object = Record<string, unknown>> {
  id: string;
  name: string;
  revision: number;
  updatedAt: number;
  snapshot: T;
}

interface Setting {
  key: string;
  value: unknown;
}
export class GameDatabase extends Dexie {
  saves!: Table<SaveRecord, string>;
  settings!: Table<Setting, string>;
  constructor(name = "rebirth-dungeon-web-v2") {
    super(name);
    this.version(1).stores({ saves: "id,name,updatedAt", settings: "key" });
  }
}

export class SaveConflictError extends Error {
  constructor() {
    super("This character changed in another tab. Reload before continuing.");
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export class SaveService<T extends object> {
  constructor(readonly db = new GameDatabase()) {}

  async list(): Promise<SaveRecord<T>[]> {
    return (await this.db.saves.orderBy("name").toArray()) as SaveRecord<T>[];
  }

  async load(id: string): Promise<SaveRecord<T> | undefined> {
    return (await this.db.saves.get(id)) as SaveRecord<T> | undefined;
  }

  async save(
    candidate: { id: string; name: string; snapshot: T },
    expectedRevision: number,
    remember = false,
  ): Promise<SaveRecord<T>> {
    if (!candidate.id || !candidate.name.trim())
      throw new Error("A character needs an ID and name.");
    const snapshot = clone(candidate.snapshot);
    return this.db.transaction(
      "rw",
      this.db.saves,
      this.db.settings,
      async () => {
        const previous = await this.db.saves.get(candidate.id);
        if ((previous?.revision ?? 0) !== expectedRevision)
          throw new SaveConflictError();
        const record = {
          ...candidate,
          snapshot,
          revision: expectedRevision + 1,
          updatedAt: Date.now(),
        };
        await this.db.saves.put(record as SaveRecord);
        if (remember)
          await this.db.settings.put({ key: "active", value: candidate.id });
        return record;
      },
    );
  }

  async delete(id: string, expectedRevision: number): Promise<void> {
    await this.db.transaction(
      "rw",
      this.db.saves,
      this.db.settings,
      async () => {
        const previous = await this.db.saves.get(id);
        if (!previous || previous.revision !== expectedRevision)
          throw new SaveConflictError();
        await this.db.saves.delete(id);
        if ((await this.db.settings.get("active"))?.value === id)
          await this.db.settings.delete("active");
      },
    );
  }

  async getSetting<V>(key: string, fallback: V): Promise<V> {
    const setting = await this.db.settings.get(key);
    return setting ? (setting.value as V) : fallback;
  }

  async setSetting(key: string, value: unknown): Promise<void> {
    await this.db.settings.put({ key, value: clone(value) });
  }
}
