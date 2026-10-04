import assert from 'node:assert/strict';
import { test } from 'node:test';
import { roleSQL, main } from '../tools/admin-roles.mjs';
test('role commands require an explicit, exclusive database target before executing', async () => {
  await assert.rejects(
    main(['grant', '--user-id', 'someone']),
    /exactly one target/,
  );
  await assert.rejects(
    main(['list', '--local', '--remote']),
    /exactly one target/,
  );
  await assert.rejects(
    main(['grant', '--local', '--user-id', "bad';DROP TABLE user;"]),
    /existing --user-id/,
  );
  assert.throws(() => roleSQL('grant'), /existing --user-id/);
  assert.match(roleSQL('grant', 'user-123'), /ON CONFLICT.*DO NOTHING/);
  assert.match(roleSQL('revoke', 'user-123'), /DELETE.*user_id='user-123'/);
  assert.match(roleSQL('list'), /JOIN user/);
});
