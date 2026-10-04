# Online play

The Expo app is online-only. **Play** opens the account-owned roster, showing the account screen until the session and connection are verified. **Account** supports email/password registration, sign-in, and sign-out. Registration uses the initial account name `Player`. Character names, talents, and ages use the existing setup form.

Each roster card offers **Delete**, followed by confirmation or cancellation. The default deletion records a server `deleted_at` timestamp, hides the character from the roster and all character reads, and prevents further gameplay while retaining saved progress. There is no restore control yet. The confirmation also offers **Permanently delete** with an explicit warning: it removes the character and all related game state from the database and cannot be undone or restored. Both choices use authenticated DELETE requests, disable duplicate input while pending, show failures without removing cached characters, and clear the deleted character's cached features and previews after success. Deletion requests do not automatically retry; repeating a soft deletion preserves its original timestamp.

Deletion validation: all 784 workspace tests passed, including migration preservation, ownership, cascade cleanup, storage rollback, concurrent soft deletion versus gameplay commits, and client cache removal. Formatting, lint and type checks passed. Browser QA at `http://192.168.4.38:8081` covered cancellation and soft deletion at 390×844, permanent deletion at 1280×900, and absence from the roster after reload. Local D1 checks confirmed the soft-deletion timestamp and permanent removal of character and hero rows. Screenshots are in ignored `client/.artifacts/character-deletion/`. The local migration was applied and the missing bundled content catalog was seeded before browser checks. Native device interaction was not performed.

Existing local characters and format 13 saves remain untouched on the device but cannot be played or imported by the client. Characters require a verified session and connection to progress. They have one current server state and no manual slots, save uploads, debug menu, offline queue, or rewind. Signing out preserves any account-scoped unresolved command journal. Old `/characters` and `/characters/new` links redirect to online selection/creation, and every `/game/...` link redirects to the online roster without interpreting local character IDs as server IDs.

## Setup

Run these commands from the workspace root:

```sh
pnpm online:setup
pnpm online:dev
```

Setup lists private IPv4 addresses with interface names. Choose the interface that
shares a network with your phone. `localhost` is explicitly computer-only. Default
ports are API **8787** and Expo **8081**; override them with `--api-port` and
`--web-port`. A noninteractive run needs `--host`; changed existing connection
settings need `--yes`:

```sh
pnpm online:setup --host 192.168.1.20 --api-port 8787 --web-port 8081 --yes
```

Use your actual detected address. Setup writes `EXPO_PUBLIC_API_URL` and the
launcher-only `LOCAL_ONLINE_WEB_PORT` to ignored `client/.env.local`. It sets matching
`BETTER_AUTH_URL` and explicit trusted origins for the chosen browser address and
`rebirthdungeon://` in ignored `server/.dev.vars`. Unrelated settings and valid
secrets are preserved. Missing/blank secrets get 32 cryptographically random bytes;
invalid nonblank secrets require explicit correction. Secrets are never printed.

Database initialization uses the existing Drizzle migrations and seed against local
D1 only. The API 2 reset migration clears old online characters once and preserves Better Auth accounts, sessions, and audit history. Reruns preserve new characters and migration history.
Legacy auth tables cause refusal before the historical reset can run. Current tables
without migration history require explicit operator review; setup never baselines
them. `LOCAL_D1_STATE=/absolute/path` selects the same state folder for setup and
launcher. No remote database or deployment is involved.

`online:dev` checks configuration and occupied ports before starting installed
Wrangler with local bindings and Expo with LAN access. In LAN mode, a Node listener on the selected interface forwards to a loopback Worker, avoiding a reproduced macOS workerd LAN stall. Its internal port is temporary; the configured public API port stays fixed. Worker inspection/storage routes remain loopback-only. Open the printed canonical
**browser URL with the same hostname as the API**. A LAN API with a localhost web
page breaks session cookies even when CORS allows it. Automatic browser opening is
suppressed. If you open Expo’s localhost link with LAN setup, the development account screen identifies the address mismatch and offers **Open online play address** instead of retrying a blocked session request. Local characters and saves belong to their original browser origin; return to that address to use them. Ctrl+C or either application's exit stops both process groups.
The original development commands remain available.

For a physical phone, use an **SDK 57 native development build** with the existing
SecureStore config plugin and `rebirthdungeon` scheme. Connect phone and computer to
the same network, open the Expo development server through your development client,
and allow local network access when prompted. This launcher does not create or
install native builds. A phone's localhost points at the phone. If a selected LAN
address disappears, rerun setup. Restrictive guest networks or a firewall may block
access even on the same Wi-Fi.

The API URL is an HTTP(S) **origin**, without `/api`, credentials, queries, or
fragments. The account screen shows a setup notice when it is missing or invalid.
Disconnected devices, unreachable servers, and server errors have separate feedback
with **Retry connection** for recoverable failures. Stored credentials survive
connection failures. Authentication mutations never automatically retry. Local
characters remain accessible. Setup commands and server addresses appear only in
development builds.

The launcher rejects conflicting shell and active Expo env-file overrides, including
settings that disable public variable loading. Remove the conflicting override and
rerun setup. Fully reload the app and restart development sessions after changing
configuration. Expo embeds public variables; rebuild published bundles to change
their API URL. See [Expo environment variables](https://docs.expo.dev/guides/environment-variables/)
and [Wrangler local configuration](https://developers.cloudflare.com/workers/local-development/environment-variables/).
Production addresses must remain explicit, with HTTPS and web/API on the same site.
Runtime server switching, public deployment, tunnels, and cloud/local save
synchronization are separate work.

## Authentication and queries

`src/online/OnlineProvider.tsx` owns one React Query client, session query, account mutations, connection observer, API transport, and command coordinator. It wraps HeroUI so portal content also receives the query context. Session query data contains only public account fields and expiry; tokens and cookies stay out of query caches, logs, and game views.

The native `.ts` auth adapter uses the official Expo client and SecureStore under the `rebirthdungeon` scheme. Application requests await `getCookie()` and send it with `credentials: "omit"`. The `.web.ts` adapter relies on browser-managed cookies and `credentials: "include"`. No JWT plugin or Bearer token is required.

Cached credentials are provisional. Startup, reconnect, and foregrounding revalidate the session before enabling game input; authoritative missing-session/401 responses require sign-in again. Network failures preserve stored credentials. Account changes cancel reads and discard game caches; generation checks reject late responses from an earlier account or connection.

| Query                         | Key scope                                       | Freshness                                  |
| ----------------------------- | ----------------------------------------------- | ------------------------------------------ |
| Session                       | API origin                                      | 30 seconds; lifecycle revalidation         |
| Content                       | Origin, account, pinned release                 | Immutable validated definitions            |
| Character roster              | Origin and account                              | 30 seconds                                 |
| Feature                       | Origin, account, character, feature             | 5 seconds; revision guards                 |
| Coherent gameplay observation | Origin, account, character                      | Composed from required real feature slices |
| Preview                       | Origin, account, character, revision, selection | Immutable at that revision                 |

Metadata, progression, resources, stats, journey, rest, dungeon, and encounter
bootstrap independently. Inventory, equipment, skills, quests, titles, and enchanting
load only when their screens require them. Content is reconstructed from the
manifest and pinned versioned collection endpoints. Character metadata GET never
returns a complete hero or battle.

Feature actions use the API 2 paths from shared `Actions.ts`; mutation responses
contain the original receipt, current `snapshotRevision`, and affected-feature
`updates`. Updates apply together. Sequential commits advance known unchanged cached
features, without inventing unloaded data. Older reads/actions cannot replace newer
slices. Unexpected revision gaps refresh required and already loaded features with
`expectedRevision` guards before input resumes. A coherent gameplay observation
publishes only after all required slices share a revision, content release, and
connection generation.
Game caches are memory-only. Reads have bounded retries for network and server failures, a 15-second timeout, and cancellation signals. Authoritative client errors and previews do not automatically retry. Transport validates responses with shared Zod contracts and limits UTF-8 JSON bodies to 4 KiB. Character cache merges never replace a newer revision with an older response.

## Gameplay ownership

`src/game/Gameplay.ts` defines the read-only host, journey, and battle ports used by shared screens, renderers, and audio. `LocalGameplayHost` remains only as a headless compatibility adapter for the original simulation/save tests; no app route imports or mounts it. `OnlineGameplayHost` subscribes to a coherent composition of React Query feature caches, maps existing intents to feature action routes, and updates after a confirmed server response. Journey observation contains core progression/resources; typed `getFeature`/`loadFeatures` ports expose optional loaded slices. Feature gates derive readiness from the subscribed observation's available feature names. Hero/stat read helpers receive that observation explicitly, keeping React Compiler memoization sensitive to feature and revision changes. It never constructs a journey engine or advances enemies locally.

Movement, interactions, services, equipment, exploration consumables, hotbar changes, skills, quests, titles, enchants, dungeons, battle actions, and encounter settlement go through the server. Equipment/enchant/burn previews use revision-bound server calculations. Enchant operation identity and RNG remain server-owned. Battle action selection and cancellation stay local, while action availability, valid targets, and combat estimates come from the server's read-only projection.

Battle receipts optionally contain version 1 presentation batches for the committed action and following enemy turns. The pure shared collector stores only animation facts; client timers play them without issuing commands. A receipt is displayed at most once in the current battle. Resume and duplicate recovery use the current public state without replaying old animation sequences or exposing encounter seeds, enemy history, or unrevealed dungeon outcomes. Dungeon HUD and visible object art are server-projected before private data is removed.

## Durable action recovery

On web, command UUIDs use cryptographic [`getRandomValues`](https://w3c.github.io/webcrypto/#Crypto-method-getRandomValues), which works on LAN HTTP where `randomUUID` requires a secure context. Native keeps Expo Crypto. Every deliberate action receives a UUID and the currently observed character revision. The coordinator writes that exact request to a separate recovery store **before** sending it: `rebirth-online-commands.db` on native and `rebirth-online-commands` IndexedDB on web. Keys begin with `game-api-v2-reset` and include API origin, account, and character (or a separate creation key). Pre-cutover requests remain in their old namespace and cannot replay automatically. Atomic insertion prevents another tab from overwriting an unresolved action; clearing compares command identity so a late acknowledgment cannot delete a newer request.

Only one unresolved request per character is allowed. Unknown outcomes, disconnects, 401s, server failures, and rate limits retain the request. **Recover pending action** explicitly resends the same ID, revision, and body. The server returns its original receipt if it already committed. No retry invents a new ID, rebases an old choice, spends resources optimistically, or rerolls outcomes. Character creation uses the same recovery path.

Authoritative 400/403/404/409/413/415/422 rejection clears the rejected request. Revision conflicts refresh the view and require a new deliberate choice. Rate limits respect `Retry-After`. Storage failure blocks sending; failure to clear an acknowledged request retains it for safe duplicate recovery. Other accounts cannot replay the journal. A current view can be newer than a duplicate receipt, as allowed by the server contract.

Rest pulses are the exception: they are ephemeral foreground lease renewals, never journaled or replayed. The host permits at most one pulse in flight, spaces pulses by at least one second, and stops on backgrounding, navigation away, unmount, failed requests, or loss of connection. After reconnect/restart, **Resume Rest** explicitly renews the server lease; no offline catch-up is awarded.

## Verification

Automated coverage includes account/connection isolation, request bounds, monotonic cache revisions, persist-before-send, storage failures, exact retries after a lost response/restart, simultaneous command coordinators, character creation recovery, rest leases, public battle targets/previews, presentation deduplication, and online host lifecycle. Shared core and Worker tests verify deterministic battles and receipt replay; the existing local save and gameplay suites remain required.

Manual checks should exercise registration, sign-in/out and replacement; online-only navigation, legacy-link redirects and untouched local saves; movement, collection, equipment previews and use; services and journals; battle action/target confirmation, reload resume, rewards and defeat; command interruption and explicit recovery; foreground/offline behavior and Rest; compact and wide layouts. Run these in native development builds on iOS and Android as well as web. Exports verify bundling, not device behavior.

Validated on October 3, 2026: workspace formatting, lint with zero warnings, type checks, and all 707 tests passed (611 client, 9 shared core, 87 server). The Worker dry-run build, local HTTP authentication/game smoke test, SDK dependency check, and web/iOS/Android exports passed. Web QA at `http://localhost:8081` against the local Worker used 390×844 and 1280×900 layouts. It covered registration, online character creation, movement and collection, equipment preview/equip, interrupted-action recovery across reload, battle damage/wear resume, retained victory loot and settlement, sign-out, and preservation of a local character/manual slot. The existing development-only HeroUI BackHandler warning remains on web. Native device interaction was not performed.

Guided local setup validated on October 3, 2026: all **727 tests** passed (617 client, 9 shared core, 101 server), plus formatting, lint, type checks, Worker dry-run build, and web/iOS/Android exports. Setup reruns against the existing local database preserved data and an active session. The canonical LAN browser URL `http://192.168.4.38:8081` passed registration, sign-in, online character creation, movement committed through the server, position persistence after reload, connection-failure retry without signing in again, and sign-out with a local character and manual slot preserved. A temporary HTTP 503 fixture verified the separate server-failure notice. The SDK 57 iOS manifest advertised the selected LAN host. Physical-device interaction and native SecureStore/reconnect checks remain unverified: the paired iPhone inspection timed out and no Android device was connected. The existing HeroUI BackHandler warning remains on web.

The localhost/LAN mismatch follow-up reproduced the unreachable account screen at `http://localhost:8081/account` with a LAN API. After the fix, that screen offers the configured online address without sending session requests. Clicking the link reached `http://192.168.4.38:8081/account`, returned HTTP 200 for session lookup, and displayed the sign-in form. Local storage is not moved between browser origins.

Online-only client validation on October 3, 2026: all 626 client tests, formatting, lint and type checks passed. Browser QA at `http://192.168.4.38:8081` used 390×844 and 1280×900 layouts and covered Play → sign-in, the seeded development account, creating an online character, opening the game/menu, returning to the roster, and legacy character/setup/save-load redirects. The drawer has no Save/Load or debug controls. Emulated disconnection during a game showed the connection gate with no local fallback. Existing local saves were not read, migrated or deleted by these changes. Native device interaction was not performed. Screenshots are in ignored `client/.artifacts/online-only/`.

Cloud/local save synchronization, social sign-in, email verification/reset, multiplayer, JWT issuance, and content administration remain future work.

API 2 automated checks also cover lazy core bootstrap, unloaded feature preservation,
independently newer reads, guarded revision gaps, null encounter removal, and the
full feature action/preview route mapping. The server rollout sequence lives in
[feature API rollout](../../server/docs/feature-api-rollout.md).

API 2 verification on October 3, 2026: workspace formatting, lint with zero warnings,
and all type checks passed. The full suite passed 771 tests (636 client, 13 shared
core, and 122 server/tooling tests); the final client storage-readiness change also
passed the full 636-test client suite. Worker dry-run and web export passed. The
isolated HTTP smoke check covered creation and durable replay, focused reads,
movement, collection, equipment preview/equip, battle actions and settlement, and
a merchant purchase. Web QA at `http://localhost:8097` against the isolated Worker
at `http://localhost:8797` used 390×844 and 1280×900 layouts. It verified lazy feature
loading, potion use, hotbar updates, rest start/stop, quests, titles, canvas movement,
keyboard dismissal of navigation, and position/inventory persistence after reload.
The task's browser and development servers were closed and temporary connection
configuration restored. No remote migration/deployment or native device interaction
was performed. Existing development warnings about require cycles, deprecated web
style props, and unsupported Reanimated easing remain.
