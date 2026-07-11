# ai-l10n-core

[![npm version](https://img.shields.io/npm/v/ai-l10n-core.svg)](https://www.npmjs.com/package/ai-l10n-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Platform-independent core for AI-powered localization. This is the foundational library for the [ai-l10n](https://www.npmjs.com/package/ai-l10n) ecosystem. It provides the low-level translation API client, glossary & linguistic instructions API clients, logger interface, and language utilities used by the SDK and CLI.

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
        | "notFound"
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
  /** The text content to be translated. Can be in JSON, YAML, PO, ARB, or other supported formats. */
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

  /** Identifies the client or integration making the translation request. 
   * Used for tracking and analytics as part of the Developer Affiliate Program. Max length: 20. 
   */
  client: string;

  /** Indicates whether to translate only new and changed strings */
  translateOnlyNewStrings?: boolean;

  /** Existing target strings (for translating only new and changed strings) */
  targetStrings?: string | null;
  schema?: FileSchema | null;

  /**
   * Localization file format (e.g., "json", "arb", "po", "yaml", "xml").
   * If not specified, auto-detected from sourceStrings content.
   * See the [supported formats table](https://l10n.dev/ws/translate-i18n-files#supported-formats).
   */
  format?: string | null;
  
  /**
   * BCP-47 code of the source language (e.g., "en", "en-US", "zh-Hans-CN").
   * If not specified, auto-detected from the source file path.
   */
  sourceLanguageCode?: string | null;

  /**
   * When true, generates a glossary from source and translated target content and saves it as the
   * active glossary for this language pair for future translations.
   * Balance is debited for the full source content upfront — even when translateOnlyNewStrings is true.
   * When false (default), an internal glossary is generated only for large content at no extra cost.
   */
  generateGlossary?: boolean;

  /**
   * Glossary entries to apply during translation.
   * - `null` or omitted: use the active glossary for this language pair.
   * - Empty array `[]`: disable glossary translation entirely.
   * - One or more entries: replace the active glossary for this request.
   * Manage saved glossaries at https://l10n.dev/ws/translation-glossary
   */
  glossary?: GlossaryEntry[] | null;

  /**
   * A list of terms to use for consistent translations.
   * Synonyms listed per entry will be replaced by the preferred term.
   */
  terminology?: TerminologyEntry[] | null;

  /**
   * Linguistic instruction to apply during translation. 
   * If null or not specified, the active linguistic instruction is used. 
   * If an empty string is provided, linguistic instruction is disabled. 
   * If a non-empty string is provided, it replaces the active linguistic instruction for this request.
   * Max length: 1000. */
  instruction?: string | null;

  /** 
   * The scope of the translation request. 
   * When `translateOnlyNewStrings` is true, the scope determines which strings are considered new/changed. 
   * It allows for more granular control over which strings are translated. 
   * It can be a file name, namespace, or any other identifier.
   */
  scope?: string | null;
}
```

##### TranslationResult

```typescript
interface TranslationResult {
  /** Target language code */
  targetLanguageCode: string;

  /** Translated content as a string in the same format as source strings */
  translations?: string;

  /** Usage statistics */
  usage: TranslationUsage;

  /** Reason translation finished */
  finishReason: FinishReason;

  /** Number of chunks completed */
  completedChunks: number;

  /** Total number of chunks */
  totalChunks: number;

  /** Remaining character balance */
  remainingBalance?: number;

  /**
   * Source strings that were filtered out due to content policy violations or length limits.
   * Populated when the finish reason is 'contentFilter' or 'length'.
   * Raw text in the same format as the input (JSON, YAML, PO, etc.).
   */
  filteredStrings?: string;
}
```

##### TranslationUsage

```typescript
interface TranslationUsage {
  /** Number of characters used */
  charsUsed: number;
  details: {
    sourceStringsCharCount: number;
    terminologyCharCount: number;
    glossaryCharCount: number;
    instructionCharCount: number;
  };
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

#### GlossaryEntry

Maps a source term to a preferred target translation for use in `TranslationConfig.glossary`.

```typescript
interface GlossaryEntry {
  /** The term in the source language to be translated. Max length: 255. */
  sourceTerm: string;
  /** The preferred translation of the term in the target language. Max length: 255. */
  targetTerm: string;
  /**
   * Optional context to clarify the meaning when the term is ambiguous. Max length: 500.
   * Example: 'bank' could mean 'financial institution' or 'river bank'.
   */
  context?: string | null;
}
```

#### TerminologyEntry

Specifies a preferred term and disallowed synonyms for use in `TranslationConfig.terminology`.

```typescript
interface TerminologyEntry {
  /** The preferred term to use in translations. */
  term: string;
  /** Synonyms that should be replaced by `term`. */
  synonyms?: string[];
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
import { URLS } from 'ai-l10n-core';

// API endpoints
URLS.API_BASE    // Base URL for l10n.dev API

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

---

### L10nGlossaryService

Low-level client for the l10n.dev Glossary API.

A glossary maps source-language terms to preferred target-language translations. Only one glossary can be active per language pair — the active glossary is applied automatically during translation.

All methods always resolve (never throw). Check `response.success` before accessing `data`.

#### Constructor

```typescript
import { L10nGlossaryService } from 'ai-l10n-core';

const service = new L10nGlossaryService();
// or with a custom logger:
const service = new L10nGlossaryService(customLogger);
```

#### Methods

| Method | Description |
|--------|-------------|
| `listGlossaries(apiKey)` | Returns all glossaries for the user |
| `createGlossary(apiKey, request)` | Creates a new glossary for a language pair |
| `getGlossary(apiKey, glossaryId)` | Returns a glossary by ID |
| `updateGlossary(apiKey, glossaryId, request)` | Updates name or active status |
| `deleteGlossary(apiKey, glossaryId)` | Permanently deletes a glossary and all its entries |
| `listGlossaryEntries(apiKey, glossaryId)` | Returns all term mappings, sorted by source term |
| `addGlossaryEntry(apiKey, glossaryId, request)` | Adds a source → target term mapping |
| `updateGlossaryEntry(apiKey, glossaryId, entryId, request)` | Replaces an existing term mapping |
| `deleteGlossaryEntry(apiKey, glossaryId, entryId)` | Removes a term mapping |

#### Types

##### CreateGlossaryRequest

```typescript
interface CreateGlossaryRequest {
  /** BCP-47 source language code (e.g., "en", "en-US"). */
  sourceLanguageCode: string;
  /** BCP-47 target language code (e.g., "es", "de"). */
  targetLanguageCode: string;
  /** Optional display name. Defaults to "sourceCode → targetCode" when omitted. */
  name?: string | null;
  /**
   * Whether this glossary is active and applied during translation.
   * When true, all other glossaries for the same language pair are deactivated.
   * Defaults to true.
   */
  isActive?: boolean;
}
```

##### UpdateGlossaryRequest

```typescript
interface UpdateGlossaryRequest {
  /** Whether this glossary is active. Setting true deactivates others for the same pair. */
  isActive: boolean;
  /** Display name. Pass null to reset to the default language-pair name. */
  name?: string | null;
}
```

##### GlossaryEntryRequest

```typescript
interface GlossaryEntryRequest {
  /** The term in the source language. Max length: 255. */
  sourceTerm: string;
  /** The preferred translation of the term in the target language. Max length: 255. */
  targetTerm: string;
  /**
   * Optional context to clarify the meaning when the term is ambiguous.
   * Example: 'bank' could mean 'financial institution' or 'river bank'. Max length: 500.
   */
  context?: string | null;
}
```

##### GlossaryResponse

```typescript
interface GlossaryResponse {
  id: number;
  name: string;
  sourceLanguageCode: string;
  targetLanguageCode: string;
  isActive: boolean;
  entryCount: number;
  /** Total additional characters debited per translation when this glossary is active. */
  charsCount: number;
  createdAt: string;
  updatedAt: string;
}
```

##### GlossaryEntryResponse

```typescript
interface GlossaryEntryResponse {
  id: number;
  sourceTerm: string;
  targetTerm: string;
  context: string | null;
  createdAt: string;
  updatedAt: string;
}
```

##### GlossaryEntryListResponse

```typescript
interface GlossaryEntryListResponse {
  entries: GlossaryEntryResponse[];
  entryCount: number;
  /** Total additional characters debited per translation. */
  charsCount: number;
}
```

#### Error reasons for glossary methods

| `reason` | Description |
|----------|-------------|
| `"noApiKey"` | API key was not provided |
| `"unauthorized"` | API key is invalid (401) |
| `"forbidden"` | No permission to access the resource (403) |
| `"notFound"` | Glossary or entry does not exist (404) |
| `"badRequest"` | Validation error (400) |
| `"rateLimited"` | Rate limited (429) |
| `"serverError"` | Internal server error (500/502/503) |
| `"networkError"` | Connection or other failure |

---

### L10nInstructionService

Low-level client for the l10n.dev Linguistic Instructions API.

A linguistic instruction guides the AI's overall translation behavior — tone, style, and grammar rules. Only one instruction can be active per language pair.

Use instructions for style/tone guidance (e.g., `"Use formal tone"`). For specific term mappings, use a glossary instead.

All methods always resolve (never throw). Check `response.success` before accessing `data`.

#### Constructor

```typescript
import { L10nInstructionService } from 'ai-l10n-core';

const service = new L10nInstructionService();
// or with a custom logger:
const service = new L10nInstructionService(customLogger);
```

#### Methods

| Method | Description |
|--------|-------------|
| `listInstructions(apiKey)` | Returns all instructions for the user |
| `createInstruction(apiKey, request)` | Creates a new instruction for a language pair |
| `getInstruction(apiKey, instructionId)` | Returns an instruction by ID |
| `updateInstruction(apiKey, instructionId, request)` | Updates text, name, or active status |
| `deleteInstruction(apiKey, instructionId)` | Permanently deletes an instruction |

#### Types

##### CreateInstructionRequest

```typescript
interface CreateInstructionRequest {
  /** BCP-47 source language code (e.g., "en", "en-US"). */
  sourceLanguageCode: string;
  /** BCP-47 target language code (e.g., "es", "de"). */
  targetLanguageCode: string;
  /**
   * The linguistic rule or instruction text that guides the AI's translation behavior.
   * Examples: "Use formal tone", "Place adjectives after the noun". Max length: 1000.
   */
  text: string;
  /** Optional display name. Defaults to "sourceCode → targetCode" when omitted. */
  name?: string | null;
  /**
   * Whether this instruction is active and applied during translation.
   * When true, all other instructions for the same language pair are deactivated.
   * Defaults to true.
   */
  isActive?: boolean;
}
```

##### UpdateInstructionRequest

```typescript
interface UpdateInstructionRequest {
  /** The linguistic rule or instruction text. Max length: 1000. */
  text: string;
  /** Whether this instruction is active. Setting true deactivates others for the same pair. */
  isActive: boolean;
  /** Display name. Pass null to reset to the default language-pair name. */
  name?: string | null;
}
```

##### InstructionResponse

```typescript
interface InstructionResponse {
  id: number;
  name: string;
  sourceLanguageCode: string;
  targetLanguageCode: string;
  isActive: boolean;
  text: string;
  /** Total additional characters debited per translation when this instruction is active. */
  charsCount: number;
  createdAt: string;
  updatedAt: string;
}
```

#### Error reasons for instruction methods

Same set as glossary methods: `"noApiKey"`, `"unauthorized"`, `"forbidden"`, `"notFound"`, `"badRequest"`, `"rateLimited"`, `"serverError"`, `"networkError"`.

---

## License

MIT

## Credits

Powered by [l10n](https://l10n.dev).dev — AI-powered localization service
