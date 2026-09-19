# Rebirth Dungeon — AI Assistant Guide

Rebirth Dungeon is a **pnpm + Turborepo monorepo** for a dice-driven fantasy RPG. It contains two projects:

- **`client/`** — the game itself: a local, single-player browser RPG built with Phaser 4, React 19, HeroUI 3, Tailwind CSS 4, Vite, and XState 5.
- **`server/`** — the game server: a [Hono](https://hono.dev) API deployed to **Cloudflare Workers** via Wrangler.

All commands are run from the repository root through Turborepo. Always work inside this workspace layout — do not create new packages, nested lockfiles, or nested `pnpm-workspace.yaml` files.

## Repository layout

```text
/
├── turbo.json              Turborepo task pipeline (build, dev, lint, format, test, deploy)
├── pnpm-workspace.yaml     Workspace definition (client, server) + pnpm settings
├── package.json            Root scripts (delegate to turbo) + shared dev tooling
├── pnpm-lock.yaml          Single lockfile for the whole monorepo
├── .oxfmtrc.json           Shared formatter config (applies to both packages)
├── AGENTS.md               This file
├── client/                 The game (see client/AGENTS.md for the full guide)
│   ├── .oxlintrc.json      Client lint config (typescript, unicorn, oxc, react plugins)
│   ├── vite/               Dev/prod Vite configs
│   ├── src/                Game source (React UI + Phaser scenes + domain logic)
│   ├── tests/              Vitest unit tests and Playwright e2e journeys
│   └── AGENTS.md           Detailed game-architecture guide — read before touching client code
└── server/                 The game server
    ├── .oxlintrc.json      Server lint config (typescript, oxc plugins)
    ├── wrangler.jsonc      Cloudflare Workers config (bindings, KV, D1, etc.)
    └── src/index.ts        Hono app entry point
```

## Toolchain conventions

- **Node 24** and **pnpm 12** (`packageManager` is pinned in the root `package.json`). Use pnpm, never npm or yarn.
- **Single root lockfile.** Run `pnpm install` from the repository root only — installing inside `client/` or `server/` directly is not supported.
- **Dependency placement:** shared tooling (turbo, oxlint, oxfmt) lives in the root `package.json`; runtime and library dependencies belong to the package that uses them.
- **pnpm settings** (`minimumReleaseAge`, `allowBuilds`) are centralized in the root `pnpm-workspace.yaml`. Preserve them when adding dependencies — new packages may need build-script approval there.
- **Formatting:** oxfmt with the shared root config — single quotes, trailing commas, 100-column target, LF line endings. Run `pnpm format` to write or `pnpm format:check` to verify; format only files you touch and avoid whole-repo formatting churn.
- **Linting:** oxlint with per-package `.oxlintrc.json` configs. Warnings fail (`--deny-warnings`); do not add suppressions without a specific reason.
- **Turborepo caching:** `build`, `typecheck`, `lint`, `test`, `test:coverage`, and `format:check` are cached (state under `.turbo/`). `dev`, `format`, `lint:fix`, `test:e2e`, and `deploy` are uncached.

## Commands (run from the repository root)

| Command                        | Purpose                                                                |
| ------------------------------ | ---------------------------------------------------------------------- |
| `pnpm install`                 | Install dependencies for both packages (root only)                     |
| `pnpm dev`                     | Start **both** dev servers concurrently (client + server)              |
| `pnpm dev:client`              | Vite dev server for the game at `http://127.0.0.1:8080`                |
| `pnpm dev:server`              | Wrangler dev server for the Hono API at `http://localhost:8787`        |
| `pnpm build`                   | Production build of the client into `client/dist/`                     |
| `pnpm typecheck`               | `tsc --noEmit` in both packages                                        |
| `pnpm lint` / `pnpm lint:fix`  | Oxlint both packages (warnings fail)                                   |
| `pnpm format` / `pnpm format:check` | oxfmt write / check in both packages                              |
| `pnpm test`                    | Vitest unit tests (client)                                             |
| `pnpm test:coverage`           | Client tests with coverage gates                                       |
| `pnpm test:e2e`                | Playwright browser journeys (client; needs `playwright install` first) |
| `pnpm deploy`                  | Deploy the server with `wrangler deploy` (typechecks first)            |
| `pnpm cf-typegen`              | Regenerate Cloudflare binding types for the server                     |
| `pnpm db:generate`             | Generate SQL migrations from `server/src/db/schema.ts` (drizzle-kit)   |
| `pnpm db:migrate:local`        | Apply pending migrations to the local D1 (for `wrangler dev`)          |
| `pnpm db:migrate`              | Apply pending migrations to the remote D1                              |

Notes:

- Target a single package with a filter when needed: `pnpm build --filter server` or `pnpm exec turbo run <task> --filter=client`.
- The **server has no build task** — Wrangler bundles Hono/Workers code at deploy time, so `pnpm build` only produces the client bundle.
- The client and server do not proxy to each other yet: Vite serves on port 8080 and Wrangler on 8787 independently.

## Where to make changes

- **Game features, UI, domain logic** → `client/src/`. Follow `client/AGENTS.md` and `client/docs/architecture.md` for boundaries and patterns.
- **API endpoints, game-server logic** → `server/src/`; the Hono app is exported from `src/index.ts`. After changing bindings in `wrangler.jsonc`, run `pnpm cf-typegen`.
- **Tooling, task pipeline, dependency policy** → root `turbo.json`, `package.json`, and `pnpm-workspace.yaml`. Keep task definitions in `turbo.json` in sync with script names in the packages.
- **New packages** (for example, shared types) → create the folder, add it to `packages:` in `pnpm-workspace.yaml`, and give it the scripts it needs; Turbo picks up tasks automatically.

Preserve existing uncommitted work, inspect `git status` before editing, and keep changes scoped to the request. Do not commit, push, or deploy unless explicitly asked.
