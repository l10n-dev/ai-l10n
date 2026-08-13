#!/usr/bin/env node

/**
 * Build every workspace in dependency order: core <- sdk <- mcp, then the CLI.
 *
 * This runs from the root package's `prepare`, which is the only build hook left
 * on the install path. The workspaces themselves build from `prepack` (publish
 * and `npm pack`) rather than `prepare` (install) on purpose:
 *
 * npm runs workspace `prepare` scripts concurrently during `npm install`. Each
 * package's build starts with `clean`, which deletes its `dist` — so core could
 * wipe `core/dist` while the SDK's tsc was resolving `ai-l10n-core` through the
 * workspace symlink. Because `skipLibCheck` hides the resulting errors inside
 * core's emitted `.d.ts` files, the failure surfaced as a wall of misleading
 * "Module 'ai-l10n-core' has no exported member ..." errors in SDK sources.
 * Serialising the builds here removes the overlap; the per-package
 * `ensure-*-built.js` guards still cover anyone building a package directly.
 *
 * CI is unaffected: it installs with `--ignore-scripts` and builds each
 * workspace explicitly, in this same order.
 */

const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');

// The root package builds last: its `prebuild` guard expects a built SDK.
const steps = [
  ['ai-l10n-core', 'npm run build -w ai-l10n-core'],
  ['ai-l10n-sdk', 'npm run build -w ai-l10n-sdk'],
  ['ai-l10n-mcp', 'npm run build -w ai-l10n-mcp'],
  ['ai-l10n (CLI)', 'npm run build'],
];

for (const [name, command] of steps) {
  // A single command string rather than (command, args[]): on Windows npm is a
  // .cmd shim, which Node refuses to spawn without a shell, and `shell: true`
  // combined with an args array is deprecated (DEP0190).
  const result = spawnSync(command, { cwd: root, stdio: 'inherit', shell: true });

  if (result.status !== 0) {
    console.error(`\n❌ Failed to build ${name}.`);
    process.exit(result.status === null ? 1 : result.status);
  }
}
