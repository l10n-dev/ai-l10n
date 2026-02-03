# Test Data

This directory contains sample localization files for testing the ai-l10n package.

## Files

- `en.json` - Sample English source file (JSON format)
- `en.jsonc` - Sample English source file with comments (JSONC format)
- `en.default.schema.json` - Sample Shopify theme localization file
- `app_en.arb` - Sample Flutter ARB file

## Usage

### CLI Test
```bash
# Set API key
npx ai-l10n config --api-key YOUR_API_KEY

# Test JSON file
npx ai-l10n translate test-data/en.json --languages es,fr --verbose

# Test JSONC file (with comments)
npx ai-l10n translate test-data/en.jsonc --languages es,fr --verbose

# Test Shopify theme file
npx ai-l10n translate test-data/en-us.default.schema.json --languages es-es,fr --verbose

# Test Flutter ARB file
npx ai-l10n translate test-data/app_en.arb --languages es,fr --verbose
```

### Code Test
```typescript
import { AiTranslator } from 'ai-l10n';

const translator = new AiTranslator();

// Test JSON file
const result1 = await translator.translate({
  sourceFile: './test-data/en.json',
  targetLanguages: ['es', 'fr'],
  verbose: true,
});

// Test JSONC file
const result2 = await translator.translate({
  sourceFile: './test-data/en.jsonc',
  targetLanguages: ['es', 'fr'],
  verbose: true,
});

// Test Shopify theme file
const result3 = await translator.translate({
  sourceFile: './test-data/en-us.default.schema.json',
  targetLanguages: ['es-ES', 'fr'],
  verbose: true,
});

// Test Flutter ARB file
const result4 = await translator.translate({
  sourceFile: './test-data/app_en.arb',
  targetLanguages: ['es', 'fr'],
  verbose: true,
});
```

## Expected Output

After running the translation, you should see:

### JSON Files
- `test-data/es.json`
- `test-data/fr.json`

### JSONC Files
- `test-data/es.jsonc`
- `test-data/fr.jsonc`

### Shopify Theme Files
- `test-data/es-es.schema.json` (note: `.default.` is removed)
- `test-data/fr.schema.json` (note: `.default.` is removed)

### Flutter ARB Files
- `test-data/app_es.arb`
- `test-data/app_fr.arb`

With all strings translated to Spanish and French respectively.

## Clean Up

To remove generated files:
```bash
# Windows
del test-data\es.json test-data\fr.json
del test-data\es.jsonc test-data\fr.jsonc
del test-data\es-es.schema.json test-data\fr.schema.json
del test-data\app_es.arb test-data\app_fr.arb

# Linux/Mac
rm test-data/es.json test-data/fr.json
rm test-data/es.jsonc test-data/fr.jsonc
rm test-data/es-es.schema.json test-data/fr.schema.json
rm test-data/app_es.arb test-data/app_fr.arb
```
