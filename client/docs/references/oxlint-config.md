[![](https://oxc.rs/assets/footer-background.DMNuC46B.jpg)\\
\\
![Oxc icon](data:image/svg+xml,%3csvg%20viewBox='0%200%2023%2014'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cpath%20d='M20.7482%200H18.8887C21.641%203.93959%2021.6571%2010.0462%2018.8887%2014H20.7482C23.516%2010.0462%2023.4999%203.93959%2020.7482%200Z'%20fill='white'/%3e%3cpath%20d='M2.07027%200C-0.682028%203.93959%20-0.698142%2010.0462%202.07027%2014H3.92985C1.16208%2010.0462%201.1782%203.93959%203.92985%200H2.07027Z'%20fill='white'/%3e%3cpath%20d='M13.4394%202.26107C13.4394%202.63492%2013.7423%202.93787%2014.1162%202.93787H16.6842C16.9858%202.93787%2017.1366%203.30269%2016.9233%203.5154L13.6373%206.8014C13.5103%206.92838%2013.4388%207.10048%2013.4388%207.28032V8.4038C13.4388%208.87111%2013.9022%209.19533%2014.3121%208.97231C14.7298%208.74542%2015.1185%208.47083%2015.4698%208.15628C15.609%208.03188%2015.823%208.03059%2015.9551%208.16338L18.3484%2010.5567C18.4806%2010.6888%2018.4812%2010.9034%2018.3446%2011.0311C16.5295%2012.7295%2014.0898%2013.7698%2011.4077%2013.7698C8.72568%2013.7698%206.286%2012.7295%204.4709%2011.0311C4.33425%2010.9034%204.33489%2010.6888%204.46703%2010.5567L6.86031%208.16338C6.99244%208.03124%207.20644%208.03188%207.34567%208.15628C7.69696%208.47083%208.08563%208.74542%208.50331%208.97231C8.9139%209.19533%209.3767%208.87111%209.3767%208.4038V7.28032C9.3767%207.10048%209.30515%206.92838%209.17817%206.8014L5.89217%203.5154C5.67881%203.30205%205.82964%202.93787%206.1313%202.93787H8.69926C9.07311%202.93787%209.37605%202.63492%209.37605%202.26107V0.568439C9.37605%200.381515%209.52753%200.230042%209.71445%200.230042H13.0991C13.286%200.230042%2013.4375%200.381515%2013.4375%200.568439V2.26107H13.4394Z'%20fill='white'/%3e%3c/svg%3e)Announcing React Compiler Support](https://oxc.rs/blog/2026-08-18-react-compiler-support)

[Skip to content](https://oxc.rs/docs/guide/usage/linter/config.html#VPContent)

On this page

Are you an LLM? You can read better optimized documentation at /docs/guide/usage/linter/config.md for this page in Markdown format

# Configuration [​](https://oxc.rs/docs/guide/usage/linter/config.html#configuration)

Oxlint works out of the box, but most teams commit a configuration file (`.oxlintrc.json` or `oxlint.config.ts`) to keep linting consistent across local runs, editors, and CI.

This page focuses on project configuration: rules, categories, plugins, overrides, and shared settings.

## Create a config file [​](https://oxc.rs/docs/guide/usage/linter/config.html#create-a-config-file)

To generate a starter config in the current directory (JSON):

sh

```
oxlint --init
```

Oxlint automatically looks for a `.oxlintrc.json`, `.oxlintrc.jsonc`, `oxlint.config.ts`, or `oxlint.config.mts` in the current working directory. You can also pass a config explicitly (note that this will disable nested config lookup):

sh

```
oxlint -c ./.oxlintrc.json
# or
oxlint --config ./.oxlintrc.json
```

Notes:

- `.oxlintrc.json` supports comments (like jsonc).
- The configuration format aims to be compatible with ESLint v8's format (`eslintrc.json`).
- You can use only one config file per directory: JSON and TypeScript configs cannot coexist, nor can `oxlint.config.ts` and `oxlint.config.mts`.

A minimal configuration looks like this:

.oxlintrc.json

json

```
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "categories": {
    "correctness": "warn"
  },
  "rules": {
    "eslint/no-unused-vars": "error"
  }
}
```

### TypeScript config file (`oxlint.config.ts`) [​](https://oxc.rs/docs/guide/usage/linter/config.html#typescript-config-file-oxlint-config-ts)

Oxlint also supports a TypeScript configuration file named `oxlint.config.ts` or `oxlint.config.mts`.

oxlint.config.ts

ts

```
import { defineConfig } from "oxlint";

export default defineConfig({
  categories: {
    correctness: "warn",
  },
  rules: {
    "eslint/no-unused-vars": "error",
  },
});
```

Notes:

- For auto-discovery, the file must be named `oxlint.config.ts` or `oxlint.config.mts`. When passed via `--config`, any path with a JS/TS extension (`.js`, `.mjs`, `.cjs`, `.ts`, `.mts`, `.cts`) is accepted.
- The default export must be an object and should be wrapped with `defineConfig` for typing.
- TypeScript configs require the Node-based `oxlint` package (JS runtime). If you're using a standalone binary, use `.oxlintrc.json` instead.
- TypeScript configs require a Node runtime that can execute TypeScript (Node v22.18+ or v24+).

## Configuration file format [​](https://oxc.rs/docs/guide/usage/linter/config.html#configuration-file-format)

A configuration file is either a JSON object (`.oxlintrc.json`) or a TypeScript module that default-exports a config object (`oxlint.config.ts`). The most common top-level fields are:

- `rules`: Enable or disable rules, set severity, and configure rule options.
- `categories`: Enable groups of rules with similar intent.
- `plugins`: Enable built-in plugins that provide additional rules.
- `jsPlugins`: Configure JavaScript plugins (alpha).
- `overrides`: Apply different configuration to different file patterns.
- `extends`: Inherit configuration from other files.
- `ignorePatterns`: Ignore additional files from the config file.
- `env`: Enable predefined globals for common environments.
- `globals`: Declare custom globals as read-only or writable.
- `settings`: Plugin-wide configuration shared by multiple rules.
- `options`: Linter-level options (for example, `options.typeAware` and `options.typeCheck`).

For a complete list of fields, see the [Config file reference](https://oxc.rs/docs/guide/usage/linter/config-file-reference.html).

## Configure linter options [​](https://oxc.rs/docs/guide/usage/linter/config.html#configure-linter-options)

Use `options` for linter-level behavior. See the [Config file reference](https://oxc.rs/docs/guide/usage/linter/config-file-reference.html#options) for the full list.

Example:

.oxlintrc.jsonoxlint.config.ts

json

```
{
  "options": {
    "typeAware": true,
    "typeCheck": true,
    "maxWarnings": 10
  }
}
```

ts

```
import { defineConfig } from "oxlint";

export default defineConfig({
  options: {
    typeAware: true,
    typeCheck: true,
    maxWarnings: 10,
  },
});
```

- `options.typeAware` is equivalent to passing `--type-aware` on the CLI.
- `options.typeCheck` (experimental) is equivalent to passing `--type-check` on the CLI.
- `options.maxWarnings` is equivalent to passing `--max-warnings` on the CLI.

CLI flags take precedence when both CLI and config values are present.

`options.typeAware` and `options.typeCheck` are only supported in the root config file.

## Configure rules [​](https://oxc.rs/docs/guide/usage/linter/config.html#configure-rules)

Rules are configured under `rules`.

A rule value is either:

- a severity (`"off"`, `"warn"`, `"error"`), or
- an array of `[severity, options]`

If a rule is from ESLint core and its name is unique, you can configure it without a plugin prefix. For example, `no-console` is the same as `eslint/no-console`.

.oxlintrc.jsonoxlint.config.ts

json

```
{
  "rules": {
    "no-alert": "error",
    "oxc/approx-constant": "warn",
    "no-plusplus": "off",
    "eslint/prefer-const": ["error", { "destructuring": "any" }]
  }
}
```

ts

```
import { defineConfig } from "oxlint";

export default defineConfig({
  rules: {
    "no-alert": "error",
    "oxc/approx-constant": "warn",
    "no-plusplus": "off",
    "eslint/prefer-const": ["error", { destructuring: "any" }],
  },
});
```

### Severity values [​](https://oxc.rs/docs/guide/usage/linter/config.html#severity-values)

Oxlint accepts ESLint-style severities:

- Disable rule: `"off"` or `"allow"`
- Warning on rule: `"warn"`
- Error on rule: `"error"` or `"deny"`

### Rule options [​](https://oxc.rs/docs/guide/usage/linter/config.html#rule-options)

To configure rule options, use an array:

.oxlintrc.jsonoxlint.config.ts

json

```
{
  "rules": {
    "no-plusplus": ["error", { "allowForLoopAfterthoughts": true }]
  }
}
```

ts

```
import { defineConfig } from "oxlint";

export default defineConfig({
  rules: {
    "no-plusplus": ["error", { allowForLoopAfterthoughts: true }],
  },
});
```

All available rules, and their configuration options, are listed in the [Rules reference](https://oxc.rs/docs/guide/usage/linter/rules.html).

### Override severity from the CLI [​](https://oxc.rs/docs/guide/usage/linter/config.html#override-severity-from-the-cli)

For quick experiments, you can adjust severity from the command line using:

- `-A` / `--allow`
- `-W` / `--warn`
- `-D` / `--deny`

Arguments are applied from left to right:

sh

```
oxlint -D no-alert -W oxc/approx-constant -A no-plusplus
```

## Enable groups of rules with categories [​](https://oxc.rs/docs/guide/usage/linter/config.html#enable-groups-of-rules-with-categories)

Categories let you enable or disable sets of rules with similar intent. By default, Oxlint enables rules in the `correctness` category.

Configure categories using `categories`:

.oxlintrc.jsonoxlint.config.ts

json

```
{
  "categories": {
    "correctness": "error",
    "suspicious": "warn",
    "pedantic": "off"
  }
}
```

ts

```
import { defineConfig } from "oxlint";

export default defineConfig({
  categories: {
    correctness: "error",
    suspicious: "warn",
    pedantic: "off",
  },
});
```

Available categories include:

- `correctness`: Code that is definitely wrong or useless
- `suspicious`: Code that is likely to be wrong or useless
- `pedantic`: Extra strict rules that may have false positives
- `perf`: Rules that aim to improve runtime performance
- `style`: Idiomatic and consistent style rules
- `restriction`: Rules that ban specific patterns or features
- `nursery`: Rules under development that may change

You can also change categories from the CLI with the same `-A`, `-W`, and `-D` options:

sh

```
oxlint -D correctness -D suspicious
```

## Configure plugins [​](https://oxc.rs/docs/guide/usage/linter/config.html#configure-plugins)

Plugins extend the set of available rules.

Oxlint supports many popular plugins natively in Rust. This provides broad rule coverage without a large JavaScript dependency tree. See [Native Plugins](https://oxc.rs/docs/guide/usage/linter/plugins.html).

Configure plugins using `plugins`. Setting `plugins` overwrites the default plugin set, so the array should include everything you want enabled:

.oxlintrc.jsonoxlint.config.ts

json

```
{
  "plugins": ["unicorn", "typescript", "oxc"]
}
```

ts

```
import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["unicorn", "typescript", "oxc"],
});
```

To disable all default plugins:

.oxlintrc.jsonoxlint.config.ts

json

```
{
  "plugins": []
}
```

ts

```
import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: [],
});
```

For plugin details and CLI flags such as `--import-plugin`, see [Native Plugins](https://oxc.rs/docs/guide/usage/linter/plugins.html).

## Configure JS plugins (alpha) [​](https://oxc.rs/docs/guide/usage/linter/config.html#configure-js-plugins-alpha)

Oxlint also supports JavaScript plugins via `jsPlugins`. This is intended for compatibility with existing ESLint plugins and advanced integrations.

Notes:

- JS plugins are in alpha and not subject to semver.

JS plugins can be declared as strings, or as objects with an alias:

.oxlintrc.jsonoxlint.config.ts

json

```
{
  "jsPlugins": [\
    "eslint-plugin-playwright",\
    { "name": "my-eslint-react", "specifier": "eslint-plugin-react" }\
  ]
}
```

ts

```
import { defineConfig } from "oxlint";

export default defineConfig({
  jsPlugins: [\
    "eslint-plugin-playwright",\
    { name: "my-eslint-react", specifier: "eslint-plugin-react" },\
  ],
});
```

Some plugin names are reserved because they are implemented natively in Rust (for example `react`, `unicorn`, `typescript`, `oxc`, `import`, `jest`, `vitest`, `jsx-a11y`, `nextjs`). If you need the JavaScript version of a reserved plugin, give it a custom `name` to avoid conflicts.

For details, see [JS plugins](https://oxc.rs/docs/guide/usage/linter/js-plugins.html).

## Apply configuration by file pattern [​](https://oxc.rs/docs/guide/usage/linter/config.html#apply-configuration-by-file-pattern)

Use `overrides` to apply different configuration to different files, such as tests, scripts, or TypeScript-only paths.

`overrides` is an array of objects. Each override can include:

- `files`: glob patterns
- `rules`: rule configuration (same shape as top-level `rules`)
- `env`: environment configuration (same shape as top-level `env`)
- `globals`: globals configuration (same shape as top-level `globals`)
- `plugins`: optionally change what plugins are enabled for this override
- `jsPlugins`: JS plugins for this override (alpha)

Example:

.oxlintrc.jsonoxlint.config.ts

json

```
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "rules": {
    "no-console": "error"
  },
  "overrides": [\
    {\
      "files": ["scripts/*.js"],\
      "rules": {\
        "no-console": "off"\
      }\
    },\
    {\
      "files": ["**/*.{ts,tsx}"],\
      "plugins": ["typescript"],\
      "rules": {\
        "typescript/no-explicit-any": "error"\
      }\
    },\
    {\
      "files": ["**/test/**"],\
      "plugins": ["jest"],\
      "env": {\
        "jest": true\
      },\
      "rules": {\
        "jest/no-disabled-tests": "off"\
      }\
    }\
  ]
}
```

ts

```
import { defineConfig } from "oxlint";

export default defineConfig({
  rules: {
    "no-console": "error",
  },
  overrides: [\
    {\
      files: ["scripts/*.js"],\
      rules: {\
        "no-console": "off",\
      },\
    },\
    {\
      files: ["**/*.{ts,tsx}"],\
      plugins: ["typescript"],\
      rules: {\
        "typescript/no-explicit-any": "error",\
      },\
    },\
    {\
      files: ["**/test/**"],\
      plugins: ["jest"],\
      env: {\
        jest: true,\
      },\
      rules: {\
        "jest/no-disabled-tests": "off",\
      },\
    },\
  ],
});
```

## Extend shared configs [​](https://oxc.rs/docs/guide/usage/linter/config.html#extend-shared-configs)

Use `extends` to inherit from other configuration files.

Paths in `extends` are resolved relative to the configuration file that declares `extends`. Configs are merged from first to last, with later entries overriding earlier ones.

Use `oxlint.config.ts` when extending config objects imported from a shared package. Package imports are not supported in the `.oxlintrc.json` format.

.oxlintrc.jsonoxlint.config.ts

json

```
{
  "extends": ["./configs/base.json", "./configs/frontend.json"]
}
```

ts

```
import baseConfig from "./configs/base.ts";
import frontendConfig from "./configs/frontend.ts";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [baseConfig, frontendConfig],
});
```

For example, a shared package can export a config object that you import and extend:

oxlint.config.ts

ts

```
import config from "@example-org/oxlint-config";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [config],
});
```

## Configure environments and globals [​](https://oxc.rs/docs/guide/usage/linter/config.html#configure-environments-and-globals)

Use `env` to enable predefined globals for common environments such as browser or node.

Use `globals` to declare project-specific globals, mark them writable or readonly, or disable a global that would otherwise be present.

.oxlintrc.jsonoxlint.config.ts

json

```
{
  "env": {
    "es6": true
  },
  "globals": {
    "MY_GLOBAL": "readonly",
    "Promise": "off"
  }
}
```

ts

```
import { defineConfig } from "oxlint";

export default defineConfig({
  env: {
    es6: true,
  },
  globals: {
    MY_GLOBAL: "readonly",
    Promise: "off",
  },
});
```

`globals` accepts:

- `"readonly"` or `"readable"` or `false`
- `"writable"` or `"writeable"` or `true`
- `"off"` to disable a global

## Plugin settings [​](https://oxc.rs/docs/guide/usage/linter/config.html#plugin-settings)

Use `settings` for plugin-wide configuration shared by multiple rules.

Example (monorepo + React + jsx-a11y):

.oxlintrc.jsonoxlint.config.ts

json

```
{
  "settings": {
    "next": {
      "rootDir": "apps/dashboard/"
    },
    "react": {
      "linkComponents": [{ "name": "Link", "linkAttribute": "to" }]
    },
    "jsx-a11y": {
      "components": {
        "Link": "a",
        "Button": "button"
      }
    }
  }
}
```

ts

```
import { defineConfig } from "oxlint";

export default defineConfig({
  settings: {
    next: {
      rootDir: "apps/dashboard/",
    },
    react: {
      linkComponents: [{ name: "Link", linkAttribute: "to" }],
    },
    "jsx-a11y": {
      components: {
        Link: "a",
        Button: "button",
      },
    },
  },
});
```

## Next steps [​](https://oxc.rs/docs/guide/usage/linter/config.html#next-steps)

- [Ignore files](https://oxc.rs/docs/guide/usage/linter/ignore-files.html): Ignore files and patterns, `.gitignore` and `.eslintignore` workflows, and symlink behavior.
- [Inline ignore comments](https://oxc.rs/docs/guide/usage/linter/ignore-comments.html): Inline suppressions and scoped exceptions.
- [Nested configs](https://oxc.rs/docs/guide/usage/linter/nested-config.html): Monorepos and per-package configuration.
- [Config file reference](https://oxc.rs/docs/guide/usage/linter/config-file-reference.html): Full schema and field documentation.
- [CLI reference](https://oxc.rs/docs/guide/usage/linter/cli.html): Complete list of flags and output formats.