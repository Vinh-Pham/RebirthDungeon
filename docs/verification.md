# Verification scope

Vitest tests cover every five-dice outcome (7,776), 1,000 dungeon seeds, the complete domain-level dungeon loop, talent damage, resource consumption, holds/rerolls, defeat, rebirth, aging, economy and capacity errors, idempotent claims, one-chest enforcement, and persistence rollback/fallback. Coverage gates require 90% statements, branches, functions, and lines across the rules and persistence modules.

Browser tests use real input and inspect a read-only test-mode snapshot. Chromium traverses rooms, rolls/holds/rerolls, reloads the battle, fights the required encounters and boss, collects rewards, reloads the selected chest, and returns to town. WebKit and Firefox use a shorter creation/walking/dungeon-entry flow. The test-mode bridge remains read-only and exposes no teleport or award commands. The progression UI test seeds a controlled IndexedDB fixture for inventory and training prerequisites, then uses actual UI interactions for reading, assembly, equipment and rank advancement.

Local Firefox launch currently fails with “Could not find profile folder” before navigation, including when using an explicitly created profile directory. This is a host/browser-launch limitation; the Firefox project remains enabled in CI. Do not report Firefox as verified until that launch succeeds.

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
