import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { HTTPException } from 'hono/http-exception';
import type { AppEnv } from '../env.js';
import { createAuth } from './auth.js';
import { rateLimitAuth } from './middleware.js';

export const authRoutes = new Hono<AppEnv>();
authRoutes.use('*', async (c, next) => {
  c.header('Cache-Control', 'no-store');
  await next();
});
authRoutes.use(
  '*',
  bodyLimit({
    maxSize: 4096,
    onError: () => {
      throw new HTTPException(413, {
        message: 'Request body exceeds 4096 bytes',
      });
    },
  }),
);
authRoutes.post('/sign-up/email', rateLimitAuth);
authRoutes.post('/sign-in/email', rateLimitAuth);
authRoutes.all('*', (c) =>
  createAuth(c.env, c.get('requestId')).handler(c.req.raw),
);
