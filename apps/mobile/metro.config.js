// Metro config for use inside the bun monorepo.
// Lets Metro resolve hoisted deps at the repo root and watch shared packages.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

// Monorepo + hoisted expo-router: pin the app root so babel-preset-expo inlines
// it into expo-router/_ctx.*.js. Without this, in some launch dirs the env var
// is unset → `require.context(undefined)` throws at runtime in Expo Go.
process.env.EXPO_ROUTER_APP_ROOT = path.resolve(projectRoot, 'app');

const config = getDefaultConfig(projectRoot);

// Watch ONLY what the app needs (its own dir auto + @shaiz/shared + hoisted deps).
// NOT the whole monorepo root — that follows the bun @shaiz/web|api symlinks into
// apps/web/.next, data/, logs that the running `bun run mira` stack rewrites
// constantly, which made Metro rebuild in an endless "Refreshing…" loop.
config.watchFolders = [
  path.resolve(monorepoRoot, 'packages'),
  path.resolve(monorepoRoot, 'node_modules'),
];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];
// Belt-and-suspenders: keep noisy build outputs out of Metro's file map.
config.resolver.blockList = [
  /\/apps\/web\/.*/,
  /\/apps\/api\/.*/,
  /\/\.next\/.*/,
  /\/\.vercel\/.*/,
  /\/\.git\/.*/,
  /\/data\/.*/,
];

module.exports = config;
