import { AiTranslator } from 'ai-l10n';

async function main() {
  const translator = new AiTranslator();

  // Update only new strings in existing translations
  console.log('Updating existing translations with new strings only...\n');
  
  const result = await translator.translate({
    sourceFile: './locales/en.json',
    targetLanguages: ['es', 'fr', 'de'],
    translateOnlyNewStrings: true, // This is the key option
    verbose: true,
  });

  console.log('\n' + '='.repeat(60));
  console.log('Update Results');
  console.log('='.repeat(60));

  result.results.forEach(translation => {
    if (translation.success) {
      console.log(`✅ Updated ${translation.language}: ${translation.outputPath}`);
      console.log(`   Characters used: ${translation.charsUsed?.toLocaleString()}`);
    } else {
      console.log(`❌ Failed to update ${translation.language}: ${translation.error}`);
    }
  });

  console.log(`\nTotal characters used: ${result.totalCharsUsed.toLocaleString()}`);
}

main().catch(console.error);
