# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-07

### Added
- Initial release of ai-l10n npm package
- AI-powered translation for JSON and ARB files
- Automatic language detection from project structure
- CLI tool with `translate`, `config`, and `batch` commands
- Programmatic API for TypeScript/JavaScript
- Support for incremental updates (translate only new strings)
- Configuration options:
  - Generate plural forms
  - Use contractions
  - Use shortening
  - Save filtered strings
  - Verbose logging
- Comprehensive documentation and examples
- TypeScript type definitions
- CI/CD integration examples for GitHub Actions, GitLab CI, and Jenkins
- Multiple project structure support:
  - Folder-based (e.g., `locales/en/`, `locales/es/`)
  - File-based JSON (e.g., `en.json`, `es.json`)
  - File-based ARB (e.g., `app_en.arb`, `app_es.arb`)
- API key management (stored, environment variable, or inline)
- Usage tracking and balance reporting
- Content filtering with separate output files

### Features
- 🤖 High-quality AI translations via l10n.dev
- 📁 Smart project structure detection
- 🔄 Incremental translation updates
- 🎯 Multiple format support (JSON & Flutter ARB)
- ⚙️ Flexible configuration options
- 🌍 Multi-language batch processing
- 📊 Character usage tracking
