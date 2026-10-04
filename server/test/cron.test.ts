import { env } from 'cloudflare:workers';
import { reset, applyD1Migrations } from 'cloudflare:test';
import { beforeEach, expect, it, vi } from 'vitest';
import { runScheduled } from '../src/cron/scheduled.js';

beforeEach(async () => {
  await reset();
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});
function controller(cron = '* * * * *') {
  return {
    cron,
    scheduledTime: new Date('2026-09-25T12:00:00.000Z').getTime(),
    noRetry() {},
  } as ScheduledController;
}

it('prints audit_retention_completed with schedule context', async () => {
  const logs = vi.spyOn(console, 'log').mockImplementation(() => {});
  await runScheduled(controller(), env.DB);
  const output = logs.mock.calls.flat().join('');
  expect(output).toContain('audit_retention_completed');

  expect(output).toContain(String(controller().scheduledTime));
});

it('runs through the real worker scheduled handler', async () => {
  const logs = vi.spyOn(console, 'log').mockImplementation(() => {});
  const worker = (await import('../src/index.js')).default;
  await worker.scheduled(controller(), env);
  expect(logs.mock.calls.flat().join('')).toContain(
    'audit_retention_completed',
  );
});

it('warns before the configured database capacity budget is exhausted', async () => {
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
  await runScheduled(controller(), env.DB, 1);
  expect(warning.mock.calls.flat().join('')).toContain(
    'audit_capacity_warning',
  );
  warning.mockRestore();
});
