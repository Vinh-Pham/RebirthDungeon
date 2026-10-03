import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import type { AppEnv } from '../env.js';
import { createAuth } from './auth.js';
import { authConfiguration } from './config.js';

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  let session;
  try {
    session = await createAuth(c.env, c.get('requestId')).api.getSession({
      headers: c.req.raw.headers,
    });
  } catch {
    throw new HTTPException(503, { message: 'Authentication unavailable' });
  }
  if (!session)
    throw new HTTPException(401, { message: 'Session expired or revoked' });
  c.set('user', session.user);
  c.set('sessionId', session.session.id);
  await next();
});

export const protectApplicationWrites = createMiddleware<AppEnv>(
  async (c, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) return next();
    const origin = c.req.header('Origin');
    const fetchSite = c.req.header('Sec-Fetch-Site');
    const { trustedOrigins } = authConfiguration(c.env);
    if (
      (origin && !trustedOrigins.includes(origin)) ||
      (!origin && fetchSite === 'cross-site')
    ) {
      throw new HTTPException(403, { message: 'Untrusted request origin' });
    }
    // Browser forms cannot impersonate native JSON requests without an allowed preflight.
    if (
      ['POST', 'PUT', 'PATCH'].includes(c.req.method) &&
      c.req.header('Content-Type')?.split(';')[0].trim().toLowerCase() !==
        'application/json'
    ) {
      throw new HTTPException(415, { message: 'JSON request body required' });
    }
    await next();
  },
);

export const rateLimitAuth = createMiddleware<AppEnv>(async (c, next) => {
  const ip = c.req.header('CF-Connecting-IP') ?? 'local';
  let allowed: boolean;
  try {
    ({ success: allowed } = await c.env.AUTH_RATE_LIMIT.limit({
      key: `${c.req.path}:${ip}`,
    }));
  } catch {
    throw new HTTPException(503, { message: 'Rate limiting unavailable' });
  }
  if (!allowed) {
    c.header('Retry-After', '60');
    throw new HTTPException(429, { message: 'Too many requests' });
  }
  await next();
});
