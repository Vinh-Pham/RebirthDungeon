import { OpenAPIHono } from '@hono/zod-openapi';
import { Scalar } from '@scalar/hono-api-reference';
import { secureHeaders } from 'hono/secure-headers';
import { cors } from 'hono/cors';
import { gameRoutes } from './game/routes.js';
import { authRoutes } from './auth/routes.js';
import { authenticationGuide } from './auth/documentation.js';
import { authConfiguration } from './auth/config.js';
import { protectApplicationWrites } from './auth/middleware.js';
import { handleError } from './errors.js';
import { queueRoutes } from './queues/routes.js';
import { cacheRoutes } from './kv/routes.js';
import { consumeJobs } from './queues/consumer.js';
import { runScheduled } from './cron/scheduled.js';
import type { AppEnv } from './env.js';

export const app = new OpenAPIHono<AppEnv>();
app.use('*', secureHeaders());
app.use('*', async (c, next) => {
  const requestId = crypto.randomUUID();
  c.set('requestId', requestId);
  c.header('X-Request-Id', requestId);
  await next();
  console.log(
    JSON.stringify({
      event: 'request_completed',
      requestId,
      method: c.req.method,
      route: c.req.routePath,
      status: c.res.status,
    }),
  );
});
const apiCors = cors({
  origin: (origin, c) =>
    authConfiguration(c.env).trustedOrigins.includes(origin)
      ? origin
      : undefined,
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'expo-origin'],
  exposeHeaders: ['X-Request-Id', 'Retry-After'],
});
app.use('/api/auth/*', async (c, next) => {
  c.header('Cache-Control', 'no-store');
  await next();
});
app.use('/queues/*', async (c, next) => {
  c.header('Cache-Control', 'no-store');
  await next();
});
app.use('/cache/*', async (c, next) => {
  c.header('Cache-Control', 'no-store');
  await next();
});
app.use('/api/auth/*', apiCors);
app.use('/api/game/*', async (c, next) => {
  c.header('Cache-Control', 'no-store');
  await next();
});
app.use('/api/game/*', apiCors, protectApplicationWrites);
app.use('/queues/*', apiCors, protectApplicationWrites);
app.use('/cache/*', apiCors, protectApplicationWrites);
app.onError(handleError);
app.notFound((c) =>
  c.json({ statusCode: 404, message: 'Not found', error: 'Not Found' }, 404),
);
app.get('/', (c) => c.text('Hello Hono!'));
app.route('/api/auth', authRoutes);
app.route('/api/game', gameRoutes);
app.route('/queues', queueRoutes);
app.route('/cache', cacheRoutes);
app.openAPIRegistry.registerComponent('securitySchemes', 'cookieAuth', {
  type: 'apiKey',
  in: 'cookie',
  name: 'better-auth.session_token',
  description:
    'Better Auth session cookie set by sign-up/sign-in. HTTPS uses the __Secure- prefix. Native clients forward the cookies from SecureStore.',
});
app.doc31('/openapi.json', {
  openapi: '3.1.0',
  info: {
    title: 'Rebirth Dungeon API',
    version: '3.0.0',
    description: authenticationGuide,
  },
  servers: [
    { url: '/', description: 'Current server (same origin as these docs)' },
  ],
  tags: [
    {
      name: 'Game',
      description:
        'Authoritative online characters with revision-checked, idempotent commands. Local characters remain separate.',
    },
    {
      name: 'Queues',
      description:
        'Asynchronous jobs with at-least-once delivery. The example records completion in Worker logs.',
    },
    {
      name: 'Cache',
      description:
        'Authenticated example entries in Cloudflare Workers KV with a time-to-live. KV is eventually consistent and never a source of truth.',
    },
  ],
});
app.get(
  '/docs',
  Scalar({
    sources: [
      { title: 'Application', url: '/openapi.json' },
      { title: 'Authentication', url: '/api/auth/open-api/generate-schema' },
    ],
    pageTitle: 'Rebirth Dungeon API Reference',
    persistAuth: false,
  }),
);
export default {
  fetch: app.fetch,
  async queue(batch: MessageBatch<unknown>): Promise<void> {
    await consumeJobs(batch);
  },
  async scheduled(controller: ScheduledController): Promise<void> {
    await runScheduled(controller);
  },
} satisfies ExportedHandler<CloudflareBindings>;
