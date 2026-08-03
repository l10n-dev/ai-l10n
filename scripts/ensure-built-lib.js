#!/usr/bin/env node

/**
 * Shared helper: make sure a workspace dependency has been built before the
 * dependent package is compiled.
 *
 * npm does not order workspace `prepare` scripts topologically, so on a plain
 * `npm install` a package can be built before the workspace packages it imports.
 * Because workspace deps are symlinks into the repo, TypeScript then resolves
 * their `types`/`exports` entries to files that do not exist yet and reports
 * confusing errors — or, for a package with no declarations at all, aborts the
 * whole install.
 *
 * Building the dependency on demand makes the order irrelevant. The dependency
 * graph here is acyclic (core <- sdk <- mcp/cli), so this cannot recurse.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

module.exports = function ensureBuilt({ name, dir, dependent, required }) {
  const targets = required.map((rel) => path.join(dir, rel));

  if (targets.every((f) => fs.existsSync(f))) return;

  if (!fs.existsSync(dir)) {
    console.error(
      `❌ ${name} sources not found at ${dir}.\n` +
        `   ${dependent} requires that workspace to be present.`,
    );
    process.exit(1);
  }

  console.log(`ℹ️  ${name} is not built yet — building it first...\n`);

  // Passed as a single command string rather than (command, args[]): on Windows
  // npm is a .cmd shim, which Node refuses to spawn without a shell, and
  // `shell: true` combined with an args array is deprecated (DEP0190).
  const result = spawnSync('npm run build', {
    cwd: dir,
    stdio: 'inherit',
    shell: true,
  });

  if (result.status !== 0) {
    console.error(
      `\n❌ Failed to build ${name}.\n` +
        `   ${dependent} cannot be compiled until it succeeds.`,
    );
    process.exit(1);
  }

  const stillMissing = targets.filter((f) => !fs.existsSync(f));
  if (stillMissing.length > 0) {
    console.error(
      `\n❌ ${name} built but expected outputs are missing:\n` +
        stillMissing.map((f) => `   - ${f}`).join('\n'),
    );
    process.exit(1);
  }

  console.log(`\n✅ ${name} is built — continuing with the ${dependent} build.\n`);
};
