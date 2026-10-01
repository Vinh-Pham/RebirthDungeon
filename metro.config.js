const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

const config = withUniwindConfig(getDefaultConfig(__dirname), {
  cssEntryFile: './src/global.css',
  dtsFile: './src/uniwind-types.d.ts',
});

const resolveUniwind = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // HeroUI Pro beta.10 imports HeroText through a barrel that also evaluates
  // Skia chart fonts. Those fonts fail during SSR and use unsupported web APIs.
  // ProgressBar only needs HeroText; resolve that helper without the charts.
  if (platform === 'web'
    && context.originModulePath.endsWith('/heroui-native-pro/lib/module/components/progress-bar/progress-bar.js')
    && moduleName === '../../helpers/internal/components/index.js') {
    return resolveUniwind(context, '../../helpers/internal/components/hero-text.js', platform);
  }
  // Keep RN Web's barrel exports pointed at its own components. Wrapping those
  // imports creates a cycle when Uniwind reads the same exports during SSR.
  // Preserve the stylesheet adapter: it puts RN Web defaults below utilities.
  if (platform === 'web' && context.originModulePath.includes('/node_modules/react-native-web/')
    && !moduleName.includes('createOrderedCSSStyleSheet')) {
    return context.resolveRequest(context, moduleName, platform);
  }
  return resolveUniwind(context, moduleName, platform);
};

module.exports = config;
