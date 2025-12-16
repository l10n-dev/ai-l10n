# GitHub Action Examples

This directory contains example GitHub Actions workflows for using the ai-l10n action in your repository.

## Quick Start

1. Copy the desired workflow file to your repository's `.github/workflows/` directory
2. Create a translation config file `ai-l10n.config.json` in your repository root
3. Add your L10N_API_KEY as a GitHub secret
4. Customize the workflow triggers and inputs as needed

## Available Examples

### [translate-pr.yml](translate-pr.yml)
Creates a pull request with translations when source files change. Best for main/master branches.

### [translate-commit.yml](translate-commit.yml)
Commits translations directly to the branch. Best for feature branches.

### [translate-manual.yml](translate-manual.yml)
Manually triggered workflow with full customization options.

## Configuration

See [ai-l10n.config.json](../translate-config.json) for translation config examples.
