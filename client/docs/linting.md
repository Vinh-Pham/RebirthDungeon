# Oxlint

Oxlint 1.83 is configured in `.oxlintrc.json`, with its version pinned through the existing pnpm lockfile. Run `pnpm lint` for a non-mutating check or `pnpm lint:fix` for safe automatic fixes. Both fail on errors, warnings, or unused suppression comments. `pnpm check` and GitHub Actions run lint before the other checks.

The configuration uses native TypeScript, Unicorn, Oxc, and React plugins with correctness rules at error severity. React Hooks rules and exhaustive dependencies are enabled, along with the Fast Refresh export rule and its constant-export allowance. No ESLint process or JavaScript-plugin bridge is needed; the obsolete legacy ESLint configuration and direct dependencies were removed.

The scan includes application code, tests, build configuration, and JavaScript scripts. Browser globals are available to application code; tests and tooling also receive Node globals. Generated output, dependencies, Firecrawl caches, and `.kilo`/`.codex` worktrees are excluded. Gitignore exclusions also apply. oxfmt remains responsible for formatting and `tsc --noEmit` for type checking; experimental Oxlint type checking is not enabled.

## Existing App exceptions

Only `src/App.tsx` disables `react/purity` and `react/set-state-in-effect`. This existing component reads the current time for rebirth eligibility and synchronizes local panels/reward selection with the external game store. Refactoring that bridge or adopting React Compiler is outside the lint setup. The rules remain enabled for other React components.

The reward-selection effect has one documented exhaustive-dependencies suppression: it initializes selection when the reward ID changes. Re-running it after each loot claim would reset the player's remaining selections. Unused suppression reporting ensures the exception is flagged if it stops being necessary.

## Official references

Retrieved using Firecrawl and retained locally:

- [Oxlint configuration](references/oxlint-config.md) — <https://oxc.rs/docs/guide/usage/linter/config.html>
- [ESLint migration](references/oxlint-migration.md) — <https://oxc.rs/docs/guide/usage/linter/migrate-from-eslint.html>