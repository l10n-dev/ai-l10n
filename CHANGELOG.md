# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-12-15

### Added
- **New Package: @ai-l10n/sdk** - Separate SDK package for programmatic use
  - Independent npm package for use in other projects (VS Code extensions, etc.)
  - Complete TypeScript API with full type definitions
  - Custom logger support through `ILogger` interface
  - All core functionality: AiTranslator, L10nTranslationService, ApiKeyManager
  - Comprehensive README with API examples
  - 139 passing tests

### Changed
- Main package now depends on `@ai-l10n/sdk` for core functionality
- Simplified package structure - main package focuses on CLI tool
- README updated with SDK package reference

### Fixed
- Improved monorepo structure for better package separation

## [1.0.2] - 2025-12-08

### Fixed
- Improved error handling in `L10nTranslationService.translate()` method:
  - Now returns `null` instead of throwing error for 401 Unauthorized responses
  - Enhanced error messages with actionable links to get API keys
  - Better handling of insufficient balance scenarios
  - Fixed `insufficientBalance` finish reason to return result instead of null
- Improved logger integration with actionable error dialogs

## [1.0.1] - 2025-12-08

### Added
- Comprehensive API reference documentation in README
- Custom logger integration documentation for VS Code extensions and other environments
- Complete unit test coverage (139+ tests)
- Test suites for all major classes:
  - AiTranslator (30 tests)
  - ApiKeyManager (26 tests)
  - ConsoleLogger (23 tests)
  - I18nProjectManager (36 tests)
  - L10nTranslationService (24 tests)

### Changed
- Enhanced README with detailed API types and methods documentation
- Improved error handling examples in documentation
- Added best practices section for API usage

### Fixed
- Minor documentation improvements and clarifications

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
