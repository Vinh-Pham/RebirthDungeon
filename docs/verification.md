# Verification scope

Vitest tests cover every five-dice outcome (7,776), 1,000 dungeon seeds, the complete domain-level dungeon loop, talent damage, resource consumption, holds/rerolls, defeat, rebirth, aging, economy and capacity errors, idempotent claims, one-chest enforcement, and persistence rollback/fallback. Coverage gates require 90% statements, branches, functions, and lines across the rules and persistence modules.

Browser tests use real input and inspect a read-only test-mode snapshot. Chromium traverses rooms, rolls/holds/rerolls, reloads the battle, fights the required encounters and boss, collects rewards, reloads the selected chest, and returns to town. WebKit and Firefox use a shorter creation/walking/dungeon-entry flow. The test-mode bridge remains read-only and exposes no teleport or award commands. The progression UI test seeds a controlled IndexedDB fixture for inventory and training prerequisites, then uses actual UI interactions for reading, assembly, equipment and rank advancement.

Local Firefox launch currently fails with “Could not find profile folder” before navigation, including when using an explicitly created profile directory. This is a host/browser-launch limitation; the Firefox project remains enabled in CI. Do not report Firefox as verified until that launch succeeds.

## Inventory hover dismissal while dragging — September 19, 2026 UTC

- Reproduced the old behavior with an immediate pointer-down assertion: the closed card remained mounted during its exit. Hover content now unmounts immediately when closed or suppressed, preventing an exiting card from repositioning as its item moves.
- The new regression check verifies immediate removal, absence throughout a held drag, and hover reopening after cancellation. All ten inventory checks passed across Chromium and WebKit. Five focused React tests, lint, TypeScript, build and whitespace checks passed.
- The previously recorded ResizeObserver notification still occurs in the separate hover-layout scenario. Firefox and full coverage were not rerun for this focused fix.

## Inventory hover cards — September 19, 2026 UTC

- HeroUI Pro HoverCard usage was verified against HeroUI MCP documentation. Cards show centered names, descriptions and catalog-backed details. Weapon critical values are explicitly character/skill values, shared with combat rather than invented per-weapon stats. Selected items expose the same details for touch users.
- Lint, TypeScript, all 139 unit/React tests, coverage gates, production build, formatting and whitespace checks passed. Coverage: 96.28% statements, 93.66% branches, 97.83% functions and 97.75% lines.
- All eight inventory browser checks passed across Chromium and WebKit, covering dragging, equipment, use/discard, keyboard actions, touch at enlarged HUD scale, hover contents, Escape/menu precedence and 320px card bounds. Desktop and narrow-screen captures were visually inspected.
- The hover scenario logs `ResizeObserver loop completed with undelivered notifications` in both browsers. Its assertions pass and no visible layout failure remained; the notification's underlying cause is unresolved. Firefox was not rerun; its previously recorded launch limitation is not a fresh result for this change.

## Shared NPC shop tabs — September 19, 2026 UTC

- Every catalog-backed shop uses the same HeroUI Shop/Quests tabs, verified against HeroUI MCP documentation. Empty quest tabs show an explicit message. Shop items use original category SVG illustrations and the existing resource-potion art.
- Visiting a shop opens the player inventory. Wide screens arrange service/inventory windows alongside one another. The shop's Your inventory button and inventory navigation bring an open inventory forward. Selling and blacksmith repairs use existing domain commands from inventory selection/context actions; equipped-item and busy/read-only restrictions remain enforced. Bank and healer services retain their existing interfaces.
- Lint, TypeScript, all 136 unit/React tests, production build, formatting and whitespace checks passed. No domain or persistence rules changed; coverage was not rerun.
- Chromium and WebKit trading journeys passed: all three vendors, purchase and inventory sale, equipped-sale rejection, repair availability, tab switching, empty Grocery quests, all shop images loading, closing-shop removal of Sell, bank operations, and 320px inventory focus. Both NPC quest journeys and the Chromium window movement/resize/scene-transition journeys also passed. The expanded trading test now routes real keyboard movement around town buildings rather than clicking off-screen NPCs or walking through blocked tiles.
- Desktop and narrow screenshots were visually inspected. Firefox was not rerun for this presentation change.

## Reward collection and automatic continuation — September 19, 2026 UTC

- `RewardModal.tsx` uses HeroUI Pro CheckboxButtonGroup without visible indicators, original reward SVGs, and border-only selection. It has no Continue button. Take all collects everything available and advances; Take selected collects only selected rewards, leaves the rest, and advances. Closing without collection retains the leave confirmation.
- Collection and continuation share one `CLAIM` transaction with `advance: true`. Ordinary loot returns to exploration, boss loot opens chest choices, and chosen-chest loot completes the run and returns to town. Capacity or persistence failure leaves the last committed reward state intact.
- Lint, TypeScript, all 136 unit/React tests, production build, formatting, and whitespace checks passed. Coverage: 96.28% statements, 93.66% branches, 97.83% functions, 97.75% lines; all 90% gates pass. Added tests cover selected-only grants, duplicate operations, boss/chest destinations, full inventory, and failed-write rollback/retry.
- Eight affected browser scenarios passed across the combined run and focused rerun: both buttons and hunting-quest claims in Chromium/WebKit, the complete Chromium dungeon/boss/chest/town journey, and WebKit's shorter entry flow. The first full journey read positions before Phaser finished changing scenes; waiting for a valid exploration position fixed the test timing, and the complete journey passed. Button checks cover keyboard selection, images, absent indicators/Continue button, automatic advancement, and saved outcomes after reload.
- Desktop and 320px reward layouts were visually inspected; the updated 320px capture shows both collection actions without a footer. Firefox was not rerun for this change.

## Inventory grid release — September 19, 2026 UTC

- Lint, TypeScript, production build, touched-file formatting, and whitespace checks passed.
- Vitest: all 132 unit/React tests passed. Coverage: 96.27% statements, 93.65% branches, 97.82% functions, 97.74% lines; all 90% gates pass.
- Added domain/persistence checks cover rectangle boundaries and fragmentation, deterministic packing, atomic grants and equipment replacement, race/slot restrictions, both accessories, no-refill stats, quantity discard, unchanged organization RNG/turns, schema-3 backups, crowded-save recovery, pending dice and RP migration, malformed layouts, duplicate operations, and failed-write rollback. React checks cover the nine slots/60 cells, manual movement, and discard cancellation/failure/success.
- Across the broad run and focused reruns, all 16 Chromium and nine enabled WebKit scenarios passed; seven existing project-specific scenarios remain skipped under WebKit. The six new inventory scenarios cover real dragging with a grabbed-cell offset, invalid destinations, race restrictions, context-menu Use, quantity discard/cancellation, persisted reload, keyboard menu dismissal and movement, touch selection, narrow layout, and enlarged HUD scale. Existing combat, shop/bank, books/pages, stat reservations, quest/RP, and window journeys also passed. WebKit's existing game scenarios retain their shorter flow.
- The first broad run exposed two stale inventory assertions/selectors, a titlebar click obscured by the larger inventory window, and a keyboard context-menu dismissal issue. Updated tests use the new item controls/model and an exposed titlebar point; the menu now explicitly owns Escape and restores item focus. Focused reruns passed. An earlier overlapping browser run collided on output artifacts; those interrupted results were not counted.
- Firefox inventory verification was attempted and failed before navigation at browser launch with “Could not find profile folder.” Firefox remains unverified on this host.
- Desktop and 320px screenshots were visually inspected (`test-results/inventory-desktop.png`, `test-results/inventory-mobile.png`), including larger slot silhouettes, the requested equipment arrangement, and the scrollable stacked backpack. Touch selection also passed at 130% HUD scale.

## Quest system release — September 19, 2026 UTC

- Lint, TypeScript, production build, touched-code Prettier checks, and whitespace checks passed.
- Vitest: all 116 unit/React tests passed. Coverage: 96.02% statements, 93.52% branches, 97.59% functions, 97.62% lines; all existing 90% gates pass.
- Quest tests cover automatic/NPC delivery, rank order, equipment/rebirth evidence, ordered dialogue, exactly-once claims after ledger eviction, three-quest tracking, backpack consumption and readiness loss, saved overflow, failed-write rollback, retained kills after death/abandonment, multi-target and counterattack credit, victory-only clear credit, schema-1/schema-2 compatibility, migration backups/fallback, and town-load reconciliation with a read-only writer-lock guard.
- RP tests cover fixed borrowed skills/equipment, independent RNG, frozen reservations after reload, no hero loot/training/ordinary quest credit, sequential encounters, success/report/claim, death/retry, explicit exit, and malformed mission saves.
- Chromium: all 13 journeys verified across the full run and focused rerun. The full run passed 12 and found a window-position restoration regression; after its fix, all six quest/window journeys passed together. The seven existing gameplay/HUD journeys passed in the full run. Tests include real NPC acceptance and hand-in, skill reward, saved hunting progress and claim, Aren’s memory through both battles and exit, detail-window focus, 320px layout, and 130% HUD scale.
- WebKit: all three new quest journeys passed together in the final run. An earlier fixture reload interrupted the initial lazy Phaser import; the trace located the error at that reload. Waiting for the initial read-only game bridge before installing/reloading a fixture fixed it without suppressing page errors. Existing Chromium-only window gesture tests remain skipped under WebKit.
- Firefox: the new journal journey was attempted and failed before navigation at `browserType.launch` with “Could not find profile folder.” This remains the documented host limitation; Firefox is not verified.
- Desktop and 320px quest screenshots were visually inspected (`test-results/quests-desktop.png`, `test-results/quests-mobile.png`). The detail content scrolls internally; the wmkit resize handles intentionally extend beyond the frame. New windows clamp on narrow viewports, while session geometry remains exact when the viewport is unchanged.
- Quest, architecture, and README documentation now describe the implemented TypeScript system. Repeatable jobs, quest abandonment, personal notes, and rewarded RP replay remain deferred by scope.

## Latest local results — September 18, 2026 UTC (wmkit game windows)

- Lint (Oxlint, deny-warnings), TypeScript, and the production build passed.
- Vitest: 92 tests passed, including the new window suite (independent windows, duplicate-open focus, session geometry restore, parent/detail cleanup, in-place service switching, live content updates, focus restoration, Escape precedence behind confirmations and owned popups, keyboard window movement, Strict Mode cleanup). Coverage: 96.39% statements, 92.94% branches, 97.23% functions, 98.2% lines — all 90% gates pass.
- Chromium: all ten journeys passed in one full run — the seven previous scenarios (combat/reload/treasure, town services, trainer, books/assembly/equipment, catalog with wiki-rank popup and focus restoration, stats/reservations, HUD at 600/390/320px with 130% scale) plus three new window journeys (drag/resize/stack/session geometry; uncovered-canvas play with no click-through and keyboard ownership; scene transitions closing windows with confirmation priority). Window drag, resize, stacking, close, reopen, Escape, and focus restoration were driven with real input.
- WebKit: the three enabled creation/walking/dungeon-entry flows passed.
- Firefox: all journeys fail at `browserType.launch` on this host (persistent profile-folder launch limitation documented above); not verified locally.
- `docs/references/wmkit.md` records the wmkit sources (README, api.md, adapters.md, theming.md) with the retrieval date.

## Latest local results — September 18, 2026 UTC (HeroUI HUD)

- Lint, TypeScript, Prettier, whitespace checks, and production build: passed.
- Vitest: all 83 tests passed, including resource current/max values, empty-character state, and reserved-cost announcements through HeroUI ProgressBar.
- Chromium: all seven scenarios passed in the final full run, including the complete combat/reload/treasure journey and the new HUD journey. The latter checks character identity above resources, all four navigation actions, empty-character disabled states, XP, readable resource tracks, and canvas clearance at 600px, 390px, and 320px with 130% HUD scale.
- Desktop and 320px enlarged-HUD screenshots were visually inspected (`test-results/hud-desktop.png`, `test-results/hud-mobile-scaled.png`).
- No domain or persistence rules changed. Coverage was not rerun for this presentation-only update. Firefox and WebKit were not rerun; their previous results and limitations remain historical context.

## Prior local results — September 18, 2026 UTC (HeroUI catalog redesign)

- TypeScript, lint, Prettier checks, and production build: passed.
- Vitest: 82 tests passed. Catalog checks cover learned-only cards, no search/count, details hidden until a skill name is clicked, modal wiki rank selection, existing lesson/use/advance transactions, and Escape dismissing only the top modal after focus moves outside it.
- Coverage: 98.28% lines, 92.94% branches, 96.45% statements, 97.61% functions. All 90% gates pass.
- Chromium: all six scenarios passed across the final full run (five passed) and the targeted progression rerun (one passed). An earlier combat-click timeout did not repeat. The progression test was interrupted by a page navigation while documentation was being edited with the Vite server running; its clean rerun passed. Checks cover the AP footer, nested details, focus return and tab preservation, X close controls, Escape after saving, and a scrollable 390px-wide catalog. Desktop, detail, and mobile screenshots under `test-results/` were visually inspected.
- WebKit and Firefox were not rerun for this change; earlier results and the Firefox launch limitation remain historical context.

## Prior local results — September 18, 2026 UTC (learned-only skill window)

- TypeScript, lint, and production build: passed for the learned-only listing.
- Vitest: 81 tests passed. New/updated checks cover the skill window hiding unlearned entries (a fresh character shows only Normal Attack, `1 / 42 skills`, and empty tabs report no matches), wiki rank browsing from learned rows, and the trainer view keeping all 42 catalog entries — including life references and Wand Mastery — visible for discovery and lessons.
- Coverage: 98.28% lines, 92.94% branches, 96.45% statements, 97.61% functions. All 90% gates pass.
- Chromium: all six scenarios passed, including the trainer journey (reloaded journal lists the learned Smash row) and the catalog journey asserting the Life tab reports `0 / 42 skills` with no matches for an unlearned category. The journal screenshot (`test-results/skill-journal.png`) was visually inspected: only Normal Attack and Smash appear, counted `2 / 42 skills`.
- WebKit and Firefox were not rerun for this UI change. The earlier WebKit creation/walking/dungeon-entry result and the Firefox launch limitation remain historical context above.

## Prior local results — September 18, 2026 UTC (skill window tabs and out-of-battle use)

- TypeScript, lint, and production build: passed for the skill window update.
- Vitest: 80 tests passed. New checks cover tab grouping/search/wiki browsing, Passive and battle-only row states, Advance appearing at exactly 100 training, and `USE_SKILL` semantics: healing pays 12 MP once for 30 HP, Mana Recovery restores 20% of maximum mana for 5 SP with a 50-activation cooldown, and battle-only, unlearned, and battle-phase uses are rejected.
- Coverage: 98.28% lines, 92.94% branches, 96.45% statements, 97.61% functions. All 90% gates pass.
- Chromium: all six scenarios passed, including the trainer journal surviving reload (list-role rows), books/rank advancement, and the catalog journey using the new Life tab on a 600×800 viewport. Screenshots (`test-results/skill-journal.png`, `test-results/skill-catalog-life-mobile.png`) were visually inspected.
- WebKit and Firefox were not rerun for this UI change. The earlier WebKit creation/walking/dungeon-entry result and the Firefox launch limitation remain historical context above.

## Prior local results — September 18, 2026 UTC (stats implementation)

- TypeScript, lint, and production build: passed for the stats implementation.
- Vitest: 74 tests passed. New checks cover modifier ordering/removal, title-slot sources, fractional growth, frozen baselines, no-refill clamping, all active skills having positive costs, mixed-cost affordability/payment, HP costs bypassing shields, status priorities/timing, poison defeat, regeneration, consumable side effects/cleansing, save migration and malformed data.
- Coverage: 98.25% lines, 92.80% branches, 96.40% statements, 97.59% functions. All 90% gates pass.
- Chromium: the five existing scenarios passed, including the full dungeon/reload journey and catalog paging. The new stats scenario passed on its focused rerun after correcting its test control name. It exercises potion use, status persistence, Character stats, HP/SP reservations, another reload, and exactly-once paid pass. The 600×800 Character panel screenshot was visually inspected (`test-results/character-stats-mobile.png`).

See [stats implementation rules](gameplay/stats-implementation.md) for numeric balance and compatibility, and [the per-skill reference index](references/skills/README.md) for wiki data.

## Character information modal — September 18, 2026

- Lint, TypeScript, all 83 unit/React tests, production build, and touched-code formatting passed.
- Focused Chromium character-stats journey passed: three tabs, source accordion, status/reload
  behavior, reserved costs, four HeroUI progress bars, and no dialog overflow at 320px.
- Visually inspected the 320px screenshot. A negative HeroUI body margin found during the
  narrow-screen rerun was removed; the final browser run passed.
- No gameplay or persistence changes. Full browser suite, Firefox, WebKit, and coverage were
  not rerun for this presentation change.

## Character panel aligned with Skill Journal — September 18, 2026

- Replaced the custom teal skin with native HeroUI tabs, secondary cards, shared modal styling,
  readable labels, and stacked stat groups on narrow screens.
- Lint, TypeScript, all 83 unit/React tests, and touched-code formatting passed.
- Focused Chromium journey passed, including all three tabs, source disclosure, Details navigation,
  keyboard tab navigation, reserved resources, reloads, and dialog/content overflow at 320px.
- Desktop and mobile screenshots were visually inspected. Production build passed.
- No domain or persistence changes; full browser suite, Firefox, WebKit, and coverage were not rerun.
