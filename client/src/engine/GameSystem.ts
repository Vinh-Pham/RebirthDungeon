import type { GameEngine } from './GameEngine';
import type { Unsubscribe } from './EventBus';

export interface GameSystem {
  /** Register command/event handlers. Return cleanup when subscriptions are used. */
  initialize?(engine: GameEngine): Unsubscribe | void;
  /** Explicit simulation delta in seconds; no wall clock or rendering dependency. */
  update(engine: GameEngine, dt: number): void;
}
