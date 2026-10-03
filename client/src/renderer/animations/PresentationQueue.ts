import type { GameEngine } from '../../engine/GameEngine';
import type { GameEvent } from '../../engine/events';
import type { Unsubscribe } from '../../engine/EventBus';

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

/** Wall-clock timers only pace visuals. They never dispatch simulation commands. */
export class PresentationQueue {
  static readonly duration = 1000;
  private pending: PresentationBatch[] = [];
  private collecting?: PresentationBatch;
  private snapshot: PresentationSnapshot = { pending: 0, busy: false };
  private listeners = new Set<() => void>();
  private timer?: ReturnType<typeof setTimeout>;
  private unsubscribe: Unsubscribe;
  private sequence = 0;
  private disposed = false;

  constructor(private readonly engine: GameEngine) {
    this.unsubscribe = engine.events.subscribe((event) => this.accept(event));
  }
  getSnapshot = (): PresentationSnapshot => this.snapshot;
  subscribe = (listener: () => void): Unsubscribe => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  dispose(): void {
    this.disposed = true;
    this.unsubscribe();
    if (this.timer) clearTimeout(this.timer);
    this.pending = [];
    this.collecting = undefined;
    this.snapshot = { pending: 0, busy: false };
    this.listeners.clear();
  }

  private accept(event: GameEvent) {
    if (this.disposed) return;
    if (event.type === 'ANIMATION_REQUESTED') {
      this.collecting = { ...event, id: ++this.sequence, impacts: [], deaths: [], missed: false };
    } else if (this.collecting) {
      if (event.type === 'DAMAGE_DEALT' || event.type === 'HEALTH_RESTORED') {
        const health = this.engine.getEntity(event.targetId)!.health!;
        const existing = this.collecting.impacts.find(
          (impact) =>
            impact.targetId === event.targetId &&
            impact.healing === (event.type === 'HEALTH_RESTORED'),
        );
        if (existing) {
          existing.amount += event.amount;
          existing.healthAfter = health.current;
        } else
          this.collecting.impacts.push({
            targetId: event.targetId,
            amount: event.amount,
            healing: event.type === 'HEALTH_RESTORED',
            critical: event.type === 'DAMAGE_DEALT' && event.critical,
            healthAfter: health.current,
            maxHealth: health.max,
          });
      } else if (event.type === 'ENTITY_DIED') this.collecting.deaths.push(event.entityId);
      else if (event.type === 'ATTACK_MISSED') this.collecting.missed = true;
      else if (event.type === 'TURN_ENDED') {
        this.pending.push(this.collecting);
        this.collecting = undefined;
        if (!this.snapshot.active) this.next();
        else this.notify({ ...this.snapshot, pending: this.pending.length });
      }
    }
  }
  private next() {
    if (this.disposed) return;
    const active = this.pending.shift();
    this.notify({ active, pending: this.pending.length, busy: !!active });
    if (active) this.timer = setTimeout(() => this.next(), PresentationQueue.duration);
  }
  private notify(snapshot: PresentationSnapshot) {
    this.snapshot = snapshot;
    this.listeners.forEach((listener) => listener());
  }
}
