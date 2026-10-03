import { betterAuth } from 'better-auth';
import {
  APIError,
  createAuthMiddleware,
  isAPIError,
  originCheckMiddleware,
} from 'better-auth/api';
import { openAPI } from 'better-auth/plugins';
import { expo } from '@better-auth/expo';
import { drizzleAdapter } from '@better-auth/drizzle-adapter/relations-v2';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../db/schema.js';
import { authConfiguration } from './config.js';
import type { AuthBindings } from './config.js';

export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

export function createAuth(env: AuthBindings, requestId?: string) {
  const config = authConfiguration(env);
  return betterAuth({
    appName: 'Rebirth Dungeon',
    baseURL: config.baseURL,
    basePath: '/api/auth',
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: config.trustedOrigins,
    database: drizzleAdapter(drizzle(env.DB), {
      provider: 'sqlite',
      schema,
      transaction: false,
    }),
    plugins: [expo(), openAPI({ disableDefaultReference: true })],
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      requireEmailVerification: false,
      minPasswordLength: 12,
      maxPasswordLength: 128,
    },
    session: {
      expiresIn: SESSION_TTL_SECONDS,
      disableSessionRefresh: true,
      cookieCache: { enabled: false },
    },
    rateLimit: { enabled: false },
    advanced: { ipAddress: { ipAddressHeaders: ['cf-connecting-ip'] } },
    disabledPaths: [
      '/request-password-reset',
      '/reset-password',
      '/send-verification-email',
      '/verify-email',
      '/change-email',
      '/sign-in/social',
      '/expo-authorization-proxy',
    ],
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === '/sign-out') {
          // Validate before revocation: hooks run before endpoint middleware.
          await originCheckMiddleware(ctx);
          const token = await ctx.getSignedCookie(
            ctx.context.authCookies.sessionToken.name,
            ctx.context.secret,
          );
          if (token) {
            try {
              await ctx.context.internalAdapter.deleteSession(token);
            } catch {
              throw new APIError('SERVICE_UNAVAILABLE', {
                code: 'SESSION_REVOCATION_FAILED',
                message: 'Session revocation unavailable',
              });
            }
          }
        }
        if (
          ['/sign-up/email', '/sign-in/email'].includes(ctx.path) &&
          ctx.body
        ) {
          return {
            context: {
              ...ctx,
              body: {
                ...ctx.body,
                email:
                  typeof ctx.body.email === 'string'
                    ? ctx.body.email.trim().toLowerCase()
                    : ctx.body.email,
                // Keep the application's fixed seven-day lifetime for every sign-in.
                rememberMe: true,
              },
            },
          };
        }
      }),
    },
    logger: {
      level: 'error',
      // Better Auth's default messages may include credentials or database parameters.
      log: () =>
        console.error(JSON.stringify({ event: 'auth_failed', requestId })),
    },
    onAPIError: {
      onError: (error) => {
        console.error(JSON.stringify({ event: 'auth_failed', requestId }));
        // Better Call otherwise logs unexpected exceptions, including SQL parameters.
        if (!isAPIError(error)) {
          throw new APIError('INTERNAL_SERVER_ERROR', {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Internal server error',
          });
        }
      },
    },
  });
}

export type AuthSession = ReturnType<typeof createAuth>['$Infer']['Session'];
