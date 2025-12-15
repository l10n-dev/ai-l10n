# Quick Start Guide

Get started with ai-l10n in 5 minutes!

## 1. Installation

```bash
npm install ai-l10n
```

## 2. Get API Key

Visit [l10n.dev/ws/keys](https://l10n.dev/ws/keys) to get your free API key.

## 3. Set API Key

```bash
npx ai-l10n config --api-key YOUR_API_KEY
```

Or use environment variable:
```bash
export L10N_API_KEY=your_api_key_here
```

## 4. Prepare Your Files

Organize your localization files in one of these structures:

### Option A: Folder-based
```
locales/
  en/
    common.json
  es/
  fr/
```

### Option B: File-based (JSON)
```
locales/
  en.json
  es.json
  fr.json
```

### Option C: Flutter ARB
```
lib/l10n/
  app_en.arb
  app_es.arb
  app_fr.arb
```

## 5. Translate!

### CLI

```bash
# Auto-detect languages from project
npx ai-l10n translate ./locales/en.json

# Specify target languages
npx ai-l10n translate ./locales/en.json --languages es,fr,de

# Update existing translations
npx ai-l10n translate ./locales/en.json --update
```

### Code

```typescript
import { AiTranslator } from 'ai-l10n';

const translator = new AiTranslator();

const result = await translator.translate({
  sourceFile: './locales/en.json',
  targetLanguages: ['es', 'fr', 'de'],
});

console.log(`Translated to ${result.results.length} languages!`);
```

## 6. Add to NPM Scripts

Add to your `package.json`:

```json
{
  "scripts": {
    "translate": "ai-l10n translate ./locales/en.json",
    "translate:update": "ai-l10n translate ./locales/en.json --update"
  }
}
```

Then run:
```bash
npm run translate
```

## Common Options

- `--languages es,fr,de` - Specify target languages
- `--update` - Update existing files only
- `--plural` - Generate strings with additional plural forms (i18next)
- `--verbose` - Detailed logging
- `--api-key KEY` - Use specific API key

## Next Steps

- Check out [examples/](./examples) for more usage patterns
- Read the full [README.md](./README.md) for detailed documentation
- Set up [CI/CD integration](./README.md#cicd-integration) for automatic translations

## Need Help?

- 📧 Email: support@l10n.dev
- 🐛 Issues: [GitHub Issues](https://github.com/l10n-dev/ai-l10n/issues)
- 📚 Docs: [l10n.dev](https://l10n.dev)

---

Happy translating! 🌍✨
