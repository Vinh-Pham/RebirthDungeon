# Static checks

Run `pnpm lint` to check JavaScript and TypeScript with Oxlint's default rules.
The command exits with a failure if Oxlint reports a warning or error.

Run `pnpm format` to apply Oxfmt and `pnpm format:check` to check formatting
without writing files. Oxfmt uses two spaces for indentation and a print width
of 120 characters. Both commands cover the web source, tests, tools, and root
app files listed in `package.json`. To format a single file, run
`pnpm exec oxfmt --write <file>`.

Run `pnpm typecheck` to check TypeScript and `pnpm test` to validate world,
combat, content and persistence behavior. `pnpm build` regenerates the
asset manifest and compiles the application. Keep authored code in `src/`,
tests in `tests/web/` and build artifacts out of version control.
