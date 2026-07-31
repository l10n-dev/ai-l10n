#!/usr/bin/env node

/**
 * Writes the package.json "type" markers into the dual build output.
 *
 * The build emits two trees from the same sources:
 *   dist/cjs -> CommonJS  (needs { "type": "commonjs" })
 *   dist/esm -> ESM       (needs { "type": "module"   })
 *
 * Node resolves the module format of a .js file from the *nearest* package.json,
 * so without these markers every file would inherit the package's own (absent)
 * "type" field and be loaded as CommonJS — including the ESM build.
 */

const fs = require('fs');
const path = require('path');

const markers = [
  ['dist/cjs', 'commonjs'],
  ['dist/esm', 'module'],
];

for (const [dir, type] of markers) {
  const target = path.join(process.cwd(), dir);

  if (!fs.existsSync(target)) {
    console.error(`❌ ${dir}/ not found — run the TypeScript build first.`);
    process.exit(1);
  }

  const file = path.join(target, 'package.json');
  fs.writeFileSync(file, JSON.stringify({ type }, null, 2) + '\n');
  console.log(`✅ ${dir}/package.json -> { "type": "${type}" }`);
}
