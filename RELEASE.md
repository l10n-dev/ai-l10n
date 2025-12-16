# Release Process

This document explains how to release a new version of ai-l10n.

## Overview

ai-l10n has two distribution channels:
1. **NPM Package** - The CLI tool (`npm install ai-l10n`)
2. **GitHub Action** - The composite action (`uses: l10n-dev/ai-l10n@v1`)

The release script automates both.

## Prerequisites

- Clean git working directory (no uncommitted changes)
- On `main` or `master` branch
- Updated `package.json` version
- npm credentials configured (`npm login`)

## Release Steps

### 1. Update Version

Update the version in `package.json`:

```json
{
  "version": "1.2.0"
}
```

Also update `sdk/package.json` if SDK changed:

```json
{
  "version": "1.2.0"
}
```

### 2. Update Changelog

Add release notes to `CHANGELOG.md`:

```markdown
## [1.2.0] - 2025-12-16

### Added
- New feature X
- GitHub Action support

### Fixed
- Bug Y
```

### 3. Commit Changes

```powershell
git add package.json sdk/package.json CHANGELOG.md
git commit -m "chore: bump version to 1.2.0"
git push
```

### 4. Run Release Script

```powershell
# Full release (tags + npm publish)
.\scripts\release.ps1

# Dry run (see what would happen)
.\scripts\release.ps1 -DryRun

# Skip npm publish (if already published)
.\scripts\release.ps1 -SkipNpm
```

### 5. Create GitHub Release

Go to: https://github.com/l10n-dev/ai-l10n/releases/new

- Tag: `v1.2.0` (auto-populated)
- Title: `v1.2.0`
- Description: Copy from CHANGELOG.md
- Click "Publish release"

## What the Release Script Does

### Step 1: Read Version
```powershell
# Reads from package.json
$version = "1.2.0"
```

### Step 2: Create Tags
```powershell
# Specific version tag (for pinning)
git tag -a v1.2.0 -m "Release 1.2.0"

# Major version tag (for auto-updates)
git tag -f -a v1 -m "Latest v1.x release"
```

**Why two tags?**

| Tag | Purpose | User Experience |
|-----|---------|-----------------|
| `v1.2.0` | Exact version | `uses: l10n-dev/ai-l10n@v1.2.0` (locked) |
| `v1` | Latest v1.x.x | `uses: l10n-dev/ai-l10n@v1` (auto-updates) |

### Step 3: Push Tags
```powershell
git push origin v1.2.0
git push origin v1 -f  # Force update major tag
```

### Step 4: Publish to npm
```powershell
npm publish  # Publishes version from package.json
```

## Version Tag Strategy

### Semantic Versioning

```
v1.2.3
│ │ │
│ │ └─ Patch: Bug fixes (backwards compatible)
│ └─── Minor: New features (backwards compatible)
└───── Major: Breaking changes
```

### Tag Mapping

When you release `v1.2.3`:

| Tag | Points To | Users |
|-----|-----------|-------|
| `v1.2.3` | Fixed commit | Want exact version |
| `v1.2` | Latest v1.2.x | Want patch updates |
| `v1` | Latest v1.x.x | Want feature updates |

**Our script creates:** `v1.2.3` and `v1` (recommended for most users)

## Example Release Flow

```powershell
# 1. Update version
code package.json  # Change to "1.2.0"

# 2. Update changelog
code CHANGELOG.md

# 3. Commit
git add .
git commit -m "chore: bump version to 1.2.0"
git push

# 4. Release (dry run first)
.\scripts\release.ps1 -DryRun  # Preview changes
.\scripts\release.ps1           # Execute release

# 5. Create GitHub release
# Visit: https://github.com/l10n-dev/ai-l10n/releases/new?tag=v1.2.0
```

## Troubleshooting

### Tag Already Exists

```powershell
# Delete local tag
git tag -d v1.2.0

# Delete remote tag
git push origin :refs/tags/v1.2.0

# Re-run release script
.\scripts\release.ps1
```

### npm Publish Failed

```powershell
# Publish manually
npm publish

# Then create tags manually
git tag -a v1.2.0 -m "Release 1.2.0"
git tag -f -a v1 -m "Latest v1.x release"
git push origin v1.2.0 v1 -f
```

### Wrong Branch

```powershell
# Switch to main
git checkout main
git pull

# Re-run release
.\scripts\release.ps1
```

## After Release

1. **Verify npm**: https://www.npmjs.com/package/ai-l10n
2. **Verify GitHub Action**: https://github.com/marketplace/actions/l10n-dev-ai-localization-automation
3. **Test installation**:
   ```powershell
   npm install -g ai-l10n@1.2.0
   ai-l10n --version
   ```
4. **Test GitHub Action** in a test repository

## Notes

- The script will prompt before publishing to npm
- Major version tags are force-pushed (this is intentional)
- Always test in a separate repo before promoting to production
- Consider creating a GitHub release for better visibility
