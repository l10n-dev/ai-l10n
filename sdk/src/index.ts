import * as fs from "fs";
import * as path from "path";
import { ApiKeyManager } from "./apiKeyManager";
import { I18nProjectManager } from "./i18nProjectManager";
import {
  L10nTranslationService,
  TranslationRequest,
  TranslationResult,
  FileSchema,
  FinishReason,
  CONFIG,
  URLS,
  ConsoleLogger,
  ILogger,
  validateLanguageCode,
  normalizeLanguageCode,
} from "ai-l10n-core";

/**
 * Configuration options for translation
 */
export interface TranslationConfig {
  /**
   * Path to the source file to translate (JSON, JSONC, PO, YAML, XML, XLIFF, ARB, etc.)
   */
  sourceFile: string;

  /**
   * Target language codes (e.g., ["es", "fr", "de"])
   * If not provided, will be auto-detected from project structure
   */
  targetLanguages?: string[];

  /**
   * API key for l10n.dev service
   * Can also be set via L10N_API_KEY environment variable
   */
  apiKey?: string;

  /**
   * Generates additional plural form strings (e.g., for i18next) with plural suffixes.
   * Do not enable for strict source-to-target mapping (default: false)
   */
  generatePluralForms?: boolean;

  /**
   * Use shortening in translations (default: false)
   */
  useShortening?: boolean;

  /**
   * Use contractions in translations (default: true)
   */
  useContractions?: boolean;

  /**
   * Translate metadata along with UI strings (default: false)
   * For example, in Flutter ARB files, metadata entries like `@key` contain descriptions
   * that can also be translated. Disabling this option ensures that metadata remains
   * unchanged in the target files.
   */
  translateMetadata?: boolean;

  /**
   * Save filtered strings to separate file (default: true)
   * Filtered strings are in i18n JSON format and contain source strings that violated
   * content policies. Review the translation for successfully translated content.
   * Content filtering operates automatically and does not constitute editorial control.
   */
  saveFilteredStrings?: boolean;

  /**
   * If true, update existing files with only new translations
   * If false, create new files with unique names (default: false)
   */
  translateOnlyNewStrings?: boolean;

  /**
   * Enable verbose logging (default: false)
   */
  verbose?: boolean;
}

/**
 * Result of a single translation operation
 */
export interface TranslationOutput {
  success: boolean;
  language: string;
  outputPath?: string;
  charsUsed?: number;
  error?: string;
}

/**
 * Result of translate operation
 */
export interface TranslationSummary {
  success: boolean;
  results: TranslationOutput[];
  totalCharsUsed: number;
  remainingBalance?: number;
}

/**
 * Main class for AI-powered localization
 */
export class AiTranslator {
  private apiKeyManager: ApiKeyManager;
  private translationService: L10nTranslationService;
  private i18nProjectManager: I18nProjectManager;

  constructor(private readonly logger: ILogger = new ConsoleLogger()) {
    this.apiKeyManager = new ApiKeyManager(this.logger);
    this.translationService = new L10nTranslationService(this.logger);
    this.i18nProjectManager = new I18nProjectManager(this.logger);
  }

  /**
   * Translate a localization file to one or more target languages
   */
  async translate(config: TranslationConfig): Promise<TranslationSummary> {
    const verbose = config.verbose ?? false;

    try {
      // Validate source file
      if (!config.sourceFile) {
        throw new Error("sourceFile is required");
      }

      const sourceFilePath = path.resolve(config.sourceFile);
      if (!fs.existsSync(sourceFilePath)) {
        throw new Error(`Source file not found: ${sourceFilePath}`);
      }

      const fileExtension = path.extname(sourceFilePath);
      const format = fileExtension.slice(1);

      if (verbose) {
        this.logger.logInfo(`📂 Source file: ${sourceFilePath}`);
      }

      // Ensure API key is available
      const apiKey = await this.apiKeyManager.ensureApiKey(config.apiKey);

      // Determine target languages
      let targetLanguages = config.targetLanguages;

      if (!targetLanguages || targetLanguages.length === 0) {
        // Auto-detect from project structure
        targetLanguages =
          this.i18nProjectManager.detectLanguagesFromProject(sourceFilePath);

        if (targetLanguages.length === 0) {
          throw new Error(
            "No target languages found. Please specify targetLanguages in config or ensure your project has the proper structure (e.g., folders named with language codes or files named with language codes).",
          );
        }

        this.logger.logInfo(
          `✨ Auto-detected target languages from project structure: ${targetLanguages.join(
            ", ",
          )}`,
        );
      }

      // Validate language codes
      for (const lang of targetLanguages) {
        if (!validateLanguageCode(lang)) {
          throw new Error(`Invalid language code: ${lang}`);
        }
      }

      if (verbose) {
        this.logger.logInfo(
          `🎯 Target languages: ${targetLanguages.join(", ")}`,
        );
      }

      // Prepare configuration
      const useContractions = config.useContractions ?? true;
      const useShortening = config.useShortening ?? false;
      const generatePluralForms = config.generatePluralForms ?? false;
      const translateMetadata = config.translateMetadata ?? false;
      const saveFilteredStrings = config.saveFilteredStrings ?? true;
      const translateOnlyNewStrings = config.translateOnlyNewStrings ?? false;

      if (verbose) {
        this.logger.logInfo(`Configuration:
  - Use contractions: ${useContractions}
  - Use shortening: ${useShortening}
  - Generate plural forms: ${generatePluralForms}
  - Translate metadata: ${translateMetadata}
  - Save filtered strings: ${saveFilteredStrings}
  - Translate only new strings: ${translateOnlyNewStrings}`);
      }

      // Perform translations in parallel
      const totalLanguages = targetLanguages.length;

      const translationPromises = targetLanguages.map(
        async (targetLanguage, i) => {
          const targetFilePath = this.i18nProjectManager.generateTargetFilePath(
            sourceFilePath,
            targetLanguage,
          );

          try {
            this.logger.logInfo(
              `\n🌐 Translating (${
                i + 1
              }/${totalLanguages}) to ${targetLanguage}...`,
            );

            const result = await this.performTranslation(
              apiKey,
              sourceFilePath,
              targetLanguage,
              targetFilePath,
              translateOnlyNewStrings,
              useContractions,
              useShortening,
              generatePluralForms,
              translateMetadata,
              saveFilteredStrings,
              format,
              verbose,
            );

            return result;
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error";
            this.logger.showAndLogError(
              `Translation to ${targetLanguage} failed: ${errorMessage}`,
            );
            return {
              success: false,
              language: targetLanguage,
              error: errorMessage,
            };
          }
        },
      );

      // Wait for all translations to complete
      const results = await Promise.all(translationPromises);

      // Calculate totals
      let totalCharsUsed = 0;
      let remainingBalance: number | undefined;

      for (const result of results) {
        totalCharsUsed += result.charsUsed || 0;
        if (
          result.remainingBalance !== undefined &&
          result.remainingBalance !== null &&
          result.remainingBalance < (remainingBalance ?? Infinity)
        ) {
          remainingBalance = result.remainingBalance;
        }
      }

      // Summary
      const successCount = results.filter((r) => r.success).length;
      this.logger.logInfo(`\n${"=".repeat(50)}`);
      this.logger.logInfo(`📊 Translation Summary`);
      this.logger.logInfo(`${"=".repeat(50)}`);
      this.logger.logInfo(
        `✅ Successful: ${successCount}/${targetLanguages.length}`,
      );
      this.logger.logInfo(
        `📝 Total characters used: ${totalCharsUsed.toLocaleString()}`,
      );
      if (remainingBalance !== undefined && remainingBalance !== null) {
        this.logger.logInfo(
          `💰 Remaining balance: ${remainingBalance.toLocaleString()} characters`,
        );
      }

      if (successCount < targetLanguages.length) {
        const failedLanguages = results
          .filter((r) => !r.success)
          .map((r) => r.language);
        this.logger.logWarning(`Failed: ${failedLanguages.join(", ")}`);
      }

      return {
        success: successCount > 0,
        results,
        totalCharsUsed,
        remainingBalance,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.showAndLogError(`❌ Translation failed: ${errorMessage}`);
      return {
        success: false,
        results: [],
        totalCharsUsed: 0,
      };
    }
  }

  private async performTranslation(
    apiKey: string,
    sourceFilePath: string,
    targetLanguage: string,
    targetFilePath: string,
    translateOnlyNewStrings: boolean,
    useContractions: boolean,
    useShortening: boolean,
    generatePluralForms: boolean,
    translateMetadata: boolean,
    saveFilteredStrings: boolean,
    format: string,
    verbose: boolean,
  ): Promise<TranslationOutput & { remainingBalance?: number }> {
    // Read source file
    const sourceContent = fs.readFileSync(sourceFilePath, "utf8");

    // Check if target file exists and read it if updating
    let targetStrings: string | undefined = undefined;
    if (translateOnlyNewStrings && fs.existsSync(targetFilePath)) {
      targetStrings = fs.readFileSync(targetFilePath, "utf8");
      if (verbose) {
        this.logger.logInfo(`  📄 Updating existing file: ${targetFilePath}`);
      }
    }

    // Normalize language code for API
    const normalizedLanguage = normalizeLanguageCode(targetLanguage);

    // Prepare translation request
    const request: TranslationRequest = {
      sourceStrings: sourceContent,
      targetLanguageCode: normalizedLanguage,
      useContractions,
      useShortening,
      generatePluralForms,
      translateMetadata,
      client: CONFIG.CLIENT,
      translateOnlyNewStrings,
      targetStrings,
      schema: format === "arb" ? FileSchema.ARBFlutter : null,
      format,
    };

    // Call translation service
    const response = await this.translationService.translate(request, apiKey);

    if (response.status === "error") {
      return {
        success: false,
        language: targetLanguage,
        error: response.message ?? "Translation service returned no result",
      };
    }

    const result = response.result!;

    if (!result.translations) {
      return {
        success: false,
        language: targetLanguage,
        error: "No translation results received",
      };
    }

    // Determine output path
    let outputPath = targetFilePath;
    if (!translateOnlyNewStrings) {
      outputPath = this.i18nProjectManager.getUniqueFilePath(targetFilePath);
    }

    // Save translated file
    fs.writeFileSync(outputPath, result.translations, "utf8");

    // Handle filtered strings
    if (result.filteredStrings) {
      this.handleFilteredStrings(result, outputPath, saveFilteredStrings);
    }

    const charsUsed = result.usage.charsUsed || 0;
    this.logger.logInfo(`  ✅ Saved to: ${outputPath}`);
    this.logger.logInfo(`  📊 Characters used: ${charsUsed.toLocaleString()}`);

    return {
      success: true,
      language: targetLanguage,
      outputPath,
      charsUsed,
      remainingBalance: response.currentBalance,
    };
  }

  private handleFilteredStrings(
    result: TranslationResult,
    targetFilePath: string,
    saveFilteredStrings: boolean,
  ): void {
    let reasonMessage: string;
    if (result.finishReason === FinishReason.contentFilter) {
      reasonMessage = "content policy violations";
    } else if (result.finishReason === FinishReason.length) {
      reasonMessage = "AI context limit was reached (content too long)";
    } else {
      return;
    }

    const filteredStringsContent = result.filteredStrings ?? "";
    this.logger.logWarning(
      `Some strings were excluded due to ${reasonMessage}`,
    );
    if (result.finishReason === FinishReason.contentFilter) {
      this.logger.logInfo(
        `  ℹ️ View content policy at: ${URLS.CONTENT_POLICY}`,
      );
    }

    if (saveFilteredStrings) {
      const ext = path.extname(targetFilePath);
      const base = path.basename(targetFilePath, ext);
      const dir = path.dirname(targetFilePath);
      const filteredPath = path.join(dir, `${base}.filtered${ext}`);

      fs.writeFileSync(filteredPath, filteredStringsContent, "utf8");
      this.logger.logInfo(`  📝 Filtered strings saved to: ${filteredPath}`);
    } else {
      this.logger.logInfo(`  📝 Filtered strings:\n${filteredStringsContent}`);
    }
  }

  /**
   * Set API key for l10n.dev service
   */
  async setApiKey(apiKey: string): Promise<void> {
    await this.apiKeyManager.setApiKey(apiKey);
  }

  /**
   * Clear stored API key
   */
  async clearApiKey(): Promise<void> {
    await this.apiKeyManager.clearApiKey();
  }

  /**
   * Get current API key (if set)
   */
  async getApiKey(): Promise<string | undefined> {
    return await this.apiKeyManager.getApiKey();
  }

  /**
   * Mask the API key for display purposes
   */
  async displayApiKey(): Promise<string> {
    return await this.apiKeyManager.displayApiKey();
  }
}

// Export main class and types
export * from "./i18nProjectManager";
export * from "ai-l10n-core";
