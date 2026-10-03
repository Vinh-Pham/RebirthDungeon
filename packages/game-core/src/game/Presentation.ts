import type { GameEvent } from '../engine/events';
import type { GameEngine } from '../engine/GameEngine';
import type { Unsubscribe } from '../engine/EventBus';
export interface PresentedImpact {
  targetId: string;
  amount: number;
  healing: boolean;
  critical: boolean;
  healthAfter: number;
  maxHealth: number;
}
export interface PresentationBatch {
  id: number;
  sourceId: string;
  targetId: string;
  animation: Extract<GameEvent, { type: 'ANIMATION_REQUESTED' }>['animation'];
  skillId?: string;
  impacts: PresentedImpact[];
  deaths: string[];
  missed: boolean;
}
export interface PresentationSnapshot {
  active?: PresentationBatch;
  pending: number;
  busy: boolean;
}

export interface BattlePresentation {
  getSnapshot(): PresentationSnapshot;
  subscribe(listener: () => void): Unsubscribe;
  dispose(): void;
}
export type PresentationFactory = (engine: GameEngine) => BattlePresentation;
export const headlessPresentation: PresentationFactory = () => ({
  getSnapshot: () => ({ busy: false, pending: 0 }),
  subscribe: () => () => {},
  dispose: () => {},
});
