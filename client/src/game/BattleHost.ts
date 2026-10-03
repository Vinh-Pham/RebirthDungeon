import type { BattleSession } from './BattleSession';

interface HostSnapshot {
  session?: BattleSession;
  error?: string;
  revision: number;
}
const empty: HostSnapshot = { revision: 0 };

/** Own engine lifetimes at subscription boundaries, including React Strict Mode. */
export class BattleHost {
  private snapshot: HostSnapshot = empty;
  private listeners = new Set<() => void>();
  constructor(private readonly createSession: () => BattleSession) {}
  getSnapshot = () => this.snapshot;
  getServerSnapshot = () => empty;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    if (!this.snapshot.session && !this.snapshot.error) this.start();
    return () => {
      this.listeners.delete(listener);
      if (!this.listeners.size) {
        this.snapshot.session?.dispose();
        this.snapshot = { revision: this.snapshot.revision };
      }
    };
  };
  restart = () => {
    this.snapshot.session?.dispose();
    this.start();
  };
  private start() {
    const revision = this.snapshot.revision + 1;
    try {
      this.snapshot = { session: this.createSession(), revision };
    } catch (error) {
      this.snapshot = {
        revision,
        error: error instanceof Error ? error.message : 'Battle could not start',
      };
    }
    this.listeners.forEach((listener) => listener());
  }
}
