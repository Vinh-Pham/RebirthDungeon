# Feature API 2 rollout

This release replaces the aggregate game API and resets online game state. The
appended reset migration preserves Better Auth users, accounts, sessions, audit
records, and migration history. It removes online characters and command receipts;
old character links return to the refreshed roster with an explanation. Device
save databases are unchanged. Command journals have the `game-api-v2-reset`
namespace, so pre-cutover requests cannot replay automatically.

1. Pause game writes at the deployment boundary and retain a database backup.
2. From `server/`, run `pnpm db:check:remote` and review the pending migration list.
3. Apply the reviewed migration with `pnpm db:migrate:remote`. Existing migration
   hashes must match the unchanged local prefix. The reset is recorded once in
   `__drizzle_migrations`; never rewrite or rerun its SQL manually.
4. Run `pnpm db:seed:content --remote` with the existing `CLOUDFLARE_ACCOUNT_ID`,
   `CLOUDFLARE_DATABASE_ID`, and `CLOUDFLARE_D1_TOKEN` credentials. The database must
   match the Worker binding and have no pending migrations. This seeds only
   authored content, validates reconstruction and cross-references, and publishes
   the complete release with its checksum. No development account is created.
5. Deploy the matching Worker and client bundle, then restore game writes. Web and
   native API origins must match the intended environment; native bundles need the
   matching API 2 client as well.
6. Confirm the content manifest and each versioned collection, sign in with an
   existing account, create a new character, and exercise movement, inventory,
   skills, services, rest, battle actions, and settlement. Confirm old character
   links return to the roster and historical audit reads still work.

Missing or invalid releases return a clear 503. Published definitions cannot be
edited or deleted. Seed retries with identical content are safe; changed content
requires a new version. Publication follows successful readback validation, so an
interrupted unpublished seed remains unavailable and may be resumed. The reserved
KV catalog namespace caches immutable validated releases; bad/missing cache entries
fall back to D1.

For an isolated local rehearsal, set `LOCAL_D1_STATE=/absolute/disposable/path`,
run `pnpm db:setup`, and start Wrangler with `--persist-to` pointing to that same
path. `pnpm db:seed:content --local` works independently of account setup.
Run the local HTTP smoke check against that Worker:

```sh
LOCAL_API_ORIGIN=http://localhost:8797 LOCAL_D1_STATE=/absolute/disposable/path pnpm test:smoke
```

The smoke check creates and removes its own synthetic account and validates real
HTTP authentication, creation/replay, focused reads, equipment preview/equip,
movement, collection, battle settlement, and service purchases. It accepts only
local HTTP origins. Remote migration, seeding, and deployment are explicit operator
commands; tests and ordinary local setup do not invoke them.
