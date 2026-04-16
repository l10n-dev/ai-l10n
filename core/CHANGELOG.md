# Changelog - ai-l10n-core

All notable changes to the core package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.0] - 2026-04-16

### Added
- **`ApiResponse<T>` type** — Generic discriminated union used as the return type of all API methods:
  ```typescript
  type ApiResponse<T> =
    | { success: true; data: T }
    | { success: false; reason: string; message: string };
  ```
- **Balance API** — New `getBalance(apiKey)` method on `L10nTranslationService` retrieves the current character balance from the `GET /v2/balance` endpoint. Returns `ApiResponse<BalanceResponse>` (always resolves, never throws).
- **`BalanceResponse` type** — `{ currentBalance: number }`
- **Structured responses for all methods** — `getBalance()`, `getLanguages()`, and `predictLanguages()` now return `ApiResponse<T>` and never throw

### Changed
- **`translate()` return type changed from `TranslationResult | null` to `TranslationResponse`** (breaking change)
  - `TranslationResponse` is now `ApiResponse<TranslationResult> & { currentBalance?: number }`
  - The method always resolves — it never throws
  - On success: `{ success: true, data: TranslationResult, currentBalance?: number }`
  - On error: `{ success: false, reason: string, message: string, currentBalance?: number }`
  - `reason` values: `"noApiKey"`, `"unauthorized"`, `"paymentRequired"`, `"badRequest"`, `"requestTooLarge"`, `"serverError"`, `"networkError"`, `"translationError"`
- **`getLanguages()` now requires `apiKey` as its first parameter** (bug fix — previously no API key was sent)
  - New signature: `getLanguages(apiKey: string, options?: ...): Promise<ApiResponse<SupportedLanguagesResponse>>`
  - Returns structured `ApiResponse` instead of throwing; error reasons: `noApiKey`, `unauthorized`, `badRequest`, `networkError`
- **`getBalance()` no longer throws** — returns `ApiResponse<BalanceResponse>`; error reasons: `noApiKey`, `unauthorized`, `networkError`
- **`predictLanguages()` no longer throws** — returns `ApiResponse<Language[]>`; error reason: `networkError`

### Migration
```typescript
// translate() — Before (1.4.x)
try {
  const result = await service.translate(request, apiKey);
  if (!result) return; // null for 401/402
  console.log(result.translations);
} catch (e) {
  console.error(e.message); // thrown for 400/413/500
}

// translate() — After (1.5.0)
const response = await service.translate(request, apiKey);
if (!response.success) {
  console.error(response.message, '| reason:', response.reason);
  return;
}
console.log(response.data.translations);

// getBalance() — Before (1.4.x)
const { currentBalance } = await service.getBalance(apiKey); // threw on error

// getBalance() — After (1.5.0)
const result = await service.getBalance(apiKey);
if (!result.success) console.error(result.reason);
else console.log(result.data.currentBalance);

// getLanguages() — Before (1.4.x)
const { languages } = await service.getLanguages(options); // no apiKey, threw on error

// getLanguages() — After (1.5.0)
const result = await service.getLanguages(apiKey, options);
if (!result.success) console.error(result.reason);
else console.log(result.data.languages);
```

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
