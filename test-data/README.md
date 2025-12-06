# Test Data

This directory contains sample localization files for testing the ai-l10n package.

## Files

- `en.json` - Sample English source file

## Usage

### CLI Test
```bash
# Set API key
npx ai-l10n config --api-key YOUR_API_KEY

# Translate to Spanish and French
npx ai-l10n translate test-data/en.json --languages es,fr --verbose
```

### Code Test
```typescript
import { AiTranslator } from 'ai-l10n';

const translator = new AiTranslator();

const result = await translator.translate({
  sourceFile: './test-data/en.json',
  targetLanguages: ['es', 'fr'],
  verbose: true,
});

console.log('Translation result:', result);
```

## Expected Output

After running the translation, you should see:
- `test-data/es.json` (or similar based on project structure)
- `test-data/fr.json` (or similar based on project structure)

With all strings translated to Spanish and French respectively.

## Clean Up

To remove generated files:
```bash
# Windows
del test-data/es.json test-data/fr.json

# Linux/Mac
rm test-data/es.json test-data/fr.json
```
