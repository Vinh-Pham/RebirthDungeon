import { z } from 'zod';
import {
  ActivityAckSchema,
  ActivityEventSchema,
  ActivityTypeSchema,
  type ActivityEvent,
} from '@rebirth/game-core/online/Audit';
import type { OnlineAccess } from './Access';
import { APIError, type GameAPI } from './API';

const EntrySchema = z.object({ characterId: z.string(), event: ActivityEventSchema });
export const ActivityQueueSchema = z.object({
  entries: z.array(EntrySchema),
  dropped: z.number().int().nonnegative(),
  lastCharacterId: z.string().optional(),
});
export type ActivityQueue = z.infer<typeof ActivityQueueSchema>;
export interface ActivityStorage {
  update(key: string, transform: (queue: ActivityQueue) => ActivityQueue): Promise<ActivityQueue>;
}
export const emptyActivityQueue = (): ActivityQueue => ({ entries: [], dropped: 0 });
export const ACTIVITY_MAX_BYTES = 1024 * 1024;
export const ACTIVITY_MAX_AGE = 7 * 86400000;
const size = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).length;
export function pruneActivity(queue: ActivityQueue, now: number): ActivityQueue {
  const entries = queue.entries.filter((e) => e.event.occurredAt >= now - ACTIVITY_MAX_AGE);
  let dropped = queue.dropped + queue.entries.length - entries.length;
  // Leave room for a durable loss report, including multibyte text.
  let bytes = size(entries);
  while (entries.length && bytes > ACTIVITY_MAX_BYTES - 2048) {
    bytes -= size(entries.shift()!) + 1;
    dropped++;
  }
  return { ...queue, entries, dropped };
}
export class ActivityOutbox {
  private flushing = false;
  private retryAt = 0;
  private timer?: ReturnType<typeof setInterval>;
  constructor(
    private options: {
      api: GameAPI;
      access: OnlineAccess;
      storage(): Promise<ActivityStorage>;
      uuid(): string;
      now(): number;
      acknowledged(characterId: string, userId: string): void;
    },
  ) {}
  start() {
    this.timer = setInterval(() => {
      void this.flush();
    }, 5000);
    const unsubscribe = this.options.access.subscribe(() => {
      void this.flush();
    });
    void this.flush();
    return () => {
      clearInterval(this.timer);
      unsubscribe();
    };
  }
  record(
    userId: string,
    characterId: string,
    type: ActivityEvent['type'],
    message: string,
    revision?: number,
  ) {
    const parsed = ActivityTypeSchema.safeParse(type);
    if (!parsed.success || this.options.access.getSnapshot().userId !== userId) return;
    const event: ActivityEvent = {
      id: this.options.uuid(),
      type: parsed.data,
      message: message.slice(0, 256),
      occurredAt: this.options.now(),
      ...(revision === undefined ? {} : { revision }),
    };
    void this.enqueue(userId, characterId, event).catch(() => {
      // Never block gameplay on telemetry storage. Report a bounded operational signal only.
      console.warn('Activity recovery storage unavailable');
    });
  }
  private key(userId: string) {
    return JSON.stringify([this.options.api.origin, userId]);
  }
  async enqueue(userId: string, characterId: string, event: ActivityEvent) {
    const storage = await this.options.storage();
    await storage.update(this.key(userId), (queue) =>
      pruneActivity(
        {
          ...queue,
          lastCharacterId: characterId,
          entries: [...queue.entries, { characterId, event: ActivityEventSchema.parse(event) }],
        },
        this.options.now(),
      ),
    );
  }
  async flush() {
    const { access, api } = this.options;
    if (this.flushing || !access.ready() || this.options.now() < this.retryAt) return;
    const lease = access.getSnapshot(),
      userId = lease.userId!;
    this.flushing = true;
    try {
      const storage = await this.options.storage();
      // Bound each flush; periodic/reconnect calls continue the remaining queue.
      for (let round = 0; round < 5 && access.ready() && access.matches(lease); round++) {
        const queue = await storage.update(this.key(userId), (previous) => {
          const current = pruneActivity(previous, this.options.now());
          if (current.dropped && current.lastCharacterId) {
            current.entries.push({
              characterId: current.lastCharacterId,
              event: {
                id: this.options.uuid(),
                type: 'ACTIVITY_DROPPED',
                occurredAt: this.options.now(),
                message: `${current.dropped} client activity events expired or exceeded the buffer limit.`,
              },
            });
            current.dropped = 0;
          }
          return current;
        });
        const characterId = queue.entries[0]?.characterId;
        if (!characterId || !access.ready() || !access.matches(lease)) return;
        const events: ActivityEvent[] = [];
        for (const entry of queue.entries) {
          if (entry.characterId !== characterId) continue;
          if (events.length === 10 || size({ version: 1, events: [...events, entry.event] }) > 4096)
            break;
          events.push(entry.event);
        }
        api.assertAccount(userId);
        const ack = await api
          .request(
            `/api/game/characters/${encodeURIComponent(characterId)}/activity`,
            ActivityAckSchema,
            { version: 1, events },
          )
          .catch(async (error: unknown) => {
            if (error instanceof APIError && error.status === 404 && access.matches(lease)) {
              await storage.update(this.key(userId), (q) => {
                const remaining = q.entries.filter((entry) => entry.characterId !== characterId);
                return {
                  entries: remaining,
                  dropped: q.dropped + q.entries.length - remaining.length,
                  lastCharacterId: remaining.at(-1)?.characterId,
                };
              });
            }
            throw error;
          });
        if (!access.matches(lease)) return;
        const sent = new Set(events.map((e) => e.id));
        const ids = new Set(ack.ids.filter((id) => sent.has(id)));
        if (!ids.size) return;
        await storage.update(this.key(userId), (q) => ({
          ...q,
          entries: q.entries.filter((e) => !ids.has(e.event.id)),
        }));
        this.options.acknowledged(characterId, userId);
      }
    } catch (error) {
      this.retryAt =
        this.options.now() +
        (error instanceof APIError ? Math.max(5000, error.retryAfterMs) : 5000);
      /* Durable activity stays queued until a later connection/flush. */
    } finally {
      this.flushing = false;
    }
  }
}
