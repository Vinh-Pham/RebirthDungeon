import type { GameEvent } from './events';

export type Unsubscribe = () => void;

/** Synchronous notifications in subscription order. Errors propagate after delivery. */
export class EventBus<T extends { type: string } = GameEvent> {
  private readonly listeners = new Set<(event: T) => void>();

  subscribe(listener: (event: T) => void): Unsubscribe {
    // Each subscription has its own identity, even when callbacks are reused.
    const subscription = (event: T) => listener(event);
    this.listeners.add(subscription);
    return () => { this.listeners.delete(subscription); };
  }

  on<K extends T['type']>(type: K, listener: (event: Extract<T, { type: K }>) => void): Unsubscribe {
    return this.subscribe((event) => {
      if (event.type === type) listener(event as Extract<T, { type: K }>);
    });
  }

  emit(event: T): void {
    // Subscriptions added during delivery begin with the next event.
    const errors: unknown[] = [];
    for (const listener of [...this.listeners]) {
      if (!this.listeners.has(listener)) continue;
      try {
        listener(event);
      } catch (error) {
        errors.push(error);
      }
    }
    // A presentation failure must not prevent game-system subscribers from running.
    if (errors.length) throw new AggregateError(errors, 'Game event delivery failed');
  }

  clear(): void {
    this.listeners.clear();
  }
}
