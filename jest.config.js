/**
 * Two Jest projects:
 *  - "unit": pure TypeScript tests (core/domain/application/data/game) run in
 *    a plain Node environment via jest-expo/node — no React Native is loaded.
 *  - "ui": component and store tests run under the full jest-expo preset.
 *
 * The moduleNameMapper is set per-project (project config overrides the
 * presets' own tsconfig-derived mapping) so `@/assets/*` resolves outside
 * `src/`.
 */
const moduleNameMapper = {
  '^@/assets/(.*)$': '<rootDir>/assets/$1',
  '^@/(.*)$': '<rootDir>/src/$1',
};

module.exports = {
  projects: [
    {
      displayName: 'unit',
      preset: 'jest-expo/node',
      moduleNameMapper,
      testMatch: [
        '<rootDir>/__tests__/{core,domain,application,data,game}/**/*.test.[jt]s?(x)',
      ],
    },
    {
      displayName: 'ui',
      preset: 'jest-expo',
      moduleNameMapper,
      testMatch: [
        '<rootDir>/__tests__/{app,presentation,stores}/**/*.test.[jt]s?(x)',
      ],
      transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg)',
      ],
    },
  ],
};
