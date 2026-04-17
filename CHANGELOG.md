# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.1] - 2026-04-17

### Changed
- Updated to use `ai-l10n-core@1.5.1`
- Set default client identifier on `translate()` requests.
- Standardized the `reason` type used in API error responses to a fixed union of values.

### Fixed
- API documentation

## [1.5.0] - 2026-04-16

### Changed
- Updated to `ai-l10n-sdk@1.5.0` and `ai-l10n-core@1.5.0`
- All `L10nTranslationService` API methods (`translate`, `getBalance`, `getLanguages`, `predictLanguages`) now return structured `ApiResponse<T>` responses and never throw
- Translation errors (previously thrown or returned as `null` from the core service) are now uniformly reported as failed translation results in the summary

## [1.4.0] - 2026-04-02

### Added
- **Multi-Format Support** - All text-based localization formats are now supported (YAML, PO/gettext, XLIFF, and any other format accepted by the API). The format is derived from the file extension and sent automatically. See [supported formats](https://l10n.dev/ws/translate-i18n-files#supported-formats)
  - `I18nProjectManager.detectLanguagesFromProject()` now auto-scans paired extensions: `.yaml`/`.yml` and `.xliff`/`.xlf` (same behavior as `.json`/`.jsonc`)

### Changed
- `ai-l10n-core` is now a fully documented, independently testable package
  - Added `README.md` with full API reference for `L10nTranslationService`, `ConsoleLogger`, `ILogger`, and all types
  - Added test suite (`ConsoleLogger` + `L10nTranslationService`, 49 tests) moved from `ai-l10n-sdk`
  - Added `scripts/verify.js` and `test`/`verify` npm scripts
  - Added `CHANGELOG.md`
- `ai-l10n-sdk` README: core-library API sections moved to `ai-l10n-core` package docs
- `validateLanguageCode()` and `normalizeLanguageCode()` moved from `I18nProjectManager` to `ai-l10n-core` (`languageUtils`). Import from `ai-l10n-core` directly instead of using the manager

## [1.3.0] - 2026-02-12

### Added
- **Metadata Translation Control** - Added `translateMetadata` configuration option (default: `false`)
  - Allows control over whether metadata is translated along with UI strings
  - For example, in Flutter ARB files, metadata entries like `@key` contain descriptions that can optionally be translated
  - When disabled (default), metadata remains unchanged in target files, ensuring consistency
  - Available in CLI via `--translate-metadata` flag and programmatic API via `translateMetadata` config option

## [1.2.0] - 2026-02-04

### Added
- **JSONC Support** - Added support for `.jsonc` (JSON with Comments) file extension for translation
  - Works with both CLI and programmatic API
  - Auto-detects `.jsonc` files in project structure alongside `.json` files
- **Shopify Theme Localization** - Added support for Shopify theme localization file patterns:
  - Automatically detects and handles files with `.default.` in the name (e.g., `en.default.schema.json`)
  - Removes `.default.` from target file names while preserving language code
  - Preserves `.schema.` suffix in translated files when present in source file
  - Example: `locales/en.default.schema.json` → `locales/es-ES.schema.json`, `locales/fr.schema.json`

### Changed
- Enhanced project structure detection to recognize both `.json` and `.jsonc` files
- Improved language code extraction to handle Shopify theme naming patterns

## [1.1.4] - 2025-12-16

### Fixed
- **CLI** - Fixed `--version` command to read version dynamically from package.json instead of hardcoded value
  - Previously always returned "1.0.0" regardless of actual package version
  - Now correctly returns the installed package version (e.g., "1.1.4")

## [1.1.3] - 2025-12-16

### Added
- **GitHub Action** - Composite action for automated translation in CI/CD workflows
  - Automatic translation on push/PR with customizable triggers
  - Pull request or direct commit modes
  - Configurable
  - Optional Node.js setup for workflows that already have Node installed
  - Built-in GitHub CLI for PR creation (no external dependencies)
- Example workflows for GitHub Actions integration
- Comprehensive release documentation (`RELEASE.md`)

### Fixed
- **CLI Batch Command** - Strip UTF-8 BOM from config files (fixes PowerShell `Out-File` issues)
- **CLI Batch Command** - Improved JSON parsing error messages with file preview
- **GitHub Action** - Fixed API key handling to support both input and environment variable

## [1.1.2] - 2025-12-15

### Changed
- Updated to `ai-l10n-sdk@1.1.2` with improved TypeScript type exports

### Fixed
- All SDK types now properly exported and accessible

## [1.1.1] - 2025-12-15

### Added
- **New Package: ai-l10n-sdk** - Separate SDK package for programmatic use
  - Independent npm package for use in other projects (VS Code extensions, etc.)
  - Complete TypeScript API with full type definitions
  - Custom logger support through `ILogger` interface
  - All core functionality: AiTranslator, L10nTranslationService
  - Comprehensive README with API examples
  - 139 passing tests

### Changed
- Main package now depends on `ai-l10n-sdk` for core functionality
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
