# Verification scope

Vitest tests cover every five-dice outcome (7,776), 1,000 dungeon seeds, the complete domain-level dungeon loop, talent damage, resource consumption, holds/rerolls, defeat, rebirth, aging, economy and capacity errors, idempotent claims, one-chest enforcement, and persistence rollback/fallback. Coverage gates require 90% statements, branches, functions, and lines across the rules and persistence modules.

Browser tests use real input and inspect a read-only test-mode snapshot. Chromium traverses rooms, rolls/holds/rerolls, reloads the battle, fights the required encounters and boss, collects rewards, reloads the selected chest, and returns to town. WebKit and Firefox use a shorter creation/walking/dungeon-entry flow. No test commands can teleport or award items.

Local Firefox launch currently fails with “Could not find profile folder” before navigation, including when using an explicitly created profile directory. This is a host/browser-launch limitation; the Firefox project remains enabled in CI. Do not report Firefox as verified until that launch succeeds.

## Latest local results

- TypeScript: passed.
- Production build: passed; interface and Phaser are separate bundles.
- Vitest: 24 tests passed, including the exhaustive dice and dungeon-seed cases. Coverage: 98.88% lines, 93.72% branches, 97.66% statements, 95.53% functions for the configured rules/persistence scope.
- Chromium: complete dungeon/boss/treasure/reload journey and town services passed.
- WebKit: creation, walking, and dungeon entry passed. The service test intentionally runs only in Chromium.
- Normal development preview: no page errors; the test-only bridge is absent.
- Firefox: blocked before launch by the local profile-folder error described above.
