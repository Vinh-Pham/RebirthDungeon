import { validateCommand, type GameCommand } from './commands';
import type { Unsubscribe } from './EventBus';

/** One authoritative handler per command type; execution is immediate. */
export class CommandBus {
  private readonly handlers = new Map<GameCommand['type'], (command: GameCommand) => void>();

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
    validateCommand(command);
    const handler = this.handlers.get(command.type);
    if (!handler) throw new Error(`No command handler registered: ${command.type}`);
    handler(command);
  }

  clear(): void {
    this.handlers.clear();
  }
}
