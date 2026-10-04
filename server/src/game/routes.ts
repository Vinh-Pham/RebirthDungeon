import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { bodyLimit } from 'hono/body-limit';
import { HTTPException } from 'hono/http-exception';
import { requireAuth } from '../auth/middleware.js';
import type { AppEnv } from '../env.js';
import { BattleAISchema } from '@rebirth/game-core/data/schemas/content';
import { QuestConditionSchema } from '@rebirth/game-core/data/schemas/quests';
import { TitleConditionSchema } from '@rebirth/game-core/data/schemas/titles';
import {
  ContentResponseSchema,
  PreviewResponseSchema,
  CreationRequestSchema,
  CommandRequestSchema,
  PreviewRequestSchema,
  CommandResponseSchema,
  PublicViewSchema,
  ListResponseSchema,
  ReceiptSchema,
  GAME_CONTENT_VERSION,
} from '@rebirth/game-core/online/Contracts';
import {
  gameContent,
  newOnlineState,
  execute,
  preview,
  publicView,
} from '@rebirth/game-core/online/Runtime';
import {
  AuditCollectionError,
  creationAudit,
} from '@rebirth/game-core/online/Audit';
import { GameRepository, requestHash } from './repository.js';

export const gameRoutes = new OpenAPIHono<AppEnv>({
  defaultHook: (result, c) => {
    if (!result.success)
      return c.json(
        {
          statusCode: 400,
          message: 'Malformed game request',
          error: 'Bad Request',
        },
        400,
      );
  },
});
// The generator cannot traverse Zod's recursive JSON type; describe its JSON value domain explicitly.
gameRoutes.openAPIRegistry.register(
  'GameJSON',
  BattleAISchema.shape.config.unwrap().valueType.openapi({
    type: ['string', 'number', 'boolean', 'object', 'array', 'null'],
  }),
);
gameRoutes.openAPIRegistry.register('GameQuestCondition', QuestConditionSchema);
gameRoutes.openAPIRegistry.register('GameTitleCondition', TitleConditionSchema);
gameRoutes.use('*', requireAuth);
gameRoutes.use('*', async (c, next) => {
  let allowed: boolean;
  try {
    ({ success: allowed } = await c.env.GAME_RATE_LIMIT.limit({
      key: c.get('user').id,
    }));
  } catch {
    throw new HTTPException(503, { message: 'Rate limiting unavailable' });
  }
  if (!allowed) {
    c.header('Retry-After', '60');
    throw new HTTPException(429, { message: 'Too many game requests' });
  }
  await next();
});
gameRoutes.use(
  '*',
  bodyLimit({
    maxSize: 4096,
    onError: (c) =>
      c.json(
        {
          statusCode: 413,
          message: 'Request body exceeds 4 KiB',
          error: 'Payload Too Large',
        },
        413,
      ),
  }),
);
const errors = {
  400: 'Malformed request',
  401: 'Session required',
  403: 'Untrusted origin',
  404: 'Missing or unowned character',
  409: 'Revision or idempotency conflict',
  413: 'Body exceeds 4 KiB',
  415: 'JSON required',
  422: 'Illegal gameplay action',
  429: 'Rate limit',
  503: 'Storage unavailable',
};
const errorSchema = z.strictObject({
  statusCode: z.number(),
  message: z.string(),
  error: z.string(),
});
const responses = (schema: z.ZodType) => ({
  200: {
    description: 'Committed result or public view',
    content: { 'application/json': { schema } },
  },
  ...Object.fromEntries(
    Object.entries(errors).map(([status, description]) => [
      status,
      { description, content: { 'application/json': { schema: errorSchema } } },
    ]),
  ),
});
const params = z.strictObject({ id: z.string().uuid() });
const route = (
  method: 'get' | 'post',
  path: string,
  schema: z.ZodType,
  body?: z.ZodType,
) =>
  createRoute({
    method,
    path,
    tags: ['Game'],
    operationId: 'game_' + method + '_' + path.replace(/[^a-zA-Z0-9]+/g, '_'),
    security: [{ cookieAuth: [] }],
    ...(body || path.includes('{id}')
      ? {
          request: {
            ...(body
              ? {
                  body: {
                    required: true,
                    content: { 'application/json': { schema: body } },
                  },
                }
              : {}),
            ...(path.includes('{id}') ? { params } : {}),
          },
        }
      : {}),
    responses: responses(schema),
  });
const repo = (c: Parameters<typeof requireAuth>[0]) =>
  new GameRepository(c.env.DB, c.get('user').id);
function gameplay<T>(action: () => T): T {
  try {
    return action();
  } catch (error) {
    if (error instanceof AuditCollectionError) {
      console.error(JSON.stringify({ event: 'audit_collection_failed' }));
      throw new HTTPException(503, { message: 'Gameplay audit unavailable' });
    }
    throw new HTTPException(422, {
      message:
        error instanceof Error ? error.message : 'Illegal gameplay action',
    });
  }
}
async function duplicate(
  repository: GameRepository,
  commandId: string,
  hash: string,
) {
  const existing = await repository.receipt(commandId);
  if (!existing) return;
  if (existing.hash !== hash)
    throw new HTTPException(409, {
      message: 'Command ID was already used with different input',
    });
  const current = await repository.load(existing.receipt.characterId);
  return CommandResponseSchema.parse({
    receipt: existing.receipt,
    view: publicView(current.state, current.character),
  });
}
gameRoutes.openapi(route('get', '/content', ContentResponseSchema), (c) =>
  c.json({ contentVersion: GAME_CONTENT_VERSION, catalog: gameContent.data }),
);
gameRoutes.openapi(route('get', '/characters', ListResponseSchema), async (c) =>
  c.json(ListResponseSchema.parse({ characters: await repo(c).list() })),
);
gameRoutes.openapi(
  route('post', '/characters', CommandResponseSchema, CreationRequestSchema),
  async (c) => {
    const input = CreationRequestSchema.parse(await c.req.json());
    c.set('auditContext', {
      commandId: input.commandId,
      type: 'CREATE_CHARACTER',
    });
    const repository = repo(c);
    const hash = await requestHash({ operation: 'CREATE_CHARACTER', input });
    const prior = await duplicate(repository, input.commandId, hash);
    if (prior) {
      c.set('auditReplay', true);
      return c.json(prior);
    }
    const now = Date.now(),
      id = crypto.randomUUID();
    const seed = new Int32Array(
      crypto.getRandomValues(new Uint32Array(1)).buffer,
    )[0];
    const character = {
      id,
      name: input.name,
      talent: input.talent,
      age: input.age,
      revision: 1,
      contentVersion: GAME_CONTENT_VERSION,
      createdAt: now,
      updatedAt: now,
    };
    const state = newOnlineState(seed, character.name, character.talent);
    const receipt = ReceiptSchema.parse({
      commandId: input.commandId,
      characterId: id,
      baseRevision: 0,
      committedRevision: 1,
      createdAt: now,
      outcome: { message: 'Character created', events: ['CHARACTER_CREATED'] },
    });
    const committed = await repository.commit(
      character,
      undefined,
      state,
      receipt,
      hash,
      {
        requestId: c.get('requestId'),
        command: {
          type: 'CREATE_CHARACTER',
          name: input.name,
          talent: input.talent,
          age: input.age,
        },
        audit: creationAudit(state),
      },
    );
    if (committed.replayed) c.set('auditReplay', true);
    const current = await repository.load(committed.receipt.characterId);
    return c.json(
      CommandResponseSchema.parse({
        receipt: committed.receipt,
        view: publicView(current.state, current.character),
      }),
    );
  },
);
gameRoutes.openapi(
  route('get', '/characters/{id}', PublicViewSchema),
  async (c) => {
    const current = await repo(c).load(c.req.param('id')!);
    return c.json(publicView(current.state, current.character));
  },
);
gameRoutes.openapi(
  route(
    'post',
    '/characters/{id}/previews',
    PreviewResponseSchema,
    PreviewRequestSchema,
  ),
  async (c) => {
    const input = PreviewRequestSchema.parse(await c.req.json());
    const current = await repo(c).load(c.req.param('id')!);
    if (input.expectedRevision !== current.character.revision)
      throw new HTTPException(409, { message: 'Character revision changed' });
    return c.json(
      PreviewResponseSchema.parse({
        revision: current.character.revision,
        preview: gameplay(() => preview(current.state, input.selection)),
      }),
    );
  },
);
gameRoutes.openapi(
  route(
    'post',
    '/characters/{id}/commands',
    CommandResponseSchema,
    CommandRequestSchema,
  ),
  async (c) => {
    const input = CommandRequestSchema.parse(await c.req.json()),
      id = c.req.param('id')!,
      repository = repo(c);
    c.set('auditContext', {
      commandId: input.commandId,
      type: input.command.type,
      expectedRevision: input.expectedRevision,
    });
    const hash = await requestHash({
      operation: 'COMMAND',
      characterId: id,
      input,
    });
    const prior = await duplicate(repository, input.commandId, hash);
    if (prior) {
      c.set('auditReplay', true);
      return c.json(prior);
    }
    const current = await repository.load(id);
    if (current.character.revision !== input.expectedRevision)
      throw new HTTPException(409, { message: 'Character revision changed' });
    const now = Date.now();
    const candidate = gameplay(() =>
      execute(current.state, current.character.name, input.command, now),
    );
    const receipt = ReceiptSchema.parse({
      commandId: input.commandId,
      characterId: id,
      baseRevision: input.expectedRevision,
      committedRevision: input.expectedRevision + 1,
      createdAt: now,
      outcome: candidate.outcome,
    });
    const committed = await repository.commit(
      current.character,
      current.rows,
      candidate.state,
      receipt,
      hash,
      {
        requestId: c.get('requestId'),
        command: input.command,
        audit: candidate.audit,
      },
    );
    if (committed.replayed) c.set('auditReplay', true);
    const latest = await repository.load(id);
    return c.json(
      CommandResponseSchema.parse({
        receipt: committed.receipt,
        view: publicView(latest.state, latest.character),
      }),
    );
  },
);
