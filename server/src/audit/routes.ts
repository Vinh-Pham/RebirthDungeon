import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { bodyLimit } from 'hono/body-limit';
import { HTTPException } from 'hono/http-exception';
import {
  ActivityBatchSchema,
  ActivityAckSchema,
  AuditDetailSchema,
  CapabilitiesSchema,
  ExportSchema,
  LogPageSchema,
  PlayersSchema,
} from '@rebirth/game-core/online/Audit';
import type { AppEnv } from '../env.js';
import { requireAuth } from '../auth/middleware.js';
import {
  auditDetail,
  auditStatement,
  isAdministrator,
  listAudit,
  LogQuerySchema,
  recordAudit,
} from './repository.js';

const failure = {
  statusCode: 400,
  message: 'Malformed log request',
  error: 'Bad Request',
};
const app = () =>
  new OpenAPIHono<AppEnv>({
    defaultHook: (result, c) => {
      if (!result.success) return c.json(failure, 400);
    },
  });
const definition = (
  method: 'get' | 'post',
  path: string,
  schema: z.ZodType,
  body?: z.ZodType,
  query?: z.ZodObject,
) =>
  createRoute({
    method,
    path,
    tags: ['Audit'],
    operationId: `audit_${method}_${path.replace(/[^a-zA-Z0-9]/g, '_')}`,
    security: [{ cookieAuth: [] }],
    request: {
      ...(path.includes('{id}')
        ? { params: z.object({ id: z.string().uuid() }) }
        : {}),
      ...(query ? { query } : {}),
      ...(body
        ? {
            body: {
              required: true,
              content: { 'application/json': { schema: body } },
            },
          }
        : {}),
    },
    responses: {
      200: {
        description: 'Audit result',
        content: { 'application/json': { schema } },
      },
    },
  });
export const characterLogRoutes = app();
characterLogRoutes.use('/characters/:id/logs', requireAuth);
characterLogRoutes.use('/characters/:id/activity', requireAuth);
characterLogRoutes.use(
  '/characters/:id/activity',
  bodyLimit({
    maxSize: 4096,
    onError: (c) => c.json({ message: 'Request body exceeds 4 KiB' }, 413),
  }),
);
const owned = async (db: D1Database, userId: string, id: string) => {
  if (
    !(await db
      .prepare(
        'SELECT id FROM game_characters WHERE id=? AND user_id=? AND deleted_at IS NULL',
      )
      .bind(id, userId)
      .first())
  )
    throw new HTTPException(404, { message: 'Character not found' });
};
characterLogRoutes.openapi(
  definition(
    'get',
    '/characters/{id}/logs',
    LogPageSchema,
    undefined,
    LogQuerySchema,
  ),
  async (c) => {
    const id = c.req.param('id')!;
    const userId = c.get('user').id;
    await owned(c.env.DB, userId, id);
    const query = LogQuerySchema.parse(c.req.query());
    return c.json(
      await listAudit(c.env.DB, { ...query, userId, characterId: id }, true),
    );
  },
);
characterLogRoutes.openapi(
  definition(
    'post',
    '/characters/{id}/activity',
    ActivityAckSchema,
    ActivityBatchSchema,
  ),
  async (c) => {
    const userId = c.get('user').id,
      id = c.req.param('id')!;
    const { success } = await c.env.ACTIVITY_RATE_LIMIT.limit({ key: userId });
    if (!success) {
      c.header('Retry-After', '60');
      throw new HTTPException(429, { message: 'Too many activity batches' });
    }
    await owned(c.env.DB, userId, id);
    const input = ActivityBatchSchema.parse(await c.req.json());
    const now = Date.now();
    await c.env.DB.batch(
      input.events.map((e) =>
        auditStatement(
          c.env.DB,
          {
            id: crypto.randomUUID(),
            timestamp: now,
            userId,
            characterId: id,
            source: 'client',
            category: ['CONNECTION_CHANGED', 'ACTIVITY_DROPPED'].includes(
              e.type,
            )
              ? 'system'
              : 'user',
            type: e.type,
            outcome: 'reported',
            message: e.message,
            requestId: c.get('requestId'),
            occurredAt: e.occurredAt,
            dedupeKey: `activity:${userId}:${e.id}`,
            details: {
              version: 1,
              eventId: e.id,
              claimedRevision: e.revision ?? null,
            },
          },
          true,
        ),
      ),
    );
    return c.json({ ids: input.events.map((e) => e.id) });
  },
);
export const adminLogRoutes = app();
adminLogRoutes.openAPIRegistry.register(
  'AuditJSON',
  AuditDetailSchema.shape.details.valueType.openapi({
    type: ['string', 'number', 'boolean', 'object', 'array', 'null'],
  }),
);
adminLogRoutes.use('*', requireAuth);
adminLogRoutes.use('*', async (c, next) => {
  if (c.req.path.endsWith('/capabilities')) return next();
  if (!(await isAdministrator(c.env.DB, c.get('user').id)))
    throw new HTTPException(403, { message: 'Administrator access required' });
  const { success } = await c.env.ACTIVITY_RATE_LIMIT.limit({
    key: `admin:${c.get('user').id}`,
  });
  if (!success)
    throw new HTTPException(429, {
      message: 'Too many investigation requests',
    });
  const filters = LogQuerySchema.omit({ cursor: true, limit: true }).safeParse(
    c.req.query(),
  );
  if (!filters.success) return c.json(failure, 400);
  // Access is audited before data is exposed. Do not log search terms or exported payloads.
  await recordAudit(c.env.DB, {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    userId: c.get('user').id,
    source: 'server',
    category: 'system',
    type: c.req.path.endsWith('/export') ? 'AUDIT_EXPORTED' : 'AUDIT_VIEWED',
    outcome: 'administration',
    message: 'Administrator accessed audit history.',
    requestId: c.get('requestId'),
    details: {
      version: 1,
      path: c.req.path,
      filters: filters.data,
    },
  });
  await next();
});
adminLogRoutes.openapi(
  definition('get', '/capabilities', CapabilitiesSchema),
  async (c) =>
    c.json({ admin: await isAdministrator(c.env.DB, c.get('user').id) }),
);
adminLogRoutes.openapi(
  definition(
    'get',
    '/players',
    PlayersSchema,
    undefined,
    z.object({ q: z.string().max(100).default('') }),
  ),
  async (c) => {
    const term = c.req.query('q') ?? '';
    // Literal substring search, bounded to 50 accounts/characters. No wildcard interpretation.
    const result = await c.env.DB.prepare(
      `SELECT u.id AS userId,u.email,g.id AS characterId,g.name FROM user u LEFT JOIN game_characters g ON g.user_id=u.id AND g.deleted_at IS NULL WHERE instr(lower(u.email),lower(?))>0 OR u.id=? OR instr(lower(g.name),lower(?))>0 OR g.id=? ORDER BY u.id,g.id LIMIT 50`,
    )
      .bind(term, term, term, term)
      .all();
    return c.json({ players: result.results });
  },
);
adminLogRoutes.openapi(
  definition('get', '/logs/export', ExportSchema, undefined, LogQuerySchema),
  async (c) => {
    const page = await listAudit(
      c.env.DB,
      LogQuerySchema.parse(c.req.query()),
      false,
      true,
    );
    return c.json({
      jsonl:
        page.entries.map((entry) => JSON.stringify(entry)).join('\n') +
        (page.entries.length ? '\n' : ''),
      nextCursor: page.nextCursor,
    });
  },
);
adminLogRoutes.openapi(
  definition('get', '/logs', LogPageSchema, undefined, LogQuerySchema),
  async (c) =>
    c.json(await listAudit(c.env.DB, LogQuerySchema.parse(c.req.query()))),
);
adminLogRoutes.openapi(
  definition('get', '/logs/{id}', AuditDetailSchema),
  async (c) => c.json(await auditDetail(c.env.DB, c.req.param('id')!)),
);
