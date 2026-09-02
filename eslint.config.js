const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

// ---------------------------------------------------------------------------
// Layer boundaries for the ECS/rot-js/Effect architecture (dependency
// direction points inward):
//
//   app → presentation → stores → application → game (simulation) → domain → core
//   data implements application/domain ports (Expo SDK allowed there)
//
// - `src/game` is the pure ECS + rot-js game simulation. Its only library
//   dependencies are `@esengine/ecs-framework` and `rot-js`; rot-js is reached
//   only through the project-owned adapters in `src/game/rot`. It must never
//   import React, React Native, Expo, Zustand, SQLite, Skia, Reanimated,
//   Effect, or provider SDKs.
// - Effect runs fallible and asynchronous work at the application boundary:
//   `src/core`, `src/domain`, and `src/game` never import it.
// - Presentation consumes immutable snapshots and pure helpers from
//   `src/game`; it never touches `@esengine/ecs-framework` or `rot-js`
//   directly. The full policy is documented in README.md → "Architecture".
// ---------------------------------------------------------------------------

const uiStack = [
  'react',
  'react-dom',
  'react-native',
  'react-native-*',
  'expo',
  'expo-*',
  '@expo/*',
];
const rendererStack = [
  '@shopify/react-native-skia',
  'react-native-reanimated',
  'react-native-worklets',
];
const appStateStack = ['zustand'];
const effectStack = ['effect', '@effect/*'];
const simLibraries = ['@esengine/ecs-framework', 'rot-js'];
const testTooling = ['@testing-library/*'];
const aliases = (layers) => layers.map((layer) => `@/${layer}`);

const forbidden = (patterns, message) => ({
  'no-restricted-imports': [
    'error',
    { patterns: [{ group: patterns, message }] },
  ],
});

const inwardOnly = (message, ...groups) => forbidden(groups.flat(), message);

module.exports = defineConfig([
  globalIgnores(['dist/*', 'node_modules/*', '.expo/*', 'ios/*', 'android/*']),
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    // Innermost layer: framework-free utilities (not even Effect).
    files: ['src/core/**/*.ts', 'src/core/**/*.tsx'],
    rules: inwardOnly(
      'src/core is the innermost pure-TypeScript layer and must not import UI, native, state, Effect, ECS/rot-js, or outer layers.',
      uiStack,
      rendererStack,
      appStateStack,
      effectStack,
      simLibraries,
      testTooling,
      aliases([
        'domain',
        'game',
        'application',
        'data',
        'stores',
        'presentation',
        'app',
      ]),
    ),
  },
  {
    // Pure game rules and content models (no Effect, no ECS, no rot-js).
    files: ['src/domain/**/*.ts', 'src/domain/**/*.tsx'],
    rules: inwardOnly(
      'src/domain must stay pure TypeScript: no React, React Native, Expo, Skia, Reanimated, Zustand, Effect, ECS/rot-js, or outer layers.',
      uiStack,
      rendererStack,
      appStateStack,
      effectStack,
      simLibraries,
      testTooling,
      aliases(['game', 'application', 'data', 'stores', 'presentation', 'app']),
    ),
  },
  {
    // The ECS/rot-js simulation: @esengine/ecs-framework is allowed here (and
    // only here), while rot-js is reserved for the adapters in src/game/rot.
    files: ['src/game/**/*.ts', 'src/game/**/*.tsx'],
    rules: inwardOnly(
      'src/game is the pure simulation: no React, React Native, Expo, Zustand, Skia, Reanimated, Effect, or outer layers; import rot-js only inside src/game/rot adapters.',
      uiStack,
      rendererStack,
      appStateStack,
      effectStack,
      testTooling,
      ['rot-js'],
      aliases(['application', 'data', 'stores', 'presentation', 'app']),
    ),
  },
  {
    // rot-js adapter home: the only place rot-js may be imported. Declared
    // after the src/game zone so it overrides it for these files.
    files: ['src/game/rot/**/*.ts'],
    rules: inwardOnly(
      'src/game/rot adapts rot-js for the simulation: no React, React Native, Expo, Zustand, Skia, Reanimated, Effect, or outer layers.',
      uiStack,
      rendererStack,
      appStateStack,
      effectStack,
      testTooling,
      aliases(['application', 'data', 'stores', 'presentation', 'app']),
    ),
  },
  {
    // Pure use-case controllers and Effect services; they may drive the
    // simulation, domain, and core but never touch UI, native, or state.
    files: ['src/application/**/*.ts', 'src/application/**/*.tsx'],
    rules: inwardOnly(
      'src/application orchestrates the simulation through Effect and must not import UI, native, state, ECS/rot-js, or outer layers.',
      uiStack,
      rendererStack,
      appStateStack,
      testTooling,
      simLibraries,
      aliases(['data', 'stores', 'presentation', 'app']),
    ),
  },
  {
    // Storage, repositories, and adapters. Expo SDK and Effect allowed; no UI
    // or renderer.
    files: ['src/data/**/*.ts', 'src/data/**/*.tsx'],
    rules: inwardOnly(
      'src/data implements application/domain ports and must not import UI, renderer, state, ECS/rot-js, or route code.',
      ['react', 'react-dom'],
      rendererStack,
      appStateStack,
      testTooling,
      simLibraries,
      aliases(['stores', 'game', 'presentation', 'app']),
    ),
  },
  {
    // Zustand stores orchestrate application programs; no renderer, data, or
    // simulation access.
    files: ['src/stores/**/*.ts', 'src/stores/**/*.tsx'],
    rules: inwardOnly(
      'src/stores must not import renderer, data, simulation, presentation, or route code; wire dependencies through bootstrap instead.',
      rendererStack,
      testTooling,
      simLibraries,
      aliases(['data', 'game', 'presentation', 'app']),
    ),
  },
  {
    // React Native UI plus the Skia/Reanimated canvas. Consumes immutable
    // snapshots via stores/application; never the ECS or rot-js directly, and
    // never Effect programs.
    files: ['src/presentation/**/*.ts', 'src/presentation/**/*.tsx'],
    rules: inwardOnly(
      'src/presentation consumes immutable snapshots via stores/application and must not import data, routes, Effect, or the ECS/rot-js libraries directly.',
      effectStack,
      testTooling,
      simLibraries,
      aliases(['data', 'app']),
    ),
  },
  {
    // Presentation shared values are intentionally mutable Reanimated state.
    // The React Compiler immutability rule cannot model `.value` writes on
    // shared values, so this one hook file is exempted.
    files: ['src/presentation/canvas/use-spike-presentation.ts'],
    rules: {
      'react-hooks/immutability': 'off',
    },
  },
]);
