#!/usr/bin/env node

/**
 * Guard: ai-l10n-sdk cannot compile unless ai-l10n-core has been built.
 *
 * `node_modules/ai-l10n-core` is an npm workspace symlink to ../core, so
 * TypeScript resolves the SDK's `import ... from "ai-l10n-core"` through core's
 * package.json `exports`/`types` — which point into core/dist. If core has not
 * been built, those paths do not exist and tsc reports a wall of misleading
 * "has no exported member" errors instead of the real cause.
 *
 * npm does not run workspace `prepare` scripts in dependency order, so a plain
 * `npm install` at the repo root can start this build before core's. Building
 * the dependency on demand makes the order irrelevant. Core does not depend on
 * the SDK, so this cannot recurse.
 */

const path = require('path');
const ensureBuilt = require('./ensure-built-lib.js');

ensureBuilt({
  name: 'ai-l10n-core',
  dir: path.resolve(__dirname, '..', '..', 'core'),
  dependent: 'ai-l10n-sdk',
  // The CommonJS pass resolves core's `require` types condition, the ESM pass
  // resolves its `import` condition — both trees must exist.
  required: ['dist/cjs/index.d.ts', 'dist/esm/index.d.ts'],
});
