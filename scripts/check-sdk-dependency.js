#!/usr/bin/env node

/**
 * Pre-publish check to ensure ai-l10n-sdk dependency is correct
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

console.log('\n🔍 Checking SDK dependency before publish...\n');

if (!sdkDependency) {
  console.error('❌ Error: ai-l10n-sdk dependency not found in package.json');
  process.exit(1);
}

// Check for local file dependency
if (sdkDependency.startsWith('file:')) {
  console.error('❌ BLOCKED: Cannot publish with local file dependency!\n');
  console.error('Current dependency:', sdkDependency);
  console.error('\n📋 Required steps:');
  console.error('1. cd sdk');
  console.error('2. npm publish');
  console.error('3. cd ..');
  console.error('4. Update package.json: "ai-l10n-sdk": "^' + sdkVersion + '"');
  console.error('5. npm publish\n');
  process.exit(1);
}

// Check if SDK is published on npm
const { execSync } = require('child_process');
try {
  const npmView = execSync('npm view ai-l10n-sdk version', { encoding: 'utf8' }).trim();
  console.log(`✅ SDK package found on npm: v${npmView}`);
  
  // Check if the dependency version exists on npm
  const dependencyVersion = sdkDependency.replace(/^[\^~]/, '');
  if (npmView !== dependencyVersion) {
    console.error(`\n⚠️  Warning: Dependency version (${dependencyVersion}) differs from published version (${npmView})`);
  }
} catch (error) {
  console.error('\n❌ BLOCKED: ai-l10n-sdk is not published on npm!\n');
  console.error('You must publish the SDK package first:');
  console.error('1. cd sdk');
  console.error('2. npm publish');
  console.error('3. cd ..');
  console.error('4. npm publish\n');
  process.exit(1);
}

// Check version sync
if (mainVersion !== sdkVersion) {
  console.error('\n❌ BLOCKED: Version mismatch!\n');
  console.error(`Main package: ${mainVersion}`);
  console.error(`SDK package:  ${sdkVersion}`);
  console.error('\nSync the versions in both package.json files.\n');
  process.exit(1);
}

const dependencyVersion = sdkDependency.replace(/^[\^~]/, '');
if (dependencyVersion !== mainVersion) {
  console.error('\n❌ BLOCKED: Dependency version mismatch!\n');
  console.error(`Package version: ${mainVersion}`);
  console.error(`Dependency:      ${sdkDependency}`);
  console.error(`Expected:        ^${mainVersion}\n`);
  process.exit(1);
}

console.log('✅ Version sync: ' + mainVersion);
console.log('✅ Dependency: ' + sdkDependency);
console.log('\n✅ All checks passed! Ready to publish.\n');
