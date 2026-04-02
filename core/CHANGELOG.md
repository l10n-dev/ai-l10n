# Changelog - ai-l10n-core

All notable changes to the core package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2026-04-02

### Added
- **Initial Package Release** - Core library extracted from `ai-l10n` as independent package
  - `L10nTranslationService` — low-level translation API client
    - `TranslationRequest` now includes optional `format?: string` field for specifying localization file format (e.g., `"json"`, `"arb"`, `"po"`, `"yaml"`, `"xliff"`)
  - `ILogger` interface — dependency injection for logging
  - `ConsoleLogger` — default console-based logger implementation
  - `languageUtils` — BCP 47 language code normalization and validation
    - `validateLanguageCode(code)` and `normalizeLanguageCode(code)` are now the canonical location for these utilities (previously also exposed as wrapper methods on `I18nProjectManager` in `ai-l10n-sdk`)
  - `constants` — `URLS` and `CONFIG` shared configuration
  - Complete TypeScript type definitions
