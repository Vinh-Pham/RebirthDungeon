import type { z } from 'zod';
import type { BattleAction } from '../BattleMachine';

export interface EnemyActorView {
  readonly id: string;
  readonly health: number;
  readonly maxHealth: number;
  readonly healableHealth: number;
  readonly stamina: number;
  readonly maxStamina: number;
  readonly mana: number;
  readonly maxMana: number;
  readonly statuses: readonly string[];
}
export interface EnemyTurnDecision {
  readonly action: Readonly<BattleAction>;
  readonly targetId: string;
}
export interface EnemyActionCandidate extends EnemyTurnDecision {
  readonly kind: 'attack' | 'defend' | 'damage' | 'heal' | 'buff';
  readonly staminaCost: number;
}
export interface EnemyBattleContext {
  readonly source: EnemyActorView;
  readonly participants: readonly EnemyActorView[];
  readonly candidates: readonly EnemyActionCandidate[];
  readonly lastAction?: Readonly<BattleAction>;
  readonly config: unknown;
}
/** Stateless family plugins score only the legal candidates supplied by the coordinator. */
export interface EnemyBattleBehavior {
  readonly id: string;
  readonly configSchema: z.ZodType;
  score(context: EnemyBattleContext): readonly number[];
}
