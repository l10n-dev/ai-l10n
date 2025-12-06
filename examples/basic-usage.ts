import { AiTranslator } from "ai-l10n";

async function main() {
  const translator = new AiTranslator();

  // Basic translation with auto-detected languages
  console.log("Example 1: Basic translation with auto-detection");
  const result1 = await translator.translate({
    sourceFile: "./test-data/en/common.json",
  });

  console.log(`Translated to ${result1.results.length} languages`);
  console.log(`Total characters used: ${result1.totalCharsUsed}`);

  // Translation to specific languages
  console.log("\nExample 2: Translation to specific languages");
  const result2 = await translator.translate({
    sourceFile: "./test-data/en/common.json",
    targetLanguages: ["de"],
    verbose: true,
  });

  // Check individual results
  for (const translation of result2.results) {
    if (translation.success) {
      console.log(`✅ ${translation.language}: ${translation.outputPath}`);
    } else {
      console.log(`❌ ${translation.language}: ${translation.error}`);
    }
  }
}

main().catch(console.error);
