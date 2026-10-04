# Rebirth Dungeon workspace

A pnpm + Turborepo workspace containing two applications and a shared game package:

- `client/`: Expo SDK 57 / React Native game, package `rebirth-dungeon`.
- `packages/game-core/`: portable catalog, validators, deterministic RPG and headless game execution, package `@rebirth/game-core`.
- `server/`: Hono API on Cloudflare Workers, with Drizzle, D1, KV, Queues, and email bindings, package `rebirth-dungeon-server`.

## Setup

Use Node.js 24.21 or later and pnpm 12.6.0 (pinned in the root `package.json`).
Install dependencies once from this directory:

```sh
pnpm install
```

The root `pnpm-workspace.yaml` owns workspace settings and allowed dependency
builds, and the root `pnpm-lock.yaml` locks all workspace packages. Dependencies use pnpm's
isolated layout so the Expo app and server email templates retain their own React
versions. Expo's existing `expo/metro-config` handles the workspace automatically.
Skia's installation hook still prepares the client's native libraries and web WASM.

For local online play, run the guided setup once, then start both apps:

```sh
pnpm online:setup
pnpm dev
```

Choose a detected LAN address for a physical phone and web, or `localhost` for this
computer only. Setup writes ignored local settings, keeps valid existing secrets,
and initializes local D1 without resetting accounts, characters, or migration history.
It refuses legacy auth resets and automatic baselining. Existing connection changes
require confirmation. Noninteractive setup requires an explicit host; add `--yes`
to confirm changes:

```sh
pnpm online:setup --host 192.168.1.20 --api-port 8787 --web-port 8081 --yes
```

Use your computer’s current address. The launcher prints the canonical browser URL;
open that exact hostname so browser session cookies work. Ports must be free. Rerun
setup after changing networks. Restart development sessions and fully reload the app
after setup changes; published bundles need rebuilding because Expo embeds public
variables. See [online play setup](client/docs/online-play.md) for phone instructions,
connection troubleshooting, and online characters.

The existing manual server setup remains available: preserve `server/.dev.vars`,
copy its example when absent, set an explicit API URL, trusted origins and a secret
of at least 32 bytes, then run `pnpm db:setup`. Client configuration belongs in
`client/.env.local`, using `client/.env.example` as a template.

## Run the apps

| Command                    | Runs                                          |
| -------------------------- | --------------------------------------------- |
| `pnpm online:setup`        | Configure local online play and initialize D1 |
| `pnpm online:dev`          | Validate setup and start API + Expo on LAN    |
| `pnpm dev` or `pnpm start` | Validate setup and start API + Expo on LAN    |
| `pnpm dev:client`          | Expo only                                     |
| `pnpm dev:server`          | Local Worker only, normally on port 8787      |
| `pnpm android`             | Expo with Android launch                      |
| `pnpm ios`                 | Expo with iOS launch                          |
| `pnpm web`                 | Expo web only                                 |
| `pnpm email:dev`           | Server's React Email preview on port 3000     |

`dev`, `start`, and `online:dev` use the same configured online launcher. In LAN
mode, it exposes the API on the selected interface through the loopback Worker
forwarder and starts Expo on the configured web port. Open the printed browser
address. Stop both applications with Ctrl+C.

The individual `dev:client`, `dev:server`, and `web` commands use Turbo for manual
development. The raw Worker listens on localhost, so those commands alone do not
expose the API at the configured LAN address. For package-specific arguments, use
an explicit filtered task:

```sh
pnpm exec turbo run dev --filter=rebirth-dungeon-server -- --port 8790
pnpm exec turbo run web --filter=rebirth-dungeon -- --clear
```

The API reference is at [localhost:8787/docs](http://localhost:8787/docs), with
Application and Authentication sources. Better Auth uses `/api/auth/*` and session
cookies. See the [server README](server/README.md) for authentication and gameplay contracts.
The server also exposes authoritative online gameplay under `/api/game/*`.
The client is online-only. Better Auth sessions and React Query connect account-owned characters to authoritative server progress; a verified session and connection are required to play.

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
`local-development-password`. The seed stores a real Better Auth scrypt credential and leaves an
existing account and its sessions unchanged. Run migrations before a standalone
seed command. Seeding uses local D1 only; it accepts no CLI arguments.
`LOCAL_D1_STATE=/absolute/path pnpm db:setup` selects a custom local state folder;
use the same state directory for the corresponding Worker session.

The existing `__drizzle_migrations` ledger and migration safeguards remain in
place. The Better Auth reset migration discards legacy accounts and sessions;
existing users must register again. Unrelated data is preserved. For remote commands, keep migration credentials in `server/.env`, using
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
