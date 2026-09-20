> **Historical browser-stack reference; not used by the Defold runtime.** Installation/API examples below belong to the original source, not this project. Use the [Defold library guides](defold/README.md) and [architecture](../architecture.md) for current plans.

[![](https://oxc.rs/assets/footer-background.DMNuC46B.jpg)\\
\\
![Oxc icon](data:image/svg+xml,%3csvg%20viewBox='0%200%2023%2014'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cpath%20d='M20.7482%200H18.8887C21.641%203.93959%2021.6571%2010.0462%2018.8887%2014H20.7482C23.516%2010.0462%2023.4999%203.93959%2020.7482%200Z'%20fill='white'/%3e%3cpath%20d='M2.07027%200C-0.682028%203.93959%20-0.698142%2010.0462%202.07027%2014H3.92985C1.16208%2010.0462%201.1782%203.93959%203.92985%200H2.07027Z'%20fill='white'/%3e%3cpath%20d='M13.4394%202.26107C13.4394%202.63492%2013.7423%202.93787%2014.1162%202.93787H16.6842C16.9858%202.93787%2017.1366%203.30269%2016.9233%203.5154L13.6373%206.8014C13.5103%206.92838%2013.4388%207.10048%2013.4388%207.28032V8.4038C13.4388%208.87111%2013.9022%209.19533%2014.3121%208.97231C14.7298%208.74542%2015.1185%208.47083%2015.4698%208.15628C15.609%208.03188%2015.823%208.03059%2015.9551%208.16338L18.3484%2010.5567C18.4806%2010.6888%2018.4812%2010.9034%2018.3446%2011.0311C16.5295%2012.7295%2014.0898%2013.7698%2011.4077%2013.7698C8.72568%2013.7698%206.286%2012.7295%204.4709%2011.0311C4.33425%2010.9034%204.33489%2010.6888%204.46703%2010.5567L6.86031%208.16338C6.99244%208.03124%207.20644%208.03188%207.34567%208.15628C7.69696%208.47083%208.08563%208.74542%208.50331%208.97231C8.9139%209.19533%209.3767%208.87111%209.3767%208.4038V7.28032C9.3767%207.10048%209.30515%206.92838%209.17817%206.8014L5.89217%203.5154C5.67881%203.30205%205.82964%202.93787%206.1313%202.93787H8.69926C9.07311%202.93787%209.37605%202.63492%209.37605%202.26107V0.568439C9.37605%200.381515%209.52753%200.230042%209.71445%200.230042H13.0991C13.286%200.230042%2013.4375%200.381515%2013.4375%200.568439V2.26107H13.4394Z'%20fill='white'/%3e%3c/svg%3e)Announcing React Compiler Support](https://oxc.rs/blog/2026-08-18-react-compiler-support)

[Skip to content](https://oxc.rs/docs/guide/usage/linter/migrate-from-eslint.html#VPContent)

On this page

Are you an LLM? You can read better optimized documentation at /docs/guide/usage/linter/migrate-from-eslint.md for this page in Markdown format

# Migrate from ESLint [​](https://oxc.rs/docs/guide/usage/linter/migrate-from-eslint.html#migrate-from-eslint)

This guide is for existing JavaScript and TypeScript projects that currently use ESLint and want to migrate to Oxlint.

## When to migrate from ESLint [​](https://oxc.rs/docs/guide/usage/linter/migrate-from-eslint.html#when-to-migrate-from-eslint)

Migrate to Oxlint if you want a dedicated linter with better speed, simpler adoption, and strong compatibility with modern ESLint workflows. Choose [Vite+](https://npmx.dev/package/vite-plus) instead if you want Oxlint as part of a larger unified toolchain.

- Move to Oxlint for dedicated linting.
- Move to [Vite+](https://npmx.dev/package/vite-plus) for an integrated workflow.
- Stay on ESLint if a specific missing behavior still blocks migration.

## Overview [​](https://oxc.rs/docs/guide/usage/linter/migrate-from-eslint.html#overview)

Oxlint and ESLint share similar configuration concepts, but they differ in supported rules and config formats.

Oxlint already supports more than 800 rules from ESLint core and various popular plugins. We intend to support nearly all existing ESLint core rules, and this work is ongoing. Check the [compatibility matrix](https://oxc.rs/compatibility.html) to verify support for your frameworks and file types.

When migrating, expect the following:

- Most ESLint core rules and popular plugin rules are supported
- Some rules may not yet be available
- ESLint configuration files must be converted to Oxlint’s config format
- Oxlint is designed for incremental adoption; a full migration is not required upfront
- Oxlint's JS Plugins allow usage of ESLint plugins that are not implemented natively by Oxlint

## Migrate with Skills [​](https://oxc.rs/docs/guide/usage/linter/migrate-from-eslint.html#migrate-with-skills)

The [`migrate-oxlint`](https://skills.sh/oxc-project/oxc/migrate-oxlint) skill provides an interactive, agent-guided migration. Install it into your coding agent:

bash

```
npx skills add https://github.com/oxc-project/oxc --skill migrate-oxlint
```

Once installed, run `/migrate-oxlint` to perform the migration.

## Migrating from an ESLint flat config [​](https://oxc.rs/docs/guide/usage/linter/migrate-from-eslint.html#migrating-from-an-eslint-flat-config)

If your project uses an ESLint v9/v10 flat config (e.g. `eslint.config.js` or `eslint.config.mjs`), you can migrate automatically using [`@oxlint/migrate`](https://npmx.dev/package/@oxlint/migrate).

### Run the migration tool [​](https://oxc.rs/docs/guide/usage/linter/migrate-from-eslint.html#run-the-migration-tool)

From the project root:

bash

```
npx @oxlint/migrate <optional-eslint-flat-config-path>
```

This command:

- Reads your ESLint flat config file
- Converts supported rules to an Oxlint config
- Preserves rule severities and options
- Preserves file and path-specific overrides to allow different rulesets for different parts of a repo
- Converts `globals` (e.g. `...globals.browser`) to equivalent `env` and `globals` values
- Preserves root `ignore` patterns for ignoring specific paths/files

The generated `.oxlintrc.json` config can be edited manually after migration.

`.eslintignore` files will be respected by Oxlint and can be left in place during migration, but we recommend moving the contents to the `"ignorePatterns"` field in `.oxlintrc.json` after migrating. Files/paths ignored via a repo's `.gitignore` file will also be respected by Oxlint automatically.

See the list of [available options](https://github.com/oxc-project/oxlint-migrate?tab=readme-ov-file#options) for more details.

### Type-Aware TypeScript rules [​](https://oxc.rs/docs/guide/usage/linter/migrate-from-eslint.html#type-aware-typescript-rules)

If your ESLint setup uses `typescript-eslint` with type-aware rules, you can pass the `--type-aware` flag:

bash

```
npx @oxlint/migrate --type-aware
```

This ensures the generated Oxlint config includes type-aware rules.

Note that type-aware linting requires [oxlint-tsgolint](https://github.com/oxc-project/tsgolint), and is based on the TypeScript native rewrite (aka TypeScript 7), but should be possible to adopt in most TypeScript projects without too much upgrade work.

For further information on Oxlint's type-aware support, see [the Type-Aware Linting page](https://oxc.rs/docs/guide/usage/linter/type-aware.html).

### JavaScript plugins [​](https://oxc.rs/docs/guide/usage/linter/migrate-from-eslint.html#javascript-plugins)

If your ESLint config uses plugins that are not supported natively by Oxlint, you can retain them using JavaScript plugins. `@oxlint/migrate` will migrate these plugins for you by default.

This allows you to continue using those rules via Oxlint alongside the native rules/plugins. The JS Plugins functionality does not support all ESLint plugins, but Oxlint's JavaScript plugin system covers a vast majority of the ESLint v9 API and is actively being improved. Most ESLint plugins covering JavaScript/TypeScript code should work in Oxlint without problems.

If you do not want to migrate your ESLint plugins to use as JS Plugins, you can pass `--js-plugins=false`.

For more information on JavaScript Plugins, see [the JS Plugins page](https://oxc.rs/docs/guide/usage/linter/js-plugins.html).

#### Local custom ESLint plugins [​](https://oxc.rs/docs/guide/usage/linter/migrate-from-eslint.html#local-custom-eslint-plugins)

If you use local custom ESLint plugins from within your own repo (e.g. `import pluginMyCompany from './eslint-plugin-my-company/lib/index.js'`), these will not be migrated automatically by `@oxlint/migrate` right now.

However, they can be added manually to the Oxlint config file after running the migration script:

.oxlintrc.jsonoxlint.config.ts

json

```
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "jsPlugins": ["./eslint-plugin-company/lib/index.js"]
}
```

ts

```
import { defineConfig } from "oxlint";

export default defineConfig({
  jsPlugins: ["./eslint-plugin-company/lib/index.js"],
});
```

## Running Oxlint and ESLint together [​](https://oxc.rs/docs/guide/usage/linter/migrate-from-eslint.html#running-oxlint-and-eslint-together)

If not all required rules are available in Oxlint, you can run Oxlint and ESLint side by side.

A common setup is:

1. Enable Oxlint for all supported rules
2. Keep ESLint for unsupported rules
3. Disable overlapping rules in ESLint

Because Oxlint is significantly faster than ESLint, it is recommended to run Oxlint first to catch errors early, then fall back to ESLint only if needed.

For example:

bash

```
oxlint && eslint
```

### Disabling overlapping rules in ESLint [​](https://oxc.rs/docs/guide/usage/linter/migrate-from-eslint.html#disabling-overlapping-rules-in-eslint)

You can use [`eslint-plugin-oxlint`](https://npmx.dev/package/eslint-plugin-oxlint) to disable ESLint rules that are already handled by Oxlint:

bash

```
npm install --save-dev eslint-plugin-oxlint
```

This reduces duplicate diagnostics, can help cut down your linting time considerably, and allows ESLint to focus only on rules that Oxlint does not yet support.

Long-term - once remaining important rules have been added in Oxlint - we strongly recommend moving fully to Oxlint to simplify your setup and reduce the number of dependencies for your project.

## Migrating from legacy ESLint (v8.x) configs [​](https://oxc.rs/docs/guide/usage/linter/migrate-from-eslint.html#migrating-from-legacy-eslint-v8-x-configs)

If your project uses ESLint v8.x with legacy config files (such as `.eslintrc.js` or `.eslintrc.json`), they cannot be migrated automatically by `@oxlint/migrate`.

In some cases, you can [migrate them automatically to an ESLint flat config with `@eslint/migrate-config`](https://npmx.dev/package/@eslint/migrate-config) first, and _then_ to Oxlint using `@oxlint/migrate`.

The "legacy" ESLint v8.x configuration file shape maps closely to Oxlint’s config format, so for simple setups most rules and options can be translated directly.

## Rule/plugin support [​](https://oxc.rs/docs/guide/usage/linter/migrate-from-eslint.html#rule-plugin-support)

You may have specific rules that you rely on in ESLint that are not yet ported to Oxlint.

Almost all rules from our supported plugins will be ported - and a majority already have been. For those that will not be ported, some rules are deprecated in the original plugins, or have alternatives implemented already.

You can check the [meta issue](https://github.com/oxc-project/oxc/issues/481) for rule/plugin implementation status to see if the rules you rely on are planned for implementation, or if they have already been implemented by other, equivalent rules.

For plugins that are not implemented natively in Oxlint, it is recommended to use [JS Plugins](https://oxc.rs/docs/guide/usage/linter/js-plugins.html).
