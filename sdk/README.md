# ai-l10n-sdk

[![npm version](https://img.shields.io/npm/v/ai-l10n-sdk.svg)](https://www.npmjs.com/package/ai-l10n-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

This is the core SDK package for ai-l10n, providing programmatic access to AI translation capabilities. Use this package when you want to integrate localization functionality into your applications without the CLI tool.

Supports JSON, JSONC, Flutter ARB, Shopify theme files, YAML, PO (gettext), XLIFF, and all other text-based localization formats. The file format is derived from the extension and passed to the API. See the [full supported formats list](https://l10n.dev/ws/translate-i18n-files#supported-formats).

Powered by [l10n](https://l10n.dev).dev

## Installation

```bash
npm install ai-l10n-sdk
```

## Related Packages

- [ai-l10n-core](https://www.npmjs.com/package/ai-l10n-core) — Core translation API client, logger interface, and shared types
- [ai-l10n](https://www.npmjs.com/package/ai-l10n) — CLI tool built on this SDK

## Usage Examples

### Basic Translation

```typescript
import { AiTranslator } from 'ai-l10n-sdk';

const translator = new AiTranslator();

// Basic translation
const result = await translator.translate({
  sourceFile: './locales/en.json',
  targetLanguages: ['es', 'fr', 'de'],
});

console.log(`Translated to ${result.results.length} languages`);
console.log(`Used ${result.totalCharsUsed} characters`);
```

### Update Existing Translations

```typescript
// Only translate new keys, preserve existing translations
// If targetLanguages is not provided or empty, 
// languages will be auto-detected from project structure
await translator.translate({
  sourceFile: './locales/en.json',
  translateOnlyNewStrings: true,
});
```

### Advanced Configuration

```typescript
import { AiTranslator, TranslationConfig } from 'ai-l10n-sdk';

const translator = new AiTranslator();

const config: TranslationConfig = {
  sourceFile: './locales/en.json',
  targetLanguages: ['es', 'fr', 'de', 'ja', 'zh-CN'],
  apiKey: 'your-api-key', // Optional, can use env variable
  generatePluralForms: true,
  useShortening: false,
  useContractions: true,
  translateMetadata: false, // Keep metadata unchanged (default)
  saveFilteredStrings: true,
  translateOnlyNewStrings: false,
  verbose: true,
};

const result = await translator.translate(config);

// Check results
for (const translation of result.results) {
  if (translation.success) {
    console.log(`✅ ${translation.language}: ${translation.outputPath}`);
  } else {
    console.log(`❌ ${translation.language}: ${translation.error}`);
  }
}
```

### Flutter ARB Files

Full support for ARB (Application Resource Bundle) files used in Flutter applications:

```typescript
const result = await translator.translate({
  sourceFile: './lib/l10n/app_en_US.arb',
  targetLanguages: ['es_ES', 'fr_FR', 'de']
});
```

**ARB Features:**
- **Automatic Metadata Updates**: The API automatically updates `@@locale` to the target language code and `@@last_modified` to the current UTC timestamp
- **Metadata Translation Control**: Use `translateMetadata: true` to translate description metadata entries (e.g., `@key` descriptions). By default (`false`), metadata remains in the source language
- **Custom Prefixes**: Supports custom file naming patterns (e.g., `app_en_US.arb`, `my_app_fr.arb`)

### JSONC Files

Full support for JSONC (JSON with Comments) files:

```typescript
const result = await translator.translate({
  sourceFile: './locales/en.jsonc',
  targetLanguages: ['es', 'fr', 'de']
});
```

**JSONC Features:**
- Works exactly like JSON files but with `.jsonc` extension
- Auto-detects `.jsonc` files in project structure alongside `.json` files

### Shopify Theme Localization

Full support for Shopify theme localization file patterns:

```typescript
const result = await translator.translate({
  sourceFile: './locales/en.default.schema.json',
  targetLanguages: ['es-ES', 'fr', 'de']
});
// Creates: es-ES.schema.json, fr.schema.json, de.schema.json
```

**Shopify Theme Features:**
- **Automatic Pattern Recognition**: Detects files with `.default.` in the name (e.g., `en.default.schema.json`)
- **Smart Output Naming**: Removes `.default.` from target files while preserving the `.schema.` suffix
- **Language Detection**: Auto-detects target languages from existing files (e.g., `es-ES.schema.json`, `fr.schema.json`)

### Other Text-Based Formats (YAML, PO, XLIFF, and more)

All text-based localization formats are supported. The format is derived from the file extension and sent to the API automatically:

```typescript
// YAML
const result = await translator.translate({
  sourceFile: './locales/en.yaml',
  targetLanguages: ['es', 'fr', 'de']
});

// PO (gettext)
const result = await translator.translate({
  sourceFile: './locales/en.po',
  targetLanguages: ['es', 'fr']
});

// XLIFF
const result = await translator.translate({
  sourceFile: './locales/en.xliff',
  targetLanguages: ['es', 'de']
});
```

For the full list of supported formats see the [API documentation](https://l10n.dev/ws/translate-i18n-files#supported-formats).

### Multiple Files

```typescript
const files = ['./locales/en/common.json', './locales/en/admin.json', './locales/en/errors.json'];

for (const file of files) {
  await translator.translate({
    sourceFile: file,
    targetLanguages: ['es', 'fr', 'de'],
  });
}
```

## Core API

`ILogger`, `ConsoleLogger`, `L10nTranslationService`, and all related types are part of the core library. See [ai-l10n-core](https://www.npmjs.com/package/ai-l10n-core) for full documentation. These are also re-exported from `ai-l10n-sdk` for convenience.

## API Reference

### AiTranslator Class

#### Constructor

```typescript
import { AiTranslator, ILogger, ConsoleLogger } from 'ai-l10n-sdk';

// Default: uses ConsoleLogger
const translator = new AiTranslator();

// With a custom logger (implements ILogger)
const customLogger: ILogger = new ConsoleLogger();
const translatorWithLogger = new AiTranslator(customLogger);
```

Creates an instance of AiTranslator.

**Parameters:**
- `logger?: ILogger` — Optional custom logger. Defaults to `ConsoleLogger` if not provided.

**Implementation Details:**
- **Project Structure Detection**: When `targetLanguages` is not specified, the translator automatically detects target languages by scanning the project directory structure (e.g., `locales/en.json`, `locales/es.json` → detects `es`)
- **File Reading**: Reads i18n files from the file system using the `sourceFile` path
- **Results Saving**: Automatically saves translated files adjacent to the source file with appropriate language suffixes (e.g., `en.json` → `es.json`, `fr.json`)
- **Incremental Updates**: When `translateOnlyNewStrings: true`, reads existing target files, merges new translations, and overwrites the files

**Notes:**
- If apiKey is not provided in TranslationConfig, the SDK uses the L10N_API_KEY environment variable.

#### Methods

##### `translate(config: TranslationConfig): Promise<TranslationSummary>`

Translates a i18n file to one or more target languages.

**Parameters:**
- `config: TranslationConfig` - Translation configuration object

**Returns:** `Promise<TranslationSummary>` - Summary of translation results

### Types

#### TranslationConfig

Configuration options for translation.

```typescript
interface TranslationConfig {
  /**
   * Path to the source file to translate.
   * Supports JSON, JSONC, ARB, YAML, PO, XLIFF, and all other text-based localization formats.
   * The format is derived from the file extension. See the [full supported formats list](https://l10n.dev/ws/translate-i18n-files#supported-formats).
   */
  sourceFile: string;

  /**
   * Target language codes (e.g., ["es", "fr", "de-DE", "zh-Hans-CN"])
   * If not provided, will be auto-detected from project structure
   */
  targetLanguages?: string[];

  /**
   * API key for l10n.dev service
   * Can also be set via L10N_API_KEY environment variable
   */
  apiKey?: string;

  /**
   * Generates additional plural form strings (e.g., for i18next) with plural suffixes.
   * Do not enable for strict source-to-target mapping (default: false)
   */
  generatePluralForms?: boolean;

  /**
   * Use shortening in translations (default: false)
   */
  useShortening?: boolean;

  /**
   * Use contractions in translations (default: true)
   */
  useContractions?: boolean;

  /**
   * Translate metadata along with UI strings (default: false)
   * For example, in Flutter ARB files, metadata entries like `@key` contain descriptions
   * that can also be translated. Disabling this option ensures that metadata remains
   * unchanged in the target files.
   */
  translateMetadata?: boolean;

  /**
   * Save filtered strings to separate file (default: true)
   * Filtered strings are in i18n JSON format and contain source strings that violated
   * content policies. Review the translation for successfully translated content.
   */
  saveFilteredStrings?: boolean;

  /**
   * If true, update existing files with only new translations
   * If false, create new files with unique names (default: false)
   */
  translateOnlyNewStrings?: boolean;

  /**
   * Enable verbose logging (default: false)
   */
  verbose?: boolean;
}
```

#### TranslationSummary

Result of a translation operation.

```typescript
interface TranslationSummary {
  /** Whether at least one translation succeeded */
  success: boolean;
  
  /** Array of individual translation results */
  results: TranslationOutput[];
  
  /** Total characters used across all translations */
  totalCharsUsed: number;
  
  /** Remaining character balance (if available) */
  remainingBalance?: number;
}
```

#### TranslationOutput

Result of a single language translation.

```typescript
interface TranslationOutput {
  /** Whether translation succeeded */
  success: boolean;
  
  /** Target language code */
  language: string;
  
  /** Path to output file (if successful) */
  outputPath?: string;
  
  /** Characters used for this translation */
  charsUsed?: number;
  
  /** Error message (if failed) */
  error?: string;
}
```

### L10nApiClient

Extends `L10nTranslationService` with the `getLanguages()` endpoint. Inherits `translate()` and `predictLanguages()` from the parent class.

#### Constructor

```typescript
import { L10nApiClient, ConsoleLogger } from 'ai-l10n-sdk';

// Default: uses ConsoleLogger
const client = new L10nApiClient();

// With a custom logger
const client = new L10nApiClient(new ConsoleLogger());
```

**Parameters:**
- `logger?: ILogger` — Optional custom logger. Defaults to `ConsoleLogger`

#### Methods

##### `getLanguages(options?): Promise<SupportedLanguagesResponse>`

Retrieves a list of supported languages, optionally filtered by codes or proficiency levels.

```typescript
// Get all supported languages
const { languages } = await client.getLanguages();

// Filter by proficiency level
const { languages } = await client.getLanguages({
  proficiencyLevels: ['strong', 'high'],
});

// Filter by specific codes
const { languages } = await client.getLanguages({
  codes: ['en', 'es', 'fr'],
});
```

Inherited from `L10nTranslationService`:
- `translate(request, apiKey)` — Translate content
- `predictLanguages(input, limit?)` — Predict language codes

#### Types

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

### I18nProjectManager

Utility class for managing i18n project structure detection, language code validation, and file path generation.

#### Constructor

```typescript
import { I18nProjectManager, ILogger, ConsoleLogger } from 'ai-l10n-sdk';

// Default: uses ConsoleLogger
const manager = new I18nProjectManager();

// With a custom logger
const customLogger: ILogger = new ConsoleLogger();
const managerWithLogger = new I18nProjectManager(customLogger);
```

Creates an instance of I18nProjectManager.

**Parameters:**
- `logger?: ILogger` — Optional custom logger. Defaults to `ConsoleLogger` if not provided.

#### Methods

##### `detectLanguagesFromProject(sourceFilePath: string): string[]`

Detects target language codes from the project structure by scanning directories and files.

**Parameters:**
- `sourceFilePath: string` - Absolute path to the source file

**Returns:** `string[]` - Array of detected language codes, sorted alphabetically

**Behavior:**
- **Folder-based structure**: Scans parent directory for language-named folders (e.g., `locales/en/`, `locales/es/`)
- **File-based structure**: Scans directory for language-named files (e.g., `en.json`, `es.json`, `app_en.arb`)
- Automatically excludes the source language from results
- Handles both `.json` and `.jsonc` files when source is JSON

**Example:**
```typescript
const manager = new I18nProjectManager();
const languages = manager.detectLanguagesFromProject('./locales/en.json');
// Returns: ['es', 'fr', 'de']
```

##### `generateTargetFilePath(sourceFilePath: string, targetLanguage: string): string`

Generates the target file path for a translated file based on the detected project structure.

**Parameters:**
- `sourceFilePath: string` - Absolute path to the source file
- `targetLanguage: string` - Target language code (e.g., `"es"`, `"fr-FR"`, `"zh-Hans-CN"`)

**Returns:** `string` - Absolute path where the translated file should be saved

**Behavior:**
- **Folder-based**: Creates `{basePath}/{language}/{filename}` (e.g., `locales/es/common.json`)
- **File-based JSON**: Creates `{basePath}/{language}{suffix}.{ext}` (e.g., `locales/es.schema.json`)
- **File-based ARB**: Creates `{basePath}/{prefix}{language}.arb` (e.g., `lib/l10n/app_es.arb`)
- Automatically creates target directories if they don't exist
- Handles Shopify theme patterns (`.default.schema.json` → `.schema.json`)
- Converts hyphens to underscores for ARB files

**Example:**
```typescript
const manager = new I18nProjectManager();

// Folder-based
manager.generateTargetFilePath('./locales/en/common.json', 'es');
// Returns: './locales/es/common.json'

// File-based JSON
manager.generateTargetFilePath('./locales/en.json', 'es');
// Returns: './locales/es.json'

// File-based ARB
manager.generateTargetFilePath('./lib/l10n/app_en_US.arb', 'es_ES');
// Returns: './lib/l10n/app_es_ES.arb'

// Shopify theme
manager.generateTargetFilePath('./locales/en.default.schema.json', 'es-ES');
// Returns: './locales/es-ES.schema.json'
```

##### `getUniqueFilePath(filePath: string): string`

Generates a unique file path by appending a counter if the file already exists.

**Parameters:**
- `filePath: string` - Desired file path

**Returns:** `string` - Unique file path (original or with counter suffix)

**Example:**
```typescript
const manager = new I18nProjectManager();

// If 'output.json' doesn't exist
manager.getUniqueFilePath('./output.json');
// Returns: './output.json'

// If 'output.json' exists
manager.getUniqueFilePath('./output.json');
// Returns: './output (1).json'

// If 'output.json' and 'output (1).json' exist
manager.getUniqueFilePath('./output.json');
// Returns: './output (2).json'
```

##### `normalizeLanguageCode(code: string): string`

Normalizes language codes to a consistent BCP 47 format.

**Parameters:**
- `code: string` - Language code to normalize (accepts hyphens or underscores)

**Returns:** `string` - Normalized language code in format: `language[-Script][-REGION]`

**Normalization Rules:**
- Language: lowercase (e.g., `"EN"` → `"en"`)
- Script: Title case (e.g., `"hans"` → `"Hans"`)
- Region: uppercase (e.g., `"us"` → `"US"`)
- Separator: always hyphen `-` (underscores converted to hyphens)

**Example:**
```typescript
const manager = new I18nProjectManager();

manager.normalizeLanguageCode('en');          // Returns: 'en'
manager.normalizeLanguageCode('en-us');       // Returns: 'en-US'
manager.normalizeLanguageCode('en_US');       // Returns: 'en-US'
manager.normalizeLanguageCode('zh_hans');     // Returns: 'zh-Hans'
manager.normalizeLanguageCode('zh-Hans-CN');  // Returns: 'zh-Hans-CN'
manager.normalizeLanguageCode('ZH_HANS_CN');  // Returns: 'zh-Hans-CN'
```

##### `validateLanguageCode(code: string): boolean`

Validates whether a string is a valid BCP 47 language code.

**Parameters:**
- `code: string` - Language code to validate

**Returns:** `boolean` - `true` if valid, `false` otherwise

**Validation Rules:**
- **Case-insensitive validation**: Accepts language codes in any case (e.g., `"EN"`, `"en"`, `"EN-US"`)
- Language: 2-3 letters (e.g., `en`, `eng`, `EN`)
- Script (optional): 4 letters (e.g., `Hans`, `Latn`, `hans`)
- Region (optional): 2-3 letters or 3 digits (e.g., `US`, `us`, `419`)
- Separators: hyphens `-` or underscores `_`

**Important:** This method only validates the format. For proper BCP 47 compliance, use `normalizeLanguageCode()` to convert validated codes to the correct case format (language lowercase, Script title case, REGION uppercase).

**Example:**
```typescript
const manager = new I18nProjectManager();

// All valid (case-insensitive)
manager.validateLanguageCode('en');           // Returns: true
manager.validateLanguageCode('EN');           // Returns: true
manager.validateLanguageCode('en-US');        // Returns: true
manager.validateLanguageCode('EN-US');        // Returns: true
manager.validateLanguageCode('en-us');        // Returns: true
manager.validateLanguageCode('zh-Hans-CN');   // Returns: true
manager.validateLanguageCode('ZH-HANS-CN');   // Returns: true

// Invalid
manager.validateLanguageCode('invalid');      // Returns: false
manager.validateLanguageCode('');             // Returns: false

// Normalize after validation for proper BCP 47 format
const code = 'EN-US';
if (manager.validateLanguageCode(code)) {
  const normalized = manager.normalizeLanguageCode(code);
  console.log(normalized); // 'en-US'
}
```

##### `extractLanguageCode(fileName: string): string | null`

Extracts language code from a file name, handling various file patterns.

**Parameters:**
- `fileName: string` - File name (with or without extension)

**Returns:** `string | null` - Extracted language code, or `null` if none found

**Supported Patterns:**
- **JSON/JSONC**: `en.json`, `es-ES.json`, `en.jsonc`
- **ARB**: `app_en.arb`, `app_en_US.arb`, `my_app_fr.arb`
- **Shopify**: `en.default.schema.json`, `es-ES.schema.json`

**Example:**
```typescript
const manager = new I18nProjectManager();

// JSON files
manager.extractLanguageCode('en.json');                    // Returns: 'en'
manager.extractLanguageCode('es-ES.json');                 // Returns: 'es-ES'
manager.extractLanguageCode('fr.jsonc');                   // Returns: 'fr'

// ARB files
manager.extractLanguageCode('app_en.arb');                 // Returns: 'en'
manager.extractLanguageCode('app_en_US.arb');              // Returns: 'en_US'
manager.extractLanguageCode('my_app_fr.arb');              // Returns: 'fr'

// Shopify theme
manager.extractLanguageCode('en.default.schema.json');     // Returns: 'en'
manager.extractLanguageCode('es-ES.schema.json');          // Returns: 'es-ES'

// Invalid files
manager.extractLanguageCode('readme.md');                  // Returns: null
manager.extractLanguageCode('invalid.json');               // Returns: null
```

## License

MIT

## Credits

Powered by [l10n.dev](https://l10n.dev) - AI-powered localization service
