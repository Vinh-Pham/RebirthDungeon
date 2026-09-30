import { CommandBus } from './CommandBus';
import { EventBus, type Unsubscribe } from './EventBus';
import { createGameRandom, type SerializableRandom } from './Random';
import { createGameWorld, type GameWorld } from './ecs/World';
import type { Entity, EntityId } from './ecs/Entity';
import type { GameCommand } from './commands';
import type { GameSystem } from './GameSystem';

export interface GameEngineOptions {
  seed: number;
}

export class GameEngine {
  readonly seed: number;
  readonly world: GameWorld = createGameWorld();
  readonly random: SerializableRandom;
  readonly events = new EventBus();
  readonly commands = new CommandBus();
  private readonly systems = new Map<GameSystem, Unsubscribe | void>();
  private disposed = false;

  constructor(options: GameEngineOptions) {
    this.seed = options.seed;
    this.random = createGameRandom(options.seed);
  }

  /** Prefer this over world.add so entity IDs remain unique. */
  spawn(entity: Entity): Entity {
    this.assertActive();
    if (!entity.id.trim()) throw new Error('Entity ID must not be empty');
    if (this.getEntity(entity.id)) throw new Error(`Duplicate entity ID: ${entity.id}`);
    return this.world.add(entity);
  }

  getEntity(id: EntityId): Entity | undefined {
    return this.world.entities.find((entity) => entity.id === id);
  }

  removeEntity(id: EntityId): void {
    this.assertActive();
    const entity = this.getEntity(id);
    if (entity) {
      this.world.remove(entity);
      // Notify game systems after Miniplex has completed its storage mutation.
      this.events.emit({ type: 'ENTITY_REMOVED', entityId: id });
    }
  }

  addSystem(system: GameSystem): Unsubscribe {
    this.assertActive();
    if (this.systems.has(system)) throw new Error('System already registered');
    const cleanup = system.initialize?.(this);
    this.systems.set(system, cleanup);
    let removed = false;
    return () => {
      if (removed || !this.systems.has(system)) return;
      removed = true;
      this.systems.delete(system);
      cleanup?.();
    };
  }

  update(dt: number): void {
    this.assertActive();
    if (!Number.isFinite(dt) || dt < 0) throw new RangeError('Delta must be finite, nonnegative seconds');
    for (const system of [...this.systems.keys()]) {
      if (this.systems.has(system)) system.update(this, dt);
    }
  }

  dispatch(command: GameCommand): void {
    this.assertActive();
    this.commands.dispatch(command);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const cleanups = [...this.systems.values()];
    this.systems.clear();
    const errors: unknown[] = [];
    for (const cleanup of cleanups) {
      try {
        cleanup?.();
      } catch (error) {
        errors.push(error);
      }
    }
    this.commands.clear();
    this.events.clear();
    this.world.clear();
    if (errors.length) throw new AggregateError(errors, 'System cleanup failed');
  }

  private assertActive(): void {
    if (this.disposed) throw new Error('Game engine has been disposed');
  }
}

export function createGameEngine(options: GameEngineOptions): GameEngine {
  return new GameEngine(options);
}
