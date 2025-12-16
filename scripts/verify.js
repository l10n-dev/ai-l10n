#!/usr/bin/env node

/**
 * Verification script to check package integrity
 */

const fs = require("fs");
const path = require("path");

console.log("🔍 Verifying ai-l10n package...\n");

const checks = [];

// Check 1: package.json exists
checks.push({
  name: "package.json exists",
  check: () => fs.existsSync("package.json"),
});

// Check 2: dist directory exists
checks.push({
  name: "dist/ directory exists",
  check: () => fs.existsSync("dist"),
});

// Check 3: Main entry point exists
checks.push({
  name: "Main entry point (dist/index.js) exists",
  check: () => fs.existsSync("dist/index.js"),
});

// Check 4: Type definitions exist
checks.push({
  name: "Type definitions (dist/index.d.ts) exist",
  check: () => fs.existsSync("dist/index.d.ts"),
});

// Check 5: CLI exists and is executable
checks.push({
  name: "CLI (dist/cli.js) exists",
  check: () => fs.existsSync("dist/cli.js"),
});

// Check 6: README exists
checks.push({
  name: "README.md exists",
  check: () => fs.existsSync("README.md"),
});

// Check 7: LICENSE exists
checks.push({
  name: "LICENSE exists",
  check: () => fs.existsSync("LICENSE"),
});

// Check 8: All source files compiled
const sourceFiles = [
  "index",
  "cli",
  "apiKeyManager",
  "translationService",
  "i18nProjectManager",
  "constants",
  "logger",
  "consoleLogger",
];
sourceFiles.forEach((file) => {
  checks.push({
    name: `${file}.js compiled`,
    check: () => fs.existsSync(`dist/${file}.js`),
  });
  checks.push({
    name: `${file}.d.ts generated`,
    check: () => fs.existsSync(`dist/${file}.d.ts`),
  });
});

// Check 9: SDK dependency check script exists
checks.push({
  name: "SDK dependency check script exists",
  check: () => fs.existsSync("scripts/check-sdk-dependency.js"),
});

// Run all checks
let passed = 0;
let failed = 0;

checks.forEach(({ name, check }) => {
  const result = check();
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
    "\n⚠️  Some checks failed. Please run `npm run build` and try again."
  );
  process.exit(1);
} else {
  console.log("\n✨ Package verification successful! Ready to publish.");

  // Show package info
  const pkg = require("../package.json");
  console.log("\n📦 Package Information:");
  console.log(`   Name: ${pkg.name}`);
  console.log(`   Version: ${pkg.version}`);
  console.log(`   Main: ${pkg.main}`);
  console.log(`   Types: ${pkg.types}`);
  console.log(`   CLI: ${pkg.bin["ai-l10n"]}`);

  // Check SDK dependency
  const sdkDep = pkg.dependencies["ai-l10n-sdk"];
  if (sdkDep && sdkDep.startsWith("file:")) {
    console.log(`\n⚠️  SDK Dependency: ${sdkDep} (local development mode)`);
    console.log("   Change to version number before publishing!");
  } else if (sdkDep) {
    console.log(`   SDK Dependency: ${sdkDep}`);
  }

  console.log("\n🚀 Next steps:");
  console.log("   1. Test locally: npm link");
  console.log("   2. Run prepublish check: npm run prepublishOnly");
  console.log("   3. Update SDK dependency if needed (file:./sdk → ^version)");
  console.log("   4. Update version: npm version [patch|minor|major]");
  console.log("   5. Publish: npm publish");
}
