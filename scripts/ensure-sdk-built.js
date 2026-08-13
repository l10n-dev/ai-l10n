#!/usr/bin/env node

/**
 * Guard: the ai-l10n CLI cannot compile unless ai-l10n-sdk has been built.
 *
 * `node_modules/ai-l10n-sdk` is an npm workspace symlink to ./sdk, so without a
 * build there are no declarations to resolve and tsc fails with
 * "Cannot find module 'ai-l10n-sdk' or its corresponding type declarations".
 *
 * Building the dependency on demand makes build order irrelevant, so `npm run
 * build` works on a fresh checkout; the SDK's own guard then does the same for
 * ai-l10n-core.
 */

const path = require('path');
const ensureBuilt = require('./ensure-built-lib.js');

ensureBuilt({
  name: 'ai-l10n-sdk',
  dir: path.resolve(__dirname, '..', 'sdk'),
  dependent: 'ai-l10n',
  required: ['dist/cjs/index.d.ts', 'dist/esm/index.d.ts'],
});
