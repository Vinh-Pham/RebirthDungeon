# Gameplay audit operations

The server commits gameplay state, retry receipts and immutable audit envelopes atomically. Deploy both additive audit migrations before deploying the recording Worker. Existing accounts, characters, progress and receipt protection remain intact. A migration-time recording start marker is returned to clients; no historical details are inferred from old receipts.

## Interfaces

All endpoints require authentication. Character endpoints enforce ownership. Admin data endpoints check the stored role on every request; no capability or session cache grants access.

| Endpoint                               | Purpose                                                                    |
| -------------------------------------- | -------------------------------------------------------------------------- |
| POST /api/game/characters/:id/activity | Strict version 1 UI batches; 4 KiB, max ten events; always client-reported |
| GET /api/game/characters/:id/logs      | Safe owner projection, latest 90 days                                      |
| GET /api/admin/capabilities            | Current administrator membership                                           |
| GET /api/admin/players?q=...           | Literal account/character lookup, max 50 matches; refine search            |
| GET /api/admin/logs                    | Filtered cursor history                                                    |
| GET /api/admin/logs/:id                | Full envelope, ordered events and changes                                  |
| GET /api/admin/logs/export             | JSON response containing bounded JSONL plus explicit nextCursor            |

Filters: userId, characterId, from/to epoch milliseconds, category, type (command or event), source, outcome, commandId, requestId, encounterId and revision. Page size defaults to 50, maximum 100. Continue with identical filters and nextCursor until null. A fixed upper sequence excludes later inserts from the series. Retention still applies during long-running exports; complete an export before its records expire. The client downloads 50-record files and explicitly offers the next page.

Player responses omit raw command parameters, state changes, request/account/session identifiers, hidden map IDs/seeds and investigation metadata. Administrative records never appear in personal history. Client occurrence times and revisions are unverified; sort uses server receipt order.

Rejected gameplay attempts contain normalized reasons and bounded identifiers, never raw bodies or credentials. Failure to store an attempt emits audit_record_failed. Collection failures emit audit_collection_failed and reject gameplay; D1 outages can also prevent rejected-attempt persistence. Do not treat an absent attempt record during an outage as proof no attempt occurred.

## Trusted operator roles

Run from server/ (or use pnpm --dir server). Every invocation requires exactly one explicit target. Use an existing account ID, not an email:

```sh
pnpm admin:roles list --local
pnpm admin:roles grant --local --user-id ACCOUNT_ID
pnpm admin:roles revoke --local --user-id ACCOUNT_ID
# Production: deliberately choose --remote instead of --local.
```

LOCAL_D1_STATE selects an alternate local persistence directory when set. There is no role mutation API. Database triggers atomically audit grants/revocations, including changes made by these trusted commands. Role events identify the affected account; operator attribution remains in the operator's Cloudflare/terminal access logs. Investigation accesses and exports record the authenticated administrator, request ID and validated filters. The viewer cannot modify gameplay or history. Revocation blocks the next data request, including export continuation.

## Retention, capacity and failure signals

Hourly cleanup deletes up to 10,000 expired rows per run in indexed batches of 1,000. Reads exclude records older than 90 days even if cleanup is delayed. Command receipts retain their existing lifetime and are never pruned by this job. Database UPDATEs to audit records are forbidden by a trigger; retention deletes are intentional.

The scheduled Worker emits audit_retention_completed with removed count, D1 database bytes, recent record count, a 90-day growth estimate and the configured byte budget. It emits audit_capacity_warning above 80% of the database budget or projected growth budget. Growth uses the last day's details/message bytes plus 256 bytes per row, multiplied by two for index/allocation headroom. This estimate is conservative for the measured mix, not a guaranteed bound. D1 size includes all tables; separately monitor long-lived receipts and campaign growth. A startup day with little traffic underestimates steady-state volume. Check these signals in Worker observability and adjust the budget before launch.

AUDIT_DATABASE_BUDGET_BYTES defaults to 400,000,000 bytes, a conservative budget below the documented Free database limit. It is a warning threshold, not a reservation, quota change or admission limit. Audit write failures reject gameplay rather than silently losing evidence.

Local D1 measurement on October 3, 2026 (`pnpm exec vitest run test/audit-capacity.test.ts --silent=false --disableConsoleIntercept`):

| Representative command            | Details JSON bytes |
| --------------------------------- | -----------------: |
| Single movement                   |                597 |
| Travel across town                |              2,612 |
| Potion                            |                610 |
| Start Rest                        |                459 |
| Travel starting encounter         |              3,710 |
| Battle defend plus enemy response |              4,361 |
| Rest pulse                        |                262 |

An equal mix of these seven samples, repeated 20 times, allocated **3,218 bytes per command including indexes**. The extra audit-only batch write measured **0.20–0.31 ms per record** locally. A character-index query returned 50 records with 50 rows read; EXPLAIN verified audit_character_idx. These are small local measurements, not deployed commit-latency or peak combat/dungeon guarantees. The rule-execution, authentication, existing state writes and network costs are additional. Measure full deployed p50/p95 command latency before production rollout.

At this measured mix, a 400 MB total budget with 20% headroom permits about **1,100 audit records/day over 90 days**, before other database use: only around 11 records per player per day at 100 DAU. UI reports and rejected attempts also consume space. This default is insufficient for an active 100-DAU game. An explicitly provisioned 8 GB budget with the same headroom would permit roughly **22,000 records/day** (220 per player at 100 DAU), still before non-audit growth. A session with frequent Rest pulses or movement can exceed that. Measure actual mix, frequency and campaign/receipt size, then choose paid capacity or revise the architecture before admitting that traffic. Never disable auditing to fit the budget.

Character/account/request/command/encounter lookups and retention use indexes. Filtering contained event types/categories scans candidate event JSON: narrow investigations by character/account/time for a small launch. Database-only retention does not guarantee long-term fit. Automated detection, alerts beyond operational console signals, bans, external archive storage and unlimited export streams are outside this version.

## Rollout and validation

1. Back up and migrate the target database with the existing explicit local/remote migration tooling.
2. Deploy the recording Worker, activity binding and hourly cleanup. Confirm creation, movement, combat and retry records and the recording start marker before distributing the client.
3. Grant operator roles with the explicit target command. Verify revocation against a fresh data request.
4. Release the client history, durable activity outbox and read-only investigation screen.
5. Measure production size/latency and monitor storage warnings. Older clients automatically receive server-side gameplay coverage but cannot supply new UI activity.

Tests cover state/receipt/audit rollback, concurrent revisions and retries, failed observers, deterministic execution, restoration suppression, broad progression/economy/dungeon commands, forged input, cross-account reads/uploads, roles/revocation, safe projections, retention boundaries, indexed reads and outbox recovery. Run core/client/server suites, migration checks, lint, format and types. Web QA covers compact/wide UI; native device behavior and production latency remain deployment checks.
