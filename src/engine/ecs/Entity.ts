import type { ActiveStatus } from '../rpg/StatusEffects';
import type { Health } from './components/Health';
import type { CombatStats } from './components/CombatStats';
import type { StatSource } from '../rpg/Stats';
import type { Weapon } from '../rpg/Character';

export type EntityId = string;

/** IDs stay fixed for the lifetime of an entity. Components are simulation-owned. */
export type Entity = {
  readonly id: EntityId;
  name?: string;
  inventory?: Record<string, number>;
  weapon?: Weapon & { id: string };
  statuses?: ActiveStatus[];
  stamina?: { current: number; max: number }; wounds?: number; fullness?: number; statSource?: StatSource;
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
