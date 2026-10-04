import { createMiddleware } from 'hono/factory';
import { RequestAttemptSchema } from '@rebirth/game-core/online/Audit';
import type { AppEnv } from '../env.js';
import { recordAudit } from './repository.js';

const reasons: Record<number, string> = {
  400: 'MALFORMED_REQUEST',
  401: 'SESSION_REQUIRED',
  403: 'FORBIDDEN',
  404: 'MISSING_OR_UNOWNED_CHARACTER',
  409: 'REVISION_OR_ID_CONFLICT',
  413: 'BODY_TOO_LARGE',
  415: 'JSON_REQUIRED',
  422: 'ILLEGAL_ACTION',
  429: 'RATE_LIMITED',
  500: 'INTERNAL_FAILURE',
  503: 'STORAGE_UNAVAILABLE',
};
/** Runs outside authentication, body validation and rate limiting. No raw bodies or credentials. */
export const auditGameRequests = createMiddleware<AppEnv>(async (c, next) => {
  await next();
  const replay = c.get('auditReplay');
  if (c.res.status < 400 && !replay) return;
  // Activity/log read failures are operational, not gameplay evidence; avoid log recursion.
  if (/\/(activity|logs)$/.test(c.req.path)) return;
  const context = c.get('auditContext');
  const claimedCharacter = c.req.path.match(
    /\/characters\/([0-9a-f-]{36})(?:\/|$)/i,
  )?.[1];
  const reason = replay
    ? 'COMMAND_REPLAYED'
    : (reasons[c.res.status] ?? 'REQUEST_REJECTED');
  try {
    await recordAudit(c.env.DB, {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      userId: c.get('user')?.id,
      characterId: claimedCharacter,
      source: 'server',
      category: 'system',
      type: reason,
      outcome: replay ? 'replayed' : 'rejected',
      message: reason.replaceAll('_', ' ').toLowerCase(),
      commandId: context?.commandId,
      requestId: c.get('requestId'),
      details: RequestAttemptSchema.parse({
        version: 1,
        status: c.res.status,
        reason,
        method: [
          'GET',
          'POST',
          'PUT',
          'PATCH',
          'DELETE',
          'HEAD',
          'OPTIONS',
        ].includes(c.req.method)
          ? c.req.method
          : 'OTHER',
        ...(context ? { request: context } : {}),
      }),
    });
  } catch {
    console.error(
      JSON.stringify({
        event: 'audit_record_failed',
        requestId: c.get('requestId'),
        status: c.res.status,
      }),
    );
  }
});
