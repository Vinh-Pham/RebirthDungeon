import type { ActiveStatus } from '../rpg/StatusEffects';
import type { Health } from './components/Health';
import type { CombatStats } from './components/CombatStats';

export type EntityId = string;

/** IDs stay fixed for the lifetime of an entity. Components are simulation-owned. */
export type Entity = {
  readonly id: EntityId;
  name?: string;
  inventory?: Record<string, number>;
  statuses?: ActiveStatus[];
  mana?: { current: number; max: number };
  skills?: string[];
  position?: { x: number; y: number };
  sprite?: { atlas: string; frame: number; idleFrames?: number[] };
  health?: Health;
  combatant?: CombatStats;
  dead?: true;
  player?: true;
  enemy?: true;
};
