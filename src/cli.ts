#!/usr/bin/env node

import { Command } from "commander";
import * as path from "path";
import * as fs from "fs";
import { AiTranslator, TranslationConfig } from "ai-l10n-sdk";

// Read version using require for better reliability
function getVersion(): string {
  try {
    // Try to require package.json from the module root
    const packageJson = require("../package.json");
    return packageJson.version;
  } catch {
    return "1.1.4"; // Fallback version
  }
}

const program = new Command();

program
  .name("ai-l10n")
  .description(
    "AI-powered auto-translation for JSON and ARB localization files"
  )
  .version(getVersion());

// Translate command
program
  .command("translate")
  .description("Translate a localization file")
  .argument("<file>", "Source file to translate (JSON or ARB)")
  .option(
    "-l, --languages <languages>",
    "Target language codes (comma-separated, e.g., es,fr,de)"
  )
  .option(
    "-k, --api-key <key>",
    "API key for l10n.dev (or set L10N_API_KEY env variable)"
  )
  .option("--plural", "Generate plural forms", false)
  .option("--shorten", "Use shortening in translations", false)
  .option("--no-contractions", "Don't use contractions in translations")
  .option("--no-save-filtered", "Don't save filtered strings to separate file")
  .option("--update", "Update existing files with only new translations", false)
  .option("-v, --verbose", "Enable verbose logging", false)
  .action(async (file: string, options: any) => {
    const config: TranslationConfig = {
      sourceFile: file,
      targetLanguages: options.languages
        ? options.languages.split(",").map((l: string) => l.trim())
        : undefined,
      apiKey: options.apiKey,
      generatePluralForms: options.plural,
      useShortening: options.shorten,
      useContractions: options.contractions,
      saveFilteredStrings: options.saveFiltered,
      translateOnlyNewStrings: options.update,
      verbose: options.verbose,
    };

    const translator = new AiTranslator();
    const result = await translator.translate(config);

    if (!result.success) {
      process.exit(1);
    }
  });

// Config command
program
  .command("config")
  .description("Manage configuration")
  .option("--api-key <key>", "Set API key")
  .option("--clear", "Clear stored API key")
  .action(async (options: any) => {
    const translator = new AiTranslator();

    if (options.clear) {
      await translator.clearApiKey();
    } else if (options.apiKey) {
      await translator.setApiKey(options.apiKey);
    } else {
      console.log(await translator.displayApiKey());
    }
  });

// Batch command using config file
program
  .command("batch")
  .description("Translate multiple files using a config file")
  .argument("<config>", "Path to config file (JSON)")
  .action(async (configFile: string) => {
    try {
      const configPath = path.resolve(configFile);
      if (!fs.existsSync(configPath)) {
        console.error(`❌ Config file not found: ${configPath}`);
        process.exit(1);
      }

      const configData = fs.readFileSync(configPath, "utf8");

      // Strip BOM if present (fixes PowerShell Out-File issues)
      const cleanConfigData =
        configData.charCodeAt(0) === 0xfeff ? configData.slice(1) : configData;

      let configs: TranslationConfig[];
      try {
        configs = JSON.parse(cleanConfigData);
      } catch (parseError) {
        console.error(`❌ Failed to parse config file as JSON`);
        console.error(`   File: ${configPath}`);
        console.error(
          `   Error: ${
            parseError instanceof Error
              ? parseError.message
              : String(parseError)
          }`
        );
        console.error(`\n   First 100 characters of file:`);
        console.error(
          `   ${cleanConfigData.substring(0, 100).replace(/\n/g, "\\n")}`
        );
        process.exit(1);
      }

      if (!Array.isArray(configs)) {
        console.error(
          "❌ Config file must contain an array of translation configurations"
        );
        process.exit(1);
      }

      console.log(`📦 Processing ${configs.length} translation(s)...\n`);

      const translator = new AiTranslator();
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < configs.length; i++) {
        const config = configs[i];
        console.log(`\n${"=".repeat(60)}`);
        console.log(
          `📁 Translation ${i + 1}/${configs.length}: ${config.sourceFile}`
        );
        console.log(`${"=".repeat(60)}`);

        const result = await translator.translate(config);

        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      }

      console.log(`\n${"=".repeat(60)}`);
      console.log(`📊 Batch Translation Complete`);
      console.log(`${"=".repeat(60)}`);
      console.log(`✅ Successful: ${successCount}`);
      console.log(`❌ Failed: ${failCount}`);

      if (failCount > 0) {
        process.exit(1);
      }
    } catch (error) {
      console.error(
        `❌ Failed to process config file: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      process.exit(1);
    }
  });

program.parse();
