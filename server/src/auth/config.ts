import { HTTPException } from 'hono/http-exception';

export type AuthBindings = Pick<
  CloudflareBindings,
  'DB' | 'BETTER_AUTH_SECRET'
> & {
  BETTER_AUTH_URL: string;
  BETTER_AUTH_TRUSTED_ORIGINS: string;
};

export function authConfiguration(env: AuthBindings) {
  try {
    if (
      !env.BETTER_AUTH_SECRET ||
      Buffer.byteLength(env.BETTER_AUTH_SECRET) < 32
    )
      throw new Error();
    const baseURL = new URL(env.BETTER_AUTH_URL);
    if (
      !['http:', 'https:'].includes(baseURL.protocol) ||
      baseURL.pathname !== '/' ||
      baseURL.search ||
      baseURL.hash ||
      baseURL.username ||
      baseURL.password
    )
      throw new Error();
    const origins: unknown = JSON.parse(env.BETTER_AUTH_TRUSTED_ORIGINS);
    if (
      !Array.isArray(origins) ||
      !origins.length ||
      !origins.every((origin): origin is string => {
        if (typeof origin !== 'string' || origin.includes('*')) return false;
        if (origin === 'rebirthdungeon://') return true;
        const url = new URL(origin);
        return (
          ['http:', 'https:'].includes(url.protocol) &&
          url.origin === origin &&
          !url.username &&
          !url.password
        );
      })
    )
      throw new Error();
    return {
      baseURL: baseURL.origin,
      trustedOrigins: [...new Set([baseURL.origin, ...origins])],
    };
  } catch {
    throw new HTTPException(503, {
      message: 'Authentication configuration unavailable',
    });
  }
}
