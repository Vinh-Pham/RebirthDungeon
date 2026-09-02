/**
 * Project-owned `TurnScheduler` over `ROT.Scheduler.Speed`. Actor ids are
 * stable strings; the rot scheduler is reconstructed from public-surface
 * data (relative due times) for snapshot/restore. `ROT.Engine` is never used:
 * the run controller decides exactly when turns advance.
 *
 * rot's Speed scheduler is fully deterministic (an event queue keyed by
 * 1/speed, no RNG); equal speeds act in insertion order.
 */

import { Scheduler } from 'rot-js';

interface RotActor {
  getSpeed(): number;
}

export interface TurnSchedulerSnapshotEntry {
  readonly id: string;
  readonly speed: number;
  /** Relative queue time until this actor's next turn. */
  readonly dueTime: number;
}

export interface TurnSchedulerSnapshot {
  readonly entries: readonly TurnSchedulerSnapshotEntry[];
}

export interface TurnScheduler {
  add(id: string, speed: number): void;
  remove(id: string): void;
  /** Advances to the next actor and returns its id (null when empty). */
  next(): string | null;
  snapshot(): TurnSchedulerSnapshot;
  restore(snapshot: TurnSchedulerSnapshot): void;
}

export function createTurnScheduler(): TurnScheduler {
  const scheduler = new Scheduler.Speed();
  const actors = new Map<string, { rotActor: RotActor; speed: number }>();
  let currentId: string | null = null;

  return {
    add(id, speed) {
      if (actors.has(id)) {
        throw new Error(`scheduler: actor '${id}' already scheduled`);
      }
      const rotActor: RotActor = { getSpeed: () => speed };
      actors.set(id, { rotActor, speed });
      scheduler.add(rotActor, true);
    },
    remove(id) {
      const entry = actors.get(id);
      if (!entry) return;
      scheduler.remove(entry.rotActor);
      actors.delete(id);
      if (currentId === id) currentId = null;
    },
    next() {
      const rotActor = scheduler.next();
      if (!rotActor) {
        currentId = null;
        return null;
      }
      for (const [id, entry] of actors) {
        if (entry.rotActor === rotActor) {
          currentId = id;
          return id;
        }
      }
      currentId = null;
      return null;
    },
    snapshot() {
      const entries: TurnSchedulerSnapshotEntry[] = [];
      for (const [id, entry] of actors) {
        // The scheduler's current actor is not in the queue — it is re-added
        // (at 1/speed) on the next `next()`. Model that as its due time.
        const dueTime = scheduler.getTimeOf(entry.rotActor);
        entries.push({
          id,
          speed: entry.speed,
          dueTime: dueTime ?? 1 / entry.speed,
        });
      }
      return { entries };
    },
    restore(snapshot) {
      scheduler.clear();
      actors.clear();
      currentId = null;
      for (const entry of snapshot.entries) {
        const rotActor: RotActor = { getSpeed: () => entry.speed };
        actors.set(entry.id, { rotActor, speed: entry.speed });
        scheduler.add(rotActor, true, entry.dueTime);
      }
    },
  };
}
