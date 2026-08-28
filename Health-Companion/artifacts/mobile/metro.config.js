const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Prevent Metro from watching openid-client's temp directory (causes ENOENT crash)
config.resolver.blockList = [/\.cache\/openid-client\/.*/];

module.exports = config;
