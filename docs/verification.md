# Verification scope

Vitest tests cover every five-dice outcome (7,776), 1,000 dungeon seeds, the complete domain-level dungeon loop, talent damage, resource consumption, holds/rerolls, defeat, rebirth, aging, economy and capacity errors, idempotent claims, one-chest enforcement, and persistence rollback/fallback. Coverage gates require 90% statements, branches, functions, and lines across the rules and persistence modules.

Browser tests use real input and inspect a read-only test-mode snapshot. Chromium traverses rooms, rolls/holds/rerolls, reloads the battle, fights the required encounters and boss, collects rewards, reloads the selected chest, and returns to town. WebKit and Firefox use a shorter creation/walking/dungeon-entry flow. The test-mode bridge remains read-only and exposes no teleport or award commands. The progression UI test seeds a controlled IndexedDB fixture for inventory and training prerequisites, then uses actual UI interactions for reading, assembly, equipment and rank advancement.

Local Firefox launch currently fails with “Could not find profile folder” before navigation, including when using an explicitly created profile directory. This is a host/browser-launch limitation; the Firefox project remains enabled in CI. Do not report Firefox as verified until that launch succeeds.

## Latest local results — September 18, 2026 UTC

- TypeScript, lint, and production build: passed.
- Vitest: 61 tests passed. Includes all 33 icon mappings and local source files, race-specific AP and costs, merged wiki cells, new offensive/support skills, source-only life skills, unverified Wand Mastery, save corruption checks, catalog search/rank browsing, and the previous dungeon/progression checks.
- Coverage includes the per-skill helpers: 98.77% lines, 93.38% branches, 96.86% statements, 97.29% functions. All 90% gates pass.
- Chromium: all five browser scenarios passed across the existing full dungeon/reload journey, town services, trainer learning, inventory/AP advancement, and the new catalog/full-spellbook scenario. Icons load successfully; wiki rank inspection, life filters, and combat paging work at a 600×800 viewport. Screenshots are written under `test-results/skill-catalog-*.png`.
- WebKit and Firefox were not rerun for this catalog change. The earlier WebKit creation/walking/dungeon-entry result and Firefox launch limitation remain historical context above.

The catalog source index and current adaptation rules are in [the per-skill reference index](references/skills/README.md).
