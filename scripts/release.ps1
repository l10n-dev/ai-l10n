#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Release script for ai-l10n CLI and GitHub Action
    
.DESCRIPTION
    This script automates the release process for both the npm package and GitHub Action:
    1. Reads version from package.json
    2. Creates Git tags with 'v' prefix (for GitHub Actions)
    3. Updates major version tag (e.g., v1)
    4. Pushes tags to GitHub
    5. Optionally publishes to npm
    
.PARAMETER SkipNpm
    Skip npm publish (useful if already published)
    
.PARAMETER DryRun
    Show what would be done without making changes
    
.EXAMPLE
    .\scripts\release.ps1
    
.EXAMPLE
    .\scripts\release.ps1 -SkipNpm
    
.EXAMPLE
    .\scripts\release.ps1 -DryRun
#>

param(
    [switch]$SkipNpm,
    [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Colors for output
function Write-Step { Write-Host "► $args" -ForegroundColor Cyan }
function Write-Success { Write-Host "✓ $args" -ForegroundColor Green }
function Write-Warning { Write-Host "⚠ $args" -ForegroundColor Yellow }
function Write-Error { Write-Host "✗ $args" -ForegroundColor Red }

# Read version from package.json
Write-Step "Reading version from package.json..."
$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
$version = $packageJson.version

if (-not $version) {
    Write-Error "Could not read version from package.json"
    exit 1
}

Write-Success "Found version: $version"

# Parse version (e.g., "1.2.3" -> major=1, minor=2, patch=3)
if ($version -match '^(\d+)\.(\d+)\.(\d+)') {
    $major = $matches[1]
    $minor = $matches[2]
    $patch = $matches[3]
} else {
    Write-Error "Invalid version format: $version (expected: X.Y.Z)"
    exit 1
}

$versionTag = "v$version"
$majorTag = "v$major"

Write-Step "Will create tags:"
Write-Host "  - $versionTag (specific version)"
Write-Host "  - $majorTag (major version pointer)"

# Check if tag already exists
$existingTag = git tag -l $versionTag
if ($existingTag) {
    Write-Warning "Tag $versionTag already exists"
    $response = Read-Host "Overwrite existing tag? (y/N)"
    if ($response -ne "y") {
        Write-Warning "Aborted"
        exit 0
    }
}

# Check for uncommitted changes
Write-Step "Checking for uncommitted changes..."
$status = git status --porcelain
if ($status) {
    Write-Error "You have uncommitted changes. Please commit or stash them first."
    git status --short
    exit 1
}

Write-Success "Working directory is clean"

# Ensure we're on main/master
Write-Step "Checking current branch..."
$currentBranch = git rev-parse --abbrev-ref HEAD
if ($currentBranch -ne "main" -and $currentBranch -ne "master") {
    Write-Warning "You're on branch '$currentBranch', not 'main' or 'master'"
    $response = Read-Host "Continue anyway? (y/N)"
    if ($response -ne "y") {
        exit 0
    }
}

if ($DryRun) {
    Write-Warning "DRY RUN MODE - No changes will be made"
    Write-Host ""
}

# Create version tag
Write-Step "Creating tag $versionTag..."
if ($DryRun) {
    Write-Host "[DRY RUN] git tag -a $versionTag -m 'Release $version'"
} else {
    if ($existingTag) {
        git tag -f -a $versionTag -m "Release $version"
    } else {
        git tag -a $versionTag -m "Release $version"
    }
    Write-Success "Created tag $versionTag"
}

# Create/update major version tag
Write-Step "Creating/updating major version tag $majorTag..."
if ($DryRun) {
    Write-Host "[DRY RUN] git tag -f -a $majorTag -m 'Latest $majorTag.x release'"
} else {
    git tag -f -a $majorTag -m "Latest $majorTag.x release"
    Write-Success "Updated tag $majorTag -> $version"
}

# Push tags
Write-Step "Pushing tags to origin..."
if ($DryRun) {
    Write-Host "[DRY RUN] git push origin $versionTag"
    Write-Host "[DRY RUN] git push origin $majorTag -f"
} else {
    git push origin $versionTag
    git push origin $majorTag -f
    Write-Success "Pushed tags to GitHub"
}

# NPM publish
if (-not $SkipNpm) {
    Write-Step "Publishing to npm..."
    if ($DryRun) {
        Write-Host "[DRY RUN] npm publish"
    } else {
        $response = Read-Host "Publish version $version to npm? (y/N)"
        if ($response -eq "y") {
            npm publish
            Write-Success "Published to npm"
        } else {
            Write-Warning "Skipped npm publish"
        }
    }
} else {
    Write-Warning "Skipped npm publish (--SkipNpm flag)"
}

Write-Host ""
Write-Success "Release $version completed!"
Write-Host ""
Write-Host "GitHub Action can now be used as:"
Write-Host "  uses: l10n-dev/ai-l10n@$versionTag" -ForegroundColor Cyan
Write-Host "  uses: l10n-dev/ai-l10n@$majorTag (recommended)" -ForegroundColor Cyan
Write-Host ""
Write-Host "NPM package can be installed as:"
Write-Host "  npm install ai-l10n@$version" -ForegroundColor Cyan
Write-Host ""

# Optionally create GitHub release
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Create GitHub Release at: https://github.com/l10n-dev/ai-l10n/releases/new?tag=$versionTag"
Write-Host "  2. Update CHANGELOG.md with release notes"
Write-Host "  3. Announce the release"
