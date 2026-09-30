import type { ContentRegistry } from '../engine/data/ContentRegistry';
import { encodeSave, parseSave, type CampaignState } from './SaveSchema';
export type SaveSlot = 'auto' | '1' | '2' | '3';
export interface SaveRow { id: SaveSlot; savedAt: string; payload: string }
export interface SaveStorage {
  read(id: SaveSlot): Promise<SaveRow | undefined>;
  list(): Promise<SaveRow[]>;
  write(row: SaveRow): Promise<void>;
  close(): Promise<void>;
}
export function validateSlot(slot: SaveSlot) { if (!['auto', '1', '2', '3'].includes(slot)) throw new Error('Invalid save slot'); }
/** Serializes reads/writes so an older autosave cannot overtake a manual save. */
export class SaveRepository {
  private chain: Promise<unknown> = Promise.resolve();
  constructor(private storage: SaveStorage, private content: ContentRegistry) {}
  save(slot: SaveSlot, state: CampaignState): Promise<void> {
    validateSlot(slot); const savedAt = new Date().toISOString(); const payload = encodeSave(state, this.content, savedAt);
    return this.enqueue(() => this.storage.write({ id: slot, savedAt, payload }));
  }
  load(slot: SaveSlot): Promise<CampaignState | undefined> {
    validateSlot(slot);
    return this.enqueue(async () => {
      const row = await this.storage.read(slot);
      return row ? parseSave(JSON.parse(row.payload), this.content).campaign : undefined;
    });
  }
  list(): Promise<Omit<SaveRow, 'payload'>[]> {
    return this.enqueue(async () => (await this.storage.list()).map(({ id, savedAt }) => ({ id, savedAt })));
  }
  close(): Promise<void> { return this.enqueue(() => this.storage.close()); }
  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.chain.then(operation); this.chain = result.catch(() => {}); return result;
  }
}
