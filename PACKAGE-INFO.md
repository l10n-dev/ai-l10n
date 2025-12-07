# ai-l10n Package Structure

## Overview
A complete npm package for AI-powered localization file translation.

## Directory Structure

```
ai-l10n/
├── src/                          # TypeScript source files
│   ├── index.ts                  # Main entry point & API
│   ├── cli.ts                    # CLI tool
│   ├── apiKeyManager.ts          # API key management
│   ├── translationService.ts     # Translation service client
│   ├── i18nProjectManager.ts     # Project structure detection
│   └── constants.ts              # Shared constants
│
├── dist/                         # Compiled JavaScript + type definitions
│   ├── index.js                  # Main entry
│   ├── index.d.ts               # TypeScript declarations
│   ├── cli.js                   # CLI executable
│   └── ...                      # Other compiled files
│
├── examples/                     # Usage examples
│   ├── README.md                # Examples documentation
│   ├── simple.js                # Simple JavaScript example
│   ├── basic-usage.ts           # Basic TypeScript example
│   ├── advanced-usage.ts        # Advanced configuration
│   ├── update-existing.ts       # Update translations
│   ├── flutter-arb.ts           # Flutter ARB example
│   ├── batch-translate.ts       # Multiple files
│   ├── translate-config.json    # Single file config
│   └── translate-config-multi.json # Multi-file config
│
├── package.json                 # Package configuration
├── tsconfig.json               # TypeScript configuration
├── README.md                   # Complete documentation
├── QUICKSTART.md              # Quick start guide
├── CHANGELOG.md               # Version history
├── LICENSE                    # AGPL-3.0 License
├── .gitignore                 # Git ignore rules
└── .npmignore                 # NPM publish ignore rules
```

## Key Features

### 1. **Programmatic API** (`src/index.ts`)
- `AiTranslator` class with `translate()` method
- TypeScript support with full type definitions
- Configuration interface `TranslationConfig`
- Result types `TranslationSummary` and `TranslationOutput`

### 2. **CLI Tool** (`src/cli.ts`)
- `ai-l10n translate` - Translate files
- `ai-l10n config` - Manage API key
- `ai-l10n batch` - Batch translation from config file

### 3. **API Key Management** (`src/apiKeyManager.ts`)
- Store in user home directory (~/.ai-l10n/config.json)
- Environment variable support (L10N_API_KEY)
- Inline configuration option

### 4. **Translation Service** (`src/translationService.ts`)
- HTTP client for l10n.dev API
- Error handling

### 5. **Project Structure Detection** (`src/i18nProjectManager.ts`)
- Auto-detect folder-based structure (en/, es/, fr/)
- Auto-detect file-based JSON (en.json, es.json)
- Auto-detect file-based ARB (app_en.arb, app_es.arb)
- Language code validation and normalization

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `sourceFile` | string | required | Source file path |
| `targetLanguages` | string[] | auto-detect | Target languages |
| `apiKey` | string | env/stored | API key |
| `generatePluralForms` | boolean | false | Generate plural forms with suffixes (don't use for strict mapping) |
| `useShortening` | boolean | false | Use shortening |
| `useContractions` | boolean | true | Use contractions |
| `saveFilteredStrings` | boolean | true | Save filtered strings |
| `translateOnlyNewStrings` | boolean | false | Update mode |
| `verbose` | boolean | false | Detailed logging |

## Usage Examples

### CLI
```bash
npx ai-l10n translate ./locales/en.json --languages es,fr,de
```

### Programmatic
```typescript
import { AiTranslator } from 'ai-l10n';

const translator = new AiTranslator();
const result = await translator.translate({
  sourceFile: './locales/en.json',
  targetLanguages: ['es', 'fr', 'de'],
});
```

### NPM Script
```json
{
  "scripts": {
    "translate": "ai-l10n translate ./locales/en.json"
  }
}
```

## Publishing to NPM

1. **Build the package:**
   ```bash
   npm run build
   ```

2. **Test locally:**
   ```bash
   npm link
   cd /path/to/test/project
   npm link ai-l10n
   ```

3. **Publish to NPM:**
   ```bash
   npm publish
   ```

## Package Metadata

- **Name:** ai-l10n
- **Version:** 1.0.0
- **License:** AGPL-3.0
- **Main Entry:** dist/index.js
- **Type Definitions:** dist/index.d.ts
- **CLI Binary:** dist/cli.js
- **Node Version:** >= 14.0.0

## Dependencies

- **commander:** CLI framework for argument parsing
- **@types/node:** TypeScript definitions for Node.js
- **typescript:** TypeScript compiler

## Files Included in NPM Package

- `dist/` - Compiled JavaScript and type definitions
- `README.md` - Documentation
- `LICENSE` - AGPL-3.0 License

Files excluded (via .npmignore):
- `src/` - TypeScript source
- `examples/` - Example code
- Development configuration files

## Next Steps

1. **Test the package locally** using `npm link`
2. **Update repository URL** in package.json if needed
3. **Add unit tests** (optional but recommended)
4. **Set up CI/CD** for automated publishing
5. **Create GitHub releases** with changelog
6. **Publish to NPM** when ready

## Support

- GitHub: https://github.com/AntonovAnton/ai-l10n
- Email: support@l10n.dev
- Website: https://l10n.dev
