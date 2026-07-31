#!/usr/bin/env node

/**
 * Verification script to check SDK package integrity
 */

const fs = require("fs");

console.log("🔍 Verifying ai-l10n-sdk package...\n");

const checks = [];

const read = (file) => fs.readFileSync(file, "utf8");

// Check 1: package.json exists
checks.push({
  name: "package.json exists",
  check: () => fs.existsSync("package.json"),
});

// Check 2: dual build directories exist
checks.push({
  name: "dist/cjs/ directory exists",
  check: () => fs.existsSync("dist/cjs"),
});
checks.push({
  name: "dist/esm/ directory exists",
  check: () => fs.existsSync("dist/esm"),
});

// Check 3: Entry points exist
checks.push({
  name: "CommonJS entry (dist/cjs/index.js) exists",
  check: () => fs.existsSync("dist/cjs/index.js"),
});
checks.push({
  name: "ESM entry (dist/esm/index.js) exists",
  check: () => fs.existsSync("dist/esm/index.js"),
});

// Check 4: Type definitions exist for both builds
checks.push({
  name: "CommonJS types (dist/cjs/index.d.ts) exist",
  check: () => fs.existsSync("dist/cjs/index.d.ts"),
});
checks.push({
  name: "ESM types (dist/esm/index.d.ts) exist",
  check: () => fs.existsSync("dist/esm/index.d.ts"),
});

// Check 5: README exists
checks.push({
  name: "README.md exists",
  check: () => fs.existsSync("README.md"),
});

// Check 6: LICENSE exists
checks.push({
  name: "LICENSE exists",
  check: () => fs.existsSync("LICENSE"),
});

// Check 7: CHANGELOG exists
checks.push({
  name: "CHANGELOG.md exists",
  check: () => fs.existsSync("CHANGELOG.md"),
});

// Check 8: All source files compiled into both trees
const sourceFiles = [
  "index",
  "apiKeyManager",
  "i18nProjectManager",
  "aiTranslator",
  "balanceManager",
];

["cjs", "esm"].forEach((flavor) => {
  sourceFiles.forEach((file) => {
    checks.push({
      name: `${flavor}/${file}.js compiled`,
      check: () => fs.existsSync(`dist/${flavor}/${file}.js`),
    });
    checks.push({
      name: `${flavor}/${file}.d.ts generated`,
      check: () => fs.existsSync(`dist/${flavor}/${file}.d.ts`),
    });
  });
});

// Check 9: Module format markers are correct
checks.push({
  name: 'dist/cjs/package.json declares "type": "commonjs"',
  check: () =>
    fs.existsSync("dist/cjs/package.json") &&
    JSON.parse(read("dist/cjs/package.json")).type === "commonjs",
});
checks.push({
  name: 'dist/esm/package.json declares "type": "module"',
  check: () =>
    fs.existsSync("dist/esm/package.json") &&
    JSON.parse(read("dist/esm/package.json")).type === "module",
});

// Check 10: Emitted code is actually in the expected module format.
// This is the check that catches a misconfigured tsconfig silently emitting
// CommonJS into dist/esm — the failure mode that makes bundlers report
// "Module 'ai-l10n-sdk' ... is not ESM".
checks.push({
  name: "ESM build uses export statements",
  check: () => /^\s*export\s/m.test(read("dist/esm/index.js")),
});
checks.push({
  name: "ESM build contains no require() calls",
  check: () => !/\brequire\s*\(/.test(read("dist/esm/index.js")),
});
checks.push({
  name: "CommonJS build uses require()",
  check: () => /\brequire\s*\(/.test(read("dist/cjs/index.js")),
});
checks.push({
  name: "CommonJS build contains no export statements",
  check: () => !/^\s*export\s/m.test(read("dist/cjs/index.js")),
});

// Check 11: exports map is wired to the built files
checks.push({
  name: "package.json exports map points at existing files",
  check: () => {
    const pkg = JSON.parse(read("package.json"));
    const entry = pkg.exports && pkg.exports["."];
    if (!entry) return false;
    const targets = [
      entry.import,
      entry.require,
      entry.default,
      entry.types && entry.types.import,
      entry.types && entry.types.require,
    ].filter(Boolean);
    return targets.length > 0 && targets.every((t) => fs.existsSync(t));
  },
});

// Check 12: Test files exist
const testFiles = [
  "aiTranslator.test.ts",
  "apiKeyManager.test.ts",
  "i18nProjectManager.test.ts",
];

testFiles.forEach((file) => {
  checks.push({
    name: `Test file src/test/${file} exists`,
    check: () => fs.existsSync(`src/test/${file}`),
  });
});

// Run all checks
let passed = 0;
let failed = 0;

checks.forEach(({ name, check }) => {
  let result;
  try {
    result = check();
  } catch (err) {
    result = false;
  }
  if (result) {
    console.log(`✅ ${name}`);
    passed++;
  } else {
    console.log(`❌ ${name}`);
    failed++;
  }
});

console.log("\n" + "=".repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log("=".repeat(50));

if (failed > 0) {
  console.log(
    "\n⚠️  Some checks failed. Please run `npm run build` and try again.",
  );
  process.exit(1);
} else {
  console.log("\n✨ Package verification successful! Ready to publish.");

  // Show package info
  const pkg = require("../package.json");
  console.log("\n📦 Package Information:");
  console.log(`   Name: ${pkg.name}`);
  console.log(`   Version: ${pkg.version}`);
  console.log(`   Main (CJS): ${pkg.main}`);
  console.log(`   Module (ESM): ${pkg.module}`);
  console.log(`   Types: ${pkg.types}`);

  console.log("\n🚀 Next steps:");
  console.log("   1. Run tests: npm test");
  console.log("   2. Test locally: npm link");
  console.log(
    "   3. Update version if needed: npm version [patch|minor|major]",
  );
  console.log("   4. Publish: npm publish --access public");
  console.log(
    "\n💡 Note: Remember to update main package dependency after publishing!",
  );
}
