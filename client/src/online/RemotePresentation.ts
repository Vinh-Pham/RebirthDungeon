import type {
  BattlePresentation,
  PresentationBatch,
  PresentationSnapshot,
} from '@rebirth/game-core/game/Presentation';
/** Plays committed facts. Timers only pace visuals and can never advance a turn. */
export class RemotePresentation implements BattlePresentation {
  private snapshot: PresentationSnapshot = { busy: false, pending: 0 };
  private queue: PresentationBatch[] = [];
  private timer?: ReturnType<typeof setTimeout>;
  private listeners = new Set<() => void>();
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  enqueue(batches: readonly PresentationBatch[]) {
    this.queue.push(...batches);
    if (!this.snapshot.busy) this.next();
  }
  private next() {
    const active = this.queue.shift();
    this.snapshot = { active, busy: !!active, pending: this.queue.length };
    this.listeners.forEach((listener) => listener());
    if (active) this.timer = setTimeout(() => this.next(), 1000);
  }
  clear() {
    if (this.timer) clearTimeout(this.timer);
    this.queue = [];
    this.next();
  }
  dispose() {
    this.clear();
    this.listeners.clear();
  }
}
