import { parseArgs } from 'node:util';
import { spawnSync } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export function roleSQL(action, userId) {
  if (action === 'list')
    return 'SELECT a.user_id,u.email,a.granted_at FROM audit_administrators a JOIN user u ON u.id=a.user_id ORDER BY a.granted_at;';
  if (
    !['grant', 'revoke'].includes(action) ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(userId ?? '')
  )
    throw new Error('Use grant/revoke with an existing --user-id, or list.');
  // IDs are validated above; no arbitrary SQL or shell interpolation is accepted.
  return action === 'grant'
    ? `INSERT INTO audit_administrators (user_id,granted_at) VALUES ('${userId}',CAST(unixepoch('subsec')*1000 AS INTEGER)) ON CONFLICT(user_id) DO NOTHING;`
    : `DELETE FROM audit_administrators WHERE user_id='${userId}';`;
}
export async function main(args) {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      local: { type: 'boolean' },
      remote: { type: 'boolean' },
      'user-id': { type: 'string' },
    },
  });
  if (!!values.local === !!values.remote || positionals.length !== 1)
    throw new Error(
      'Choose exactly one target: --local or --remote. Usage: pnpm admin:roles grant|revoke|list --local|--remote [--user-id ID]',
    );
  const sql = roleSQL(positionals[0], values['user-id']);
  const dir = await mkdtemp(join(tmpdir(), 'rebirth-admin-'));
  try {
    const file = join(dir, 'roles.sql');
    await writeFile(file, sql, { mode: 0o600 });
    console.log(
      `Audit administrator ${positionals[0]}: ${values.remote ? 'REMOTE' : 'LOCAL'} Worker DB binding.`,
    );
    const result = spawnSync(
      'pnpm',
      [
        'exec',
        'wrangler',
        'd1',
        'execute',
        'DB',
        values.remote ? '--remote' : '--local',
        '--file',
        file,
        ...(values.local && process.env.LOCAL_D1_STATE
          ? ['--persist-to', process.env.LOCAL_D1_STATE]
          : []),
      ],
      { stdio: 'inherit' },
    );
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error('Role operation failed.');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
if (import.meta.url === pathToFileURL(process.argv[1]).href)
  await main(process.argv.slice(2));
