#!/usr/bin/env node

import { Command } from "commander";
import * as path from "path";
import * as fs from "fs";
import {
  AiTranslator,
  ApiKeyManager,
  GlossaryManager,
  LinguisticInstructionsManager,
  TranslationConfig,
} from "ai-l10n-sdk";

// Read version using require for better reliability
function getVersion(): string {
  try {
    // Try to require package.json from the module root
    const packageJson = require("../package.json");
    return packageJson.version;
  } catch {
    return "v1"; // Fallback version
  }
}

const program = new Command();

program
  .name("ai-l10n")
  .description("AI-powered auto-translation for i18n localization files")
  .version(getVersion());

// Translate command
program
  .command("translate")
  .description("Translate a localization file")
  .argument(
    "<file>",
    "Source file to translate (JSON, JSONC, PO, YAML, XML, XLIFF, ARB, etc.)",
  )
  .option(
    "-l, --languages <languages>",
    "Target language codes (comma-separated, e.g., es,fr,de)",
  )
  .option(
    "-k, --api-key <key>",
    "API key for l10n.dev (store using 'ai-l10n config --api-key <key>' or set L10N_API_KEY env variable)",
  )
  .option("--plural", "Generate plural forms", false)
  .option("--shorten", "Use shortening in translations", false)
  .option("--no-contractions", "Don't use contractions in translations")
  .option(
    "--translate-metadata",
    "Translate metadata (e.g., descriptions in ARB files)",
    false,
  )
  .option("--no-save-filtered", "Don't save filtered strings to separate file")
  .option(
    "--update",
    "Update existing files (translates only new and changed strings)",
    false,
  )
  .option(
    "--replace",
    "Replace existing target files instead of creating new ones",
    false,
  )
  .option(
    "--glossary",
    "Generate and save a glossary from source and translated content for this language pair. " +
      "Your balance is debited for the full source content upfront — even when 'Translate only new strings' is on. " +
      "Disable to let the system generate a temporary internal glossary only for large content that exceeds the AI limits, at no extra cost.",
    false,
  )
  .option(
    "--instruction <instruction>",
    "Linguistic instruction to apply during translation",
  )
  .option("-v, --verbose", "Enable verbose logging", false)
  .action(async (file: string, options: any) => {
    const config: TranslationConfig = {
      sourceFile: file,
      targetLanguages: options.languages
        ? options.languages.split(",").map((l: string) => l.trim())
        : undefined,
      generatePluralForms: options.plural,
      useShortening: options.shorten,
      useContractions: options.contractions,
      translateMetadata: options.translateMetadata,
      saveFilteredStrings: options.saveFiltered,
      translateOnlyNewStrings: options.update,
      generateGlossary: options.glossary,
      instruction: options.instruction,
      replace: options.replace,
      verbose: options.verbose,
    };

    const translator = new AiTranslator();
    const result = await translator.translate(config, options.apiKey);

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
    const apiKeyManager = new ApiKeyManager();

    if (options.clear) {
      await apiKeyManager.clearStoredApiKey();
    } else if (options.apiKey) {
      await apiKeyManager.storeApiKey(options.apiKey);
    } else {
      console.log(await apiKeyManager.displayStoredApiKey());
    }
  });

// Batch command using config file
program
  .command("batch")
  .description("Translate multiple files using a config file")
  .argument("<config>", "Path to config file (JSON)")
  .option(
    "-k, --api-key <key>",
    "API key for l10n.dev (store using 'ai-l10n config --api-key <key>' or set L10N_API_KEY env variable)",
  )
  .action(async (configFile: string, options: any) => {
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
          }`,
        );
        console.error(`\n   First 100 characters of file:`);
        console.error(
          `   ${cleanConfigData.substring(0, 100).replace(/\n/g, "\\n")}`,
        );
        process.exit(1);
      }

      if (!Array.isArray(configs)) {
        console.error(
          "❌ Config file must contain an array of translation configurations",
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
          `📁 Translation ${i + 1}/${configs.length}: ${config.sourceFile}`,
        );
        console.log(`${"=".repeat(60)}`);

        const result = await translator.translate(config, options.apiKey);

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
        }`,
      );
      process.exit(1);
    }
  });

// ── Glossary commands ─────────────────────────────────────────────────────────

const glossaryCmd = program
  .command("glossary")
  .description("Manage translation glossaries");

glossaryCmd
  .command("list")
  .description("List all glossaries")
  .option("-k, --api-key <key>", "API key for l10n.dev")
  .action(async (options: any) => {
    const manager = new GlossaryManager();
    const result = await manager.listGlossaries(options.apiKey);
    if (!result.success) {
      process.exit(1);
    }
    const { glossaries } = result.data;
    if (glossaries.length === 0) {
      console.log("ℹ️  No glossaries found.");
      return;
    }
    console.log(`📚 Glossaries (${glossaries.length})\n`);
    for (const g of glossaries) {
      const active = g.isActive ? " [active]" : "";
      console.log(
        `  #${g.id}  ${g.sourceLanguageCode} → ${g.targetLanguageCode}${active}  ${g.entryCount} entries  "${g.name}"`,
      );
    }
  });

glossaryCmd
  .command("create")
  .description("Create a new glossary")
  .requiredOption("-s, --source <code>", "Source language code (e.g., en)")
  .requiredOption("-t, --target <code>", "Target language code (e.g., de)")
  .option("-n, --name <name>", "Display name (defaults to 'source → target')")
  .option("--no-activate", "Do not activate this glossary after creation")
  .option("-k, --api-key <key>", "API key for l10n.dev")
  .action(async (options: any) => {
    const manager = new GlossaryManager();
    const result = await manager.createGlossary(
      {
        sourceLanguageCode: options.source,
        targetLanguageCode: options.target,
        name: options.name ?? null,
        isActive: options.activate,
      },
      options.apiKey,
    );
    if (!result.success) {
      process.exit(1);
    }
    const g = result.data;
    const active = g.isActive ? " [active]" : "";
    console.log(`✅ Created glossary #${g.id}: "${g.name}"${active}`);
  });

glossaryCmd
  .command("get")
  .description("Show details of a glossary")
  .argument("<id>", "Glossary ID")
  .option("-k, --api-key <key>", "API key for l10n.dev")
  .action(async (id: string, options: any) => {
    const manager = new GlossaryManager();
    const result = await manager.getGlossary(parseInt(id, 10), options.apiKey);
    if (!result.success) {
      process.exit(1);
    }
    const g = result.data;
    console.log(`📖 Glossary #${g.id}`);
    console.log(`  Name:            ${g.name}`);
    console.log(
      `  Language pair:   ${g.sourceLanguageCode} → ${g.targetLanguageCode}`,
    );
    console.log(`  Active:          ${g.isActive ? "✅ yes" : "❌ no"}`);
    console.log(`  Entries:         ${g.entryCount}`);
    console.log(`  Chars overhead:  ${g.charsCount.toLocaleString()}`);
    console.log(`  Created:         ${g.createdAt}`);
    console.log(`  Updated:         ${g.updatedAt}`);
  });

glossaryCmd
  .command("update")
  .description("Update a glossary name or active status")
  .argument("<id>", "Glossary ID")
  .option("-n, --name <name>", "New display name (pass empty string to reset)")
  .option(
    "--activate",
    "Activate this glossary (deactivates others for the same language pair)",
  )
  .option("--deactivate", "Deactivate this glossary")
  .option("-k, --api-key <key>", "API key for l10n.dev")
  .action(async (id: string, options: any) => {
    if (options.activate && options.deactivate) {
      console.error(
        "❌ Cannot use --activate and --deactivate at the same time.",
      );
      process.exit(1);
    }
    if (
      !options.activate &&
      !options.deactivate &&
      options.name === undefined
    ) {
      console.error(
        "❌ Provide at least one of --name, --activate, or --deactivate.",
      );
      process.exit(1);
    }
    const manager = new GlossaryManager();
    // Fetch current state to fill required isActive field when not explicitly changed
    const current = await manager.getGlossary(parseInt(id, 10), options.apiKey);
    if (!current.success) {
      process.exit(1);
    }
    const isActive = options.activate
      ? true
      : options.deactivate
        ? false
        : current.data.isActive;
    const name =
      options.name !== undefined
        ? options.name === ""
          ? null
          : options.name
        : current.data.name;

    const result = await manager.updateGlossary(
      parseInt(id, 10),
      { isActive, name },
      options.apiKey,
    );
    if (!result.success) {
      process.exit(1);
    }
    const g = result.data;
    console.log(
      `✅ Updated glossary #${g.id}: "${g.name}" (active: ${g.isActive})`,
    );
  });

glossaryCmd
  .command("delete")
  .description("Permanently delete a glossary and all its entries")
  .argument("<id>", "Glossary ID")
  .option("-k, --api-key <key>", "API key for l10n.dev")
  .action(async (id: string, options: any) => {
    const manager = new GlossaryManager();
    const result = await manager.deleteGlossary(
      parseInt(id, 10),
      options.apiKey,
    );
    if (!result.success) {
      process.exit(1);
    }
    console.log(`✅ Deleted glossary #${id}.`);
  });

glossaryCmd
  .command("entries")
  .description("List all entries in a glossary")
  .argument("<glossaryId>", "Glossary ID")
  .option("-k, --api-key <key>", "API key for l10n.dev")
  .action(async (glossaryId: string, options: any) => {
    const manager = new GlossaryManager();
    const result = await manager.listGlossaryEntries(
      parseInt(glossaryId, 10),
      options.apiKey,
    );
    if (!result.success) {
      process.exit(1);
    }
    const { entries, entryCount, charsCount } = result.data;
    if (entries.length === 0) {
      console.log(`ℹ️  Glossary #${glossaryId} has no entries.`);
      return;
    }
    console.log(
      `📋 Entries in glossary #${glossaryId} (${entryCount} entries, ${charsCount.toLocaleString()} chars overhead)\n`,
    );
    for (const e of entries) {
      const ctx = e.context ? `  [${e.context}]` : "";
      console.log(`  #${e.id}  "${e.sourceTerm}"  →  "${e.targetTerm}"${ctx}`);
    }
  });

glossaryCmd
  .command("add-entry")
  .description("Add a term mapping to a glossary")
  .argument("<glossaryId>", "Glossary ID")
  .requiredOption("-s, --source <term>", "Source term")
  .requiredOption("-t, --target <term>", "Target term (preferred translation)")
  .option(
    "-c, --context <context>",
    "Optional context to disambiguate the term",
  )
  .option("-k, --api-key <key>", "API key for l10n.dev")
  .action(async (glossaryId: string, options: any) => {
    const manager = new GlossaryManager();
    const result = await manager.addGlossaryEntry(
      parseInt(glossaryId, 10),
      {
        sourceTerm: options.source,
        targetTerm: options.target,
        context: options.context ?? null,
      },
      options.apiKey,
    );
    if (!result.success) {
      process.exit(1);
    }
    const e = result.data;
    console.log(
      `✅ Added entry #${e.id}: "${e.sourceTerm}" → "${e.targetTerm}"`,
    );
  });

glossaryCmd
  .command("update-entry")
  .description("Update a term mapping in a glossary")
  .argument("<glossaryId>", "Glossary ID")
  .argument("<entryId>", "Entry ID")
  .requiredOption("-s, --source <term>", "Source term")
  .requiredOption("-t, --target <term>", "Target term (preferred translation)")
  .option(
    "-c, --context <context>",
    "Optional context to disambiguate the term",
  )
  .option("-k, --api-key <key>", "API key for l10n.dev")
  .action(async (glossaryId: string, entryId: string, options: any) => {
    const manager = new GlossaryManager();
    const result = await manager.updateGlossaryEntry(
      parseInt(glossaryId, 10),
      parseInt(entryId, 10),
      {
        sourceTerm: options.source,
        targetTerm: options.target,
        context: options.context ?? null,
      },
      options.apiKey,
    );
    if (!result.success) {
      process.exit(1);
    }
    const e = result.data;
    console.log(
      `✅ Updated entry #${e.id}: "${e.sourceTerm}" → "${e.targetTerm}"`,
    );
  });

glossaryCmd
  .command("delete-entry")
  .description("Permanently remove a term mapping from a glossary")
  .argument("<glossaryId>", "Glossary ID")
  .argument("<entryId>", "Entry ID")
  .option("-k, --api-key <key>", "API key for l10n.dev")
  .action(async (glossaryId: string, entryId: string, options: any) => {
    const manager = new GlossaryManager();
    const result = await manager.deleteGlossaryEntry(
      parseInt(glossaryId, 10),
      parseInt(entryId, 10),
      options.apiKey,
    );
    if (!result.success) {
      process.exit(1);
    }
    console.log(`✅ Deleted entry #${entryId} from glossary #${glossaryId}.`);
  });

// ── Instruction commands ──────────────────────────────────────────────────────

const instructionCmd = program
  .command("instruction")
  .description("Manage linguistic instructions");

instructionCmd
  .command("list")
  .description("List all linguistic instructions")
  .option("-k, --api-key <key>", "API key for l10n.dev")
  .action(async (options: any) => {
    const manager = new LinguisticInstructionsManager();
    const result = await manager.listInstructions(options.apiKey);
    if (!result.success) {
      process.exit(1);
    }
    const { instructions } = result.data;
    if (instructions.length === 0) {
      console.log("ℹ️  No instructions found.");
      return;
    }
    console.log(`📋 Instructions (${instructions.length})\n`);
    for (const ins of instructions) {
      const active = ins.isActive ? " [active]" : "";
      const text =
        ins.text.length > 60 ? ins.text.substring(0, 57) + "..." : ins.text;
      console.log(
        `  #${ins.id}  ${ins.sourceLanguageCode} → ${ins.targetLanguageCode}${active}  "${text}"`,
      );
    }
  });

instructionCmd
  .command("create")
  .description("Create a new linguistic instruction")
  .requiredOption("-s, --source <code>", "Source language code (e.g., en)")
  .requiredOption("-t, --target <code>", "Target language code (e.g., de)")
  .requiredOption("--text <text>", 'Instruction text (e.g., "Use formal tone")')
  .option("-n, --name <name>", "Display name (defaults to 'source → target')")
  .option("--no-activate", "Do not activate this instruction after creation")
  .option("-k, --api-key <key>", "API key for l10n.dev")
  .action(async (options: any) => {
    const manager = new LinguisticInstructionsManager();
    const result = await manager.createInstruction(
      {
        sourceLanguageCode: options.source,
        targetLanguageCode: options.target,
        text: options.text,
        name: options.name ?? null,
        isActive: options.activate,
      },
      options.apiKey,
    );
    if (!result.success) {
      process.exit(1);
    }
    const ins = result.data;
    const active = ins.isActive ? " [active]" : "";
    console.log(`✅ Created instruction #${ins.id}: "${ins.name}"${active}`);
  });

instructionCmd
  .command("get")
  .description("Show details of a linguistic instruction")
  .argument("<id>", "Instruction ID")
  .option("-k, --api-key <key>", "API key for l10n.dev")
  .action(async (id: string, options: any) => {
    const manager = new LinguisticInstructionsManager();
    const result = await manager.getInstruction(
      parseInt(id, 10),
      options.apiKey,
    );
    if (!result.success) {
      process.exit(1);
    }
    const ins = result.data;
    console.log(`📖 Instruction #${ins.id}`);
    console.log(`  Name:           ${ins.name}`);
    console.log(
      `  Language pair:  ${ins.sourceLanguageCode} → ${ins.targetLanguageCode}`,
    );
    console.log(`  Active:         ${ins.isActive ? "✅ yes" : "❌ no"}`);
    console.log(`  Text:           ${ins.text}`);
    console.log(`  Chars overhead: ${ins.charsCount.toLocaleString()}`);
    console.log(`  Created:        ${ins.createdAt}`);
    console.log(`  Updated:        ${ins.updatedAt}`);
  });

instructionCmd
  .command("update")
  .description("Update a linguistic instruction")
  .argument("<id>", "Instruction ID")
  .requiredOption("--text <text>", "New instruction text")
  .option("-n, --name <name>", "New display name (pass empty string to reset)")
  .option(
    "--activate",
    "Activate this instruction (deactivates others for the same language pair)",
  )
  .option("--deactivate", "Deactivate this instruction")
  .option("-k, --api-key <key>", "API key for l10n.dev")
  .action(async (id: string, options: any) => {
    if (options.activate && options.deactivate) {
      console.error(
        "❌ Cannot use --activate and --deactivate at the same time.",
      );
      process.exit(1);
    }
    const manager = new LinguisticInstructionsManager();
    const current = await manager.getInstruction(
      parseInt(id, 10),
      options.apiKey,
    );
    if (!current.success) {
      process.exit(1);
    }
    const isActive = options.activate
      ? true
      : options.deactivate
        ? false
        : current.data.isActive;
    const name =
      options.name !== undefined
        ? options.name === ""
          ? null
          : options.name
        : current.data.name;

    const result = await manager.updateInstruction(
      parseInt(id, 10),
      { text: options.text, isActive, name },
      options.apiKey,
    );
    if (!result.success) {
      process.exit(1);
    }
    const ins = result.data;
    console.log(
      `✅ Updated instruction #${ins.id}: "${ins.name}" (active: ${ins.isActive})`,
    );
  });

instructionCmd
  .command("delete")
  .description("Permanently delete a linguistic instruction")
  .argument("<id>", "Instruction ID")
  .option("-k, --api-key <key>", "API key for l10n.dev")
  .action(async (id: string, options: any) => {
    const manager = new LinguisticInstructionsManager();
    const result = await manager.deleteInstruction(
      parseInt(id, 10),
      options.apiKey,
    );
    if (!result.success) {
      process.exit(1);
    }
    console.log(`✅ Deleted instruction #${id}.`);
  });

// Catch any unhandled errors during parsing
try {
  program.parse();
} catch (error) {
  console.error(
    "❌ CLI Error:",
    error instanceof Error ? error.message : error,
  );
  console.error("Stack:", error instanceof Error ? error.stack : "");
  process.exit(2);
}
