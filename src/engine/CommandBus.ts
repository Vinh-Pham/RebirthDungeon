import { validateCommand, type GameCommand } from './commands';
import { immutableData, type Immutable } from './immutableState';
import { cloneData } from './cloneData';
import type { Unsubscribe } from './EventBus';

export interface CommandObservation {
  readonly command: Immutable<GameCommand>;
  readonly committed: boolean;
  readonly error?: string;
}

/** One authoritative handler per command type; execution is immediate. */
export class CommandBus {
  private readonly handlers = new Map<GameCommand['type'], (command: GameCommand) => void>();

  private readonly observers = new Set<(observation: CommandObservation) => void>();
  private readonly frames: { committed: boolean }[] = [];
  observe(listener: (observation: CommandObservation) => void): Unsubscribe {
    const subscription = (observation: CommandObservation) => listener(observation);
    this.observers.add(subscription);
    return () => {
      this.observers.delete(subscription);
    };
  }
  get isDispatching() {
    return this.frames.length > 0;
  }
  /** Owners call this after simulation commit, before fallible notification delivery. */
  markCommitted(): void {
    this.frames.forEach((frame) => {
      frame.committed = true;
    });
  }

  register<K extends GameCommand['type']>(
    type: K,
    handler: (command: Extract<GameCommand, { type: K }>) => void,
  ): Unsubscribe {
    if (this.handlers.has(type)) throw new Error(`Command handler already registered: ${type}`);
    const wrapped = (command: GameCommand) => handler(command as Extract<GameCommand, { type: K }>);
    this.handlers.set(type, wrapped);
    return () => {
      if (this.handlers.get(type) === wrapped) this.handlers.delete(type);
    };
  }

  dispatch(command: GameCommand): void {
    const frame = { committed: false };
    this.frames.push(frame);
    let failure: unknown;
    try {
      validateCommand(command);
      const handler = this.handlers.get(command.type);
      if (!handler) throw new Error(`No command handler registered: ${command.type}`);
      handler(command);
      frame.committed = true;
    } catch (error) {
      failure = error;
      throw error;
    } finally {
      this.frames.pop();
      if (this.observers.size) {
        try {
          const observation = immutableData({
            command: cloneData(command),
            committed: frame.committed,
            ...(failure
              ? { error: failure instanceof Error ? failure.message : 'Action failed' }
              : {}),
          });
          for (const observer of [...this.observers]) {
            if (!this.observers.has(observer)) continue;
            try {
              observer(observation);
            } catch {
              /* Diagnostics cannot affect dispatch. */
            }
          }
        } catch {
          /* Malformed external commands may not be cloneable. */
        }
      }
    }
  }

  clear(): void {
    this.handlers.clear();
    this.observers.clear();
  }
}
