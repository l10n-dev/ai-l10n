# ai-l10n-core

[![npm version](https://img.shields.io/npm/v/ai-l10n-core.svg)](https://www.npmjs.com/package/ai-l10n-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Platform-independent core for AI-powered localization — translation API client, language utilities, and shared types.

This is the foundational library for the [ai-l10n](https://www.npmjs.com/package/ai-l10n) ecosystem. It provides the low-level translation API client, logger interface, and language utilities used by the SDK and CLI.

Powered by [l10n.dev](https://l10n.dev).

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

##### `translate(request: TranslationRequest, apiKey: string): Promise<TranslationResult | null>`

Translates JSON content using the l10n.dev API.

**Parameters:**
- `request: TranslationRequest` — Translation request configuration
- `apiKey: string` — API key for authentication

**Returns:** `Promise<TranslationResult | null>` — Translation result, or `null` for 401/402 responses

**Throws:** Error for 400, 413, 500, and other failure conditions

##### `predictLanguages(input: string, limit?: number): Promise<Language[]>`

Predicts possible language codes from a text input (language name in English or native language, region, or script).

**Parameters:**
- `input: string` — Text to analyze
- `limit?: number` — Maximum number of predictions (default: 10)

**Returns:** `Promise<Language[]>` — Array of predicted languages with codes and names

#### Types

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

  /** Return translations as JSON string */
  returnTranslationsAsString: boolean;

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

  /** Insufficient character balance */
  insufficientBalance = "insufficientBalance",

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

#### Error Handling

The service throws errors for:

- **400 Bad Request** — Validation error with details
- **413 Request Too Large** — `"Request too large. Maximum request size is 5 MB."`
- **500 Server Error** — `"An internal server error occurred (Error code: ...)"`

Returns `null` with error logged for:

- **Missing API Key** — `"API Key not set. Please configure your API Key first."`
- **401 Unauthorized** — `"Unauthorized. Please check your API Key."`
- **402 Payment Required** — `"Not enough characters remaining for this translation..."`

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

## License

MIT

## Credits

Powered by [l10n.dev](https://l10n.dev) — AI-powered localization service
