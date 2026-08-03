const { getDefaultConfig } = require("expo/metro-config");
const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const path = require("path");

const config = getSentryExpoConfig(__dirname, { getDefaultConfig });

if (!config.resolver.assetExts.includes("ogg")) {
  config.resolver.assetExts.push("ogg");
}

// Codex/agent control mounts can be briefly replaced by the host environment.
// Metro must not watch them or its fallback watcher may terminate with ENOENT.
config.resolver.blockList = [
  /(^|[/\\])\.codex([/\\]|$)/,
  /(^|[/\\])\.agents([/\\]|$)/,
];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "ws") {
    return {
      filePath: path.resolve(__dirname, "shims/ws.js"),
      type: "sourceFile",
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
