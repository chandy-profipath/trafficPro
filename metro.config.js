const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Ensure Metro can resolve ESM/mjs files
config.resolver.sourceExts = [...(config.resolver.sourceExts || []), 'mjs'];

// Add alias for @supabase/node-fetch to prevent dynamic import issues
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@supabase/node-fetch': path.resolve(__dirname, 'shims', 'node-fetch.js'),
  '@supabase/phoenix': path.resolve(__dirname, 'libs', 'supabasePhoenixShim.js'),
};

// Clear Metro transform cache on each build
config.resetCache = true;

// Ensure Metro watches our libs folder for shims
config.watchFolders = [...(config.watchFolders || []), path.resolve(__dirname, 'libs')];

module.exports = config;
