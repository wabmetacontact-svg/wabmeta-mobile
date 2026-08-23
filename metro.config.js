const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Web ke liye worklets fix
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "react-native-worklets" && platform === "web") {
    return { type: "empty" };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
