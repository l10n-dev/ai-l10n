import * as assert from "assert";
import * as sinon from "sinon";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { AiTranslator, TranslationConfig } from "../index";
import { ApiKeyManager } from "../apiKeyManager";
import { I18nProjectManager } from "../i18nProjectManager";
import {
  FinishReason,
  L10nTranslationService,
  TranslationResult,
} from "../translationService";
import { ConsoleLogger } from "../consoleLogger";

suite("AiTranslator Test Suite", () => {
  let translator: AiTranslator;
  let tempDir: string;
  let apiKeyManagerStub: sinon.SinonStubbedInstance<ApiKeyManager>;
  let i18nProjectManagerStub: sinon.SinonStubbedInstance<I18nProjectManager>;
  let translationServiceStub: sinon.SinonStubbedInstance<L10nTranslationService>;
  let consoleLogStub: sinon.SinonStub;
  let consoleErrorStub: sinon.SinonStub;
  let consoleWarnStub: sinon.SinonStub;

  setup(() => {
    // Create temp directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "test-translator-"));

    // Create translator instance
    translator = new AiTranslator();

    // Stub console methods
    consoleLogStub = sinon.stub(console, "log");
    consoleErrorStub = sinon.stub(console, "error");
    consoleWarnStub = sinon.stub(console, "warn");

    // Stub dependencies
    apiKeyManagerStub = sinon.stub((translator as any).apiKeyManager);
    i18nProjectManagerStub = sinon.stub((translator as any).i18nProjectManager);
    translationServiceStub = sinon.stub((translator as any).translationService);
  });

  teardown(() => {
    sinon.restore();

    // Cleanup temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  suite("Constructor", () => {
    test("initializes with all dependencies", () => {
      const newTranslator = new AiTranslator();

      assert.ok((newTranslator as any).logger);
      assert.ok((newTranslator as any).apiKeyManager);
      assert.ok((newTranslator as any).translationService);
      assert.ok((newTranslator as any).i18nProjectManager);
    });
  });

  suite("API Key Management", () => {
    test("setApiKey delegates to ApiKeyManager", async () => {
      apiKeyManagerStub.setApiKey.resolves();

      await translator.setApiKey("test-key");

      assert.ok(apiKeyManagerStub.setApiKey.calledOnceWith("test-key"));
    });

    test("clearApiKey delegates to ApiKeyManager", async () => {
      apiKeyManagerStub.clearApiKey.resolves();

      await translator.clearApiKey();

      assert.ok(apiKeyManagerStub.clearApiKey.calledOnce);
    });

    test("getApiKey delegates to ApiKeyManager", async () => {
      apiKeyManagerStub.getApiKey.resolves("stored-key");

      const result = await translator.getApiKey();

      assert.strictEqual(result, "stored-key");
      assert.ok(apiKeyManagerStub.getApiKey.calledOnce);
    });

    test("displayApiKey delegates to ApiKeyManager", async () => {
      apiKeyManagerStub.displayApiKey.resolves("API Key: abcd...xyz");

      const result = await translator.displayApiKey();

      assert.strictEqual(result, "API Key: abcd...xyz");
      assert.ok(apiKeyManagerStub.displayApiKey.calledOnce);
    });
  });

  suite("Translation - Validation", () => {
    test("throws error when sourceFile is not provided", async () => {
      const config: TranslationConfig = {
        sourceFile: "",
      };

      const result = await translator.translate(config);

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.results.length, 0);
      assert.ok(
        consoleErrorStub.calledWith(sinon.match(/sourceFile is required/))
      );
    });

    test("throws error when source file does not exist", async () => {
      const config: TranslationConfig = {
        sourceFile: path.join(tempDir, "nonexistent.json"),
      };

      const result = await translator.translate(config);

      assert.strictEqual(result.success, false);
      assert.ok(
        consoleErrorStub.calledWith(sinon.match(/Source file not found/))
      );
    });

    test("throws error for unsupported file type", async () => {
      const txtFile = path.join(tempDir, "test.txt");
      fs.writeFileSync(txtFile, "test");

      const config: TranslationConfig = {
        sourceFile: txtFile,
      };

      const result = await translator.translate(config);

      assert.strictEqual(result.success, false);
      assert.ok(
        consoleErrorStub.calledWith(
          sinon.match(
            /Unsupported file type.*Only \.json and \.arb files are supported/
          )
        )
      );
    });

    test("throws error for invalid language code", async () => {
      const sourceFile = path.join(tempDir, "en.json");
      fs.writeFileSync(sourceFile, JSON.stringify({ hello: "Hello" }));

      apiKeyManagerStub.ensureApiKey.resolves("api-key");
      i18nProjectManagerStub.validateLanguageCode.returns(false);

      const config: TranslationConfig = {
        sourceFile,
        targetLanguages: ["invalid-code"],
      };

      const result = await translator.translate(config);

      assert.strictEqual(result.success, false);
      assert.ok(
        consoleErrorStub.calledWith(sinon.match(/Invalid language code/))
      );
    });
  });

  suite("Translation - Language Detection", () => {
    test("auto-detects target languages from project structure", async () => {
      const sourceFile = path.join(tempDir, "en.json");
      fs.writeFileSync(sourceFile, JSON.stringify({ hello: "Hello" }));

      apiKeyManagerStub.ensureApiKey.resolves("api-key");
      i18nProjectManagerStub.detectLanguagesFromProject.returns(["es", "fr"]);
      i18nProjectManagerStub.validateLanguageCode.returns(true);
      i18nProjectManagerStub.normalizeLanguageCode.callsFake((code) => code);
      i18nProjectManagerStub.generateTargetFilePath.callsFake((source, lang) =>
        path.join(tempDir, `${lang}.json`)
      );
      i18nProjectManagerStub.getUniqueFilePath.callsFake((p) => p);

      translationServiceStub.translateJson.resolves({
        targetLanguageCode: "es",
        translations: JSON.stringify({ hello: "Hola" }),
        usage: { charsUsed: 10 },
        completedChunks: 1,
        totalChunks: 1,
      });

      const config: TranslationConfig = {
        sourceFile,
      };

      const result = await translator.translate(config);

      assert.strictEqual(result.success, true);
      assert.ok(
        consoleLogStub.calledWith(
          sinon.match(/Auto-detected target languages.*es, fr/)
        )
      );
    });

    test("throws error when no languages detected and none provided", async () => {
      const sourceFile = path.join(tempDir, "en.json");
      fs.writeFileSync(sourceFile, JSON.stringify({ hello: "Hello" }));

      apiKeyManagerStub.ensureApiKey.resolves("api-key");
      i18nProjectManagerStub.detectLanguagesFromProject.returns([]);

      const config: TranslationConfig = {
        sourceFile,
      };

      const result = await translator.translate(config);

      assert.strictEqual(result.success, false);
      assert.ok(
        consoleErrorStub.calledWith(sinon.match(/No target languages found/))
      );
    });

    test("uses provided target languages", async () => {
      const sourceFile = path.join(tempDir, "en.json");
      fs.writeFileSync(sourceFile, JSON.stringify({ hello: "Hello" }));

      apiKeyManagerStub.ensureApiKey.resolves("api-key");
      i18nProjectManagerStub.validateLanguageCode.returns(true);
      i18nProjectManagerStub.normalizeLanguageCode.callsFake((code) => code);
      i18nProjectManagerStub.generateTargetFilePath.callsFake((source, lang) =>
        path.join(tempDir, `${lang}.json`)
      );
      i18nProjectManagerStub.getUniqueFilePath.callsFake((p) => p);

      translationServiceStub.translateJson.resolves({
        targetLanguageCode: "es",
        translations: JSON.stringify({ hello: "Hola" }),
        usage: { charsUsed: 10 },
        completedChunks: 1,
        totalChunks: 1,
      });

      const config: TranslationConfig = {
        sourceFile,
        targetLanguages: ["de"],
      };

      const result = await translator.translate(config);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.results.length, 1);
      assert.strictEqual(result.results[0].language, "de");
    });
  });

  suite("Translation - Success Cases", () => {
    test("successfully translates JSON file to single language", async () => {
      const sourceFile = path.join(tempDir, "en.json");
      fs.writeFileSync(sourceFile, JSON.stringify({ hello: "Hello" }));

      apiKeyManagerStub.ensureApiKey.resolves("api-key");
      i18nProjectManagerStub.validateLanguageCode.returns(true);
      i18nProjectManagerStub.normalizeLanguageCode.callsFake((code) => code);
      i18nProjectManagerStub.generateTargetFilePath.returns(
        path.join(tempDir, "es.json")
      );
      i18nProjectManagerStub.getUniqueFilePath.callsFake((p) => p);

      translationServiceStub.translateJson.resolves({
        targetLanguageCode: "es",
        translations: JSON.stringify({ hello: "Hola" }),
        usage: { charsUsed: 10 },
        completedChunks: 1,
        totalChunks: 1,
        remainingBalance: 1000,
      });

      const config: TranslationConfig = {
        sourceFile,
        targetLanguages: ["es"],
      };

      const result = await translator.translate(config);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.results.length, 1);
      assert.strictEqual(result.results[0].success, true);
      assert.strictEqual(result.results[0].language, "es");
      assert.strictEqual(result.totalCharsUsed, 10);
      assert.strictEqual(result.remainingBalance, 1000);
    });

    test("successfully translates to multiple languages in parallel", async () => {
      const sourceFile = path.join(tempDir, "en.json");
      fs.writeFileSync(sourceFile, JSON.stringify({ hello: "Hello" }));

      apiKeyManagerStub.ensureApiKey.resolves("api-key");
      i18nProjectManagerStub.validateLanguageCode.returns(true);
      i18nProjectManagerStub.normalizeLanguageCode.callsFake((code) => code);
      i18nProjectManagerStub.generateTargetFilePath.callsFake((source, lang) =>
        path.join(tempDir, `${lang}.json`)
      );
      i18nProjectManagerStub.getUniqueFilePath.callsFake((p) => p);

      translationServiceStub.translateJson.callsFake(async (req) => ({
        targetLanguageCode: req.targetLanguageCode,
        translations: JSON.stringify({
          hello: `Hello-${req.targetLanguageCode}`,
        }),
        usage: { charsUsed: 10 },
        completedChunks: 1,
        totalChunks: 1,
        remainingBalance: 1000,
      }));

      const config: TranslationConfig = {
        sourceFile,
        targetLanguages: ["es", "fr", "de"],
      };

      const result = await translator.translate(config);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.results.length, 3);
      assert.strictEqual(result.results.filter((r) => r.success).length, 3);
      assert.strictEqual(result.totalCharsUsed, 30);
    });

    test("creates output files with translated content", async () => {
      const sourceFile = path.join(tempDir, "en.json");
      fs.writeFileSync(sourceFile, JSON.stringify({ hello: "Hello" }));

      const outputFile = path.join(tempDir, "es.json");

      apiKeyManagerStub.ensureApiKey.resolves("api-key");
      i18nProjectManagerStub.validateLanguageCode.returns(true);
      i18nProjectManagerStub.normalizeLanguageCode.callsFake((code) => code);
      i18nProjectManagerStub.generateTargetFilePath.returns(outputFile);
      i18nProjectManagerStub.getUniqueFilePath.returns(outputFile);

      translationServiceStub.translateJson.resolves({
        targetLanguageCode: "es",
        translations: JSON.stringify({ hello: "Hola" }),
        usage: { charsUsed: 10 },
        completedChunks: 1,
        totalChunks: 1,
      });

      const config: TranslationConfig = {
        sourceFile,
        targetLanguages: ["es"],
      };

      await translator.translate(config);

      assert.ok(fs.existsSync(outputFile));
      const content = JSON.parse(fs.readFileSync(outputFile, "utf8"));
      assert.strictEqual(content.hello, "Hola");
    });
  });

  suite("Translation - Configuration Options", () => {
    test("applies verbose mode logging", async () => {
      const sourceFile = path.join(tempDir, "en.json");
      fs.writeFileSync(sourceFile, JSON.stringify({ hello: "Hello" }));

      apiKeyManagerStub.ensureApiKey.resolves("api-key");
      i18nProjectManagerStub.validateLanguageCode.returns(true);
      i18nProjectManagerStub.normalizeLanguageCode.callsFake((code) => code);
      i18nProjectManagerStub.generateTargetFilePath.returns(
        path.join(tempDir, "es.json")
      );
      i18nProjectManagerStub.getUniqueFilePath.callsFake((p) => p);

      translationServiceStub.translateJson.resolves({
        targetLanguageCode: "es",
        translations: JSON.stringify({ hello: "Hola" }),
        usage: { charsUsed: 10 },
        completedChunks: 1,
        totalChunks: 1,
      });

      const config: TranslationConfig = {
        sourceFile,
        targetLanguages: ["es"],
        verbose: true,
      };

      await translator.translate(config);

      assert.ok(consoleLogStub.calledWith(sinon.match(/Source file:/)));
      assert.ok(consoleLogStub.calledWith(sinon.match(/Target languages:/)));
      assert.ok(consoleLogStub.calledWith(sinon.match(/Configuration:/)));
    });

    test("passes all config options to translation service", async () => {
      const sourceFile = path.join(tempDir, "test.arb");
      fs.writeFileSync(sourceFile, JSON.stringify({ hello: "Hello" }));

      apiKeyManagerStub.ensureApiKey.resolves("api-key");
      i18nProjectManagerStub.validateLanguageCode.returns(true);
      i18nProjectManagerStub.normalizeLanguageCode.callsFake((code) => code);
      i18nProjectManagerStub.generateTargetFilePath.returns(
        path.join(tempDir, "es.arb")
      );
      i18nProjectManagerStub.getUniqueFilePath.callsFake((p) => p);

      translationServiceStub.translateJson.resolves({
        targetLanguageCode: "es",
        translations: JSON.stringify({ hello: "Hola" }),
        usage: { charsUsed: 10 },
        completedChunks: 1,
        totalChunks: 1,
      });

      const config: TranslationConfig = {
        sourceFile,
        targetLanguages: ["es"],
        useContractions: false,
        useShortening: true,
        generatePluralForms: true,
      };

      await translator.translate(config);

      const callArgs = translationServiceStub.translateJson.firstCall.args[0];
      assert.strictEqual(callArgs.useContractions, false);
      assert.strictEqual(callArgs.useShortening, true);
      assert.strictEqual(callArgs.generatePluralForms, true);
    });

    test("detects ARB file and sets correct schema", async () => {
      const sourceFile = path.join(tempDir, "app_en.arb");
      fs.writeFileSync(sourceFile, JSON.stringify({ hello: "Hello" }));

      apiKeyManagerStub.ensureApiKey.resolves("api-key");
      i18nProjectManagerStub.validateLanguageCode.returns(true);
      i18nProjectManagerStub.normalizeLanguageCode.callsFake((code) => code);
      i18nProjectManagerStub.generateTargetFilePath.returns(
        path.join(tempDir, "app_es.arb")
      );
      i18nProjectManagerStub.getUniqueFilePath.callsFake((p) => p);

      translationServiceStub.translateJson.resolves({
        targetLanguageCode: "es",
        translations: JSON.stringify({ hello: "Hola" }),
        usage: { charsUsed: 10 },
        completedChunks: 1,
        totalChunks: 1,
      });

      const config: TranslationConfig = {
        sourceFile,
        targetLanguages: ["es"],
      };

      await translator.translate(config);

      const callArgs = translationServiceStub.translateJson.firstCall.args[0];
      assert.strictEqual(callArgs.schema, "arbFlutter");
    });

    test("handles translateOnlyNewStrings mode", async () => {
      const sourceFile = path.join(tempDir, "en.json");
      fs.writeFileSync(
        sourceFile,
        JSON.stringify({ hello: "Hello", world: "World" })
      );

      const targetFile = path.join(tempDir, "es.json");
      fs.writeFileSync(targetFile, JSON.stringify({ hello: "Hola" }));

      apiKeyManagerStub.ensureApiKey.resolves("api-key");
      i18nProjectManagerStub.validateLanguageCode.returns(true);
      i18nProjectManagerStub.normalizeLanguageCode.callsFake((code) => code);
      i18nProjectManagerStub.generateTargetFilePath.returns(targetFile);

      translationServiceStub.translateJson.resolves({
        targetLanguageCode: "es",
        translations: JSON.stringify({ hello: "Hola", world: "Mundo" }),
        usage: { charsUsed: 10 },
        completedChunks: 1,
        totalChunks: 1,
      });

      const config: TranslationConfig = {
        sourceFile,
        targetLanguages: ["es"],
        translateOnlyNewStrings: true,
      };

      await translator.translate(config);

      const callArgs = translationServiceStub.translateJson.firstCall.args[0];
      assert.strictEqual(callArgs.translateOnlyNewStrings, true);
      assert.ok(callArgs.targetStrings);
    });
  });

  suite("Translation - Filtered Strings", () => {
    test("saves filtered strings to separate file", async () => {
      const sourceFile = path.join(tempDir, "en.json");
      fs.writeFileSync(sourceFile, JSON.stringify({ hello: "Hello" }));

      const outputFile = path.join(tempDir, "es.json");
      const filteredFile = path.join(tempDir, "es.filtered.json");

      apiKeyManagerStub.ensureApiKey.resolves("api-key");
      i18nProjectManagerStub.validateLanguageCode.returns(true);
      i18nProjectManagerStub.normalizeLanguageCode.callsFake((code) => code);
      i18nProjectManagerStub.generateTargetFilePath.returns(outputFile);
      i18nProjectManagerStub.getUniqueFilePath.returns(outputFile);

      translationServiceStub.translateJson.resolves({
        targetLanguageCode: "es",
        translations: JSON.stringify({ hello: "Hola" }),
        usage: { charsUsed: 10 },
        finishReason: FinishReason.contentFilter,
        filteredStrings: { badWord: "inappropriate" },
        filteredStringsCount: 1,
        completedChunks: 1,
        totalChunks: 1,
      });

      const config: TranslationConfig = {
        sourceFile,
        targetLanguages: ["es"],
        saveFilteredStrings: true,
      };

      await translator.translate(config);

      assert.ok(fs.existsSync(filteredFile));
      assert.ok(consoleWarnStub.calledWith(sinon.match(/1 string.*excluded/)));
    });

    test("logs filtered strings when saveFilteredStrings is false", async () => {
      const sourceFile = path.join(tempDir, "en.json");
      fs.writeFileSync(sourceFile, JSON.stringify({ hello: "Hello" }));

      apiKeyManagerStub.ensureApiKey.resolves("api-key");
      i18nProjectManagerStub.validateLanguageCode.returns(true);
      i18nProjectManagerStub.normalizeLanguageCode.callsFake((code) => code);
      i18nProjectManagerStub.generateTargetFilePath.returns(
        path.join(tempDir, "es.json")
      );
      i18nProjectManagerStub.getUniqueFilePath.callsFake((p) => p);

      translationServiceStub.translateJson.resolves({
        targetLanguageCode: "es",
        translations: JSON.stringify({ hello: "Hola" }),
        usage: { charsUsed: 10 },
        finishReason: FinishReason.contentFilter,
        filteredStrings: { badWord: "inappropriate" },
        filteredStringsCount: 1,
        completedChunks: 1,
        totalChunks: 1,
      });

      const config: TranslationConfig = {
        sourceFile,
        targetLanguages: ["es"],
        saveFilteredStrings: false,
      };

      await translator.translate(config);

      assert.ok(consoleLogStub.calledWith(sinon.match(/Filtered strings:/)));
    });

    test("handles length finish reason for filtered strings", async () => {
      const sourceFile = path.join(tempDir, "en.json");
      fs.writeFileSync(sourceFile, JSON.stringify({ hello: "Hello" }));

      apiKeyManagerStub.ensureApiKey.resolves("api-key");
      i18nProjectManagerStub.validateLanguageCode.returns(true);
      i18nProjectManagerStub.normalizeLanguageCode.callsFake((code) => code);
      i18nProjectManagerStub.generateTargetFilePath.returns(
        path.join(tempDir, "es.json")
      );
      i18nProjectManagerStub.getUniqueFilePath.callsFake((p) => p);

      translationServiceStub.translateJson.resolves({
        targetLanguageCode: "es",
        translations: JSON.stringify({ hello: "Hola" }),
        usage: { charsUsed: 10 },
        finishReason: FinishReason.length,
        filteredStrings: { longText: "very long content..." },
        filteredStringsCount: 1,
        completedChunks: 1,
        totalChunks: 1,
      });

      const config: TranslationConfig = {
        sourceFile,
        targetLanguages: ["es"],
      };

      await translator.translate(config);

      assert.ok(
        consoleWarnStub.calledWith(sinon.match(/AI context limit was reached/))
      );
    });
  });

  suite("Translation - Error Handling", () => {
    test("handles individual language translation failure", async () => {
      const sourceFile = path.join(tempDir, "en.json");
      fs.writeFileSync(sourceFile, JSON.stringify({ hello: "Hello" }));

      apiKeyManagerStub.ensureApiKey.resolves("api-key");
      i18nProjectManagerStub.validateLanguageCode.returns(true);
      i18nProjectManagerStub.normalizeLanguageCode.callsFake((code) => code);
      i18nProjectManagerStub.generateTargetFilePath.callsFake((source, lang) =>
        path.join(tempDir, `${lang}.json`)
      );
      i18nProjectManagerStub.getUniqueFilePath.callsFake((p) => p);

      translationServiceStub.translateJson.callsFake(async (req) => {
        if (req.targetLanguageCode === "es") {
          return {
            targetLanguageCode: "es",
            translations: JSON.stringify({ hello: "Hola" }),
            usage: { charsUsed: 10 },
            completedChunks: 1,
            totalChunks: 1,
          };
        }
        throw new Error("Translation failed for fr");
      });

      const config: TranslationConfig = {
        sourceFile,
        targetLanguages: ["es", "fr"],
      };

      const result = await translator.translate(config);

      assert.strictEqual(result.success, true); // At least one succeeded
      assert.strictEqual(result.results.length, 2);
      assert.strictEqual(result.results[0].success, true);
      assert.strictEqual(result.results[1].success, false);
      assert.ok(result.results[1].error);
    });

    test("handles null result from translation service", async () => {
      const sourceFile = path.join(tempDir, "en.json");
      fs.writeFileSync(sourceFile, JSON.stringify({ hello: "Hello" }));

      apiKeyManagerStub.ensureApiKey.resolves("api-key");
      i18nProjectManagerStub.validateLanguageCode.returns(true);
      i18nProjectManagerStub.normalizeLanguageCode.callsFake((code) => code);
      i18nProjectManagerStub.generateTargetFilePath.returns(
        path.join(tempDir, "es.json")
      );
      i18nProjectManagerStub.getUniqueFilePath.callsFake((p) => p);

      translationServiceStub.translateJson.resolves(null);

      const config: TranslationConfig = {
        sourceFile,
        targetLanguages: ["es"],
      };

      const result = await translator.translate(config);

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.results[0].success, false);
      assert.ok(result.results[0].error?.includes("no result"));
    });

    test("handles missing translations in result", async () => {
      const sourceFile = path.join(tempDir, "en.json");
      fs.writeFileSync(sourceFile, JSON.stringify({ hello: "Hello" }));

      apiKeyManagerStub.ensureApiKey.resolves("api-key");
      i18nProjectManagerStub.validateLanguageCode.returns(true);
      i18nProjectManagerStub.normalizeLanguageCode.callsFake((code) => code);
      i18nProjectManagerStub.generateTargetFilePath.returns(
        path.join(tempDir, "es.json")
      );
      i18nProjectManagerStub.getUniqueFilePath.callsFake((p) => p);

      translationServiceStub.translateJson.resolves({
        targetLanguageCode: "es",
        translations: undefined as any,
        usage: { charsUsed: 0 },
        completedChunks: 1,
        totalChunks: 1,
      });

      const config: TranslationConfig = {
        sourceFile,
        targetLanguages: ["es"],
      };

      const result = await translator.translate(config);

      assert.strictEqual(result.success, false);
      assert.ok(result.results[0].error?.includes("No translation results"));
    });

    test("reports all failures in summary", async () => {
      const sourceFile = path.join(tempDir, "en.json");
      fs.writeFileSync(sourceFile, JSON.stringify({ hello: "Hello" }));

      apiKeyManagerStub.ensureApiKey.resolves("api-key");
      i18nProjectManagerStub.validateLanguageCode.returns(true);
      i18nProjectManagerStub.normalizeLanguageCode.callsFake((code) => code);
      i18nProjectManagerStub.generateTargetFilePath.callsFake((source, lang) =>
        path.join(tempDir, `${lang}.json`)
      );
      i18nProjectManagerStub.getUniqueFilePath.callsFake((p) => p);

      translationServiceStub.translateJson.rejects(new Error("Service error"));

      const config: TranslationConfig = {
        sourceFile,
        targetLanguages: ["es", "fr", "de"],
      };

      const result = await translator.translate(config);

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.results.filter((r) => !r.success).length, 3);
      assert.ok(consoleLogStub.calledWith(sinon.match(/Failed: es, fr, de/)));
    });
  });

  suite("Translation - Summary Reporting", () => {
    test("displays summary with success count", async () => {
      const sourceFile = path.join(tempDir, "en.json");
      fs.writeFileSync(sourceFile, JSON.stringify({ hello: "Hello" }));

      apiKeyManagerStub.ensureApiKey.resolves("api-key");
      i18nProjectManagerStub.validateLanguageCode.returns(true);
      i18nProjectManagerStub.normalizeLanguageCode.callsFake((code) => code);
      i18nProjectManagerStub.generateTargetFilePath.callsFake((source, lang) =>
        path.join(tempDir, `${lang}.json`)
      );
      i18nProjectManagerStub.getUniqueFilePath.callsFake((p) => p);

      translationServiceStub.translateJson.resolves({
        targetLanguageCode: "es",
        translations: JSON.stringify({ hello: "Hola" }),
        usage: { charsUsed: 15 },
        completedChunks: 1,
        totalChunks: 1,
      });

      const config: TranslationConfig = {
        sourceFile,
        targetLanguages: ["es", "fr"],
      };

      await translator.translate(config);

      assert.ok(consoleLogStub.calledWith(sinon.match(/Translation Summary/)));
      assert.ok(consoleLogStub.calledWith(sinon.match(/Successful: 2\/2/)));
      assert.ok(
        consoleLogStub.calledWith(sinon.match(/Total characters used: 30/))
      );
    });

    test("displays remaining balance when available", async () => {
      const sourceFile = path.join(tempDir, "en.json");
      fs.writeFileSync(sourceFile, JSON.stringify({ hello: "Hello" }));

      apiKeyManagerStub.ensureApiKey.resolves("api-key");
      i18nProjectManagerStub.validateLanguageCode.returns(true);
      i18nProjectManagerStub.normalizeLanguageCode.callsFake((code) => code);
      i18nProjectManagerStub.generateTargetFilePath.returns(
        path.join(tempDir, "es.json")
      );
      i18nProjectManagerStub.getUniqueFilePath.callsFake((p) => p);

      translationServiceStub.translateJson.resolves({
        targetLanguageCode: "es",
        translations: JSON.stringify({ hello: "Hola" }),
        usage: { charsUsed: 10 },
        remainingBalance: 5000,
        completedChunks: 1,
        totalChunks: 1,
      });

      const config: TranslationConfig = {
        sourceFile,
        targetLanguages: ["es"],
      };

      await translator.translate(config);

      assert.ok(
        consoleLogStub.calledWith(sinon.match(/Remaining balance: 5,000/))
      );
    });

    test("uses lowest remaining balance from multiple translations", async () => {
      const sourceFile = path.join(tempDir, "en.json");
      fs.writeFileSync(sourceFile, JSON.stringify({ hello: "Hello" }));

      apiKeyManagerStub.ensureApiKey.resolves("api-key");
      i18nProjectManagerStub.validateLanguageCode.returns(true);
      i18nProjectManagerStub.normalizeLanguageCode.callsFake((code) => code);
      i18nProjectManagerStub.generateTargetFilePath.callsFake((source, lang) =>
        path.join(tempDir, `${lang}.json`)
      );
      i18nProjectManagerStub.getUniqueFilePath.callsFake((p) => p);

      let callCount = 0;
      translationServiceStub.translateJson.callsFake(async () => {
        callCount++;
        return {
          targetLanguageCode: "es",
          translations: JSON.stringify({ hello: "Hola" }),
          usage: { charsUsed: 10 },
          remainingBalance: callCount === 1 ? 1000 : 500,
          completedChunks: 1,
          totalChunks: 1,
        };
      });

      const config: TranslationConfig = {
        sourceFile,
        targetLanguages: ["es", "fr"],
      };

      const result = await translator.translate(config);

      assert.strictEqual(result.remainingBalance, 500);
    });
  });

  suite("Translation - Default Configuration", () => {
    test("uses correct default values for options", async () => {
      const sourceFile = path.join(tempDir, "en.json");
      fs.writeFileSync(sourceFile, JSON.stringify({ hello: "Hello" }));

      apiKeyManagerStub.ensureApiKey.resolves("api-key");
      i18nProjectManagerStub.validateLanguageCode.returns(true);
      i18nProjectManagerStub.normalizeLanguageCode.callsFake((code) => code);
      i18nProjectManagerStub.generateTargetFilePath.returns(
        path.join(tempDir, "es.json")
      );
      i18nProjectManagerStub.getUniqueFilePath.callsFake((p) => p);

      translationServiceStub.translateJson.resolves({
        targetLanguageCode: "es",
        translations: JSON.stringify({ hello: "Hola" }),
        usage: { charsUsed: 10 },
        completedChunks: 1,
        totalChunks: 1,
      });

      const config: TranslationConfig = {
        sourceFile,
        targetLanguages: ["es"],
      };

      await translator.translate(config);

      const callArgs = translationServiceStub.translateJson.firstCall.args[0];
      assert.strictEqual(callArgs.useContractions, true); // default true
      assert.strictEqual(callArgs.useShortening, false); // default false
      assert.strictEqual(callArgs.generatePluralForms, false); // default false
      assert.strictEqual(callArgs.translateOnlyNewStrings, false); // default false
    });
  });
});
