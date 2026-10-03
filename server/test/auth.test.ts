import { env, exports } from 'cloudflare:workers';
import { applyD1Migrations, reset, type D1Migration } from 'cloudflare:test';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { verifyPassword } from 'better-auth/crypto';
import { app } from '../src/index.js';
import { SESSION_TTL_SECONDS } from '../src/auth/auth.js';
import {
  authRequest,
  register,
  cookieFrom,
  PASSWORD,
  AUTH_ORIGIN,
} from './auth-helpers.js';

declare global {
  namespace Cloudflare {
    interface Env {
      TEST_MIGRATIONS: D1Migration[];
    }
  }
}
beforeEach(async () => {
  await reset();
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});
afterEach(() => vi.restoreAllMocks());

const email = 'player@example.com';
const credentials = { email, password: PASSWORD };
async function session(cookie?: string) {
  return (await authRequest('/get-session', undefined, cookie)).json();
}
function protectedRequest(
  cookie?: string,
  extraHeaders?: Record<string, string>,
) {
  return exports.default.fetch(`${AUTH_ORIGIN}/cache/entries/missing`, {
    headers: { ...(cookie ? { Cookie: cookie } : {}), ...extraHeaders },
  });
}

describe('Better Auth email/password sessions', () => {
  it('normalizes email, hashes credentials, and signs up with a secure cookie', async () => {
    const auth = await register('  Player@Example.com  ');
    expect(auth.user).toMatchObject({
      name: 'Player',
      email,
      emailVerified: false,
    });
    const account = await env.DB.prepare('SELECT * FROM account').first<{
      password: string;
      provider_id: string;
      user_id: string;
    }>();
    expect(account!.provider_id).toBe('credential');
    expect(account!.user_id).toBe(auth.user.id);
    expect(account!.password).not.toContain(PASSWORD);
    expect(
      await verifyPassword({ hash: account!.password, password: PASSWORD }),
    ).toBe(true);
    const current = await session(auth.cookie);
    expect(current).toMatchObject({ user: { id: auth.user.id, email } });
    expect(JSON.stringify(current)).not.toContain(account!.password);
    expect((await protectedRequest(auth.cookie)).status).toBe(404);
    const expiry = await env.DB.prepare(
      'SELECT expires_at, created_at FROM session',
    ).first<{ expires_at: number; created_at: number }>();
    expect(
      Math.abs(
        expiry!.expires_at - expiry!.created_at - SESSION_TTL_SECONDS * 1000,
      ),
    ).toBeLessThan(1000);
  });

  it('returns Better Auth native errors for duplicate normalized emails', async () => {
    await register();
    const response = await authRequest('/sign-up/email', {
      name: 'Other',
      email: ' PLAYER@EXAMPLE.COM ',
      password: PASSWORD,
    });
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({
      code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL',
    });
    expect(
      await env.DB.prepare('SELECT COUNT(*) AS count FROM user').first('count'),
    ).toBe(1);
  });

  it('handles simultaneous registration without duplicating accounts', async () => {
    const responses = await Promise.all(
      [1, 2].map(() =>
        authRequest('/sign-up/email', { name: 'Player', ...credentials }),
      ),
    );
    expect(responses.map((res) => res.status).sort()).toEqual([200, 422]);
    for (const table of ['user', 'account', 'session']) {
      expect(
        await env.DB.prepare(`SELECT COUNT(*) AS count FROM ${table}`).first(
          'count',
        ),
      ).toBe(1);
    }
  });

  it('replaces the old session after sign-in and preserves user identity', async () => {
    const first = await register();
    const login = await authRequest('/sign-in/email', {
      email: ' PLAYER@EXAMPLE.COM ',
      password: PASSWORD,
    });
    expect(login.status).toBe(200);
    const cookie = cookieFrom(login);
    expect(cookie).not.toBe(first.cookie);
    expect(await session(first.cookie)).toBeNull();
    expect((await protectedRequest(first.cookie)).status).toBe(401);
    expect(await session(cookie)).toMatchObject({
      user: { id: first.user.id },
    });
    expect(
      await env.DB.prepare('SELECT COUNT(*) AS count FROM session').first(
        'count',
      ),
    ).toBe(1);
  });

  it('leaves exactly one valid session after concurrent sign-ins', async () => {
    const first = await register();
    const logins = await Promise.all(
      [1, 2].map(() => authRequest('/sign-in/email', credentials)),
    );
    expect(logins.map((res) => res.status)).toEqual([200, 200]);
    const sessions = await Promise.all(
      logins.map((res) => session(cookieFrom(res))),
    );
    expect(sessions.filter(Boolean)).toHaveLength(1);
    expect(await session(first.cookie)).toBeNull();
    expect(
      await env.DB.prepare('SELECT COUNT(*) AS count FROM session').first(
        'count',
      ),
    ).toBe(1);
  });

  it('keeps the previous session if its replacement insert fails', async () => {
    const first = await register();
    await env.DB.prepare(
      "CREATE TRIGGER reject_new_session AFTER INSERT ON session BEGIN SELECT RAISE(ABORT, 'private database details'); END",
    ).run();
    const response = await authRequest('/sign-in/email', credentials);
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(await response.text()).not.toContain('private database details');
    expect(await session(first.cookie)).toMatchObject({
      user: { id: first.user.id },
    });
    expect(
      await env.DB.prepare('SELECT COUNT(*) AS count FROM session').first(
        'count',
      ),
    ).toBe(1);
  });

  it('keeps all other users signed in when one user signs in again', async () => {
    const alice = await register();
    const bob = await register('bob@example.com');
    await authRequest('/sign-in/email', credentials);
    expect(await session(alice.cookie)).toBeNull();
    expect(await session(bob.cookie)).toMatchObject({
      user: { id: bob.user.id },
    });
  });

  it('uses the same generic error for absent accounts and wrong passwords', async () => {
    const first = await register();
    const wrong = await authRequest('/sign-in/email', {
      email,
      password: 'incorrect long password',
    });
    const absent = await authRequest('/sign-in/email', {
      email: 'absent@example.com',
      password: PASSWORD,
    });
    expect(wrong.status).toBe(401);
    expect(absent.status).toBe(401);
    expect(await wrong.json()).toEqual(await absent.json());
    expect(await session(first.cookie)).toBeTruthy();
  });

  it('accepts password boundaries and preserves whitespace', async () => {
    for (const length of [12, 128]) {
      const auth = await register(
        `length-${length}@example.com`,
        'a'.repeat(length),
      );
      expect(await session(auth.cookie)).toBeTruthy();
    }
    await register();
    expect(
      (
        await authRequest('/sign-in/email', {
          email,
          password: PASSWORD.trim(),
        })
      ).status,
    ).toBe(401);
  });

  it('rejects invalid credentials, missing names, and password lengths', async () => {
    for (const body of [
      {},
      { ...credentials },
      { name: 'Player', ...credentials, email: 'not-an-email' },
      { name: 'Player', ...credentials, password: 'a'.repeat(11) },
      { name: 'Player', ...credentials, password: 'a'.repeat(129) },
    ]) {
      const response = await authRequest('/sign-up/email', body);
      expect(response.status).toBe(400);
    }
  });

  it('enforces seven days even when the client disables rememberMe', async () => {
    for (const path of ['/sign-up/email', '/sign-in/email']) {
      const response = await authRequest(path, {
        name: 'Player',
        ...credentials,
        rememberMe: false,
      });
      expect(response.status).toBe(200);
      const current = await (
        await authRequest('/get-session', undefined, cookieFrom(response))
      ).json<{ session: { expiresAt: string; createdAt: string } }>();
      expect(
        new Date(current.session.expiresAt).getTime() -
          new Date(current.session.createdAt).getTime(),
      ).toBeGreaterThan(SESSION_TTL_SECONDS * 1000 - 1000);
      expect(response.headers.get('Set-Cookie')).toContain('Max-Age=604800');
    }
  });

  it('expires sessions without sliding their fixed deadline', async () => {
    const auth = await register();
    const expiry = Date.now() + 86400000;
    await env.DB.prepare(
      'UPDATE session SET expires_at = ?, created_at = ?, updated_at = ?',
    )
      .bind(expiry, Date.now() - 6 * 86400000, Date.now() - 6 * 86400000)
      .run();
    expect(await session(auth.cookie)).toBeTruthy();
    expect(
      await env.DB.prepare('SELECT expires_at FROM session').first(
        'expires_at',
      ),
    ).toBe(expiry);
    await env.DB.prepare('UPDATE session SET expires_at = ?')
      .bind(Date.now() - 1)
      .run();
    expect(await session(auth.cookie)).toBeNull();
    expect((await protectedRequest(auth.cookie)).status).toBe(401);
  });

  it('revokes the current session and clears the cookie at sign-out', async () => {
    const auth = await register();
    const response = await authRequest('/sign-out', {}, auth.cookie);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true });
    expect(response.headers.get('Set-Cookie')).toContain('Max-Age=0');
    expect(await session(auth.cookie)).toBeNull();
    expect((await protectedRequest(auth.cookie)).status).toBe(401);
  });

  it('does not revoke the winning session when an old device signs out', async () => {
    const first = await register();
    const login = await authRequest('/sign-in/email', credentials);
    await authRequest('/sign-out', {}, first.cookie);
    expect(await session(cookieFrom(login))).toBeTruthy();
  });

  it('rejects missing, tampered, and legacy bearer credentials', async () => {
    const auth = await register();
    expect(await session()).toBeNull();
    expect(
      await session(
        auth.cookie.replace('session_token=', 'session_token=invalid'),
      ),
    ).toBeNull();
    expect(
      (
        await protectedRequest(undefined, {
          Authorization: 'Bearer legacy-token',
        })
      ).status,
    ).toBe(401);
    for (const path of [
      '/auth/register',
      '/auth/login',
      '/auth/me',
      '/auth/refresh',
      '/auth/logout',
    ]) {
      expect(
        (await exports.default.fetch(`${AUTH_ORIGIN}${path}`)).status,
      ).toBe(404);
    }
  });

  it('fails closed on D1 failure and keeps error details out of logs', async () => {
    const auth = await register();
    const logs = vi.spyOn(console, 'error').mockImplementation(() => {});
    await env.DB.prepare('DROP TABLE session').run();
    const response = await protectedRequest(auth.cookie);
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('SELECT');
    expect(logs.mock.calls.flat().join('')).not.toContain(auth.cookie);
    expect(logs.mock.calls.flat().join('')).not.toContain(PASSWORD);
  });

  it('sanitizes unexpected handler errors without logging database parameters', async () => {
    const logs = vi.spyOn(console, 'error').mockImplementation(() => {});
    await env.DB.prepare('DROP TABLE user').run();
    const response = await authRequest('/sign-up/email', {
      name: 'Player',
      ...credentials,
    });
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({
      code: 'INTERNAL_SERVER_ERROR',
    });
    const output = logs.mock.calls.flat().join('');
    expect(output).not.toContain(email);
    expect(output).not.toContain(PASSWORD);
    expect(output).not.toContain('SELECT');
    expect(output).not.toContain('SERVER_ERROR');
  });

  it('reports failed session revocation and preserves the cookie for retry', async () => {
    const auth = await register();
    const logs = vi.spyOn(console, 'error').mockImplementation(() => {});
    await env.DB.prepare(
      `CREATE TRIGGER fail_revoke BEFORE DELETE ON session BEGIN SELECT RAISE(ABORT, 'private database details'); END`,
    ).run();
    const response = await authRequest('/sign-out', {}, auth.cookie);
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      code: 'SESSION_REVOCATION_FAILED',
    });
    expect(response.headers.get('Set-Cookie')).toBeNull();
    expect((await protectedRequest(auth.cookie)).status).toBe(404);
    expect(logs.mock.calls.flat().join('')).not.toContain(
      'private database details',
    );
    await env.DB.prepare('DROP TRIGGER fail_revoke').run();
    expect((await authRequest('/sign-out', {}, auth.cookie)).status).toBe(200);
    expect((await protectedRequest(auth.cookie)).status).toBe(401);
  });

  it('does not revoke sessions for rejected sign-out origins', async () => {
    const auth = await register();
    expect(
      (
        await authRequest('/sign-out', {}, auth.cookie, {
          Origin: 'https://evil.example',
        })
      ).status,
    ).toBe(403);
    expect((await protectedRequest(auth.cookie)).status).toBe(404);
  });

  it('rejects missing configuration before creating users', async () => {
    const response = await app.request(
      '/api/auth/sign-up/email',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Player', ...credentials }),
      },
      { ...env, BETTER_AUTH_SECRET: '' },
    );
    expect(response.status).toBe(503);
    expect(
      await env.DB.prepare('SELECT COUNT(*) AS count FROM user').first('count'),
    ).toBe(0);
  });

  it('rejects unsafe auth configuration and accepts explicitly configured LAN origins', async () => {
    for (const overrides of [
      { BETTER_AUTH_URL: 'https://example.com/api' },
      { BETTER_AUTH_URL: 'https://user:password@example.com' },
      { BETTER_AUTH_URL: 'ftp://example.com' },
      { BETTER_AUTH_TRUSTED_ORIGINS: '["https://*.example.com"]' },
      { BETTER_AUTH_TRUSTED_ORIGINS: '[]' },
      { BETTER_AUTH_TRUSTED_ORIGINS: 'not json' },
    ]) {
      const response = await app.request(
        '/api/auth/get-session',
        {},
        { ...env, ...overrides },
      );
      expect(response.status).toBe(503);
    }
    const response = await app.request(
      'http://192.168.1.20:8787/api/auth/get-session',
      {},
      {
        ...env,
        BETTER_AUTH_URL: 'http://192.168.1.20:8787',
        BETTER_AUTH_TRUSTED_ORIGINS:
          '["rebirthdungeon://","http://192.168.1.20:8081"]',
      },
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toBeNull();
  });

  it('applies sign-up/sign-in rate limits and fails closed on limiter errors', async () => {
    const limit = vi
      .spyOn(env.AUTH_RATE_LIMIT, 'limit')
      .mockResolvedValue({ success: false });
    for (const path of ['/sign-up/email', '/sign-in/email']) {
      const response = await authRequest(path, {
        name: 'Player',
        ...credentials,
      });
      expect(response.status).toBe(429);
      expect(response.headers.get('Retry-After')).toBe('60');
    }
    expect(limit).toHaveBeenCalledWith({
      key: '/api/auth/sign-in/email:192.0.2.1',
    });
    limit.mockRejectedValue(new Error('private limiter details'));
    const response = await authRequest('/sign-in/email', credentials);
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('private limiter details');
  });

  it('rejects oversized authentication requests', async () => {
    expect(
      (
        await authRequest('/sign-up/email', {
          name: 'x'.repeat(5000),
          ...credentials,
        })
      ).status,
    ).toBe(413);
  });

  it('supports the Expo-origin header and rejects untrusted origins', async () => {
    const response = await exports.default.fetch(
      `${AUTH_ORIGIN}/api/auth/sign-up/email`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'expo-origin': 'rebirthdungeon://',
        },
        body: JSON.stringify({ name: 'Player', ...credentials }),
      },
    );
    expect(response.status, await response.clone().text()).toBe(200);
    const denied = await authRequest('/sign-in/email', credentials, undefined, {
      Origin: 'https://evil.example',
    });
    expect(denied.status).toBe(403);
  });

  it('configures credentialed CORS without trusting arbitrary origins', async () => {
    for (const origin of ['https://app.example.com', 'https://evil.example']) {
      const response = await exports.default.fetch(
        `${AUTH_ORIGIN}/api/auth/sign-in/email`,
        {
          method: 'OPTIONS',
          headers: {
            Origin: origin,
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type',
          },
        },
      );
      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
        origin === 'https://app.example.com' ? origin : null,
      );
      expect(response.headers.get('Access-Control-Allow-Credentials')).toBe(
        'true',
      );
    }
  });

  it('generates Better Auth schemas and exposes both Scalar sources', async () => {
    const response = await authRequest('/open-api/generate-schema');
    expect(response.status).toBe(200);
    const schema = await response.json<{ paths: Record<string, unknown> }>();
    for (const path of [
      '/sign-up/email',
      '/sign-in/email',
      '/get-session',
      '/sign-out',
    ])
      expect(schema.paths).toHaveProperty(path);
    expect(JSON.stringify(schema)).not.toContain('JWT_ACCESS_SECRET');
    const docs = await (
      await exports.default.fetch(`${AUTH_ORIGIN}/docs`)
    ).text();
    expect(docs).toContain('/openapi.json');
    expect(docs).toContain('/api/auth/open-api/generate-schema');
    const spec = await (
      await exports.default.fetch(`${AUTH_ORIGIN}/openapi.json`)
    ).json<{ paths: Record<string, unknown> }>();
    expect(
      Object.keys(spec.paths).every((path) => !path.startsWith('/auth/')),
    ).toBe(true);
  });

  it('does not offer verification or password-reset flows', async () => {
    for (const path of [
      '/request-password-reset',
      '/reset-password',
      '/send-verification-email',
      '/verify-email',
    ]) {
      const response = await authRequest(path, {});
      expect(response.status).toBe(404);
    }
  });
});
