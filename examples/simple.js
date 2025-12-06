const { AiTranslator } = require('ai-l10n');

async function main() {
  const translator = new AiTranslator();

  // Simple translation example for JavaScript users
  const result = await translator.translate({
    sourceFile: './locales/en.json',
    targetLanguages: ['es', 'fr', 'de'],
  });

  console.log(`✅ Translation complete!`);
  console.log(`   Translated to ${result.results.length} languages`);
  console.log(`   Used ${result.totalCharsUsed} characters`);

  // Show individual results
  result.results.forEach(translation => {
    if (translation.success) {
      console.log(`   ✓ ${translation.language}: ${translation.outputPath}`);
    } else {
      console.log(`   ✗ ${translation.language}: ${translation.error}`);
    }
  });
}

main().catch(console.error);
