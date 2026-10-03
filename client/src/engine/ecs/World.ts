import { World } from 'miniplex';
import type { Entity } from './Entity';

export type GameWorld = World<Entity>;

export function createGameWorld(): GameWorld {
  return new World<Entity>();
}
