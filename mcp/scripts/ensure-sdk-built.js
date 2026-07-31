#!/usr/bin/env node

/**
 * Guard: ai-l10n-mcp cannot compile unless ai-l10n-sdk has been built.
 *
 * `node_modules/ai-l10n-sdk` is an npm workspace symlink to ../sdk, so without
 * a build there are no declarations to resolve and tsc fails with
 * "Cannot find module 'ai-l10n-sdk' or its corresponding type declarations".
 *
 * npm does not run workspace `prepare` scripts in dependency order, so a plain
 * `npm install` at the repo root can start this build first and abort the whole
 * install. Building the dependency on demand makes the order irrelevant; the
 * SDK's own guard then does the same for ai-l10n-core.
 */

const path = require('path');
const ensureBuilt = require('./ensure-built-lib.js');

ensureBuilt({
  name: 'ai-l10n-sdk',
  dir: path.resolve(__dirname, '..', '..', 'sdk'),
  dependent: 'ai-l10n-mcp',
  required: ['dist/cjs/index.d.ts', 'dist/esm/index.d.ts'],
});
