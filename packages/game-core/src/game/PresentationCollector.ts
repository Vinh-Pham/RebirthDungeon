import type { GameEvent } from '../engine/events';
import type { PresentationBatch } from './Presentation';

/** Collect resolved visual facts without clocks, simulation commands, or random draws. */
export class PresentationCollector {
  readonly batches: PresentationBatch[] = [];
  private collecting?: PresentationBatch;
  constructor(private health: (id: string) => { current: number; max: number } | undefined) {}
  accept(event: GameEvent): PresentationBatch | undefined {
    if (event.type === 'ANIMATION_REQUESTED') {
      this.collecting = {
        sourceId: event.sourceId,
        targetId: event.targetId,
        animation: event.animation,
        skillId: event.skillId,
        id: this.batches.length + 1,
        impacts: [],
        deaths: [],
        missed: false,
      };
    } else if (this.collecting) {
      if (event.type === 'DAMAGE_DEALT' || event.type === 'HEALTH_RESTORED') {
        const health = this.health(event.targetId);
        if (!health) return;
        const healing = event.type === 'HEALTH_RESTORED';
        const existing = this.collecting.impacts.find(
          (i) => i.targetId === event.targetId && i.healing === healing,
        );
        if (existing) {
          existing.amount += event.amount;
          existing.healthAfter = health.current;
          existing.critical ||= event.type === 'DAMAGE_DEALT' && event.critical;
        } else
          this.collecting.impacts.push({
            targetId: event.targetId,
            amount: event.amount,
            healing,
            critical: event.type === 'DAMAGE_DEALT' && event.critical,
            healthAfter: health.current,
            maxHealth: health.max,
          });
      } else if (event.type === 'ENTITY_DIED') this.collecting.deaths.push(event.entityId);
      else if (event.type === 'ATTACK_MISSED') this.collecting.missed = true;
      else if (event.type === 'TURN_ENDED') {
        const batch = this.collecting;
        this.batches.push(batch);
        this.collecting = undefined;
        return batch;
      }
    }
  }
}
