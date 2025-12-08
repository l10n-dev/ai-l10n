import { AiTranslator } from "ai-l10n";

async function main() {
  const translator = new AiTranslator();

  // Translate Flutter ARB files
  console.log("Translating Flutter ARB files...\n");

  const result = await translator.translate({
    sourceFile: "./test-data/app_en.arb",
    targetLanguages: ["es", "fr", "de", "ja"],
    generatePluralForms: true, // Important for Flutter apps
    verbose: true,
  });

  console.log("\n" + "=".repeat(60));
  console.log("Flutter ARB Translation Results");
  console.log("=".repeat(60));

  result.results.forEach((translation) => {
    if (translation.success) {
      console.log(`✅ ${translation.language}: ${translation.outputPath}`);
    }
  });

  console.log(
    `\nSuccess rate: ${result.results.filter((r) => r.success).length}/${
      result.results.length
    }`
  );
}

main().catch(console.error);
