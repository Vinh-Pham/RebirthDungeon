import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { bodyLimit } from 'hono/body-limit';
import { HTTPException } from 'hono/http-exception';
import { requireAuth } from '../auth/middleware.js';
import type { AppEnv } from '../env.js';
import { BattleAISchema } from '@rebirth/game-core/data/schemas/content';
import { QuestConditionSchema } from '@rebirth/game-core/data/schemas/quests';
import { TitleConditionSchema } from '@rebirth/game-core/data/schemas/titles';
import {
  CreationRequestSchema,
  CommandRequestSchema,
  PreviewRequestSchema,
  ListResponseSchema,
} from '@rebirth/game-core/online/Contracts';
import {
  GAME_FEATURES,
  featureResponseSchema,
  MutationResponseSchema,
  CreationResponseSchema,
  FeaturePreviewResponseSchema,
  ContentManifestSchema,
  ContentCollectionSchema,
  contentCollectionResponseSchema,
} from '@rebirth/game-core/online/Features';
import {
  actionDefinitions,
  previewDefinitions,
} from '@rebirth/game-core/online/Actions';
import { ContentRepository } from './content.js';
import { GameRepository } from './repository.js';
import { GameExecution } from './execution.js';
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
const revisionQuery = z.strictObject({
  expectedRevision: z.coerce.number().int().nonnegative().optional(),
});
const route = (
  method: 'get' | 'post',
  path: string,
  schema: z.ZodType,
  body?: z.ZodType,
  parameterSchema?: z.ZodObject,
  query?: z.ZodObject,
) =>
  createRoute({
    method,
    path,
    tags: [
      'Game ' +
        (path.includes('/characters')
          ? (path.split('/')[3] ?? 'Characters')
          : 'Content'),
    ],
    operationId: 'game_' + method + '_' + path.replace(/[^a-zA-Z0-9]+/g, '_'),
    security: [{ cookieAuth: [] }],
    request: {
      ...(body
        ? {
            body: {
              required: true,
              content: { 'application/json': { schema: body } },
            },
          }
        : {}),
      ...(parameterSchema
        ? { params: parameterSchema }
        : path.includes('{id}')
          ? { params }
          : {}),
      ...(query ? { query } : {}),
    },
    responses: responses(schema),
  });
const repo = (c: Parameters<typeof requireAuth>[0]) =>
  new GameRepository(
    c.env.DB,
    c.get('user').id,
    new ContentRepository(c.env.DB, c.env.CACHE),
  );
const execution = (c: Parameters<typeof requireAuth>[0]) =>
  new GameExecution(repo(c), c.get('requestId'));

gameRoutes.openapi(route('get', '/content', ContentManifestSchema), async (c) =>
  c.json(await new ContentRepository(c.env.DB, c.env.CACHE).manifest()),
);
for (const collection of ContentCollectionSchema.options) {
  gameRoutes.openapi(
    route(
      'get',
      `/content/{version}/${collection}`,
      contentCollectionResponseSchema(collection),
      undefined,
      z.strictObject({ version: z.string().min(1).max(300) }),
    ),
    async (c) => {
      const version = c.req.param('version')!;
      return c.json({
        apiVersion: 2,
        contentVersion: version,
        data: await new ContentRepository(c.env.DB, c.env.CACHE).collection(
          version,
          collection,
        ),
      });
    },
  );
}
gameRoutes.openapi(route('get', '/characters', ListResponseSchema), async (c) =>
  c.json(ListResponseSchema.parse({ characters: await repo(c).list() })),
);
gameRoutes.openapi(
  route('post', '/characters', CreationResponseSchema, CreationRequestSchema),
  async (c) => {
    const input = CreationRequestSchema.parse(await c.req.json());
    c.set('auditContext', {
      commandId: input.commandId,
      type: 'CREATE_CHARACTER',
    });
    const result = await execution(c).create(input);
    if (result.replayed) c.set('auditReplay', true);
    return c.json(result.response);
  },
);
for (const feature of GAME_FEATURES) {
  const path =
    '/characters/{id}' + (feature === 'character' ? '' : '/' + feature);
  gameRoutes.openapi(
    route(
      'get',
      path,
      featureResponseSchema(feature),
      undefined,
      undefined,
      revisionQuery,
    ),
    async (c) => {
      const query = revisionQuery.parse(c.req.query());
      return c.json(
        await repo(c).feature(
          c.req.param('id')!,
          feature,
          query.expectedRevision,
        ),
      );
    },
  );
}
for (const action of actionDefinitions) {
  gameRoutes.openapi(
    route(
      'post',
      '/characters/{id}' + action.path,
      MutationResponseSchema,
      action.body,
      action.params,
    ),
    async (c) => {
      const body = action.body.parse(await c.req.json()) as Record<
        string,
        unknown
      >;
      const { commandId, expectedRevision, ...fields } = body;
      const command = {
        ...fields,
        ...Object.fromEntries(
          action.keys.map((key) => [key, c.req.param(key)]),
        ),
        type: action.type,
      };
      const input = CommandRequestSchema.parse({
        commandId,
        expectedRevision,
        command,
      });
      c.set('auditContext', {
        commandId: input.commandId,
        type: input.command.type,
        expectedRevision: input.expectedRevision,
      });
      const result = await execution(c).action(c.req.param('id')!, input);
      if (result.replayed) c.set('auditReplay', true);
      return c.json(result.response);
    },
  );
}
for (const definition of previewDefinitions) {
  gameRoutes.openapi(
    route(
      'post',
      '/characters/{id}' + definition.path,
      FeaturePreviewResponseSchema,
      definition.body,
    ),
    async (c) => {
      const { expectedRevision, ...fields } = definition.body.parse(
        await c.req.json(),
      );
      const input = PreviewRequestSchema.parse({
        expectedRevision,
        selection: { type: definition.type, ...fields },
      });
      return c.json(
        FeaturePreviewResponseSchema.parse(
          await execution(c).preview(c.req.param('id')!, input),
        ),
      );
    },
  );
}
