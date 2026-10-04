import { z } from 'zod';
import { freeze } from 'immer';
import {
  LOG_CATEGORIES,
  LogInputSchema,
  copyLogInput,
  type LogInput,
  type LogSink,
} from '../engine/logging/LogEngine';
import { CommandSchema } from './Contracts';
import type { OnlineState } from './Runtime';

export const AUDIT_RETENTION_MS = 90 * 86400000;
export const ActivityTypeSchema = z.enum([
  'NAVIGATION',
  'SKILL_DETAILS',
  'SKILL_FILTER',
  'TITLE_DETAILS',
  'TITLE_FILTER',
  'QUEST_DETAILS',
  'QUEST_FILTER',
  'CHARACTER_TAB',
  'STATS_OPENED',
  'INVENTORY_FILTER',
  'ITEM_DETAILS',
  'ACTION_INSPECTED',
  'ACTION_USE',
  'AUDIO_SETTINGS',
  'AUDIO_RESUME',
  'BATTLE_INSPECTION',
  'BATTLE_DETAILS',
  'BATTLE_FILTER',
  'SELECT_ACTION',
  'SELECT_TARGET',
  'CANCEL_ACTION',
  'CONNECTION_CHANGED',
  'ACTIVITY_DROPPED',
]);
export const ActivityEventSchema = z.strictObject({
  id: z.string().uuid(),
  type: ActivityTypeSchema,
  message: z.string().min(1).max(256),
  occurredAt: z.number().int().nonnegative().max(8640000000000000),
  revision: z.number().int().nonnegative().optional(),
});
export type ActivityEvent = z.infer<typeof ActivityEventSchema>;
export const ActivityBatchSchema = z.strictObject({
  version: z.literal(1),
  events: z.array(ActivityEventSchema).min(1).max(10),
});
export const ActivityAckSchema = z.strictObject({ ids: z.array(z.string()) });
export const LogSourceSchema = z.enum(['server', 'client']);
export const LogOutcomeSchema = z.enum([
  'committed',
  'rejected',
  'replayed',
  'reported',
  'administration',
]);
export const LogRowSchema = z.object({
  version: z.literal(1),
  events: z
    .array(z.object({ category: z.enum(LOG_CATEGORIES), type: z.string(), message: z.string() }))
    .optional(),
  id: z.string(),
  timestamp: z.number(),
  source: LogSourceSchema,
  category: z.enum(LOG_CATEGORIES),
  type: z.string(),
  message: z.string(),
  outcome: LogOutcomeSchema,
  occurredAt: z.number().nullable(),
  userId: z.string().nullable().optional(),
  characterId: z.string().nullable().optional(),
  commandId: z.string().nullable().optional(),
  requestId: z.string().nullable().optional(),
  revision: z.number().nullable().optional(),
  encounterId: z.string().nullable().optional(),
});
export type HistoryRow = z.infer<typeof LogRowSchema>;
export const LogPageSchema = z.object({
  entries: z.array(LogRowSchema),
  nextCursor: z.string().nullable(),
  recordingSince: z.number(),
});
export const AuditDetailSchema = z.object({
  record: LogRowSchema,
  details: z.record(z.string(), z.json()),
});
export const CapabilitiesSchema = z.object({ admin: z.boolean() });
export const PlayersSchema = z.object({
  players: z.array(
    z.object({
      userId: z.string(),
      email: z.string(),
      characterId: z.string().nullable(),
      name: z.string().nullable(),
    }),
  ),
});
export const ExportSchema = z.object({ jsonl: z.string(), nextCursor: z.string().nullable() });
/** Internal server contracts; never included in public gameplay responses. */
export const AuthoritativeAuditSchema = z.strictObject({
  version: z.literal(1),
  contentVersion: z.string(),
  baseRevision: z.number().int().nonnegative(),
  committedRevision: z.number().int().positive(),
  command: z.union([
    CommandSchema,
    z.strictObject({
      type: z.literal('CREATE_CHARACTER'),
      name: z.string(),
      talent: z.string(),
      age: z.number().int(),
    }),
  ]),
  events: z.array(LogInputSchema),
  changes: z.array(z.strictObject({ path: z.string(), before: z.json(), after: z.json() })),
});
export const RequestAttemptSchema = z.strictObject({
  version: z.literal(1),
  status: z.number().int().min(100).max(599),
  reason: z.string().min(1).max(80),
  method: z.string().max(16),
  request: z
    .strictObject({
      commandId: z.string().uuid(),
      type: z.string().max(80),
      expectedRevision: z.number().int().nonnegative().optional(),
    })
    .optional(),
});
export interface StateChange {
  path: string;
  before: z.infer<ReturnType<typeof z.json>>;
  after: z.infer<ReturnType<typeof z.json>>;
}
export interface ExecutionAudit {
  version: 1;
  events: readonly LogInput[];
  changes: StateChange[];
}

/** Observer errors are remembered even when the legacy diagnostic path catches them. */
export class AuditCollector implements LogSink {
  active = false;
  private entries: LogInput[] = [];
  private failed = false;
  onError = () => {
    if (this.active) this.failed = true;
  };
  append(entries: readonly LogInput[]) {
    if (!this.active) return;
    try {
      this.entries.push(...entries.map(copyLogInput));
    } catch {
      this.failed = true;
    }
  }
  finish(before: OnlineState, after: OnlineState): ExecutionAudit {
    if (this.failed) throw new AuditCollectionError();
    try {
      return freeze(
        { version: 1 as const, events: this.entries, changes: stateChanges(before, after) },
        true,
      );
    } catch {
      throw new AuditCollectionError();
    }
  }
}
export class AuditCollectionError extends Error {
  constructor() {
    super('Gameplay audit unavailable');
  }
}
function stateChanges(before: OnlineState | undefined, after: OnlineState): StateChange[] {
  const changes: StateChange[] = [];
  const facts = (s: OnlineState) => ({
    hero: s.campaign.hero,
    worldId: s.campaign.worldId,
    position: s.campaign.position,
    opened: s.campaign.opened,
    cleared: s.campaign.cleared,
    context: s.context,
    battle: s.battle?.entities,
    encounterCount: s.campaign.encounterCount,
    rewards: s.rewards?.loot,
    dungeon: s.campaign.dungeon
      ? {
          returnTo: s.campaign.dungeon.returnTo,
          cleared: s.campaign.dungeon.cleared,
          opened: s.campaign.dungeon.opened,
          revealedMimics: s.campaign.dungeon.revealedMimics,
          usedFountains: s.campaign.dungeon.usedFountains,
          effects: s.campaign.dungeon.effects,
          bossKey: s.campaign.dungeon.bossKey,
          treasureKey: s.campaign.dungeon.treasureKey,
          bossDoorOpened: s.campaign.dungeon.bossDoorOpened,
          selectedChest: s.campaign.dungeon.selectedChest,
        }
      : undefined,
  });
  const walk = (a: unknown, b: unknown, path: string) => {
    if (JSON.stringify(a) === JSON.stringify(b)) return;
    if (a && b && typeof a === 'object' && typeof b === 'object') {
      const left = a as Record<string, unknown>,
        right = b as Record<string, unknown>;
      for (const key of new Set([...Object.keys(left), ...Object.keys(right)]))
        walk(left[key], right[key], `${path}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`);
    } else
      changes.push({
        path,
        before: z.json().parse(JSON.parse(JSON.stringify(a ?? null))),
        after: z.json().parse(JSON.parse(JSON.stringify(b ?? null))),
      });
  };
  walk(before ? facts(before) : {}, facts(after), '');
  return changes;
}

export function creationAudit(state: OnlineState): ExecutionAudit {
  return freeze(
    {
      version: 1 as const,
      events: [
        { type: 'CHARACTER_CREATED', category: 'user' as const, message: 'Character created.' },
      ],
      changes: stateChanges(undefined, state),
    },
    true,
  );
}
