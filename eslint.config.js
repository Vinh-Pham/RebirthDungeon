const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

// ---------------------------------------------------------------------------
// Layer boundaries (dependency direction points inward)
//
//   app → presentation → stores/game → application → domain → core
//   data → application → domain → core
//
// core/domain/application are pure TypeScript: no React, React Native, Expo,
// Skia, Reanimated, or Zustand. The automated checks below encode this policy;
// the full rules are documented in README.md → "Architecture".
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
    // Innermost layer: framework-free utilities.
    files: ['src/core/**/*.ts', 'src/core/**/*.tsx'],
    rules: inwardOnly(
      'src/core is the innermost pure-TypeScript layer and must not import UI, native, state, or outer layers.',
      uiStack,
      rendererStack,
      appStateStack,
      testTooling,
      aliases([
        'domain',
        'application',
        'data',
        'stores',
        'game',
        'presentation',
        'app',
      ]),
    ),
  },
  {
    // Pure game rules and engines.
    files: ['src/domain/**/*.ts', 'src/domain/**/*.tsx'],
    rules: inwardOnly(
      'src/domain must stay pure TypeScript: no React, React Native, Expo, Skia, Reanimated, Zustand, or outer layers.',
      uiStack,
      rendererStack,
      appStateStack,
      testTooling,
      aliases(['application', 'data', 'stores', 'game', 'presentation', 'app']),
    ),
  },
  {
    // Pure use-case controllers; they may depend on domain and core only.
    files: ['src/application/**/*.ts', 'src/application/**/*.tsx'],
    rules: inwardOnly(
      'src/application orchestrates domain code and must not import UI, native, state, or outer layers.',
      uiStack,
      rendererStack,
      appStateStack,
      testTooling,
      aliases(['data', 'stores', 'game', 'presentation', 'app']),
    ),
  },
  {
    // Storage, repositories, and adapters. Expo SDK allowed; no UI or renderer.
    files: ['src/data/**/*.ts', 'src/data/**/*.tsx'],
    rules: inwardOnly(
      'src/data implements application/domain interfaces and must not import UI, renderer, state, or route code.',
      ['react', 'react-dom'],
      rendererStack,
      appStateStack,
      aliases(['stores', 'game', 'presentation', 'app']),
    ),
  },
  {
    // Zustand stores orchestrate application controllers; no renderer code.
    files: ['src/stores/**/*.ts', 'src/stores/**/*.tsx'],
    rules: inwardOnly(
      'src/stores must not import renderer, data, presentation, or route code; wire dependencies through bootstrap instead.',
      rendererStack,
      aliases(['data', 'game', 'presentation', 'app']),
    ),
  },
  {
    // Skia/Reanimated renderer consumes immutable snapshots; no app state.
    files: ['src/game/**/*.ts', 'src/game/**/*.tsx'],
    rules: inwardOnly(
      'src/game renders immutable scene snapshots and must not import app state, data, presentation, or route code.',
      appStateStack,
      aliases(['data', 'stores', 'presentation', 'app']),
    ),
  },
  {
    // React Native screens and components; go through stores/application.
    files: ['src/presentation/**/*.ts', 'src/presentation/**/*.tsx'],
    rules: inwardOnly(
      'src/presentation must reach data through stores/application and must not import route files.',
      aliases(['data', 'app']),
    ),
  },
]);
