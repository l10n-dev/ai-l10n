# Changelog - ai-l10n-sdk

All notable changes to the SDK package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.4] - 2025-12-16

### Changed
- Version bumped to match main package (no functional changes to SDK)

## [1.1.3] - 2025-12-16

### Changed
- Version bumped to match main package (no functional changes to SDK)

## [1.1.2] - 2025-12-15

### Fixed
- **Type Exports** - Added missing type exports for better TypeScript support:
  - `I18nProjectManager` class and related types
  - `TranslationRequest`, `TranslationResult`, `FileSchema`, `FinishReason` from translation service
  - `URLS` constants
  - All types now properly accessible when importing from the package

## [1.1.1] - 2025-12-15

### Added
- **Initial Release** - Independent SDK package extracted from ai-l10n
- Core translation functionality:
  - `AiTranslator` class with full translation API
  - `L10nTranslationService` for direct API access
  - `ApiKeyManager` for secure API key storage
  - `I18nProjectManager` for project structure detection
  - `ILogger` interface for custom logging
  - `ConsoleLogger` implementation
- Complete TypeScript support with type definitions
- Comprehensive test suite (139 passing tests)
- Full documentation with API examples
- Support for JSON and ARB file formats
- Custom logger integration for VS Code extensions and other environments

### Features
- Translate files to 165+ languages
- Context-aware AI translations
- Incremental translation (translate only new strings)
- Type-safe JSON handling
- Automatic language detection
- Plural forms generation
- Content filtering with separate filtered strings output
- Usage tracking and balance monitoring
