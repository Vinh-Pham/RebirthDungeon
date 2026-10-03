export interface AccessSnapshot {
  userId?: string;
  generation: number;
  connectionGeneration: number;
  verified: boolean;
  online: boolean;
  foreground: boolean;
}
/** An identity/lifecycle guard, never a second authentication or gameplay store. */
export class OnlineAccess {
  private snapshot: AccessSnapshot = {
    generation: 0,
    connectionGeneration: 0,
    verified: false,
    online: true,
    foreground: true,
  };
  private listeners = new Set<() => void>();
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private update(change: Partial<AccessSnapshot>) {
    this.snapshot = { ...this.snapshot, ...change };
    this.listeners.forEach((listener) => listener());
  }
  connection(online: boolean, foreground: boolean) {
    if (online === this.snapshot.online && foreground === this.snapshot.foreground) return;
    this.update({
      online,
      foreground,
      verified: false,
      connectionGeneration: this.snapshot.connectionGeneration + 1,
    });
  }
  invalidate() {
    this.update({ verified: false, generation: this.snapshot.generation + 1 });
  }
  accept(userId: string | undefined, lease: AccessSnapshot): boolean {
    if (!this.matches(lease)) return false;
    this.update({
      userId,
      verified: !!userId,
      generation: this.snapshot.generation + (userId !== this.snapshot.userId ? 1 : 0),
    });
    return true;
  }
  matches(lease: AccessSnapshot) {
    return (
      lease.generation === this.snapshot.generation &&
      lease.connectionGeneration === this.snapshot.connectionGeneration
    );
  }
  ready() {
    const s = this.snapshot;
    return !!s.userId && s.verified && s.online && s.foreground;
  }
}
