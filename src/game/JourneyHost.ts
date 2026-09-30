import type { ContentRegistry } from '../engine/data/ContentRegistry';
import { SaveRepository, type SaveSlot, type SaveStorage } from '../persistence/SaveRepository';
import { AutoSaver } from '../persistence/AutoSaver';
import { JourneySession } from './JourneySession';
import type { BattleSession } from './BattleSession';
interface HostView { session?: JourneySession; battle?: BattleSession; revision: number; busy: boolean; storageAvailable: boolean; error?: string;
  notice?: string; slots: { id: SaveSlot; savedAt: string }[] }
const empty: HostView = { revision: 0, busy: true, storageAvailable: false, slots: [] };
export class JourneyHost {
  private snapshot: HostView = empty;
  private listeners = new Set<() => void>();
  private repository?: SaveRepository;
  private autosaver?: AutoSaver;
  private unsubscribe?: () => void;
  private generation = 0;
  constructor(readonly content: ContentRegistry, private createStorage: () => Promise<SaveStorage>) {}
  getSnapshot = () => this.snapshot;
  getServerSnapshot = () => empty;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    if (this.listeners.size === 1) void this.start();
    return () => { this.listeners.delete(listener); if (!this.listeners.size) void this.stop(); };
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
      this.attach(new JourneySession(this.content, state));
      this.autosaver?.schedule(this.snapshot.session!.toSave()); this.update({ notice: `Loaded slot ${slot}.` });
    } catch (error) { if (generation === this.generation) this.fail(error); } finally { if (generation === this.generation) this.update({ busy: false }); }
  }
  returnFromBattle = () => {
    const { battle, session } = this.snapshot;
    if (!battle || !session || !battle.combat.result) return;
    try { session.finishBattle(battle); battle.dispose(); this.update({ battle: undefined }); }
    catch (error) { this.fail(error); }
  };
  async flush() { const generation = this.generation; try { await this.autosaver?.flush(); } catch (error) { if (generation === this.generation) this.fail(error); } }
  private async start() {
    const generation = ++this.generation;
    this.update({ busy: true });
    try {
      const repository = new SaveRepository(await this.createStorage(), this.content);
      if (generation !== this.generation) { await repository.close(); return; }
      this.repository = repository; this.update({ storageAvailable: true });
      let state;
      try { state = await repository.load('auto'); } catch (error) { if (generation === this.generation) this.fail(error); }
      if (generation !== this.generation) return;
      this.autosaver = new AutoSaver(repository, (error) => { if (generation === this.generation) this.fail(error); });
      this.attach(new JourneySession(this.content, state));
      const slots = await repository.list();
      if (generation === this.generation) this.update({ slots, busy: false });
    } catch (error) {
      if (generation !== this.generation) return;
      // Gameplay remains available when storage is unavailable; the error stays visible.
      this.attach(new JourneySession(this.content)); this.fail(error); this.update({ busy: false });
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
    try { await saver?.dispose(); } catch { /* No mounted UI remains to notify. */ }
    try { await repository?.close(); } catch { /* Always attempt database cleanup, even after a failed flush. */ }
  }
  private fail(error: unknown) { this.update({ error: error instanceof Error ? error.message : 'Save operation failed' }); }
  private update(patch: Partial<HostView>) { this.snapshot = { ...this.snapshot, ...patch }; this.listeners.forEach((listener) => listener()); }
}
