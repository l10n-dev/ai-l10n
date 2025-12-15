#!/usr/bin/env node

/**
 * Pre-publish check to ensure ai-l10n-sdk dependency matches package version
 * This script prevents publishing with "file:./sdk" dependency and ensures version sync
 */

const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const sdkPackageJsonPath = path.join(__dirname, '..', 'sdk', 'package.json');

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const sdkPackageJson = JSON.parse(fs.readFileSync(sdkPackageJsonPath, 'utf8'));

const mainVersion = packageJson.version;
const sdkVersion = sdkPackageJson.version;
const sdkDependency = packageJson.dependencies['ai-l10n-sdk'];

if (!sdkDependency) {
  console.error('❌ Error: ai-l10n-sdk dependency not found in package.json');
  process.exit(1);
}

if (sdkDependency.startsWith('file:')) {
  console.error('\n❌ Cannot publish with local file dependency!\n');
  console.error('The ai-l10n-sdk dependency is set to:', sdkDependency);
  console.error('\nTo publish, you need to:');
  console.error('1. First publish the SDK package:');
  console.error(`   cd sdk && npm publish --access public\n`);
  console.error('2. Then update package.json dependency to match the version:');
  console.error(`   "ai-l10n-sdk": "^${sdkVersion}"\n`);
  console.error('3. Then publish this package:');
  console.error('   npm publish\n');
  console.error('Note: You can keep "file:./sdk" for local development');
  console.error('      Just change it to the version number before publishing.\n');
  process.exit(1);
}

// Extract version from dependency (remove ^ or ~ prefix)
const dependencyVersion = sdkDependency.replace(/^[\^~]/, '');

// Check if versions match
if (mainVersion !== sdkVersion) {
  console.error('\n⚠️  Warning: Version mismatch detected!');
  console.error(`Main package version: ${mainVersion}`);
  console.error(`SDK package version:  ${sdkVersion}`);
  console.error('\nVersions should match. Update sdk/package.json to match.\n');
  process.exit(1);
}

// Check if dependency version matches package version
if (dependencyVersion !== mainVersion) {
  console.error('\n❌ SDK dependency version does not match package version!\n');
  console.error(`Package version:           ${mainVersion}`);
  console.error(`SDK dependency specified:  ${sdkDependency}`);
  console.error(`Expected:                  ^${mainVersion}\n`);
  console.error('Update package.json dependency to:');
  console.error(`  "ai-l10n-sdk": "^${mainVersion}"\n`);
  process.exit(1);
}

console.log('✅ SDK dependency check passed:');
console.log(`   Package version: ${mainVersion}`);
console.log(`   SDK version:     ${sdkVersion}`);
console.log(`   Dependency:      ${sdkDependency}`);
