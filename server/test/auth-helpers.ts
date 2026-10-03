import { env, exports } from 'cloudflare:workers';
import { expect } from 'vitest';
import type { AuthSession } from '../src/auth/auth.js';

export const AUTH_ORIGIN = 'https://example.com';
export const PASSWORD = '  a secure 🔐password漢字  ';
export function cookieFrom(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(';')[0])
    .join('; ');
}
export function authRequest(
  path: string,
  body?: unknown,
  cookie?: string,
  extraHeaders?: Record<string, string>,
) {
  return exports.default.fetch(`${AUTH_ORIGIN}/api/auth${path}`, {
    method: body !== undefined ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      Origin: AUTH_ORIGIN,
      'CF-Connecting-IP': '192.0.2.1',
      ...(cookie ? { Cookie: cookie } : {}),
      ...extraHeaders,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}
export async function register(
  email = 'player@example.com',
  password = PASSWORD,
) {
  const response = await authRequest('/sign-up/email', {
    name: 'Player',
    email,
    password,
  });
  expect(response.status, await response.clone().text()).toBe(200);
  const data = await response.json<{
    user: AuthSession['user'];
    token: string;
  }>();
  const cookie = cookieFrom(response);
  expect(cookie).toContain('session_token=');
  return { user: data.user, cookie };
}
export async function expireSessions() {
  await env.DB.prepare('UPDATE session SET expires_at = ?')
    .bind(Date.now() - 1000)
    .run();
}
