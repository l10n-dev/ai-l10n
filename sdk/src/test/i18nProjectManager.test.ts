import * as assert from "assert";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

// Import the I18nProjectManager and related types
import { I18nProjectManager } from "../i18nProjectManager.js";

suite("I18nProjectManager Test Suite", () => {
  let tempDir: string;
  let detector: any;

  setup(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "test-lang-detector-"));
    detector = new I18nProjectManager();
  });

  teardown(() => {
    // Cleanup temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  suite("Project Structure Detection", () => {
    test("detects folder-based structure (locales/en/common.json)", () => {
      // Create folder structure
      const localesDir = path.join(tempDir, "locales", "en");
      fs.mkdirSync(localesDir, { recursive: true });
      const sourceFile = path.join(localesDir, "common.json");
      fs.writeFileSync(sourceFile, "{}");

      const structure = detector.detectProjectStructure(sourceFile);

      assert.strictEqual(structure.type, "folder");
      assert.strictEqual(structure.basePath, path.join(tempDir, "locales"));
      assert.strictEqual(structure.sourceLanguage, "en");
    });

    test("detects file-based structure (i18n/en.json)", () => {
      // Create file structure
      const i18nDir = path.join(tempDir, "i18n");
      fs.mkdirSync(i18nDir, { recursive: true });
      const sourceFile = path.join(i18nDir, "en.json");
      fs.writeFileSync(sourceFile, "{}");

      const structure = detector.detectProjectStructure(sourceFile);

      assert.strictEqual(structure.type, "file");
      assert.strictEqual(structure.basePath, i18nDir);
      assert.strictEqual(structure.sourceLanguage, "en");
    });

    test("detects complex language codes (zh-Hans-CN)", () => {
      // Create folder structure with complex language code
      const localesDir = path.join(tempDir, "locales", "zh-Hans-CN");
      fs.mkdirSync(localesDir, { recursive: true });
      const sourceFile = path.join(localesDir, "app.json");
      fs.writeFileSync(sourceFile, "{}");

      const structure = detector.detectProjectStructure(sourceFile);

      assert.strictEqual(structure.type, "folder");
      assert.strictEqual(structure.sourceLanguage, "zh-Hans-CN");
    });

    test("returns unknown structure for unrecognized patterns", () => {
      // Create a file that doesn't match known patterns
      const randomDir = path.join(tempDir, "translations");
      fs.mkdirSync(randomDir, { recursive: true });
      const sourceFile = path.join(randomDir, "messages.json");
      fs.writeFileSync(sourceFile, "{}");

      const structure = detector.detectProjectStructure(sourceFile);

      assert.strictEqual(structure.type, "unknown");
      assert.strictEqual(structure.basePath, randomDir);
      assert.strictEqual(structure.sourceLanguage, undefined);
    });
  });

  suite("Target File Path Generation", () => {
    test("generates folder-based target path", () => {
      // Setup folder-based structure
      const localesDir = path.join(tempDir, "locales", "en");
      fs.mkdirSync(localesDir, { recursive: true });
      const sourceFile = path.join(localesDir, "common.json");
      fs.writeFileSync(sourceFile, "{}");

      const targetPath = detector.generateTargetFilePath(sourceFile, "fr");

      const expectedPath = path.join(tempDir, "locales", "fr", "common.json");
      assert.strictEqual(targetPath, expectedPath);
    });

    test("generates file-based target path", () => {
      // Setup file-based structure
      const i18nDir = path.join(tempDir, "i18n");
      fs.mkdirSync(i18nDir, { recursive: true });
      const sourceFile = path.join(i18nDir, "en.json");
      fs.writeFileSync(sourceFile, "{}");

      const targetPath = detector.generateTargetFilePath(sourceFile, "fr");

      const expectedPath = path.join(i18nDir, "fr.json");
      assert.strictEqual(targetPath, expectedPath);
    });

    test("handles unknown structure", () => {
      // Setup unknown structure
      const translationsDir = path.join(tempDir, "translations");
      fs.mkdirSync(translationsDir, { recursive: true });
      const sourceFile = path.join(translationsDir, "messages.json");
      fs.writeFileSync(sourceFile, "{}");

      const targetPath = detector.generateTargetFilePath(sourceFile, "fr");

      const expectedPath = path.join(translationsDir, "messages.fr.json");
      assert.strictEqual(targetPath, expectedPath);
    });

    test("handles file conflicts with numbering", () => {
      // Setup file-based structure
      const i18nDir = path.join(tempDir, "i18n");
      fs.mkdirSync(i18nDir, { recursive: true });
      const sourceFile = path.join(i18nDir, "en.json");
      fs.writeFileSync(sourceFile, "{}");

      // Create conflicting files
      const conflictFile1 = path.join(i18nDir, "fr.json");
      const conflictFile2 = path.join(i18nDir, "fr (1).json");
      fs.writeFileSync(conflictFile1, "{}");
      fs.writeFileSync(conflictFile2, "{}");

      let targetPath = detector.generateTargetFilePath(sourceFile, "fr");
      targetPath = detector.getUniqueFilePath(targetPath);

      const expectedPath = path.join(i18nDir, "fr (2).json");
      assert.strictEqual(targetPath, expectedPath);
    });

    test("preserves case of original language code", () => {
      // Setup with mixed case language code
      const localesDir = path.join(tempDir, "locales", "zh-Hans-CN");
      fs.mkdirSync(localesDir, { recursive: true });
      const sourceFile = path.join(localesDir, "app.json");
      fs.writeFileSync(sourceFile, "{}");

      const targetPath = detector.generateTargetFilePath(sourceFile, "JA-jp");

      const expectedPath = path.join(tempDir, "locales", "JA-jp", "app.json");
      assert.strictEqual(targetPath, expectedPath);
    });
  });

  suite("Language Detection from Project", () => {
    test("detects available languages in folder-based structure", () => {
      // Create multiple language folders
      const localesDir = path.join(tempDir, "locales");
      const languages = ["en", "fr", "de", "zh-Hans-CN"];

      for (const lang of languages) {
        const langDir = path.join(localesDir, lang);
        fs.mkdirSync(langDir, { recursive: true });
        fs.writeFileSync(path.join(langDir, "common.json"), "{}");
      }

      const sourceFile = path.join(localesDir, "en", "common.json");
      const detectedLanguages = detector.detectLanguagesFromProject(sourceFile);

      assert.strictEqual(detectedLanguages.length, 3);
      assert.deepStrictEqual(
        detectedLanguages.sort(),
        ["fr", "de", "zh-Hans-CN"].sort(),
      );
    });

    test("detects available languages in file-based structure", () => {
      // Create multiple language files
      const i18nDir = path.join(tempDir, "i18n");
      fs.mkdirSync(i18nDir, { recursive: true });
      const languages = ["en", "fr", "de", "ja"];

      for (const lang of languages) {
        fs.writeFileSync(path.join(i18nDir, `${lang}.json`), "{}");
      }

      const sourceFile = path.join(i18nDir, "en.json");
      const detectedLanguages = detector.detectLanguagesFromProject(sourceFile);

      assert.strictEqual(detectedLanguages.length, 3);
      assert.deepStrictEqual(
        detectedLanguages.sort(),
        ["fr", "de", "ja"].sort(),
      );
    });

    test("returns empty array for unknown structure", () => {
      const translationsDir = path.join(tempDir, "translations");
      fs.mkdirSync(translationsDir, { recursive: true });
      const sourceFile = path.join(translationsDir, "messages.json");
      fs.writeFileSync(sourceFile, "{}");

      const detectedLanguages = detector.detectLanguagesFromProject(sourceFile);

      assert.strictEqual(detectedLanguages.length, 0);
    });

    test("handles case-insensitive language detection", () => {
      // Create files with mixed case language codes
      const i18nDir = path.join(tempDir, "i18n");
      fs.mkdirSync(i18nDir, { recursive: true });

      fs.writeFileSync(path.join(i18nDir, "EN.json"), "{}");
      fs.writeFileSync(path.join(i18nDir, "RU.json"), "{}");
      fs.writeFileSync(path.join(i18nDir, "Fr.json"), "{}");
      fs.writeFileSync(path.join(i18nDir, "de.json"), "{}");

      const sourceFile = path.join(i18nDir, "EN.json");
      const detectedLanguages = detector.detectLanguagesFromProject(sourceFile);

      assert.strictEqual(detectedLanguages.length, 3);
      // Should preserve original case and exclude source language
      assert.deepStrictEqual(
        detectedLanguages.sort((a: string, b: string) =>
          a.localeCompare(b, undefined, { sensitivity: "base" }),
        ),
        ["de", "Fr", "RU"].sort((a: string, b: string) =>
          a.localeCompare(b, undefined, { sensitivity: "base" }),
        ),
      );
    });
  });

  suite("ARB File Support", () => {
    suite("ARB Language Code Extraction", () => {
      test("extracts language code from ARB file with prefix (app_en_US.arb)", () => {
        const i18nDir = path.join(tempDir, "lib", "l10n");
        fs.mkdirSync(i18nDir, { recursive: true });
        const sourceFile = path.join(i18nDir, "app_en_US.arb");
        fs.writeFileSync(sourceFile, "{}");

        const structure = detector.detectProjectStructure(sourceFile);

        assert.strictEqual(structure.type, "file");
        assert.strictEqual(structure.sourceLanguage, "en_US");
      });

      test("extracts language code from ARB file with custom prefix (my_app_fr.arb)", () => {
        const i18nDir = path.join(tempDir, "lib", "l10n");
        fs.mkdirSync(i18nDir, { recursive: true });
        const sourceFile = path.join(i18nDir, "my_app_fr.arb");
        fs.writeFileSync(sourceFile, "{}");

        const structure = detector.detectProjectStructure(sourceFile);

        assert.strictEqual(structure.type, "file");
        assert.strictEqual(structure.sourceLanguage, "fr");
      });

      test("extracts complex language code from ARB file (app_zh_Hans_CN.arb)", () => {
        const i18nDir = path.join(tempDir, "lib", "l10n");
        fs.mkdirSync(i18nDir, { recursive: true });
        const sourceFile = path.join(i18nDir, "app_zh_Hans_CN.arb");
        fs.writeFileSync(sourceFile, "{}");

        const structure = detector.detectProjectStructure(sourceFile);

        assert.strictEqual(structure.type, "file");
        assert.strictEqual(structure.sourceLanguage, "zh_Hans_CN");
      });

      test("handles ARB file without prefix (en_US.arb)", () => {
        const i18nDir = path.join(tempDir, "lib", "l10n");
        fs.mkdirSync(i18nDir, { recursive: true });
        const sourceFile = path.join(i18nDir, "en_US.arb");
        fs.writeFileSync(sourceFile, "{}");

        const structure = detector.detectProjectStructure(sourceFile);

        assert.strictEqual(structure.type, "file");
        assert.strictEqual(structure.sourceLanguage, "en_US");
      });
    });

    suite("ARB Target File Path Generation", () => {
      test("generates ARB target path preserving prefix (app_en_US.arb -> app_es.arb)", () => {
        const i18nDir = path.join(tempDir, "lib", "l10n");
        fs.mkdirSync(i18nDir, { recursive: true });
        const sourceFile = path.join(i18nDir, "app_en_US.arb");
        fs.writeFileSync(sourceFile, "{}");

        const targetPath = detector.generateTargetFilePath(sourceFile, "es");

        const expectedPath = path.join(i18nDir, "app_es.arb");
        assert.strictEqual(targetPath, expectedPath);
      });

      test("generates ARB target path with custom prefix (my_app_fr.arb -> my_app_de.arb)", () => {
        const i18nDir = path.join(tempDir, "lib", "l10n");
        fs.mkdirSync(i18nDir, { recursive: true });
        const sourceFile = path.join(i18nDir, "my_app_fr.arb");
        fs.writeFileSync(sourceFile, "{}");

        const targetPath = detector.generateTargetFilePath(sourceFile, "de");

        const expectedPath = path.join(i18nDir, "my_app_de.arb");
        assert.strictEqual(targetPath, expectedPath);
      });

      test("generates ARB target path with complex target code (app_en.arb -> app_zh_Hans_CN.arb)", () => {
        const i18nDir = path.join(tempDir, "lib", "l10n");
        fs.mkdirSync(i18nDir, { recursive: true });
        const sourceFile = path.join(i18nDir, "app_en.arb");
        fs.writeFileSync(sourceFile, "{}");

        const targetPath = detector.generateTargetFilePath(
          sourceFile,
          "zh_Hans_CN",
        );

        const expectedPath = path.join(i18nDir, "app_zh_Hans_CN.arb");
        assert.strictEqual(targetPath, expectedPath);
      });

      test("generates ARB target path without prefix (en.arb -> fr.arb)", () => {
        const i18nDir = path.join(tempDir, "lib", "l10n");
        fs.mkdirSync(i18nDir, { recursive: true });
        const sourceFile = path.join(i18nDir, "en.arb");
        fs.writeFileSync(sourceFile, "{}");

        const targetPath = detector.generateTargetFilePath(sourceFile, "fr");

        const expectedPath = path.join(i18nDir, "fr.arb");
        assert.strictEqual(targetPath, expectedPath);
      });
    });

    suite("ARB Language Detection", () => {
      test("detects ARB languages in file-based structure", () => {
        const i18nDir = path.join(tempDir, "lib", "l10n");
        fs.mkdirSync(i18nDir, { recursive: true });

        // Create ARB files with prefix
        const sourceFile = path.join(i18nDir, "app_en.arb");
        fs.writeFileSync(sourceFile, "{}");
        fs.writeFileSync(path.join(i18nDir, "app_es.arb"), "{}");
        fs.writeFileSync(path.join(i18nDir, "app_fr.arb"), "{}");
        fs.writeFileSync(path.join(i18nDir, "app_de.arb"), "{}");

        const detectedLanguages =
          detector.detectLanguagesFromProject(sourceFile);

        assert.strictEqual(detectedLanguages.length, 3);
        assert.deepStrictEqual(detectedLanguages.sort(), ["de", "es", "fr"]);
      });

      test("detects ARB languages with underscores", () => {
        const i18nDir = path.join(tempDir, "lib", "l10n");
        fs.mkdirSync(i18nDir, { recursive: true });

        // Create ARB files with complex language codes
        const sourceFile = path.join(i18nDir, "app_en_US.arb");
        fs.writeFileSync(sourceFile, "{}");
        fs.writeFileSync(path.join(i18nDir, "app_es_ES.arb"), "{}");
        fs.writeFileSync(path.join(i18nDir, "app_fr_FR.arb"), "{}");
        fs.writeFileSync(path.join(i18nDir, "app_zh_Hans_CN.arb"), "{}");

        const detectedLanguages =
          detector.detectLanguagesFromProject(sourceFile);

        assert.strictEqual(detectedLanguages.length, 3);
        assert.ok(detectedLanguages.includes("es_ES"));
        assert.ok(detectedLanguages.includes("fr_FR"));
        assert.ok(detectedLanguages.includes("zh_Hans_CN"));
      });

      test("excludes JSON files when detecting ARB languages", () => {
        const i18nDir = path.join(tempDir, "lib", "l10n");
        fs.mkdirSync(i18nDir, { recursive: true });

        // Create mixed files
        const sourceFile = path.join(i18nDir, "app_en.arb");
        fs.writeFileSync(sourceFile, "{}");
        fs.writeFileSync(path.join(i18nDir, "app_es.arb"), "{}");
        fs.writeFileSync(path.join(i18nDir, "es.json"), "{}"); // Should be ignored
        fs.writeFileSync(path.join(i18nDir, "fr.json"), "{}"); // Should be ignored

        const detectedLanguages =
          detector.detectLanguagesFromProject(sourceFile);

        assert.strictEqual(detectedLanguages.length, 1);
        assert.deepStrictEqual(detectedLanguages, ["es"]);
      });
    });

    suite("ARB Folder-Based Structure", () => {
      test("detects ARB folder-based structure (lib/l10n/en_US/app.arb)", () => {
        const localesDir = path.join(tempDir, "lib", "l10n", "en_US");
        fs.mkdirSync(localesDir, { recursive: true });
        const sourceFile = path.join(localesDir, "app.arb");
        fs.writeFileSync(sourceFile, "{}");

        const structure = detector.detectProjectStructure(sourceFile);

        assert.strictEqual(structure.type, "folder");
        assert.strictEqual(
          structure.basePath,
          path.join(tempDir, "lib", "l10n"),
        );
        assert.strictEqual(structure.sourceLanguage, "en_US");
      });

      test("generates ARB folder-based target path", () => {
        const localesDir = path.join(tempDir, "lib", "l10n", "en_US");
        fs.mkdirSync(localesDir, { recursive: true });
        const sourceFile = path.join(localesDir, "app.arb");
        fs.writeFileSync(sourceFile, "{}");

        const targetPath = detector.generateTargetFilePath(sourceFile, "es");

        const expectedPath = path.join(tempDir, "lib", "l10n", "es", "app.arb");
        assert.strictEqual(targetPath, expectedPath);
      });

      test("detects ARB languages in folder-based structure", () => {
        const l10nDir = path.join(tempDir, "lib", "l10n");
        fs.mkdirSync(l10nDir, { recursive: true });

        // Create folder-based ARB structure
        const enDir = path.join(l10nDir, "en_US");
        const esDir = path.join(l10nDir, "es");
        const frDir = path.join(l10nDir, "fr_FR");

        fs.mkdirSync(enDir, { recursive: true });
        fs.mkdirSync(esDir, { recursive: true });
        fs.mkdirSync(frDir, { recursive: true });

        const sourceFile = path.join(enDir, "app.arb");
        fs.writeFileSync(sourceFile, "{}");
        fs.writeFileSync(path.join(esDir, "app.arb"), "{}");
        fs.writeFileSync(path.join(frDir, "app.arb"), "{}");

        const detectedLanguages =
          detector.detectLanguagesFromProject(sourceFile);

        assert.strictEqual(detectedLanguages.length, 2);
        assert.ok(detectedLanguages.includes("es"));
        assert.ok(detectedLanguages.includes("fr_FR"));
      });
    });
  });

  suite("JSONC File Support", () => {
    suite("JSONC Language Detection", () => {
      test("detects JSONC languages in file-based structure", () => {
        const i18nDir = path.join(tempDir, "i18n");
        fs.mkdirSync(i18nDir, { recursive: true });

        // Create JSONC files
        const sourceFile = path.join(i18nDir, "en.jsonc");
        fs.writeFileSync(sourceFile, "{}");
        fs.writeFileSync(path.join(i18nDir, "es.jsonc"), "{}");
        fs.writeFileSync(path.join(i18nDir, "fr.jsonc"), "{}");
        fs.writeFileSync(path.join(i18nDir, "de.jsonc"), "{}");

        const detectedLanguages =
          detector.detectLanguagesFromProject(sourceFile);

        assert.strictEqual(detectedLanguages.length, 3);
        assert.deepStrictEqual(detectedLanguages.sort(), ["de", "es", "fr"]);
      });

      test("detects both JSON and JSONC files together", () => {
        const i18nDir = path.join(tempDir, "i18n");
        fs.mkdirSync(i18nDir, { recursive: true });

        // Create mixed JSON and JSONC files
        const sourceFile = path.join(i18nDir, "en.json");
        fs.writeFileSync(sourceFile, "{}");
        fs.writeFileSync(path.join(i18nDir, "es.json"), "{}");
        fs.writeFileSync(path.join(i18nDir, "fr.jsonc"), "{}");
        fs.writeFileSync(path.join(i18nDir, "de.jsonc"), "{}");

        const detectedLanguages =
          detector.detectLanguagesFromProject(sourceFile);

        assert.strictEqual(detectedLanguages.length, 3);
        assert.deepStrictEqual(detectedLanguages.sort(), ["de", "es", "fr"]);
      });

      test("excludes ARB files when detecting JSONC languages", () => {
        const i18nDir = path.join(tempDir, "i18n");
        fs.mkdirSync(i18nDir, { recursive: true });

        // Create mixed files
        const sourceFile = path.join(i18nDir, "en.jsonc");
        fs.writeFileSync(sourceFile, "{}");
        fs.writeFileSync(path.join(i18nDir, "es.jsonc"), "{}");
        fs.writeFileSync(path.join(i18nDir, "app_fr.arb"), "{}"); // Should be ignored

        const detectedLanguages =
          detector.detectLanguagesFromProject(sourceFile);

        assert.strictEqual(detectedLanguages.length, 1);
        assert.deepStrictEqual(detectedLanguages, ["es"]);
      });
    });

    suite("JSONC Target File Path Generation", () => {
      test("generates JSONC target path (en.jsonc -> fr.jsonc)", () => {
        const i18nDir = path.join(tempDir, "i18n");
        fs.mkdirSync(i18nDir, { recursive: true });
        const sourceFile = path.join(i18nDir, "en.jsonc");
        fs.writeFileSync(sourceFile, "{}");

        const targetPath = detector.generateTargetFilePath(sourceFile, "fr");

        const expectedPath = path.join(i18nDir, "fr.jsonc");
        assert.strictEqual(targetPath, expectedPath);
      });

      test("preserves JSONC extension with complex language codes", () => {
        const i18nDir = path.join(tempDir, "i18n");
        fs.mkdirSync(i18nDir, { recursive: true });
        const sourceFile = path.join(i18nDir, "en-US.jsonc");
        fs.writeFileSync(sourceFile, "{}");

        const targetPath = detector.generateTargetFilePath(
          sourceFile,
          "zh-Hans-CN",
        );

        const expectedPath = path.join(i18nDir, "zh-Hans-CN.jsonc");
        assert.strictEqual(targetPath, expectedPath);
      });
    });

    suite("JSONC Project Structure Detection", () => {
      test("detects file-based structure for JSONC files", () => {
        const i18nDir = path.join(tempDir, "i18n");
        fs.mkdirSync(i18nDir, { recursive: true });
        const sourceFile = path.join(i18nDir, "en.jsonc");
        fs.writeFileSync(sourceFile, "{}");

        const structure = detector.detectProjectStructure(sourceFile);

        assert.strictEqual(structure.type, "file");
        assert.strictEqual(structure.basePath, i18nDir);
        assert.strictEqual(structure.sourceLanguage, "en");
      });
    });
  });

  suite("Shopify Theme Localization Support", () => {
    suite("Shopify Language Code Extraction", () => {
      test("extracts language code from Shopify default file (en.default.schema.json)", () => {
        const localesDir = path.join(tempDir, "locales");
        fs.mkdirSync(localesDir, { recursive: true });
        const sourceFile = path.join(localesDir, "en.default.schema.json");
        fs.writeFileSync(sourceFile, "{}");

        const structure = detector.detectProjectStructure(sourceFile);

        assert.strictEqual(structure.type, "file");
        assert.strictEqual(structure.sourceLanguage, "en");
      });

      test("extracts language code from Shopify schema file (es-ES.schema.json)", () => {
        const localesDir = path.join(tempDir, "locales");
        fs.mkdirSync(localesDir, { recursive: true });
        const sourceFile = path.join(localesDir, "es-ES.schema.json");
        fs.writeFileSync(sourceFile, "{}");

        const structure = detector.detectProjectStructure(sourceFile);

        assert.strictEqual(structure.type, "file");
        assert.strictEqual(structure.sourceLanguage, "es-ES");
      });

      test("extracts language code from Shopify file with only .schema (fr.schema.json)", () => {
        const localesDir = path.join(tempDir, "locales");
        fs.mkdirSync(localesDir, { recursive: true });
        const sourceFile = path.join(localesDir, "fr.schema.json");
        fs.writeFileSync(sourceFile, "{}");

        const structure = detector.detectProjectStructure(sourceFile);

        assert.strictEqual(structure.type, "file");
        assert.strictEqual(structure.sourceLanguage, "fr");
      });

      test("handles complex language code in Shopify file (zh-Hans-CN.default.schema.json)", () => {
        const localesDir = path.join(tempDir, "locales");
        fs.mkdirSync(localesDir, { recursive: true });
        const sourceFile = path.join(
          localesDir,
          "zh-Hans-CN.default.schema.json",
        );
        fs.writeFileSync(sourceFile, "{}");

        const structure = detector.detectProjectStructure(sourceFile);

        assert.strictEqual(structure.type, "file");
        assert.strictEqual(structure.sourceLanguage, "zh-Hans-CN");
      });
    });

    suite("Shopify Target File Path Generation", () => {
      test("removes .default and preserves .schema (en.default.schema.json -> es-ES.schema.json)", () => {
        const localesDir = path.join(tempDir, "locales");
        fs.mkdirSync(localesDir, { recursive: true });
        const sourceFile = path.join(localesDir, "en.default.schema.json");
        fs.writeFileSync(sourceFile, "{}");

        const targetPath = detector.generateTargetFilePath(sourceFile, "es-ES");

        const expectedPath = path.join(localesDir, "es-ES.schema.json");
        assert.strictEqual(targetPath, expectedPath);
      });

      test("preserves .schema suffix (fr.schema.json -> de.schema.json)", () => {
        const localesDir = path.join(tempDir, "locales");
        fs.mkdirSync(localesDir, { recursive: true });
        const sourceFile = path.join(localesDir, "fr.schema.json");
        fs.writeFileSync(sourceFile, "{}");

        const targetPath = detector.generateTargetFilePath(sourceFile, "de");

        const expectedPath = path.join(localesDir, "de.schema.json");
        assert.strictEqual(targetPath, expectedPath);
      });

      test("handles complex language codes (en.default.schema.json -> zh-Hans-CN.schema.json)", () => {
        const localesDir = path.join(tempDir, "locales");
        fs.mkdirSync(localesDir, { recursive: true });
        const sourceFile = path.join(localesDir, "en.default.schema.json");
        fs.writeFileSync(sourceFile, "{}");

        const targetPath = detector.generateTargetFilePath(
          sourceFile,
          "zh-Hans-CN",
        );

        const expectedPath = path.join(localesDir, "zh-Hans-CN.schema.json");
        assert.strictEqual(targetPath, expectedPath);
      });

      test("works with regular JSON when no .schema suffix (en.default.json -> fr.json)", () => {
        const localesDir = path.join(tempDir, "locales");
        fs.mkdirSync(localesDir, { recursive: true });
        const sourceFile = path.join(localesDir, "en.default.json");
        fs.writeFileSync(sourceFile, "{}");

        const targetPath = detector.generateTargetFilePath(sourceFile, "fr");

        const expectedPath = path.join(localesDir, "fr.json");
        assert.strictEqual(targetPath, expectedPath);
      });
    });

    suite("Shopify Language Detection", () => {
      test("detects Shopify theme languages excluding .default files", () => {
        const localesDir = path.join(tempDir, "locales");
        fs.mkdirSync(localesDir, { recursive: true });

        // Create Shopify theme localization files
        const sourceFile = path.join(localesDir, "en.default.schema.json");
        fs.writeFileSync(sourceFile, "{}");
        fs.writeFileSync(path.join(localesDir, "es-ES.schema.json"), "{}");
        fs.writeFileSync(path.join(localesDir, "fr.schema.json"), "{}");
        fs.writeFileSync(path.join(localesDir, "de.schema.json"), "{}");

        const detectedLanguages =
          detector.detectLanguagesFromProject(sourceFile);

        assert.strictEqual(detectedLanguages.length, 3);
        assert.deepStrictEqual(detectedLanguages.sort(), ["de", "es-ES", "fr"]);
      });

      test("detects languages with both .default and non-.default files", () => {
        const localesDir = path.join(tempDir, "locales");
        fs.mkdirSync(localesDir, { recursive: true });

        const sourceFile = path.join(localesDir, "en.default.schema.json");
        fs.writeFileSync(sourceFile, "{}");
        fs.writeFileSync(path.join(localesDir, "es.schema.json"), "{}");
        fs.writeFileSync(path.join(localesDir, "fr.default.schema.json"), "{}");
        fs.writeFileSync(path.join(localesDir, "de.schema.json"), "{}");

        const detectedLanguages =
          detector.detectLanguagesFromProject(sourceFile);

        // Should detect es, fr, and de (fr has .default so detected as language, de doesn't)
        assert.strictEqual(detectedLanguages.length, 3);
        assert.ok(detectedLanguages.includes("es"));
        assert.ok(detectedLanguages.includes("fr"));
        assert.ok(detectedLanguages.includes("de"));
      });

      test("excludes non-schema JSON files when detecting Shopify languages", () => {
        const localesDir = path.join(tempDir, "locales");
        fs.mkdirSync(localesDir, { recursive: true });

        const sourceFile = path.join(localesDir, "en.default.schema.json");
        fs.writeFileSync(sourceFile, "{}");
        fs.writeFileSync(path.join(localesDir, "es.schema.json"), "{}");
        fs.writeFileSync(path.join(localesDir, "fr.json"), "{}"); // Should be detected
        fs.writeFileSync(path.join(localesDir, "config.json"), "{}"); // Should not be detected (not a language code)

        const detectedLanguages =
          detector.detectLanguagesFromProject(sourceFile);

        assert.ok(detectedLanguages.includes("es"));
        assert.ok(detectedLanguages.includes("fr"));
        assert.strictEqual(detectedLanguages.includes("config"), false);
      });
    });

    suite("Shopify JSONC Support", () => {
      test("handles Shopify pattern with JSONC extension", () => {
        const localesDir = path.join(tempDir, "locales");
        fs.mkdirSync(localesDir, { recursive: true });
        const sourceFile = path.join(localesDir, "en.default.schema.jsonc");
        fs.writeFileSync(sourceFile, "{}");

        const structure = detector.detectProjectStructure(sourceFile);

        assert.strictEqual(structure.type, "file");
        assert.strictEqual(structure.sourceLanguage, "en");
      });

      test("generates JSONC Shopify target path", () => {
        const localesDir = path.join(tempDir, "locales");
        fs.mkdirSync(localesDir, { recursive: true });
        const sourceFile = path.join(localesDir, "en.default.schema.jsonc");
        fs.writeFileSync(sourceFile, "{}");

        const targetPath = detector.generateTargetFilePath(sourceFile, "es-ES");

        const expectedPath = path.join(localesDir, "es-ES.schema.jsonc");
        assert.strictEqual(targetPath, expectedPath);
      });
    });
  });

  suite("File-Name-Based Language Detection", () => {
    // Creates the given files in a directory and returns the path of the first one
    const createFiles = (dirName: string, fileNames: string[]): string => {
      const dir = path.join(tempDir, dirName);
      fs.mkdirSync(dir, { recursive: true });
      for (const fileName of fileNames) {
        fs.writeFileSync(path.join(dir, fileName), "{}");
      }
      return path.join(dir, fileNames[0]);
    };

    suite("Project Structure Detection", () => {
      test("detects a language code suffixed to the file name (emails.en.json)", () => {
        const sourceFile = createFiles("locales", ["emails.en.json"]);

        const structure = detector.detectProjectStructure(sourceFile);

        assert.strictEqual(structure.type, "file");
        assert.strictEqual(structure.basePath, path.join(tempDir, "locales"));
        assert.strictEqual(structure.sourceLanguage, "en");
        assert.deepStrictEqual(structure.fileNameMatch, {
          language: "en",
          prefix: "emails.",
          suffix: ".json",
        });
      });

      test("detects a language code joined with a hyphen (emails-en.json)", () => {
        const sourceFile = createFiles("locales", ["emails-en.json"]);

        const structure = detector.detectProjectStructure(sourceFile);

        assert.strictEqual(structure.type, "file");
        assert.strictEqual(structure.sourceLanguage, "en");
      });

      test("detects a language code prefixed to the file name (en-US.common.json)", () => {
        const sourceFile = createFiles("locales", ["en-US.common.json"]);

        const structure = detector.detectProjectStructure(sourceFile);

        assert.strictEqual(structure.type, "file");
        assert.strictEqual(structure.sourceLanguage, "en-US");
      });

      test("detects a language code with script and region (common.en-Latn-Us.yml)", () => {
        const sourceFile = createFiles("locales", ["common.en-Latn-Us.yml"]);

        const structure = detector.detectProjectStructure(sourceFile);

        assert.strictEqual(structure.type, "file");
        assert.strictEqual(structure.sourceLanguage, "en-Latn-Us");
      });

      test("detects a language code joined with underscores (messages_en_US.properties)", () => {
        const sourceFile = createFiles("locales", [
          "messages_en_US.properties",
        ]);

        const structure = detector.detectProjectStructure(sourceFile);

        assert.strictEqual(structure.type, "file");
        assert.strictEqual(structure.sourceLanguage, "en_US");
      });

      test("prefers the candidate corroborated by sibling files", () => {
        // Both "de" and "fr" are language codes, but only the "fr" pattern has siblings
        const sourceFile = createFiles("locales", [
          "de.app.fr.json",
          "de.app.es.json",
        ]);

        const structure = detector.detectProjectStructure(sourceFile);

        assert.strictEqual(structure.sourceLanguage, "fr");
        assert.strictEqual(structure.fileNameMatch.prefix, "de.app.");
      });

      test("does not treat unknown tokens as language codes", () => {
        for (const fileName of [
          "strings.min.json",
          "bundle.new.json",
          "site.map.json",
          "data.set.json",
          "config.dev.json",
        ]) {
          const sourceFile = createFiles("unknown", [fileName]);

          const structure = detector.detectProjectStructure(sourceFile);

          assert.strictEqual(structure.type, "unknown", fileName);
          assert.strictEqual(structure.sourceLanguage, undefined, fileName);
        }
      });

      test("prefers an embedded code over a coincidental whole-name match", () => {
        // "app-en" parses as a language code structurally ("app" + region "en"),
        // but "app" is not a language - the embedded "en" is the real code
        const sourceFile = createFiles("locales", ["app-en.json"]);

        const structure = detector.detectProjectStructure(sourceFile);

        assert.strictEqual(structure.type, "file");
        assert.strictEqual(structure.sourceLanguage, "en");
        assert.strictEqual(
          detector.generateTargetFilePath(sourceFile, "fr"),
          path.join(tempDir, "locales", "app-fr.json"),
        );
      });

      test("keeps whole-name codes with unrecognized subtags file-based", () => {
        // "bal" is a real language code outside the bundled sets, so the previous
        // interpretation is kept rather than discarded
        const sourceFile = createFiles("locales", ["bal-PK.json"]);

        const structure = detector.detectProjectStructure(sourceFile);

        assert.strictEqual(structure.type, "file");
        assert.strictEqual(structure.sourceLanguage, "bal-PK");
      });
    });

    suite("Language Detection from Project", () => {
      test("detects languages of files following the same pattern", () => {
        const sourceFile = createFiles("locales", [
          "emails.en.json",
          "emails.es.json",
          "emails.fr.json",
          "emails.zh-Hans-CN.json",
        ]);

        const detectedLanguages =
          detector.detectLanguagesFromProject(sourceFile);

        assert.deepStrictEqual(detectedLanguages, ["es", "fr", "zh-Hans-CN"]);
      });

      test("ignores files following a different pattern", () => {
        const sourceFile = createFiles("locales", [
          "emails.en.json",
          "emails.es.json",
          "common.de.json",
          "emails.json",
          "emails.es.yaml",
        ]);

        const detectedLanguages =
          detector.detectLanguagesFromProject(sourceFile);

        assert.deepStrictEqual(detectedLanguages, ["es"]);
      });

      test("detects languages for a prefixed language code", () => {
        const sourceFile = createFiles("locales", [
          "en-US.common.json",
          "ja.common.json",
          "pt-BR.common.json",
        ]);

        const detectedLanguages =
          detector.detectLanguagesFromProject(sourceFile);

        assert.deepStrictEqual(detectedLanguages, ["ja", "pt-BR"]);
      });

      test("returns an empty array when no other language files exist", () => {
        const sourceFile = createFiles("locales", ["emails.en.json"]);

        const detectedLanguages =
          detector.detectLanguagesFromProject(sourceFile);

        assert.deepStrictEqual(detectedLanguages, []);
      });
    });

    suite("Target File Path Generation", () => {
      test("replaces the language code in the file name (email.en.json -> email.ru-RU.json)", () => {
        const sourceFile = createFiles("locales", ["email.en.json"]);

        const targetPath = detector.generateTargetFilePath(sourceFile, "ru-RU");

        assert.strictEqual(
          targetPath,
          path.join(tempDir, "locales", "email.ru-RU.json"),
        );
      });

      test("replaces a prefixed language code (en-US.common.json -> ja.common.json)", () => {
        const sourceFile = createFiles("locales", ["en-US.common.json"]);

        const targetPath = detector.generateTargetFilePath(sourceFile, "ja");

        assert.strictEqual(
          targetPath,
          path.join(tempDir, "locales", "ja.common.json"),
        );
      });

      test("keeps a hyphen separator (emails-en.json -> emails-fr.json)", () => {
        const sourceFile = createFiles("locales", ["emails-en.json"]);

        const targetPath = detector.generateTargetFilePath(sourceFile, "fr");

        assert.strictEqual(
          targetPath,
          path.join(tempDir, "locales", "emails-fr.json"),
        );
      });

      test("follows the underscore separator of the source file name", () => {
        const sourceFile = createFiles("locales", [
          "messages_en_US.properties",
        ]);

        const targetPath = detector.generateTargetFilePath(sourceFile, "ru-RU");

        assert.strictEqual(
          targetPath,
          path.join(tempDir, "locales", "messages_ru_RU.properties"),
        );
      });

      test("replaces a code with script and region (common.en-Latn-Us.yml -> common.fr.yml)", () => {
        const sourceFile = createFiles("locales", ["common.en-Latn-Us.yml"]);

        const targetPath = detector.generateTargetFilePath(sourceFile, "fr");

        assert.strictEqual(
          targetPath,
          path.join(tempDir, "locales", "common.fr.yml"),
        );
      });

      test("appends the language code for unknown structures", () => {
        // Regression: file names without a language code keep the previous behavior
        const sourceFile = createFiles("translations", ["messages.json"]);

        const targetPath = detector.generateTargetFilePath(sourceFile, "fr");

        assert.strictEqual(
          targetPath,
          path.join(tempDir, "translations", "messages.fr.json"),
        );
      });
    });

    suite("Source Language Extraction", () => {
      test("extracts the language code from the file name", () => {
        const sourceFile = createFiles("locales", ["emails.en.json"]);

        assert.strictEqual(
          detector.extractLanguageCodeFromPath(sourceFile),
          "en",
        );
      });

      test("returns null for unknown structures", () => {
        const sourceFile = createFiles("translations", ["messages.json"]);

        assert.strictEqual(
          detector.extractLanguageCodeFromPath(sourceFile),
          null,
        );
      });
    });

    suite("Project Structure Description", () => {
      test("describes a file-name-based structure", () => {
        const sourceFile = createFiles("locales", [
          "emails.en.json",
          "emails.fr.json",
        ]);

        const structure = detector.describeProjectStructure(sourceFile);

        assert.strictEqual(structure.type, "file");
        assert.strictEqual(structure.sourceLanguage, "en");
        assert.strictEqual(structure.fileNameMatch.prefix, "emails.");
      });

      test("describes the existing structure types", () => {
        const folderSource = createFiles(path.join("locales", "en"), [
          "common.json",
        ]);
        assert.strictEqual(
          detector.describeProjectStructure(folderSource).type,
          "folder",
        );

        const fileSource = createFiles("i18n", ["en.json"]);
        assert.strictEqual(
          detector.describeProjectStructure(fileSource).type,
          "file",
        );

        const unknownSource = createFiles("translations", ["messages.json"]);
        assert.strictEqual(
          detector.describeProjectStructure(unknownSource).type,
          "unknown",
        );
      });
    });

    suite("Custom Language Code Regex", () => {
      const languageCodeRegex = "^strings\\.(?<language>[\\w-]+)\\.json$";

      test("detects languages the built-in detection rejects", () => {
        // "min" is not a known language code, so only the custom regex finds it
        const sourceFile = createFiles("locales", [
          "strings.min.json",
          "strings.ru.json",
          "strings.de.json",
        ]);

        assert.deepStrictEqual(
          detector.detectLanguagesFromProject(sourceFile),
          [],
        );
        assert.deepStrictEqual(
          detector.detectLanguagesFromProject(sourceFile, {
            languageCodeRegex,
          }),
          ["de", "ru"],
        );
      });

      test("generates target paths from the custom pattern", () => {
        const sourceFile = createFiles("locales", ["strings.min.json"]);

        const targetPath = detector.generateTargetFilePath(
          sourceFile,
          "ru-RU",
          { languageCodeRegex },
        );

        assert.strictEqual(
          targetPath,
          path.join(tempDir, "locales", "strings.ru-RU.json"),
        );
      });

      test("accepts a regex configured on the instance", () => {
        const sourceFile = createFiles("locales", [
          "strings.min.json",
          "strings.ru.json",
        ]);
        const configured: any = new I18nProjectManager(undefined, {
          languageCodeRegex,
        });

        assert.strictEqual(
          configured.detectProjectStructure(sourceFile).sourceLanguage,
          "min",
        );
        assert.deepStrictEqual(
          configured.detectLanguagesFromProject(sourceFile),
          ["ru"],
        );
      });

      test("takes precedence over the folder-based structure", () => {
        const sourceFile = createFiles(path.join("locales", "en"), [
          "strings.min.json",
        ]);

        const structure = detector.detectProjectStructure(sourceFile, {
          languageCodeRegex,
        });

        assert.strictEqual(structure.type, "file");
        assert.strictEqual(structure.sourceLanguage, "min");
      });

      test("falls back to automatic detection when the regex does not match", () => {
        const sourceFile = createFiles("locales", ["emails.en.json"]);

        const structure = detector.detectProjectStructure(sourceFile, {
          languageCodeRegex,
        });

        assert.strictEqual(structure.type, "file");
        assert.strictEqual(structure.sourceLanguage, "en");
      });

      test("throws for an invalid regex", () => {
        const sourceFile = createFiles("locales", ["emails.en.json"]);

        assert.throws(
          () =>
            detector.detectLanguagesFromProject(sourceFile, {
              languageCodeRegex: "^emails\\.([\\w-]+)\\.json$",
            }),
          /named capture group/,
        );
        assert.throws(
          () =>
            detector.detectLanguagesFromProject(sourceFile, {
              languageCodeRegex: "^(?<language>[a-z",
            }),
          /not a valid regular expression/,
        );
      });
    });
  });
});
