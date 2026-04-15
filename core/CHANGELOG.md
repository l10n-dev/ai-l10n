# Changelog - ai-l10n-core

All notable changes to the core package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.0] - 2026-04-16

### Added
- **Balance API** — New `getBalance(apiKey)` method on `L10nTranslationService` retrieves the current character balance from the `GET /v2/balance` endpoint. Returns `BalanceResponse` (`{ currentBalance: number }`). Throws on non-2xx responses.
- **`BalanceResponse` type** — `{ currentBalance: number }`
- **`TranslationResponse` type** — Structured result wrapper for `translate()` with `status`, `reason`, `message`, `result`, and `currentBalance` fields

### Changed
- **`translate()` return type changed from `TranslationResult | null` to `TranslationResponse`** (breaking change)
  - The method now always resolves — it never throws
  - On success: `{ status: "success", result: TranslationResult, currentBalance?: number }`
  - On error: `{ status: "error", reason: string, message: string, currentBalance?: number }`
  - `currentBalance` on a `paymentRequired` error reflects the current (insufficient) balance from the API response
  - `reason` values: `"noApiKey"`, `"unauthorized"`, `"paymentRequired"`, `"badRequest"`, `"requestTooLarge"`, `"serverError"`, `"networkError"`, `"translationError"`

### Migration
```typescript
// Before (1.4.x)
try {
  const result = await service.translate(request, apiKey);
  if (!result) return; // null for 401/402
  console.log(result.translations);
} catch (e) {
  console.error(e.message); // thrown for 400/413/500
}

// After (1.5.0)
const response = await service.translate(request, apiKey);
if (response.status === 'error') {
  console.error(response.message, '| reason:', response.reason);
  return;
}
console.log(response.result!.translations);
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
