# Verification scope

Vitest tests cover every five-dice outcome (7,776), 1,000 dungeon seeds, the complete domain-level dungeon loop, talent damage, resource consumption, holds/rerolls, defeat, rebirth, aging, economy and capacity errors, idempotent claims, one-chest enforcement, and persistence rollback/fallback. Coverage gates require 90% statements, branches, functions, and lines across the rules and persistence modules.

Browser tests use real input and inspect a read-only test-mode snapshot. Chromium traverses rooms, rolls/holds/rerolls, reloads the battle, fights the required encounters and boss, collects rewards, reloads the selected chest, and returns to town. WebKit and Firefox use a shorter creation/walking/dungeon-entry flow. The test-mode bridge remains read-only and exposes no teleport or award commands. The progression UI test seeds a controlled IndexedDB fixture for inventory and training prerequisites, then uses actual UI interactions for reading, assembly, equipment and rank advancement.

Local Firefox launch currently fails with “Could not find profile folder” before navigation, including when using an explicitly created profile directory. This is a host/browser-launch limitation; the Firefox project remains enabled in CI. Do not report Firefox as verified until that launch succeeds.

## Latest local results — September 18, 2026 UTC

- TypeScript, lint, and production build: passed for the stats implementation.
- Vitest: 74 tests passed. New checks cover modifier ordering/removal, title-slot sources, fractional growth, frozen baselines, no-refill clamping, all active skills having positive costs, mixed-cost affordability/payment, HP costs bypassing shields, status priorities/timing, poison defeat, regeneration, consumable side effects/cleansing, save migration and malformed data.
- Coverage: 98.25% lines, 92.80% branches, 96.40% statements, 97.59% functions. All 90% gates pass.
- Chromium: the five existing scenarios passed, including the full dungeon/reload journey and catalog paging. The new stats scenario passed on its focused rerun after correcting its test control name. It exercises potion use, status persistence, Character stats, HP/SP reservations, another reload, and exactly-once paid pass. The 600×800 Character panel screenshot was visually inspected (`test-results/character-stats-mobile.png`).
- WebKit and Firefox were not rerun for this stats change. The earlier WebKit creation/walking/dungeon-entry result and Firefox launch limitation remain historical context above.

See [stats implementation rules](gameplay/stats-implementation.md) for numeric balance and compatibility, and [the per-skill reference index](references/skills/README.md) for wiki data.
