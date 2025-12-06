import { AiTranslator } from "ai-l10n";

async function translateMultipleFiles() {
  const translator = new AiTranslator();

  const files = ["./test-data/en/common.json", "./test-data/en.json"];

  const targetLanguages = ["es", "fr"];

  console.log(
    `Translating ${files.length} files to ${targetLanguages.length} languages...\n`
  );

  let totalCharsUsed = 0;

  for (const file of files) {
    console.log("=".repeat(60));
    console.log(`Translating: ${file}`);
    console.log("=".repeat(60));

    const result = await translator.translate({
      sourceFile: file,
      targetLanguages,
      translateOnlyNewStrings: true,
    });

    console.log(
      `✅ ${result.results.filter((r) => r.success).length} languages completed`
    );
    console.log(
      `📊 Characters used: ${result.totalCharsUsed.toLocaleString()}\n`
    );

    totalCharsUsed += result.totalCharsUsed;
  }

  console.log("=".repeat(60));
  console.log("Batch Translation Complete");
  console.log("=".repeat(60));
  console.log(
    `Total characters used across all files: ${totalCharsUsed.toLocaleString()}`
  );
}

translateMultipleFiles().catch(console.error);
