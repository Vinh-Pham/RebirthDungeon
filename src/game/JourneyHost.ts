import type { ContentRegistry } from '../engine/data/ContentRegistry';
import { SaveRepository, type SaveSlot, type SaveStorage } from '../persistence/SaveRepository';
import { AutoSaver } from '../persistence/AutoSaver';
import { JourneySession } from './JourneySession';
import type { GrowthTalent } from '../engine/rpg/Stats';
import type { BattleSession } from './BattleSession';
interface HostView { session?: JourneySession; battle?: BattleSession; revision: number; busy: boolean; storageAvailable: boolean; error?: string;
  notice?: string; slots: { id: SaveSlot; savedAt: string }[] }
const empty: HostView = { revision: 0, busy: true, storageAvailable: false, slots: [] };
const pendingStops = new Set<Promise<void>>();
export async function settleJourneySaves() { await Promise.all([...pendingStops]); }
export class JourneyHost {
  private snapshot: HostView = empty;
  private listeners = new Set<() => void>();
  private repository?: SaveRepository;
  private autosaver?: AutoSaver;
  private unsubscribe?: () => void;
  private generation = 0;
  constructor(readonly content: ContentRegistry, private createStorage: () => Promise<SaveStorage>, private characterName?: string, private growthTalent?: GrowthTalent) {}
  getSnapshot = () => this.snapshot;
  getServerSnapshot = () => empty;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    if (this.listeners.size === 1) void this.start();
    return () => {
      this.listeners.delete(listener);
      if (!this.listeners.size) void this.stop();
    };
  };
  async save(slot: SaveSlot) {
    if (this.snapshot.busy || !this.snapshot.session || !this.repository || this.snapshot.battle) return;
    const generation = this.generation; const repository = this.repository; const saver = this.autosaver;
    this.update({ busy: true, error: undefined });
    try {
      const state = this.snapshot.session.toSave();
      await saver?.flush(); await repository.save(slot, state);
      const slots = await repository.list();
      if (generation === this.generation) this.update({ slots, notice: `Saved to slot ${slot}.` });
    } catch (error) { if (generation === this.generation) this.fail(error); } finally { if (generation === this.generation) this.update({ busy: false }); }
  }
  async load(slot: SaveSlot) {
    if (this.snapshot.busy || !this.repository || this.snapshot.battle) return;
    const generation = this.generation; const repository = this.repository; const saver = this.autosaver;
    this.update({ busy: true, error: undefined });
    try {
      await saver?.flush(); const state = await repository.load(slot);
      if (generation !== this.generation) return;
      if (!state) throw new Error('This slot is empty');
      this.attach(new JourneySession(this.content, state, undefined, this.characterName));
      this.autosaver?.schedule(this.snapshot.session!.toSave()); this.update({ notice: `Loaded slot ${slot}.` });
    } catch (error) { if (generation === this.generation) this.fail(error); } finally { if (generation === this.generation) this.update({ busy: false }); }
  }
  returnFromBattle = () => {
    const { battle, session } = this.snapshot;
    if (!battle || !session || !battle.combat.result) return;
    try { session.finishBattle(battle); battle.dispose(); this.update({ battle: undefined }); }
    catch (error) { this.fail(error); }
  };
  async flush() {
    const generation = this.generation;
    try { await this.autosaver?.flush(); return true; }
    catch (error) { if (generation === this.generation) this.fail(error); return false; }
  }
  async flushForExit() {
    if (this.snapshot.busy) return false;
    this.update({ busy: true });
    try { return await this.flush(); } finally { this.update({ busy: false }); }
  }
  private async start() {
    const generation = ++this.generation;
    this.update({ busy: true });
    try {
      await settleJourneySaves();
      if (generation !== this.generation) return;
      const repository = new SaveRepository(await this.createStorage(), this.content, this.growthTalent);
      if (generation !== this.generation) { await repository.close(); return; }
      this.repository = repository; this.update({ storageAvailable: true });
      let state;
      try {
        state = await repository.load('auto');
        if (!state && this.characterName) {
          const slots = (await repository.list()).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
          if (slots[0]) state = await repository.load(slots[0].id);
        }
      } catch (error) {
        if (this.characterName) throw error;
        if (generation === this.generation) this.fail(error);
      }
      if (this.characterName && !state) throw new Error('No journey save was found for this character.');
      if (generation !== this.generation) return;
      this.autosaver = new AutoSaver(repository, (error) => { if (generation === this.generation) this.fail(error); });
      this.attach(new JourneySession(this.content, state, undefined, this.characterName));
      const slots = await repository.list();
      if (generation === this.generation) this.update({ slots, busy: false });
    } catch (error) {
      if (generation !== this.generation) return;
      // Selected characters must never silently become fresh campaigns after a load failure.
      if (!this.characterName) this.attach(new JourneySession(this.content));
      this.fail(error); this.update({ busy: false });
    }
  }
  private attach(session: JourneySession) {
    this.unsubscribe?.(); this.snapshot.battle?.dispose(); this.snapshot.session?.dispose();
    this.update({ session, battle: undefined, revision: this.snapshot.revision + 1 });
    this.unsubscribe = session.subscribe(() => {
      const pending = session.getSnapshot().state.pending;
      if (pending && !this.snapshot.battle) this.update({ battle: session.createBattle() });
      this.autosaver?.schedule(session.toSave());
    });
    if (session.getSnapshot().state.pending) this.update({ battle: session.createBattle() });
  }
  private async stop() {
    ++this.generation; this.unsubscribe?.(); this.unsubscribe = undefined;
    this.snapshot.battle?.dispose(); this.snapshot.session?.dispose();
    const saver = this.autosaver; const repository = this.repository;
    this.autosaver = undefined; this.repository = undefined; this.snapshot = empty;
    // Menu reads wait for writes, but an obsolete blocked read must not delay a new session.
    const saving = (saver?.dispose() ?? Promise.resolve()).catch(() => {});
    pendingStops.add(saving);
    try { await saving; } finally { pendingStops.delete(saving); }
    try { await repository?.close(); } catch { /* Always attempt database cleanup, even after a failed flush. */ }
  }
  private fail(error: unknown) { this.update({ error: error instanceof Error ? error.message : 'Save operation failed' }); }
  private update(patch: Partial<HostView>) { this.snapshot = { ...this.snapshot, ...patch }; this.listeners.forEach((listener) => listener()); }
}
