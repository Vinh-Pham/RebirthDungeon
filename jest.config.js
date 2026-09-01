/**
 * Two Jest projects:
 *  - "unit": pure TypeScript tests (core/domain/application/data) run in a
 *    plain Node environment via jest-expo/node — no React Native is loaded.
 *  - "ui": component and store tests run under the full jest-expo preset.
 */
module.exports = {
  moduleNameMapper: {
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  projects: [
    {
      displayName: 'unit',
      preset: 'jest-expo/node',
      testMatch: [
        '<rootDir>/__tests__/{core,domain,application,data}/**/*.test.[jt]s?(x)',
      ],
    },
    {
      displayName: 'ui',
      preset: 'jest-expo',
      testMatch: [
        '<rootDir>/__tests__/{app,game,presentation,stores}/**/*.test.[jt]s?(x)',
      ],
      transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg)',
      ],
    },
  ],
};
