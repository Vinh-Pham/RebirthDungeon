import { env } from 'cloudflare:workers';
import { applyD1Migrations, reset } from 'cloudflare:test';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { app } from '../src/index.js';
import { register } from './auth-helpers.js';
import { CommandResponseSchema } from '@rebirth/game-core/online/Contracts';
import {
  LogPageSchema,
  AUDIT_RETENTION_MS,
} from '@rebirth/game-core/online/Audit';
import {
  listAudit,
  LogQuerySchema,
  pruneAudit,
  recordAudit,
} from '../src/audit/repository.js';

beforeEach(async () => {
  await reset();
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});
afterEach(() => vi.restoreAllMocks());
const req = (path: string, cookie?: string, body?: unknown) =>
  app.request(
    path,
    {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookie ? { Cookie: cookie } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
    env,
  );
async function fixture() {
  const owner = await register();
  const input = {
    commandId: crypto.randomUUID(),
    name: 'Audit Hero',
    talent: 'warrior',
    age: 12,
  };
  const response = await req('/api/game/characters', owner.cookie, input);
  expect(response.status).toBe(200);
  const result = CommandResponseSchema.parse(await response.json());
  return { ...owner, id: result.view.character.id, input };
}
const count = async (sql = 'SELECT COUNT(*) AS count FROM audit_records') =>
  env.DB.prepare(sql).first<number>('count');

it('persists command details atomically, deduplicates receipts, and records replay attempts', async () => {
  const f = await fixture();
  const input = {
    commandId: crypto.randomUUID(),
    expectedRevision: 1,
    command: { type: 'MOVE', dx: 1, dy: 0 },
  };
  const first = await req(
    `/api/game/characters/${f.id}/commands`,
    f.cookie,
    input,
  );
  expect(first.status).toBe(200);
  const result = CommandResponseSchema.parse(await first.json());
  const row = await env.DB.prepare(
    'SELECT * FROM audit_records WHERE command_id=?',
  )
    .bind(input.commandId)
    .first<{ details: string }>();
  const details = JSON.parse(row!.details);
  expect(details.command).toEqual(input.command);
  expect(
    details.events.some((e: { type: string }) => e.type === 'WORLD_MOVED'),
  ).toBe(true);
  expect(
    details.changes.some((c: { path: string }) => c.path === '/position/x'),
  ).toBe(true);
  expect(
    (await req(`/api/game/characters/${f.id}/commands`, f.cookie, input))
      .status,
  ).toBe(200);
  expect(
    await count(
      "SELECT COUNT(*) AS count FROM audit_records WHERE outcome='committed'",
    ),
  ).toBe(2);
  expect(
    await count(
      "SELECT COUNT(*) AS count FROM audit_records WHERE outcome='replayed'",
    ),
  ).toBe(1);
  expect(result.view.character.revision).toBe(2);
});
it('rolls back state and receipts when an audit insert fails, then accepts exact recovery', async () => {
  const f = await fixture();
  await env.DB.exec(
    "CREATE TRIGGER fail_audit BEFORE INSERT ON audit_records WHEN NEW.outcome='committed' BEGIN SELECT RAISE(ABORT,'test outage'); END;",
  );
  const input = {
    commandId: crypto.randomUUID(),
    expectedRevision: 1,
    command: { type: 'MOVE', dx: 1, dy: 0 },
  };
  expect(
    (await req(`/api/game/characters/${f.id}/commands`, f.cookie, input))
      .status,
  ).toBe(503);
  expect(
    await count('SELECT COUNT(*) AS count FROM game_command_receipts'),
  ).toBe(1);
  expect(
    await env.DB.prepare('SELECT revision FROM game_characters WHERE id=?')
      .bind(f.id)
      .first('revision'),
  ).toBe(1);
  await env.DB.exec('DROP TRIGGER fail_audit;');
  expect(
    (await req(`/api/game/characters/${f.id}/commands`, f.cookie, input))
      .status,
  ).toBe(200);
  expect(
    await count(
      "SELECT COUNT(*) AS count FROM audit_records WHERE outcome='committed'",
    ),
  ).toBe(2);
});
it('records validation/auth/revision/illegal-action failures without raw bodies or credentials', async () => {
  const f = await fixture();
  expect(
    (
      await req(`/api/game/characters/${f.id}/commands`, undefined, {
        password: 'secret-test-password',
      })
    ).status,
  ).toBe(401);
  expect(
    (
      await req(`/api/game/characters/${f.id}/commands`, f.cookie, {
        token: 'secret-test-token',
      })
    ).status,
  ).toBe(400);
  expect(
    (
      await req(`/api/game/characters/${f.id}/commands`, f.cookie, {
        commandId: crypto.randomUUID(),
        expectedRevision: 999,
        command: { type: 'MOVE', dx: 1, dy: 0 },
      })
    ).status,
  ).toBe(409);
  expect(
    (
      await req(`/api/game/characters/${f.id}/commands`, f.cookie, {
        commandId: crypto.randomUUID(),
        expectedRevision: 1,
        command: { type: 'REST_PULSE' },
      })
    ).status,
  ).toBe(422);
  const rows = await env.DB.prepare(
    "SELECT * FROM audit_records WHERE outcome='rejected'",
  ).all();
  expect(rows.results).toHaveLength(4);
  expect(JSON.stringify(rows.results)).not.toMatch(
    /secret-test|Cookie|password/,
  );
});
it('enforces ownership and provenance, acknowledges duplicate activity, and projects safe player history', async () => {
  const f = await fixture();
  const other = await register('other@example.com');
  const event = {
    id: crypto.randomUUID(),
    type: 'NAVIGATION',
    message: 'Opened Skills.',
    occurredAt: Date.now() - 1000,
    revision: 1,
  };
  const path = `/api/game/characters/${f.id}/activity`;
  expect(
    (await req(path, other.cookie, { version: 1, events: [event] })).status,
  ).toBe(404);
  expect(
    (
      await req(path, f.cookie, {
        version: 1,
        events: [{ ...event, source: 'server' }],
      })
    ).status,
  ).toBe(400);
  expect(
    (await req(path, f.cookie, { version: 1, events: [event] })).status,
  ).toBe(200);
  expect(
    (await req(path, f.cookie, { version: 1, events: [event] })).status,
  ).toBe(200);
  expect(
    await count(
      "SELECT COUNT(*) AS count FROM audit_records WHERE source='client'",
    ),
  ).toBe(1);
  const pathLogs = `/api/game/characters/${f.id}/logs`;
  expect((await req(pathLogs, other.cookie)).status).toBe(404);
  const text = await (await req(pathLogs, f.cookie)).text();
  const page = LogPageSchema.parse(JSON.parse(text));
  expect(page.entries).toHaveLength(2);
  expect(page.entries[0].source).toBe('client');
  expect(text).not.toMatch(
    /requestId|commandId|userId|randomState|seed|claimedRevision|details/,
  );
});
it('requires stored roles on every request and logs role changes, reads and exports', async () => {
  const f = await fixture();
  expect((await req('/api/admin/logs', f.cookie)).status).toBe(403);
  await env.DB.prepare('INSERT INTO audit_administrators VALUES (?,?)')
    .bind(f.user.id, Date.now())
    .run();
  expect((await req('/api/admin/capabilities', f.cookie)).status).toBe(200);
  const response = await req(
    `/api/admin/logs?outcome=committed&characterId=${f.id}`,
    f.cookie,
  );
  expect(response.status).toBe(200);
  const page = LogPageSchema.parse(await response.json());
  expect(
    (await req(`/api/admin/logs/${page.entries[0].id}`, f.cookie)).status,
  ).toBe(200);
  const exported = await req(
    `/api/admin/logs/export?outcome=committed&characterId=${f.id}`,
    f.cookie,
  );
  expect(exported.status).toBe(200);
  expect((await exported.json<{ jsonl: string }>()).jsonl).toContain(
    'CREATE_CHARACTER',
  );
  await env.DB.prepare('DELETE FROM audit_administrators WHERE user_id=?')
    .bind(f.user.id)
    .run();
  expect((await req('/api/admin/logs', f.cookie)).status).toBe(403);
  expect(
    await count(
      "SELECT COUNT(*) AS count FROM audit_records WHERE type IN ('ADMIN_ROLE_GRANTED','ADMIN_ROLE_REVOKED')",
    ),
  ).toBe(2);
  expect(
    await count(
      "SELECT COUNT(*) AS count FROM audit_records WHERE type='AUDIT_EXPORTED'",
    ),
  ).toBe(1);
});
it('keeps cursor boundaries stable across later inserts and rejects changed filter scope', async () => {
  const f = await fixture();
  for (let i = 0; i < 4; i++)
    await recordAudit(env.DB, {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      userId: f.user.id,
      characterId: f.id,
      source: 'client',
      category: 'user',
      type: 'NAVIGATION',
      outcome: 'reported',
      message: String(i),
      details: { version: 1 },
    });
  const query = LogQuerySchema.parse({ characterId: f.id, limit: 2 });
  const first = await listAudit(env.DB, query);
  expect(first.nextCursor).toBeTruthy();
  await recordAudit(env.DB, {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    userId: f.user.id,
    characterId: f.id,
    source: 'client',
    category: 'user',
    type: 'NAVIGATION',
    outcome: 'reported',
    message: 'later',
    details: { version: 1 },
  });
  const second = await listAudit(env.DB, {
    ...query,
    cursor: first.nextCursor!,
  });
  expect(second.entries.every((e) => e.message !== 'later')).toBe(true);
  expect(
    new Set([...first.entries, ...second.entries].map((e) => e.id)).size,
  ).toBe(4);
  await expect(
    listAudit(env.DB, {
      ...query,
      cursor: first.nextCursor!,
      characterId: 'other',
    }),
  ).rejects.toThrow('Invalid log cursor');
});
it('prunes expired audits, keeps boundary records and receipts, and prevents updates', async () => {
  await fixture();
  const now = Date.now();
  for (const age of [AUDIT_RETENTION_MS + 1, AUDIT_RETENTION_MS])
    await recordAudit(env.DB, {
      id: crypto.randomUUID(),
      timestamp: now - age,
      source: 'server',
      category: 'system',
      type: 'TEST',
      outcome: 'rejected',
      message: 'Test.',
      details: { version: 1 },
    });
  expect(await pruneAudit(env.DB, now)).toBe(1);
  expect(await count()).toBe(2);
  expect(
    await count('SELECT COUNT(*) AS count FROM game_command_receipts'),
  ).toBe(1);
  await expect(
    env.DB.prepare("UPDATE audit_records SET message='changed'").run(),
  ).rejects.toThrow();
});
it('includes audit endpoints in the generated API document', async () => {
  const response = await req('/openapi.json');
  expect(response.status).toBe(200);
  const text = await response.text();
  expect(text).toContain('/api/admin/logs/export');
  expect(text).toContain('/api/game/characters/{id}/activity');
});

it('redacts generated map seeds from player messages while retaining internal evidence', async () => {
  const f = await fixture();
  await recordAudit(env.DB, {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    userId: f.user.id,
    characterId: f.id,
    source: 'server',
    category: 'movement',
    type: 'OFFER_ITEM',
    outcome: 'committed',
    message: 'Entered a dungeon.',
    details: {
      version: 1,
      events: [
        {
          type: 'MAP_CHANGED',
          category: 'movement',
          message: 'Entered dungeon:crypt:123456789.',
          metadata: { seed: 123456789 },
        },
      ],
    },
  });
  const text = await (
    await req(`/api/game/characters/${f.id}/logs`, f.cookie)
  ).text();
  expect(text).toContain('Entered another area.');
  expect(text).not.toContain('123456789');
});
it('records throttled game requests independently of the activity allowance and signals audit outages', async () => {
  const f = await fixture();
  vi.spyOn(env.GAME_RATE_LIMIT, 'limit').mockResolvedValue({ success: false });
  expect(
    (
      await req(`/api/game/characters/${f.id}/commands`, f.cookie, {
        commandId: crypto.randomUUID(),
        expectedRevision: 1,
        command: { type: 'MOVE', dx: 1, dy: 0 },
      })
    ).status,
  ).toBe(429);
  expect(
    await count(
      "SELECT COUNT(*) AS count FROM audit_records WHERE type='RATE_LIMITED'",
    ),
  ).toBe(1);
  expect(
    (
      await req(`/api/game/characters/${f.id}/activity`, f.cookie, {
        version: 1,
        events: [
          {
            id: crypto.randomUUID(),
            type: 'NAVIGATION',
            message: 'Opened inventory.',
            occurredAt: Date.now(),
          },
        ],
      })
    ).status,
  ).toBe(200);
  await env.DB.exec(
    "CREATE TRIGGER fail_all_audit BEFORE INSERT ON audit_records BEGIN SELECT RAISE(ABORT,'outage'); END;",
  );
  const signal = vi.spyOn(console, 'error').mockImplementation(() => {});
  expect(
    (await req(`/api/game/characters/${f.id}/commands`, f.cookie, {})).status,
  ).toBe(429);
  expect(signal.mock.calls.flat().join('')).toContain('audit_record_failed');
});
