import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import {
  AUDIT_RETENTION_MS,
  AuthoritativeAuditSchema,
  LogRowSchema,
  type ExecutionAudit,
} from '@rebirth/game-core/online/Audit';
import {
  COMMAND_LABELS,
  EVENT_POLICY,
} from '@rebirth/game-core/game/logging/GameActionLogging';
import { LOG_CATEGORIES } from '@rebirth/game-core/engine/logging/LogEngine';
import {
  GAME_CONTENT_VERSION,
  type OnlineCommand,
} from '@rebirth/game-core/online/Contracts';

export interface CommitAudit {
  requestId: string;
  command:
    | OnlineCommand
    | { type: 'CREATE_CHARACTER'; name: string; talent: string; age: number };
  audit: ExecutionAudit;
}
export interface AuditRecord {
  id: string;
  timestamp: number;
  userId?: string;
  characterId?: string;
  source: 'server' | 'client';
  category: (typeof LOG_CATEGORIES)[number];
  type: string;
  outcome:
    | 'committed'
    | 'rejected'
    | 'replayed'
    | 'reported'
    | 'administration';
  message: string;
  commandId?: string;
  requestId?: string;
  revision?: number;
  encounterId?: string;
  occurredAt?: number;
  dedupeKey?: string;
  details: unknown;
}
export function auditStatement(
  db: D1Database,
  r: AuditRecord,
  deduplicate = false,
) {
  const details = JSON.stringify(
    z.record(z.string(), z.json()).parse(r.details),
  );
  if (new TextEncoder().encode(details).length > 1024 * 1024)
    throw new HTTPException(503, {
      message: 'Audit storage value exceeds supported size',
    });
  return db
    .prepare(`INSERT INTO audit_records
    (id,timestamp,user_id,character_id,source,category,type,outcome,message,command_id,request_id,revision,encounter_id,occurred_at,dedupe_key,details)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)${deduplicate ? ' ON CONFLICT(dedupe_key) DO NOTHING' : ''}`)
    .bind(
      r.id,
      r.timestamp,
      r.userId ?? null,
      r.characterId ?? null,
      r.source,
      r.category,
      r.type,
      r.outcome,
      r.message,
      r.commandId ?? null,
      r.requestId ?? null,
      r.revision ?? null,
      r.encounterId ?? null,
      r.occurredAt ?? null,
      r.dedupeKey ?? null,
      details,
    );
}
export function commandAuditCategory(
  type: string,
): (typeof LOG_CATEGORIES)[number] {
  return ['MOVE', 'TRAVEL_TO', 'OFFER_ITEM', 'EXIT_DUNGEON'].includes(type)
    ? 'movement'
    : ['BATTLE_ACTION', 'SETTLE_ENCOUNTER'].includes(type)
      ? 'combat'
      : ['START_REST', 'STOP_REST', 'REST_PULSE', 'USE_LIFE_SKILL'].includes(
            type,
          )
        ? 'system'
        : 'user';
}
export function commitRecord(
  userId: string,
  characterId: string,
  commandId: string,
  revision: number,
  timestamp: number,
  data: CommitAudit,
  encounterCount: number,
): AuditRecord {
  // Validate the entire batch before constructing SQL. No public response carries this object.
  const events = data.audit.events.map((e) => ({ ...e }));
  return {
    id: crypto.randomUUID(),
    timestamp,
    userId,
    characterId,
    source: 'server',
    category: commandAuditCategory(data.command.type),
    type: data.command.type,
    outcome: 'committed',
    message: `${data.command.type.replaceAll('_', ' ').toLowerCase()} completed.`,
    commandId,
    requestId: data.requestId,
    revision,
    encounterId: `encounter:${encounterCount}`,
    dedupeKey: `command:${userId}:${commandId}`,
    details: AuthoritativeAuditSchema.parse({
      version: 1,
      contentVersion: GAME_CONTENT_VERSION,
      baseRevision: revision - 1,
      committedRevision: revision,
      command: data.command,
      events,
      changes: data.audit.changes,
    }),
  };
}
export async function recordAudit(db: D1Database, record: AuditRecord) {
  await auditStatement(db, record).run();
}
export async function isAdministrator(
  db: D1Database,
  userId: string,
): Promise<boolean> {
  return !!(await db
    .prepare('SELECT user_id FROM audit_administrators WHERE user_id=?')
    .bind(userId)
    .first());
}
export const LogQuerySchema = z.object({
  userId: z.string().max(128).optional(),
  characterId: z.string().max(128).optional(),
  from: z.coerce.number().int().nonnegative().optional(),
  to: z.coerce.number().int().nonnegative().optional(),
  category: z.enum(LOG_CATEGORIES).optional(),
  source: z.enum(['server', 'client']).optional(),
  outcome: z
    .enum(['committed', 'rejected', 'replayed', 'reported', 'administration'])
    .optional(),
  type: z.string().max(80).optional(),
  commandId: z.string().max(128).optional(),
  requestId: z.string().max(128).optional(),
  encounterId: z.string().max(128).optional(),
  revision: z.coerce.number().int().nonnegative().optional(),
  cursor: z.string().max(4096).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type LogQuery = z.infer<typeof LogQuerySchema>;
const cursorSchema = z.object({
  upper: z.number().int().nonnegative(),
  before: z.number().int().positive(),
  scope: z.string(),
});
type Stored = { sequence: number; details: string; [key: string]: unknown };
const columns = `sequence,id,timestamp,source,category,type,message,outcome,occurred_at AS occurredAt,
 user_id AS userId,character_id AS characterId,command_id AS commandId,request_id AS requestId,
 revision,encounter_id AS encounterId,details`;
const playerEvents = (details: string) => {
  const data = JSON.parse(details) as {
    events?: { category: string; type: string; message: string }[];
  };
  return (data.events ?? [])
    .filter(
      (e) =>
        Object.hasOwn(EVENT_POLICY, e.type) ||
        Object.hasOwn(COMMAND_LABELS, e.type),
    )
    .map((e) => ({
      category: e.category,
      type: e.type,
      // Generated map identifiers embed the dungeon seed. Keep them in admin details only.
      message: e.type === 'MAP_CHANGED' ? 'Entered another area.' : e.message,
    }));
};
export function projectRecord(row: Stored, player = false) {
  const parsed = LogRowSchema.parse({ ...row, version: 1 });
  if (!player) return parsed;
  // Explicit projection: no IDs, command parameters, changes, metadata, seeds, or request failures.
  return {
    version: 1 as const,
    id: parsed.id,
    timestamp: parsed.timestamp,
    source: parsed.source,
    category: parsed.category,
    type: parsed.type,
    message: parsed.message,
    outcome: parsed.outcome,
    occurredAt: parsed.occurredAt,
    events: playerEvents(row.details),
  };
}
export async function listAudit(
  db: D1Database,
  query: LogQuery,
  player = false,
  includeDetails = false,
) {
  const { cursor, limit, ...filters } = query;
  const scope = JSON.stringify({ player, ...filters });
  let upper: number,
    before = Number.MAX_SAFE_INTEGER;
  if (cursor) {
    try {
      const decoded = cursorSchema.parse(
        JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')),
      );
      if (decoded.scope !== scope || decoded.before > decoded.upper + 1)
        throw new Error();
      upper = decoded.upper;
      before = decoded.before;
    } catch {
      throw new HTTPException(400, { message: 'Invalid log cursor' });
    }
  } else
    upper = (await db
      .prepare('SELECT COALESCE(MAX(sequence),0) AS value FROM audit_records')
      .first<number>('value'))!;
  const where = ['timestamp >= ?', 'sequence <= ?', 'sequence < ?'];
  const params: (string | number)[] = [
    Math.max(Date.now() - AUDIT_RETENTION_MS, filters.from ?? 0),
    upper,
    before,
  ];
  const fields = {
    userId: 'user_id',
    characterId: 'character_id',
    source: 'source',
    outcome: 'outcome',
    commandId: 'command_id',
    requestId: 'request_id',
    encounterId: 'encounter_id',
    revision: 'revision',
  };
  for (const [key, column] of Object.entries(fields)) {
    const value = filters[key as keyof typeof filters];
    if (value !== undefined) {
      where.push(`${column} = ?`);
      params.push(value);
    }
  }
  for (const field of ['category', 'type'] as const)
    if (filters[field]) {
      where.push(
        `(${field} = ? OR EXISTS (SELECT 1 FROM json_each(audit_records.details,'$.events') WHERE json_extract(value,'$.${field}') = ?))`,
      );
      params.push(filters[field], filters[field]);
    }
  if (filters.to !== undefined) {
    where.push('timestamp <= ?');
    params.push(filters.to);
  }
  if (player) where.push("outcome IN ('committed','reported')");
  const result = await db
    .prepare(
      `SELECT ${columns} FROM audit_records WHERE ${where.join(' AND ')} ORDER BY sequence DESC LIMIT ?`,
    )
    .bind(...params, limit + 1)
    .all<Stored>();
  const page = result.results.slice(0, limit);
  const nextCursor =
    result.results.length > limit
      ? Buffer.from(
          JSON.stringify({ upper, before: page.at(-1)!.sequence, scope }),
        ).toString('base64url')
      : null;
  const recordingSince = (await db
    .prepare(
      "SELECT value FROM audit_configuration WHERE key='recording_since'",
    )
    .first<number>('value'))!;
  return {
    entries: page.map((row) => ({
      ...projectRecord(row, player),
      ...(includeDetails ? { details: JSON.parse(row.details) } : {}),
    })),
    nextCursor,
    recordingSince,
  };
}
export async function auditDetail(db: D1Database, id: string) {
  const row = await db
    .prepare(`SELECT ${columns} FROM audit_records WHERE id=? AND timestamp>=?`)
    .bind(id, Date.now() - AUDIT_RETENTION_MS)
    .first<Stored>();
  if (!row) throw new HTTPException(404, { message: 'Log not found' });
  return {
    record: projectRecord(row),
    details: JSON.parse(row.details) as Record<string, unknown>,
  };
}
export async function pruneAudit(db: D1Database, now = Date.now()) {
  let removed = 0;
  for (let i = 0; i < 10; i++) {
    const result = await db
      .prepare(
        'DELETE FROM audit_records WHERE sequence IN (SELECT sequence FROM audit_records WHERE timestamp < ? ORDER BY timestamp LIMIT 1000)',
      )
      .bind(now - AUDIT_RETENTION_MS)
      .run();
    removed += result.meta.changes;
    if (result.meta.changes < 1000) break;
  }
  return removed;
}
