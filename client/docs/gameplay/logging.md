# Persistent gameplay audit history

Implemented October 3, 2026. Online play records authoritative gameplay on the server; a modified client cannot suppress these records while successfully committing actions. Client UI activity is separately labeled **Client reported** and is never proof that gameplay occurred. Rejections and unusual patterns are investigation evidence, not automatic proof of cheating. No scoring, bans, or alerts are implemented.

## Recording boundary

`packages/game-core/src/online/Runtime.ts` attaches an `AuditCollector` only to actual command execution. It reuses the exhaustive classifications and formatters in `GameActionLogging.ts`. Restoration happens with collection disabled, so reconstructed battle setup does not appear as a new encounter; genuine encounter starts do. Reads, validation and previews do not create committed gameplay.

Each command carries ordered rule events and changes to resources, inventory, equipment, progression, position, battle actors, rewards and mutable dungeon facts. Travel includes each resolved movement step within its command. Character creation has its own record. The server adds authenticated identity, server time, request/command IDs, base/committed revisions, content version and validated command. It commits the envelope in the same D1 transaction as the receipt and changed state rows. Collection/serialization failures prevent persistence; write failures roll back the entire batch. Receipt recovery reuses the same command and never invents a second committed action. Command identity and committed character revision have unique database indexes.

The legacy memory `LogEngine` remains for headless/local compatibility tests. Online play no longer uses it as history. Its observer error hook allows authoritative collection to fail closed without changing legacy diagnostic observer behavior. Audit tables remain outside campaign save schemas and the state-diff registry.

Malformed, illegal, unauthorized, conflicting, stale and throttled game requests produce separate server-observed attempt records with normalized reasons and bounded identifiers. Raw bodies, credentials, cookies and tokens are excluded. Provisional events from rejected execution are not published. If logging storage also fails, the Worker emits an operational failure signal; rejected-attempt persistence cannot be guaranteed during an outage.

## Personal history

The drawer's **Logs** screen queries the server with account-scoped, cancellable cursor pagination and retains **All, Combat, Movement, User, System** filters. Records are ordered by server insertion sequence, with a fixed boundary for each pagination series. A command can contain events in several categories; filtering matches the envelope or a contained event and shows matching messages.

Rows show receipt time and provenance; delayed client reports also show their unverified occurrence time. History lasts 90 days and survives reload, sign-out and leaving a character. There is no Clear logs control. The recording start time comes from the additive migration; old receipts are not fabricated into detailed history.

Player projection explicitly permits version, record ID, time, source, category/type, message, outcome and safe event messages. It omits command/request/account IDs, private metadata, state changes, seeds and RNG. Generated map identifiers contain seeds, so their player-facing messages are replaced with a safe area-change message.

## Client activity

`ActivityOutbox` accepts only the versioned UI event allowlist: navigation, journal/details/filter interactions, settings, battle selection/cancellation and connection lifecycle. Rendering, animation frames, raw keystrokes and reading/filtering Logs are excluded.

A separate SQLite database on native and IndexedDB database on web persist queues scoped to API origin and account. Atomic storage updates preserve concurrent enqueues. Stable IDs allow idempotent retries. Uploads contain at most ten events and 4 KiB of UTF-8 JSON; the server derives identity and receipt time and always stamps client provenance. Client time and revision are unverified context.

Delivery runs every five seconds and on connection/account lifecycle changes; it pauses without a verified foreground connection. Account leases reject stale acknowledgments. A seven-day or 1 MiB bound drops oldest entries and queues a loss report. Deleted characters cannot permanently block remaining queues. Rate-limit backoff is independent of gameplay. Storage/upload failure never blocks a game command; persistence is best effort if the device storage itself fails.

## Administration and operations

Administrators open **Gameplay investigations** from Account. The viewer supports player lookup, time/category/type/outcome/source and correlation filters, details and related records. JSONL exports contain bounded pages with explicit continuation and a fixed upper sequence; continue until Export complete. Native shares each JSONL page through the platform share sheet.

Every admin data request checks current database membership. Revocation applies to the next request. Investigation reads/exports and operator role changes are recorded. No player-facing API can grant roles. See [server operations](../../../server/docs/gameplay-audit.md) for target-specific commands, capacity measurements and rollout.

## Verification

Core tests cover deterministic state/RNG, per-step travel, item changes, battle restoration and collector failure. Server tests cover atomic rollback, receipts/replays/concurrency, broad gameplay command envelopes, safe projection, ownership, roles/revocation, export cursors, retention, migrations and indexed reads. Client tests cover lost responses/reload, identity changes, background/reconnect, multibyte batch limits, rate backoff, expiry/size loss reports and removed characters.

Web QA covers compact and wide history and investigation screens, real movement, filters, reload and revocation. Native SQLite and share adapters typecheck and bundle; device-level background delivery, safe areas and sharing still require iOS/Android verification.
