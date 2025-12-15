# ai-l10n

[![npm version](https://img.shields.io/npm/v/ai-l10n.svg)](https://www.npmjs.com/package/ai-l10n)
[![License: AGPL-3.0](https://img.shields.io/badge/agpl-v3.svg)](https://opensource.org/license/agpl-v3)

AI-powered translation for app localization. Automatically translate your i18n files to 165+ languages using AI. Supports JSON and Flutter ARB formats with intelligent project structure detection.

Powered by [l10n](https://l10n.dev).dev

![ai-localization example](https://raw.githubusercontent.com/l10n-dev/ai-l10n/main/demonstration-dark-ai-l10n.gif)

## Features

- 🤖 **AI-Powered Translations** - Context-aware translations using advanced AI
- 🌍 **165 Languages** - Translate to any of 165 supported languages with varying proficiency levels
- 📁 **Smart Detection** - Automatically detects target languages from your project structure
- 🔄 **Incremental Updates** - Translate only new strings while preserving existing translations
- 🔒 **Type Safety** - Preserves JSON data types—numbers stay numbers, booleans stay booleans, null values are maintained
- 🎯 **Multiple Formats** - Supports JSON and Flutter ARB files with full metadata handling
- ⚙️ **Flexible Configuration** - Use via CLI, programmatically, or in CI/CD pipelines
- 🌐 **i18next Plural Forms Support** - Automatically generates all required plural form strings with correct suffixes. For languages with complex pluralization rules (like Russian, Arabic, or Polish), ensures every necessary form is created
- 🛠️ **Developer-Friendly** - Preserves placeholders, HTML tags, and formatting while adapting dates and numbers to target locales. Intelligently avoids translating proper names, URLs, and technical terms. Learn more about [I18N Translation Using AI](https://l10n.dev/help/i18n-translation-using-ai)
- 🕵️ **Smart Error Detection & Chunking** - Automatically detects and retries if placeholders or formatting are lost. For large files, splits content into manageable chunks while maintaining context. Prevents issues common with direct AI uploads (Claude/GPT) where exceeding ~16,000 characters causes content loss
- 🔍 **Content Filtering** - Automatic content filtering at moderate sensitivity. Filtered strings saved separately in i18n JSON format for review
- 📊 **Usage Tracking** - Monitor character usage and remaining balance
- 💰 **Free Tier** - Get 30,000 characters free every month

## Installation

### For CLI + Programmatic (SDK)
```bash
npm install ai-l10n
```

### For SDK Only

```bash
npm install @ai-l10n/sdk
```

## Getting Started

### 1. Get Your API Key

Get your free API key from [l10n.dev/ws/keys](https://l10n.dev/ws/keys)

### 2. Configure API Key

You can provide your API key in three ways:

**Option A: Save it globally**
```bash
npx ai-l10n config --api-key YOUR_API_KEY
```

**Option B: Use environment variable**
```bash
export L10N_API_KEY=your_api_key_here
```

**Option C: Pass it directly in code or CLI**
```bash
npx ai-l10n translate path/to/file.json --api-key YOUR_API_KEY
```

### 3. Translate Your Files

#### Basic Translation

```bash
# Auto-detect target languages from project structure
npx ai-l10n translate path/to/en.json

# Specify target languages
npx ai-l10n translate path/to/en.json --languages es,fr,de

# Update existing files with only new translations
npx ai-l10n translate path/to/en.json --update
```

#### Advanced Options

```bash
npx ai-l10n translate ./locales/en.json \
  --languages es,fr,de \
  --plural \                    # Generate plural forms (adds suffixes, e.g., for i18next)
  --shorten \                   # Use shortening
  --no-contractions \           # Don't use contractions (e.g., "don't" vs "do not")
  --update \                    # Update existing files only
  --verbose                     # Detailed logging
```

#### Batch Translation

Create a config file `translate-config.json`:

```json
[
  {
    "sourceFile": "./locales/en/common.json",
    "targetLanguages": ["pl", "ru", "ar"],
    "generatePluralForms": true,
    "translateOnlyNewStrings": true
  },
  {
    "sourceFile": "./locales/en/admin.json",
    "targetLanguages": ["pl", "ru", "ar", "de"]
  }
]
```

Run batch translation:

```bash
npx ai-l10n batch translate-config.json
```

#### Configuration Management

```bash
# View current API key status
npx ai-l10n config

# Set API key
npx ai-l10n config --api-key YOUR_API_KEY

# Clear API key
npx ai-l10n config --clear
```

### Programmatic Usage

```typescript
import { AiTranslator } from 'ai-l10n';

const translator = new AiTranslator();

const result = await translator.translate({
  sourceFile: './locales/en.json',
  targetLanguages: ['es', 'fr', 'de'],
});
```

**📚 See the [@ai-l10n/sdk README](https://github.com/AntonovAnton/ai-l10n/tree/main/sdk#readme) for:**
- Complete API documentation and TypeScript interfaces
- Advanced usage examples
- Custom logger integration
- Error handling and type definitions

### NPM Scripts Integration

Add scripts to your `package.json`:

```json
{
  "scripts": {
    "translate": "ai-l10n translate ./locales/en.json",
    "translate:update": "ai-l10n translate ./locales/en.json --update",
    "translate:all": "ai-l10n batch translate-config.json"
  }
}
```

Then run:

```bash
npm run translate
npm run translate:update
npm run translate:all
```

### CI/CD Integration

#### GitHub Actions

```yaml
name: Auto-translate

on:
  push:
    paths:
      - 'locales/en.json'

jobs:
  translate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Translate
        env:
          L10N_API_KEY: ${{ secrets.L10N_API_KEY }}
        run: npx ai-l10n translate ./locales/en.json --update
      
      - name: Commit translations
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add locales/
          git commit -m "Auto-translate localization files" || exit 0
          git push
```

#### GitLab CI

```yaml
translate:
  stage: build
  script:
    - npm install
    - npx ai-l10n translate ./locales/en.json --update
  only:
    changes:
      - locales/en.json
  variables:
    L10N_API_KEY: $L10N_API_KEY
```

#### Jenkins

```groovy
pipeline {
  agent any
  
  environment {
    L10N_API_KEY = credentials('l10n-api-key')
  }
  
  stages {
    stage('Translate') {
      steps {
        sh 'npm install'
        sh 'npx ai-l10n translate ./locales/en.json --update'
      }
    }
  }
}
```

## Project Structure

ai-l10n automatically detects your project structure and generates translations accordingly.

### Folder-Based Structure

```
locales/
  en/
    common.json
    errors.json
  es/              # Auto-detected
    common.json
    errors.json
  zh-Hans-CN/      # Auto-detected
    common.json
```

### File-Based Structure (JSON)

```
locales/
  en.json          # Source
  es.json          # Auto-detected
  fr-FR.json       # Auto-detected
  zh-Hans-CN.json  # Auto-detected
```

### File-Based Structure (Flutter ARB)

```
lib/l10n/
  app_en.arb           # Source
  app_es.arb           # Auto-detected
  app_fr_FR.arb        # Auto-detected
  app_zh_Hans-CN.arb   # Auto-detected
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `sourceFile` | `string` | **required** | Path to source file (JSON or ARB) |
| `targetLanguages` | `string[]` | auto-detect | Target language codes (e.g., `["es", "fr", "de"]`) |
| `apiKey` | `string` | env/stored | API key for l10n.dev |
| `generatePluralForms` | `boolean` | `false` | Generate plural forms with suffixes (e.g., for i18next). Don't use for strict source-to-target mapping |
| `useShortening` | `boolean` | `false` | Use shortening in translations |
| `useContractions` | `boolean` | `true` | Use contractions in translations (using contractions makes the translation less formal) |
| `saveFilteredStrings` | `boolean` | `true` | Save filtered strings (i18n JSON format with source strings excluded due to content policy violations) to separate .filtered file |
| `translateOnlyNewStrings` | `boolean` | `false` | Update existing files with only new translations |
| `verbose` | `boolean` | `false` | Enable detailed logging |

## Content Filtering

The service uses automated content filtering systems configured at moderate sensitivity levels to balance safety with service availability. When content is filtered:

- **Filtered strings are saved** in i18n JSON format to a `.filtered` file (if `saveFilteredStrings` is enabled)
- **Content filtering operates automatically** and does not constitute editorial control over your content

If strings are filtered, you'll see:
```
⚠️ X string(s) were excluded due to content policy violations
ℹ️ View content policy at: https://l10n.dev/terms-of-service#content-policy
📝 Filtered strings saved to: path/to/file.filtered.json
```

## Language Support

l10n.dev supports 165+ languages with varying proficiency levels:

- **Strong (12 languages)**: English, Spanish, French, German, Chinese, Russian, Portuguese, Italian, Japanese, Korean, Arabic, Hindi
- **High (53 languages)**: Most European and Asian languages including Dutch, Swedish, Polish, Turkish, Vietnamese, Thai, and more
- **Moderate (100+ languages)**: Wide range of world languages

## Pricing

- **Free Characters**: 30,000 characters free every month
- **Pay-as-you-go**: Affordable character-based pricing with no subscription required
- **Current Pricing**: Visit [l10n.dev/#pricing](https://l10n.dev/#pricing) for up-to-date rates

## Language Codes

Use standard language codes (BCP-47 with optional script and region):

- Simple: `es`, `fr`, `de`, `ja`, `zh`
- With region: `en-US`, `en-GB`, `pt-BR`, `zh-CN`
- With script: `zh-Hans`, `zh-Hant`
- Full format: `zh-Hans-CN`

For ARB files, use underscores: `en_US`, `zh_Hans_CN`

## Troubleshooting

### API Key Issues

```bash
# Check if API key is configured
npx ai-l10n config

# Set new API key
npx ai-l10n config --api-key YOUR_API_KEY

# Or use environment variable
export L10N_API_KEY=your_api_key_here
```

### No Languages Detected

If auto-detection fails, specify languages explicitly:

```bash
npx ai-l10n translate ./locales/en.json --languages es,fr,de
```

### Insufficient Balance

Purchase more characters at [l10n.dev/#pricing](https://l10n.dev/#pricing)

## Related Projects

- [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=l10n-dev.translate-i18n-json) - Translate directly in VS Code

## Support

- 📧 Email: support@l10n.dev
- 🐛 Issues: [GitHub Issues](https://github.com/l10n-dev/ai-l10n/issues)
- 📚 API Documentation: [l10n.dev/api/doc](https://l10n.dev/api/doc)
- 🌐 Website: [l10n](https://l10n.dev).dev

## Privacy & Security

- **Secure API Keys**: Stored securely in your home directory (~/.ai-l10n/config.json) or via environment variables
- **No Data Storage**: Source code and translations are not stored on our servers beyond processing time
- **Encrypted Communication**: All communication with l10n.dev API uses HTTPS encryption
- **Privacy First**: Built by developers for developers with privacy, reliability, and quality as top priorities

> **💡 Tip for Large-Scale Translation:**
>
> For translating many files at once, use the [I18N File Translation UI](https://l10n.dev/ws/translate-i18n-files) on l10n.dev.
>
> This npm package translates files in real-time via the [Translate JSON API](https://l10n.dev/api/doc/#tag/json-translation) and does not store your JSON or translations on our servers. For very large files, translation may take several minutes.
>
> On the l10n.dev platform, you can:
> - Securely create translation jobs for batch processing
> - Set custom terminology for consistent translations
> - Monitor progress in real-time
> - Download files when complete with full control (delete anytime)
> - Use the API for automation and CI/CD workflows

## Important: Working with Arrays in JSON

⚠️ **When using "Translate Only New Strings"**: If your JSON contains arrays (not just objects), ensure array indexes in your target file match those in the source file. When adding new strings, always append them to the end of the array.

**Example:**

```json
// ✅ CORRECT: New items added at the end
// source.json
["Apple", "Banana", "Orange"]

// target.json (existing)
["Manzana", "Plátano"]

// After translation (new item appended)
["Manzana", "Plátano", "Naranja"]

// ❌ INCORRECT: Items inserted in the middle
// This will cause misalignment!
["Apple", "Cherry", "Banana", "Orange"]
```

For object-based JSON structures (recommended for i18n), this is not a concern as translations are matched by key names.


## License

AGPL-3.0

## Credits

Powered by [l10n.dev](https://l10n.dev) - AI-powered localization service
