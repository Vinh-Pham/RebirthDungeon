import type { ProgressionCommand } from '../engine/commands';
import { setItemHotbar } from '../engine/rpg/Inventory';
import type { ContentRegistry } from '../engine/data/ContentRegistry';
import { SaveRepository, type SaveSlot, type SaveStorage } from '../persistence/SaveRepository';
import { AutoSaver } from '../persistence/AutoSaver';
import { JourneySession } from './JourneySession';
import type { GrowthTalent } from '../engine/rpg/Stats';
import type { BattleSession } from './BattleSession';
import type { AudioSettings } from '../audio/AudioManager';
import type { DebugCommand } from './DebugCommands';

export interface JourneyHostOptions {
  debugEnabled?: boolean;
}
interface HostView {
  session?: JourneySession;
  battle?: BattleSession;
  revision: number;
  busy: boolean;
  storageAvailable: boolean;
  error?: string;
  notice?: string;
  pendingResult?: string;
  retryAvailable?: boolean;
  slots: { id: SaveSlot; savedAt: string }[];
}
const empty: HostView = { revision: 0, busy: true, storageAvailable: false, slots: [] };
const pendingStops = new Set<Promise<void>>();
export async function settleJourneySaves() {
  await Promise.all([...pendingStops]);
}
export class JourneyHost {
  private snapshot: HostView = empty;
  private listeners = new Set<() => void>();
  private repository?: SaveRepository;
  private autosaver?: AutoSaver;
  private unsubscribe?: () => void;
  private generation = 0;
  private candidate?: JourneySession;
  private candidateBattle?: BattleSession;
  private durableWrite?: Promise<boolean>;
  constructor(
    readonly content: ContentRegistry,
    private createStorage: () => Promise<SaveStorage>,
    private characterName?: string,
    private growthTalent?: GrowthTalent,
    private audioSettings?: () => AudioSettings,
    private options: JourneyHostOptions = {},
  ) {}
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
    if (
      this.candidate ||
      this.snapshot.busy ||
      !this.snapshot.session ||
      !this.repository ||
      this.snapshot.battle
    )
      return;
    const generation = this.generation;
    const repository = this.repository;
    const saver = this.autosaver;
    this.update({ busy: true, error: undefined });
    try {
      const state = this.snapshot.session.getSnapshot().state;
      await saver?.flush();
      await repository.save(slot, state);
      const slots = await repository.list();
      if (generation === this.generation) this.update({ slots, notice: `Saved to slot ${slot}.` });
    } catch (error) {
      if (generation === this.generation) this.fail(error);
    } finally {
      if (generation === this.generation) this.update({ busy: false });
    }
  }
  async load(slot: SaveSlot) {
    if (this.candidate || this.snapshot.busy || !this.repository || this.snapshot.battle) return;
    const generation = this.generation;
    const repository = this.repository;
    const saver = this.autosaver;
    this.update({ busy: true, error: undefined });
    try {
      await saver?.flush();
      const state = await repository.load(slot);
      if (generation !== this.generation) return;
      if (!state) throw new Error('This slot is empty');
      const session = new JourneySession(this.content, state, undefined, this.characterName);
      this.attach(session);
      const catchup = session.titleCatchupCandidate();
      if (catchup) {
        this.candidate = catchup;
        session.lockMutations();
        await this.persistCandidate();
      } else {
        this.autosaver?.schedule(session.getSnapshot().state);
        this.update({ notice: `Loaded slot ${slot}.` });
      }
    } catch (error) {
      if (generation === this.generation) this.fail(error);
    } finally {
      if (generation === this.generation) this.update({ busy: false });
    }
  }
  progress = async (command: ProgressionCommand): Promise<boolean> => {
    const { session, busy, battle } = this.snapshot;
    if (!session || busy || (battle && command.type !== 'SET_ITEM_HOTBAR') || this.candidate)
      return false;
    if (!this.repository) {
      this.fail(new Error('Save storage is required for town services and progression'));
      return false;
    }
    try {
      if (battle && command.type === 'SET_ITEM_HOTBAR') {
        setItemHotbar(
          {
            inventory: battle.getSnapshot().inventory?.items ?? {},
            itemHotbar: [...session.getSnapshot().state.hero.itemHotbar],
          },
          command.itemId,
          command.assigned,
          this.content,
        );
      }
      this.candidate = session.progressionCandidate(command);
      this.candidateBattle = battle;
      battle?.setInputLocked(true);
    } catch (error) {
      this.fail(error);
      return false;
    }
    session.lockMutations();
    return this.persistCandidate();
  };
  debug = async (command: DebugCommand): Promise<boolean> => {
    const { session, busy, battle } = this.snapshot;
    if (!this.options.debugEnabled || !session || busy || this.candidate) return false;
    if (!this.repository) {
      this.fail(new Error('Save storage is required for debug changes'));
      return false;
    }
    try {
      this.candidate = session.debugCandidate(command);
      this.candidateBattle = battle;
      battle?.setInputLocked(true);
    } catch (error) {
      this.fail(error);
      return false;
    }
    session.lockMutations();
    return this.persistCandidate();
  };
  retryProgression = async (): Promise<boolean> => {
    if (!this.candidate || this.snapshot.busy) return false;
    return this.persistCandidate();
  };
  private persistCandidate(): Promise<boolean> {
    const candidate = this.candidate,
      repository = this.repository,
      saver = this.autosaver,
      generation = this.generation;
    if (!candidate || !repository) return Promise.resolve(false);
    this.update({ busy: true, error: undefined, retryAvailable: false });
    const writing = (async () => {
      try {
        await saver?.flush();
        await repository.save('auto', candidate.getSnapshot().state);
        if (generation !== this.generation) return false;
        this.candidate = undefined;
        const notice = candidate.getSnapshot().message;
        const preservedBattle = this.candidateBattle;
        this.candidateBattle = undefined;
        if (preservedBattle) {
          preservedBattle.setItemHotbar(candidate.getSnapshot().state.hero.itemHotbar);
          preservedBattle.setInputLocked(false);
        }
        this.attach(candidate, preservedBattle);
        this.update({ notice, pendingResult: undefined, retryAvailable: false });
        // Saved progression cannot be retried because a consumer failed after commit.
        try {
          candidate.publishCommittedEvents();
        } catch (error) {
          this.fail(error);
        }
        return true;
      } catch (error) {
        if (generation === this.generation) {
          this.fail(error);
          this.update({ retryAvailable: true, pendingResult: candidate.getSnapshot().message });
        }
        return false;
      } finally {
        if (generation === this.generation) this.update({ busy: false });
      }
    })();
    this.durableWrite = writing;
    return writing;
  }
  returnFromBattle = async (selectedItemIds?: readonly string[]): Promise<boolean> => {
    const { battle, session } = this.snapshot;
    if (this.candidate) return this.retryProgression();
    if (!battle || !session || !battle.combat.result || this.snapshot.busy) return false;
    if (!this.repository) {
      this.fail(new Error('Save storage is required to commit this encounter'));
      return false;
    }
    try {
      this.candidate = session.battleCandidate(battle, selectedItemIds);
    } catch (error) {
      this.fail(error);
      return false;
    }
    session.lockMutations();
    return this.persistCandidate();
  };
  async flush() {
    if (this.candidate) {
      this.fail(new Error('Save pending. Use Retry save before leaving.'));
      return false;
    }
    const generation = this.generation;
    try {
      await this.autosaver?.flush();
      return true;
    } catch (error) {
      if (generation === this.generation) this.fail(error);
      return false;
    }
  }
  async flushForExit() {
    if (this.snapshot.busy) return false;
    this.update({ busy: true });
    try {
      return await this.flush();
    } finally {
      this.update({ busy: false });
    }
  }
  private async start() {
    const generation = ++this.generation;
    this.update({ busy: true });
    try {
      await settleJourneySaves();
      if (generation !== this.generation) return;
      const repository = new SaveRepository(
        await this.createStorage(),
        this.content,
        this.growthTalent,
      );
      if (generation !== this.generation) {
        await repository.close();
        return;
      }
      this.repository = repository;
      this.update({ storageAvailable: true });
      let state;
      try {
        state = await repository.load('auto');
        if (!state && this.characterName) {
          const slots = (await repository.list()).sort((a, b) =>
            b.savedAt.localeCompare(a.savedAt),
          );
          if (slots[0]) state = await repository.load(slots[0].id);
        }
      } catch (error) {
        if (this.characterName) throw error;
        if (generation === this.generation) this.fail(error);
      }
      if (this.characterName && !state)
        throw new Error('No journey save was found for this character.');
      if (generation !== this.generation) return;
      this.autosaver = new AutoSaver(repository, (error) => {
        if (generation === this.generation) this.fail(error);
      });
      const session = new JourneySession(this.content, state, undefined, this.characterName);
      const reconciled = session.getSnapshot().state;
      this.attach(session);
      const catchup = session.titleCatchupCandidate();
      if (catchup) {
        this.candidate = catchup;
        session.lockMutations();
        await this.persistCandidate();
      }
      // Save newly discovered automatic offers/state-stage advancement after a load.
      if (
        !catchup &&
        ((state && JSON.stringify(state) !== JSON.stringify(reconciled)) ||
          (!state && Object.keys(reconciled.hero.quests).length))
      )
        this.autosaver?.schedule(session.getSnapshot().state);
      const slots = await repository.list();
      if (generation === this.generation) this.update({ slots, busy: false });
    } catch (error) {
      if (generation !== this.generation) return;
      // Selected characters must never silently become fresh campaigns after a load failure.
      if (!this.characterName) this.attach(new JourneySession(this.content));
      this.fail(error);
      this.update({ busy: false });
    }
  }
  private attach(session: JourneySession, preservedBattle?: BattleSession) {
    session.manageDurability();
    if (this.audioSettings) session.setAudio(this.audioSettings());
    this.unsubscribe?.();
    if (this.snapshot.battle !== preservedBattle) this.snapshot.battle?.dispose();
    this.snapshot.session?.dispose();
    this.update({ session, battle: preservedBattle, revision: this.snapshot.revision + 1 });
    this.unsubscribe = session.subscribe(() => {
      // Audio preference refreshes may arrive while a retained candidate is saving.
      if (this.candidate) return;
      const pending = session.getSnapshot().state.pending;
      if (pending && !this.snapshot.battle) this.update({ battle: session.createBattle() });
      this.autosaver?.schedule(session.getSnapshot().state);
    });
    if (session.getSnapshot().state.pending && !preservedBattle)
      this.update({ battle: session.createBattle() });
  }
  private async stop() {
    ++this.generation;
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.snapshot.battle?.dispose();
    this.snapshot.session?.dispose();
    const saver = this.autosaver;
    const repository = this.repository;
    this.autosaver = undefined;
    this.repository = undefined;
    this.snapshot = empty;
    // Menu reads wait for writes, but an obsolete blocked read must not delay a new session.
    const candidate = this.candidate;
    this.candidate = undefined;
    this.candidateBattle = undefined;
    const saving = Promise.all([saver?.dispose(), this.durableWrite])
      .then(() => {})
      .catch(() => {})
      .finally(() => candidate?.dispose());
    this.durableWrite = undefined;
    pendingStops.add(saving);
    try {
      await saving;
    } finally {
      pendingStops.delete(saving);
    }
    try {
      await repository?.close();
    } catch {
      /* Always attempt database cleanup, even after a failed flush. */
    }
  }
  private fail(error: unknown) {
    this.update({ error: error instanceof Error ? error.message : 'Save operation failed' });
  }
  private update(patch: Partial<HostView>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((listener) => listener());
  }
}
