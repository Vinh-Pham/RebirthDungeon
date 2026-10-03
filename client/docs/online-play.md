# Online play

The Expo app supports independent local and online characters. **Play** opens local saves; **Play online** opens the account-owned roster. **Account** supports email/password registration, sign-in, and sign-out. Registration uses the initial account name `Player`. Character names, talents, and ages use the existing setup form.

Local characters and format 13 saves remain on the device. Online characters start fresh and require a verified session and connection to progress. They have one current server state and no manual slots, save uploads, debug menu, offline queue, or rewind. Signing out preserves local saves and any account-scoped unresolved command journal.

## Setup

Initialize the server using [its README](../../server/README.md). Copy `client/.env.example` to `client/.env.local` when absent, or add the variable to your existing environment:

```dotenv
EXPO_PUBLIC_API_URL=http://localhost:8787
```

This is the API **origin**, without `/api`, credentials, query parameters, or fragments. Missing configuration leaves local play available and explains that online play is unconfigured. Invalid configuration displays an error. Restart Expo after changing it; the public variable is embedded in the app bundle.

Run the Worker on port 8787 and Expo web on port 8081. The server's explicit `BETTER_AUTH_TRUSTED_ORIGINS` must include the actual browser origin (including its port) and `rebirthdungeon://`. If Expo chooses another port, update the approved list. Production web and API should share a site and use HTTPS. Physical devices need a reachable LAN or tunnel API URL, with matching server `BETTER_AUTH_URL`; a phone's localhost points at the phone.

Better Auth and its Expo plugin use matching 1.7.7 versions. SecureStore, Network, and Crypto were installed through Expo's SDK 57 installer. Build a fresh native development client for the SecureStore config plugin; do not edit generated native directories. Device validation remains necessary even when all platform exports pass.

## Authentication and queries

`src/online/OnlineProvider.tsx` owns one React Query client, session query, account mutations, connection observer, API transport, and command coordinator. It wraps HeroUI so portal content also receives the query context. Session query data contains only public account fields and expiry; tokens and cookies stay out of query caches, logs, and game views.

The native `.ts` auth adapter uses the official Expo client and SecureStore under the `rebirthdungeon` scheme. Application requests await `getCookie()` and send it with `credentials: "omit"`. The `.web.ts` adapter relies on browser-managed cookies and `credentials: "include"`. No JWT plugin or Bearer token is required.

Cached credentials are provisional. Startup, reconnect, and foregrounding revalidate the session before enabling game input; authoritative missing-session/401 responses require sign-in again. Network failures preserve stored credentials. Account changes cancel reads and discard game caches; generation checks reject late responses from an earlier account or connection.

| Query            | Key scope                                       | Freshness                                     |
| ---------------- | ----------------------------------------------- | --------------------------------------------- |
| Session          | API origin                                      | 30 seconds, with lifecycle revalidation       |
| Content          | Origin and account                              | 5 minutes; bundled content version must match |
| Character roster | Origin and account                              | 30 seconds                                    |
| Character view   | Origin, account, character                      | 5 seconds; foreground/reconnect revalidation  |
| Preview          | Origin, account, character, revision, selection | Immutable at that revision; no mutation       |

Game caches are memory-only. Reads have bounded retries for network and server failures, a 15-second timeout, and cancellation signals. Authoritative client errors and previews do not automatically retry. Transport validates responses with shared Zod contracts and limits UTF-8 JSON bodies to 4 KiB. Character cache merges never replace a newer revision with an older response.

## Gameplay ownership

`src/game/Gameplay.ts` defines the read-only host, journey, and battle ports used by shared screens, renderers, and audio. `LocalGameplayHost` wraps the original local simulation and save lifecycle. `OnlineGameplayHost` subscribes to React Query's public server view, maps existing UI intents to the public command allowlist, and updates only after a confirmed server response. It never constructs a journey engine or advances enemies locally.

Movement, interactions, services, equipment, exploration consumables, hotbar changes, skills, quests, titles, enchants, dungeons, battle actions, and encounter settlement go through the server. Equipment/enchant/burn previews use revision-bound server calculations. Enchant operation identity and RNG remain server-owned. Battle action selection and cancellation stay local, while action availability, valid targets, and combat estimates come from the server's read-only projection.

Battle receipts optionally contain version 1 presentation batches for the committed action and following enemy turns. The pure shared collector stores only animation facts; client timers play them without issuing commands. A receipt is displayed at most once in the current battle. Resume and duplicate recovery use the current public state without replaying old animation sequences or exposing encounter seeds, enemy history, or unrevealed dungeon outcomes. Dungeon HUD and visible object art are server-projected before private data is removed.

## Durable action recovery

Every deliberate action receives a UUID and the currently observed character revision. The coordinator writes that exact request to a separate recovery store **before** sending it: `rebirth-online-commands.db` on native and `rebirth-online-commands` IndexedDB on web. Keys include API origin, account, and character (or a separate character-creation key). Atomic insertion prevents another tab from overwriting an unresolved action; clearing compares command identity so a late acknowledgment cannot delete a newer request.

Only one unresolved request per character is allowed. Unknown outcomes, disconnects, 401s, server failures, and rate limits retain the request. **Recover pending action** explicitly resends the same ID, revision, and body. The server returns its original receipt if it already committed. No retry invents a new ID, rebases an old choice, spends resources optimistically, or rerolls outcomes. Character creation uses the same recovery path.

Authoritative 400/403/404/409/413/415/422 rejection clears the rejected request. Revision conflicts refresh the view and require a new deliberate choice. Rate limits respect `Retry-After`. Storage failure blocks sending; failure to clear an acknowledged request retains it for safe duplicate recovery. Other accounts cannot replay the journal. A current view can be newer than a duplicate receipt, as allowed by the server contract.

Rest pulses are the exception: they are ephemeral foreground lease renewals, never journaled or replayed. The host permits at most one pulse in flight, spaces pulses by at least one second, and stops on backgrounding, navigation away, unmount, failed requests, or loss of connection. After reconnect/restart, **Resume Rest** explicitly renews the server lease; no offline catch-up is awarded.

## Verification

Automated coverage includes account/connection isolation, request bounds, monotonic cache revisions, persist-before-send, storage failures, exact retries after a lost response/restart, simultaneous command coordinators, character creation recovery, rest leases, public battle targets/previews, presentation deduplication, and online host lifecycle. Shared core and Worker tests verify deterministic battles and receipt replay; the existing local save and gameplay suites remain required.

Manual checks should exercise registration, sign-in/out and replacement; separate rosters and local-save preservation; movement, collection, equipment previews and use; services and journals; battle action/target confirmation, reload resume, rewards and defeat; command interruption and explicit recovery; foreground/offline behavior and Rest; compact and wide layouts. Run these in native development builds on iOS and Android as well as web. Exports verify bundling, not device behavior.

Validated on October 3, 2026: workspace formatting, lint with zero warnings, type checks, and all 707 tests passed (611 client, 9 shared core, 87 server). The Worker dry-run build, local HTTP authentication/game smoke test, SDK dependency check, and web/iOS/Android exports passed. Web QA at `http://localhost:8081` against the local Worker used 390×844 and 1280×900 layouts. It covered registration, online character creation, movement and collection, equipment preview/equip, interrupted-action recovery across reload, battle damage/wear resume, retained victory loot and settlement, sign-out, and preservation of a local character/manual slot. The existing development-only HeroUI BackHandler warning remains on web. Native device interaction was not performed.

Cloud/local save synchronization, social sign-in, email verification/reset, multiplayer, JWT issuance, and content administration remain future work.
