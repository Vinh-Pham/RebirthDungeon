# Combat events and per-battle archives

**Initial combat log implemented 2026-09-20; multi-battle archives remain a later storage milestone.** Milestone 4 uses a bounded active/latest encounter log and latest committed event batch. Milestone 6 adds per-battle archives. Use the [battle contract](turn-based-plan.md), [architecture](architecture.md), and [Druid](references/defold/druid.md) GUI. The current panel browses the active/latest encounter; a completed-archive list is not enabled.

## Events required by the combat slice

Proposed `game/domain/battle/` modules emit plain Lua event records as part of the action candidate. Capture battle/run/actor/target IDs, round/turn/operation IDs and a monotonic battle sequence before advancing the cursor. Events describe actions/items, costs, recovery, damage, criticals, hit indices, shield absorption, statuses, counters, defeats and termination. Record actual HP loss separately from calculated hit damage.

Persist events with outcomes and RNG continuation through DefSave. Event notifications publish them only after confirmed save. Consumers deduplicate IDs per presentation session; animations and logs never execute commands. Keep the latest batch in the envelope through battle cleanup so terminal feedback can render once. Startup may skip old effects and rebuild from committed state.

Bound active history to **100 events** initially, trim only complete operation/turn groups, and mark incomplete history. A group exceeding the bound may be omitted from retained history while the latest committed batch still presents its outcome. Define content/event bounds before shipping.

## Later archive contract

Archive victory, defeat or abandonment in the same transaction that ends the battle. Keep battle/run identity, encounter/participant labels, origin (hero or RP), final round/outcome, events, archive format version and an incomplete flag. Battle ID prevents duplicate archiving during later claims or cleanup. Rebirth preserves archives. Later RP archives may be copied as display-only records without copying NPC possessions, XP, training or quest state into the hero.

The archive milestone raises the per-stream retention bound to **1,000 events** and retains the latest **20 completed records** plus the active battle. Trim oldest whole groups after an operation; mark truncated or imported partial histories incomplete. This replaces the initial 100-event policy only when the archive format and storage budget are verified. No unlimited growth, export/search/analytics or cross-version executable replay is implied.

## Player experience

Show a compact chronological action log in battle. Later provide View combat log and a menu entry in a Druid panel/Monarch popup. Default to the active encounter or latest completed battle; list completed records newest first, label outcome and RP origin, and number same-named enemies locally.

Group by turn/operation with expandable costs, hits, criticals, healing, absorption and status details. Turn-start recovery remains separate. Use one pure formatter for compact/full views. Render only selected records and virtualize long lists as needed. Auto-follow only at the bottom; otherwise show New entries / Jump to latest without stealing focus. Evaluate native accessibility support instead of promising browser live regions.

Browsing is presentation-only and can remain available while writes/actions are disabled. Apply the first-slice modal pause policy until a separate nonblocking window milestone is verified. Test formatting, retention, duplicate archives, failed-save rollback, restart after terminal actions, character switching and long-text/GUI bounds. Measure realistic DefSave envelope size before enabling archives.

## Implemented first-slice contract — 2026-09-20

`game/domain/combat_log.lua` owns the version-1 display record inside profile format 3 (the log was introduced with format 2). Format-1 and format-2 profiles migrate on load and remain unchanged on disk until a successful save; older builds reject unsupported profile formats instead of silently writing stale log or treasure data. The outer A/B envelope stays version 1. It retains the **active or latest encounter**, not a list of completed archives. Starting the next battle replaces that record. Victory, defeat and abandonment finalize it in the same saved candidate as their outcome, before battle/run cleanup; claims, return, rebirth and restart preserve it. Older active histories migrate in memory without rewriting their saved slot and are marked incomplete. Unknown newer combat-log versions are preserved and refused by the save loader.

The initial limits are **100 retained events**, **64 events per committed operation/batch**, **256 bytes per event text**, **128 bytes per operation/identity**, **64 bytes per participant label**, and **8 participants**. Retention runs after every operation, including terminal actions and items, and removes whole operation groups. Oversized groups can be removed entirely; the separate latest batch remains intact. Unsupported oversized content rejects the candidate rather than partially saving it. Noncombat commands keep the latest combat batch, and audio/visual consumers suppress old batches on selection and deduplicate battle sequences.

The current combat rules emit encounter start, turn recovery, actions/costs, item recovery, each hit, actual HP loss versus calculated damage, guard/status application and expiration, periodic damage, defeat and termination. Hit indices, skill, actor/target, run/battle, round/turn, operation and event IDs are retained. The formatter understands criticals, absorption, healing and counters as display data; this does not invent unavailable combat mechanics.

Battle shows three compact chronological operation summaries. **Battle log** and **Menu → View combat log** open the existing sibling Monarch modal. Six operation rows and eight wrapped detail lines are rendered at a time. Select a row to expand costs/hits/statuses; use detail paging for longer operations. Earlier/Later actions anchor to stable sequence positions. New entries never move an anchored view; **Jump to latest** resumes following. Incomplete or expired reading positions are identified. Escape collapses details before returning to the parent panel. Read-only storage and save-recovery screens allow browsing without executing commands. Only bounded display projections cross into GUI scripts.

The later **20 × 1,000-event archive policy remains gated**. The native DefSave fixture round-trips the initial detailed history/batch at approximately **272 KB** per envelope including the eight-room map and saved room gates. A 20-record, 1,000-event-per-record candidate serializes to approximately **14.83 MB**, above the project's **512 KiB** budget derived from the documented `sys.save` contract. Although this engine's serializer accepts that larger in-memory buffer, this does not establish a supported save contract for shipping. A separate compact/archive storage design and atomicity verification are needed before raising retention. No archive collection, export, search, RP import or executable replay has been enabled.

Verification and exact measurements are recorded in [verification](verification.md). The budget fixture is `tests/combat_log_native.lua`; domain tests cover retention, formatting, identities, legacy migration, duplicate operations, failed saves, terminal cleanup/rebirth and anchored browsing. Fresh-process tests verify terminal batches survive reward cleanup. GUI fixtures exercise the modal, detail paging bounds, parent navigation, restart and read-only browsing at both desktop acceptance sizes.
