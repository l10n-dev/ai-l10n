import { AiTranslator, TranslationConfig } from "ai-l10n";

async function main() {
  const translator = new AiTranslator();

  // Advanced configuration with all options
  const config: TranslationConfig = {
    sourceFile: "./test-data/en.json",
    targetLanguages: ["es", "fr", "de"],

    // API configuration
    apiKey: process.env.L10N_API_KEY, // Optional, can also use stored key

    // Translation options
    generatePluralForms: true, // Generate plural forms
    useShortening: false, // Don't use shortening
    useContractions: true, // Use contractions (default)

    // Output options
    saveFilteredStrings: true, // Save filtered strings to .filtered files
    translateOnlyNewStrings: false, // Create new files instead of updating

    // Logging
    verbose: true, // Detailed logging
  };

  console.log("Starting advanced translation with custom configuration...\n");

  const result = await translator.translate(config);

  // Detailed results analysis
  console.log("\n" + "=".repeat(60));
  console.log("Translation Results Analysis");
  console.log("=".repeat(60));

  const successResults = result.results.filter((r) => r.success);
  const failedResults = result.results.filter((r) => !r.success);

  console.log(`\n✅ Successful Translations: ${successResults.length}`);
  successResults.forEach((r) => {
    console.log(
      `  - ${r.language}: ${r.charsUsed?.toLocaleString()} chars → ${
        r.outputPath
      }`
    );
  });

  if (failedResults.length > 0) {
    console.log(`\n❌ Failed Translations: ${failedResults.length}`);
    failedResults.forEach((r) => {
      console.log(`  - ${r.language}: ${r.error}`);
    });
  }

  console.log(`\n📊 Total Statistics:`);
  console.log(
    `  - Total characters used: ${result.totalCharsUsed.toLocaleString()}`
  );
  if (result.remainingBalance !== undefined) {
    console.log(
      `  - Remaining balance: ${result.remainingBalance.toLocaleString()} characters`
    );
  }
}

main().catch(console.error);
