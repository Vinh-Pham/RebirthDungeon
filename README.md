# Rebirth Dungeon workspace

A pnpm + Turborepo workspace containing two applications:

- `client/`: Expo SDK 57 / React Native game, package `rebirth-dungeon`.
- `server/`: Hono API on Cloudflare Workers, with Drizzle, D1, KV, Queues, and email bindings, package `rebirth-dungeon-server`.

## Setup

Use Node.js 24.21 or later and pnpm 12.6.0 (pinned in the root `package.json`).
Install dependencies once from this directory:

```sh
pnpm install
```

The root `pnpm-workspace.yaml` owns workspace settings and allowed dependency
builds, and the root `pnpm-lock.yaml` locks both apps. Dependencies use pnpm's
isolated layout so the Expo app and server email templates retain their own React
versions. Expo's existing `expo/metro-config` handles the workspace automatically.
Skia's installation hook still prepares the client's native libraries and web WASM.

For a new local server setup, copy `server/.dev.vars.example` to
`server/.dev.vars` and set `JWT_ACCESS_SECRET` to a secret with at least 32 random
bytes. Preserve an existing `.dev.vars`. Then initialize local D1:

```sh
pnpm db:setup
```

## Run the apps

| Command                    | Runs                                      |
| -------------------------- | ----------------------------------------- |
| `pnpm dev` or `pnpm start` | Expo and the local Worker together        |
| `pnpm dev:client`          | Expo only                                 |
| `pnpm dev:server`          | Local Worker only, normally on port 8787  |
| `pnpm android`             | Expo with Android launch                  |
| `pnpm ios`                 | Expo with iOS launch                      |
| `pnpm web`                 | Expo web only                             |
| `pnpm email:dev`           | Server's React Email preview on port 3000 |

Turbo runs independent apps concurrently. Its terminal UI lets you select the
Expo task and interact with its keyboard shortcuts. Stop the run with Ctrl+C.
To use Expo web alongside the API, run `pnpm web` and `pnpm dev:server` in two
terminals. To pass package-specific arguments, use an explicit filtered task:

```sh
pnpm exec turbo run dev --filter=rebirth-dungeon-server -- --port 8790
pnpm exec turbo run web --filter=rebirth-dungeon -- --clear
```

The API reference is at [localhost:8787/docs](http://localhost:8787/docs).
The client remains a local game; starting both apps does not add API integration.

## Database tasks

Run these from the workspace root; Turbo executes them in `server/`, preserving
its Wrangler configuration, local D1 state, and Drizzle migration paths.

| Command                                      | Action                                                                               |
| -------------------------------------------- | ------------------------------------------------------------------------------------ |
| `pnpm db:generate`                           | Generate Drizzle SQL after changing the schema                                       |
| `pnpm db:migrate` or `pnpm db:migrate:local` | Apply local D1 migrations                                                            |
| `pnpm db:baseline:local`                     | Verify and record the original schema for an existing local database without history |
| `pnpm db:seed` or `pnpm db:seed:local`       | Add the local development account after migrations                                   |
| `pnpm db:setup`                              | Apply local migrations, then seed                                                    |
| `pnpm db:check:remote`                       | Verify remote migration history without applying SQL                                 |
| `pnpm db:migrate:remote`                     | Verify remote history, then apply pending reviewed migrations                        |

The local fixture login is `player@example.invalid` with password
`local-development-password`. The seed stores a real Argon2id hash and leaves an
existing account and its sessions unchanged. Run migrations before a standalone
seed command. Seeding uses local D1 only; it accepts no CLI arguments.
`LOCAL_D1_STATE=/absolute/path pnpm db:setup` selects a custom local state folder;
use the same state directory for the corresponding Worker session.

The existing `__drizzle_migrations` ledger and migration safeguards remain in
place. For remote commands, keep migration credentials in `server/.env`, using
`server/.env.example` as a template. Exported `CLOUDFLARE_*` and `WRANGLER_*`
variables are also forwarded through Turbo. Local Worker secrets stay in
`server/.dev.vars`; Turbo does not load `.env` files itself.

## Checks and builds

```sh
pnpm lint
pnpm lint:fix
pnpm typecheck
pnpm test
pnpm format
pnpm format:check
pnpm build
```

Both apps use the same versions of Oxfmt, Oxlint, and TypeScript. `format` writes
with Oxfmt, `format:check` checks formatting, `lint` runs Oxlint, `lint:fix` applies
safe fixes, and `typecheck` runs `tsc --noEmit` with each app's own configuration.
Use `lint:fix:client` or `lint:fix:server` to fix one app. Formatting and lint fixes
always execute without caching. The client no longer uses ESLint.

`build` exports Expo web into `client/dist/` and performs a Worker dry-run build
into `server/dist/`. Native release builds still use Expo/EAS from `client/`.
Use `build:client`, `build:server`, `lint:client`, `lint:server`,
`typecheck:client`, `typecheck:server`, `test:client`, or `test:server` to select
one app. `pnpm test:watch` runs both test watchers.

Server utilities are also available at the root:

```sh
pnpm cf-typegen
pnpm deploy:dry-run
pnpm test:migrations
pnpm test:seed
pnpm test:smoke   # Requires the local API to be running
pnpm email:test  # See server/README.md for recipient and send options
pnpm deploy     # Publishes the Worker when explicitly invoked
```

Builds and static checks are cached in `.turbo/`. Development servers, format
writes, binding generation, database commands, deployment commands, and server
integration tests always execute. Expo public build variables and local `.env`
files are included in client build cache inputs.

App-level instructions: [client README](client/README.md) and
[server README](server/README.md). Commands can also run from either app directory
using its package scripts; dependency installs belong at the workspace root.

## Configuration references

Official docs consulted through Firecrawl:

- [Turborepo workspace structure](https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository)
- [Turborepo task configuration](https://turborepo.dev/docs/crafting-your-repository/configuring-tasks)
- [Turborepo environment variables](https://turborepo.dev/docs/crafting-your-repository/using-environment-variables)
- [Expo monorepos and isolated installs](https://docs.expo.dev/guides/monorepos/)
- [Wrangler local platform proxy](https://developers.cloudflare.com/workers/wrangler/api/)
