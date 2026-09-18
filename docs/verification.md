# Verification scope

Vitest tests cover every five-dice outcome (7,776), 1,000 dungeon seeds, the complete domain-level dungeon loop, talent damage, resource consumption, holds/rerolls, defeat, rebirth, aging, economy and capacity errors, idempotent claims, one-chest enforcement, and persistence rollback/fallback. Coverage gates require 90% statements, branches, functions, and lines across the rules and persistence modules.

Browser tests use real input and inspect a read-only test-mode snapshot. Chromium traverses rooms, rolls/holds/rerolls, reloads the battle, fights the required encounters and boss, collects rewards, reloads the selected chest, and returns to town. WebKit and Firefox use a shorter creation/walking/dungeon-entry flow. The test-mode bridge remains read-only and exposes no teleport or award commands. The progression UI test seeds a controlled IndexedDB fixture for inventory and training prerequisites, then uses actual UI interactions for reading, assembly, equipment and rank advancement.

Local Firefox launch currently fails with “Could not find profile folder” before navigation, including when using an explicitly created profile directory. This is a host/browser-launch limitation; the Firefox project remains enabled in CI. Do not report Firefox as verified until that launch succeeds.

## Latest local results

- TypeScript: passed.
- Production build: passed; interface and Phaser are separate bundles.
- Vitest: 41 tests passed, including exhaustive dice/dungeon cases and ranked skill acquisition, mastery eligibility, action snapshots, advanced combat, migration, legacy backup, corruption recovery and durable rollback. Coverage: 98.63% lines, 92.79% branches, 96.52% statements, 97% functions for the configured rules/persistence scope.
- Chromium: complete dungeon/boss/treasure/reload journey, town services, trainer learning/reload, book reading, page assembly, equipment and AP advancement passed. The journal is also checked at a 600px viewport.
- WebKit: creation, walking, and dungeon entry passed. The service and skill-interface tests intentionally run only in Chromium.
- Full Chromium journey asserts no browser page or console errors. The test-only bridge remains gated to e2e mode.
- Firefox: blocked before launch by the local profile-folder error described above.
