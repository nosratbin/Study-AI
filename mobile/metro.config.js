const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

module.exports = withNativewind(config, {
  // inline variables break light-dark()/PlatformColor in CSS variables
  inlineVariables: false,
  // rem = 16 so Tailwind spacing is a true 4 px grid (react-native-css defaults to 14).
  inlineRem: 16,
  // className support is added explicitly through src/tw
  globalClassNamePolyfill: false,
});
