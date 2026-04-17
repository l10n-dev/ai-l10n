# ai-l10n-core

[![npm version](https://img.shields.io/npm/v/ai-l10n-core.svg)](https://www.npmjs.com/package/ai-l10n-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Platform-independent core for AI-powered localization — translation API client, language utilities, and shared types.

This is the foundational library for the [ai-l10n](https://www.npmjs.com/package/ai-l10n) ecosystem. It provides the low-level translation API client, logger interface, and language utilities used by the SDK and CLI.

Powered by [l10n](https://l10n.dev).dev

## Installation

```bash
npm install ai-l10n-core
```

## Related Packages

- [ai-l10n-sdk](https://www.npmjs.com/package/ai-l10n-sdk) — High-level SDK with `AiTranslator`, file management, and project structure detection
- [ai-l10n](https://www.npmjs.com/package/ai-l10n) — CLI tool built on the SDK

## Custom Logger Integration

By default, `L10nTranslationService` uses the built-in `ConsoleLogger` which outputs to the console. For integration in other environments (VS Code extensions, web applications, custom UIs), implement a custom logger.

### Logger Interface

Implement the `ILogger` interface to create your own logger:

```typescript
import { ILogger } from 'ai-l10n-core';

class MyLogger implements ILogger {
  logInfo(message: string): void {
    myLoggingSystem.info(message);
  }
  logWarning(message: string, error?: unknown): void {
    myLoggingSystem.warn(message, error);
  }
  logError(message: string, error?: unknown): void {
    myLoggingSystem.error(message, error);
  }
  showAndLogError(
    message: string,
    error?: unknown,
    context?: string,
    linkBtnText?: string,
    url?: string
  ): void {
    myLoggingSystem.error(message, { error, context, linkBtnText, url });
  }
}
```

### Default ConsoleLogger

The built-in `ConsoleLogger` implementation:

```typescript
import { ConsoleLogger } from 'ai-l10n-core';

const logger = new ConsoleLogger();

// Outputs with emojis and formatting
logger.logInfo('Translation started');           // Plain console.log
logger.logWarning('File not found', error);      // ⚠️ with error details
logger.logError('Translation failed', error);    // ❌ with error details
logger.showAndLogError(
  'API request failed',
  error,
  'Authentication',
  'Get API Key',
  'https://l10n.dev/ws/keys'
);
```

## API Reference

### ConsoleLogger

Default console-based implementation of `ILogger`.

#### Constructor

```typescript
import { ConsoleLogger } from 'ai-l10n-core';

const logger = new ConsoleLogger();
```

#### Methods

- `logInfo(message: string): void` — Outputs plain `console.log`
- `logWarning(message: string, error?: unknown): void` — Outputs `⚠️  message` via `console.warn`
- `logError(message: string, error?: unknown): void` — Outputs `❌ message` via `console.error`
- `showAndLogError(message, error?, context?, linkBtnText?, url?): void` — Outputs full error details including stack trace, context, and optional link

---

### L10nTranslationService

Low-level client for interacting with the l10n.dev translation API.

#### Constructor

```typescript
import { L10nTranslationService, ConsoleLogger, ILogger } from 'ai-l10n-core';

// Default: uses ConsoleLogger
const service = new L10nTranslationService();

// With a custom logger
const customLogger: ILogger = new ConsoleLogger();
const service = new L10nTranslationService(customLogger);
```

#### Methods

##### `translate(request: TranslationRequest, apiKey: string): Promise<TranslationResponse>`

Translates localization content using the l10n.dev API.

**Parameters:**
- `request: TranslationRequest` — Translation request configuration
- `apiKey: string` — API key for authentication

**Returns:** `Promise<TranslationResponse>` — Always resolves (never throws). Check `success` field to determine success or failure.

**Example:**
```typescript
const response = await service.translate(request, apiKey);
if (!response.success) {
  console.error(response.message, 'reason:', response.reason);
  if (response.reason === 'paymentRequired') {
    console.log('Current balance:', response.currentBalance);
  }
} else {
  console.log('Translated:', response.data.translations);
  console.log('Balance remaining:', response.currentBalance);
}
```

##### `getBalance(apiKey: string): Promise<ApiResponse<BalanceResponse>>`

Retrieves the current character balance available for translation.

**Parameters:**
- `apiKey: string` — API key for authentication

**Returns:** `Promise<ApiResponse<BalanceResponse>>` — Always resolves (never throws). Check `success` to determine success or failure. On success, `data.currentBalance` holds the number of characters available.

**Error reasons:** `noApiKey`, `unauthorized`, `serverError`, `networkError`

**Example:**
```typescript
const response = await service.getBalance(apiKey);
if (!response.success) {
  console.error(response.message, 'reason:', response.reason);
} else {
  console.log(`Available: ${response.data.currentBalance.toLocaleString()} characters`);
}
```

##### `predictLanguages(input: string, limit?: number): Promise<ApiResponse<Language[]>>`

Predicts possible language codes from a text input (language name in English or native language, region, or script).

**Parameters:**
- `input: string` — Text to analyze
- `limit?: number` — Maximum number of predictions (default: 10)

**Returns:** `Promise<ApiResponse<Language[]>>` — Always resolves (never throws). On success, `data` is an array of predicted languages with codes and names.

**Error reasons:** , `serverError`, `networkError`

##### `getLanguages(apiKey: string, options?: { codes?: string[]; proficiencyLevels?: LanguageProficiencyLevel[] }): Promise<ApiResponse<SupportedLanguagesResponse>>`

Retrieves a list of supported languages, optionally filtered by language codes or proficiency levels.

**Parameters:**
- `apiKey: string` — API key for authentication
- `options?` — Optional filter object
  - `codes?: string[]` — Filter by specific language codes (e.g., `["en", "es", "fr"]`)
  - `proficiencyLevels?: LanguageProficiencyLevel[]` — Filter by proficiency level: `"strong"`, `"high"`, `"moderate"`, or `"limited"`

**Returns:** `Promise<ApiResponse<SupportedLanguagesResponse>>` — Always resolves (never throws). On success, `data.languages` is an array of `SupportedLanguage` entries.

**Error reasons:** `noApiKey`, `unauthorized`, `badRequest`, `serverError`, `networkError`

**Example:**
```typescript
// Get all supported languages
const response = await service.getLanguages(apiKey);
if (!response.success) {
  console.error(response.message, 'reason:', response.reason);
} else {
  const { languages } = response.data;
}

// Filter by proficiency level
const response = await service.getLanguages(apiKey, {
  proficiencyLevels: ['strong', 'high'],
});

// Filter by specific codes
const response = await service.getLanguages(apiKey, {
  codes: ['en', 'es', 'fr'],
});
```

#### Types

##### ApiResponse\<T\>

```typescript
type ApiResponse<T> =
  | { success: true; data: T }
  | {
      success: false;
      reason:
        | "paymentRequired"
        | "translationError"
        | "requestTooLarge"
        | "badRequest"
        | "unauthorized"
        | "forbidden"
        | "rateLimited"
        | "serverError"
        | "networkError"
        | "noApiKey";
      message: string;
    };
```

All methods that contact the API return an `ApiResponse<T>`. Check `success` before accessing `data`.

##### TranslationResponse

```typescript
type TranslationResponse = ApiResponse<TranslationResult> & { currentBalance?: number };
```

The union distributes over the intersection, so `currentBalance?` is available on both branches:
- On `success: true`: `data` holds the `TranslationResult`, `currentBalance` is the remaining balance.
- On `success: false`: `reason` and `message` describe the error, `currentBalance` is set when `reason` is `"paymentRequired"`.

##### BalanceResponse

```typescript
interface BalanceResponse {
  /** Current balance of characters available for translation. */
  currentBalance: number;
}
```

##### TranslationRequest

```typescript
interface TranslationRequest {
  /** Source strings as JSON string */
  sourceStrings: string;

  /** Target language code (e.g., "es", "fr-FR") */
  targetLanguageCode: string;

  /** Use contractions (e.g., "don't" vs "do not") */
  useContractions?: boolean;

  /** Use shortened forms when translation is longer than source text */
  useShortening?: boolean;

  /** Generate plural forms for i18next */
  generatePluralForms?: boolean;

  /** Translate metadata along with UI strings (e.g., ARB `@key` descriptions) */
  translateMetadata?: boolean;

  /** Client identifier */
  client: string;

  /** Only translate new strings */
  translateOnlyNewStrings?: boolean;

  /** Existing target strings (for incremental updates) */
  targetStrings?: string;

  /** File schema format */
  schema: FileSchema | null;

  /**
   * Localization file format (e.g., "json", "arb", "po", "yaml", "xml").
   * If not specified, auto-detected from sourceStrings content.
   * See the [supported formats table](https://l10n.dev/ws/translate-i18n-files#supported-formats).
   */
  format?: string;
}
```

##### TranslationResult

```typescript
interface TranslationResult {
  /** Target language code */
  targetLanguageCode: string;

  /** Translated content as JSON string */
  translations?: string;

  /** Usage statistics */
  usage: TranslationUsage;

  /** Reason translation finished */
  finishReason?: FinishReason;

  /** Number of chunks completed */
  completedChunks: number;

  /** Total number of chunks */
  totalChunks: number;

  /** Remaining character balance */
  remainingBalance?: number;

  /** Strings filtered due to content policy, in the same format as the input */
  filteredStrings?: string;
}
```

##### TranslationUsage

```typescript
interface TranslationUsage {
  /** Number of characters used */
  charsUsed?: number;
}
```

##### FileSchema

Supported file schema formats for translation requests.

```typescript
enum FileSchema {
  /** OpenAPI specification format */
  OpenAPI = "openApi",

  /** Flutter ARB (Application Resource Bundle) format */
  ARBFlutter = "arbFlutter"
}
```

##### FinishReason

Reasons why a translation finished.

```typescript
enum FinishReason {
  /** Translation completed successfully */
  stop = "stop",

  /** Translation stopped due to length/context limits */
  length = "length",

  /** Some content was filtered due to content policy */
  contentFilter = "contentFilter",

  /** Translation failed with error */
  error = "error"
}
```

##### Language

```typescript
interface Language {
  /** Language code (e.g., "es", "fr-FR") */
  code: string;

  /** Human-readable language name */
  name: string;
}

```
##### SupportedLanguage

```typescript
interface SupportedLanguage {
  code: string | null;
  name: string | null;
  nativeName: string | null;
  level?: "strong" | "high" | "moderate" | "limited";
  regions?: Region[] | null;
  scripts?: Script[] | null;
}
```

#### Error Handling

All methods always resolve — they never throw. Check `response.success`:

##### `translate()` error reasons

| `reason` | Description |
|----------|-------------|
| `"paymentRequired"` | Insufficient balance (402); `currentBalance` is set |
| `"translationError"` | Translation failed; API returned `finishReason: "error"` |
| `"requestTooLarge"` | Request exceeds 5 MB (413) |
| `"badRequest"` | Validation error (400); `message` contains details |
| `"unauthorized"` | API key is invalid (401) |
| `"forbidden"` | API key lacks required permissions (403) |
| `"rateLimited"` | Requests are being rate-limited (429) |
| `"serverError"` | Internal server error (500) |
| `"networkError"` | Connection or other failure |
| `"noApiKey"` | API key was not provided |

##### `getBalance()` error reasons

| `reason` | Description |
|----------|-------------|
| `"noApiKey"` | API key was not provided |
| `"unauthorized"` | API key is invalid (401) |
| `"serverError"` | Internal server error (500) |
| `"networkError"` | Connection or other failure |

##### `getLanguages()` error reasons

| `reason` | Description |
|----------|-------------|
| `"noApiKey"` | API key was not provided |
| `"unauthorized"` | API key is invalid (401) |
| `"badRequest"` | Validation error (400); `message` contains details |
| `"serverError"` | Internal server error (500) |
| `"networkError"` | Connection or other failure |

##### `predictLanguages()` error reasons

| `reason` | Description |
|----------|-------------|
| `"serverError"` | Internal server error (500) |
| `"networkError"` | Connection or other failure |

---

### ILogger Interface

```typescript
interface ILogger {
  logInfo(message: string): void;
  logWarning(message: string, error?: unknown): void;
  logError(message: string, error?: unknown): void;
  showAndLogError(
    message: string,
    error?: unknown,
    context?: string,
    linkBtnText?: string,
    url?: string
  ): void;
}
```

---

### Constants

```typescript
import { URLS, CONFIG } from 'ai-l10n-core';

// API endpoints
URLS.API_BASE    // Base URL for l10n.dev API

// Configuration keys
CONFIG.API_KEY   // Key name for stored API key
```

---

### Language Utilities

Pure utility functions for working with BCP 47 language codes.

```typescript
import { validateLanguageCode, normalizeLanguageCode, extractLanguageCode } from 'ai-l10n-core';
```

##### `validateLanguageCode(code: string): boolean`

Validates whether a string is a valid BCP 47 language code.

**Parameters:**
- `code: string` — Language code to validate

**Returns:** `boolean` — `true` if valid, `false` otherwise

**Validation Rules:**
- **Case-insensitive validation**: Accepts language codes in any case (e.g., `"EN"`, `"en"`, `"EN-US"`)
- Language: 2-3 letters (e.g., `en`, `eng`, `EN`)
- Script (optional): 4 letters (e.g., `Hans`, `Latn`, `hans`)
- Region (optional): 2-3 letters or 3 digits (e.g., `US`, `us`, `419`)
- Separators: hyphens `-` or underscores `_`

**Important:** This function only validates the format. For proper BCP 47 compliance, use `normalizeLanguageCode()` to convert validated codes to the correct case format (language lowercase, Script title case, REGION uppercase).

**Example:**
```typescript
// All valid (case-insensitive)
validateLanguageCode('en');           // true
validateLanguageCode('EN');           // true
validateLanguageCode('en-US');        // true
validateLanguageCode('en-us');        // true
validateLanguageCode('zh-Hans-CN');   // true
validateLanguageCode('ZH-HANS-CN');   // true

// Invalid
validateLanguageCode('invalid');      // false
validateLanguageCode('');             // false

// Normalize after validation for proper BCP 47 format
const code = 'EN-US';
if (validateLanguageCode(code)) {
  const normalized = normalizeLanguageCode(code);
  console.log(normalized); // 'en-US'
}
```

---

##### `normalizeLanguageCode(code: string): string`

Normalizes language codes to a consistent BCP 47 format.

**Parameters:**
- `code: string` — Language code to normalize (accepts hyphens or underscores)

**Returns:** `string` — Normalized language code in format: `language[-Script][-REGION]`

**Normalization Rules:**
- Language: lowercase (e.g., `"EN"` → `"en"`)
- Script: Title case (e.g., `"hans"` → `"Hans"`)
- Region: uppercase (e.g., `"us"` → `"US"`)
- Separator: always hyphen `-` (underscores converted to hyphens)

**Example:**
```typescript
normalizeLanguageCode('en');          // 'en'
normalizeLanguageCode('en-us');       // 'en-US'
normalizeLanguageCode('en_US');       // 'en-US'
normalizeLanguageCode('zh_hans');     // 'zh-Hans'
normalizeLanguageCode('zh-Hans-CN');  // 'zh-Hans-CN'
normalizeLanguageCode('ZH_HANS_CN'); // 'zh-Hans-CN'
```

---

##### `extractLanguageCode(fileName: string): string | null`

Extracts a language code from a file name, handling various localization file patterns.

**Parameters:**
- `fileName: string` — File name (with or without extension)

**Returns:** `string | null` — Extracted language code, or `null` if none found

**Supported Patterns:**
- **JSON/JSONC**: `en.json`, `es-ES.json`, `en.jsonc`
- **ARB**: `app_en.arb`, `app_en_US.arb`, `my_app_fr.arb`
- **Shopify**: `en.default.schema.json`, `es-ES.schema.json`

**Example:**
```typescript
// JSON files
extractLanguageCode('en.json');                    // 'en'
extractLanguageCode('es-ES.json');                 // 'es-ES'
extractLanguageCode('fr.jsonc');                   // 'fr'

// ARB files
extractLanguageCode('app_en.arb');                 // 'en'
extractLanguageCode('app_en_US.arb');              // 'en_US'
extractLanguageCode('my_app_fr.arb');              // 'fr'

// Shopify theme
extractLanguageCode('en.default.schema.json');     // 'en'
extractLanguageCode('es-ES.schema.json');          // 'es-ES'

// Invalid files
extractLanguageCode('readme.md');                  // null
extractLanguageCode('invalid.json');               // null
```

## License

MIT

## Credits

Powered by [l10n](https://l10n.dev).dev — AI-powered localization service
