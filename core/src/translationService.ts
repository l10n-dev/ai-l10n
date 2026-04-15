import { ConsoleLogger } from "./consoleLogger";
import { URLS } from "./constants";
import { ILogger } from "./logger";

/**
 * Supported file schema formats for translation requests.
 * Used to enable schema-specific translation handling.
 */
export enum FileSchema {
  /** OpenAPI specification format */
  OpenAPI = "openApi",
  /** Flutter ARB (Application Resource Bundle) format */
  ARBFlutter = "arbFlutter",
}

// API Types based on the OpenAPI specification
export interface TranslationRequest {
  sourceStrings: string;
  targetLanguageCode: string;
  useContractions?: boolean;
  useShortening?: boolean;
  generatePluralForms?: boolean;
  translateMetadata?: boolean;
  client: string;
  translateOnlyNewStrings?: boolean;
  targetStrings?: string;
  schema: FileSchema | null;
  /**
   * Localization file format (e.g., "json", "arb", "po", "yaml", "xml").
   * If not specified, auto-detected from sourceStrings content.
   * See https://l10n.dev/ws/translate-i18n-files#supported-formats for supported formats.
   */
  format?: string;
}

export interface TranslationResult {
  targetLanguageCode: string;
  translations?: string;
  usage: TranslationUsage;
  finishReason?: FinishReason;
  completedChunks: number;
  totalChunks: number;
  remainingBalance?: number;
  /**
   * Source strings that were filtered out due to content policy violations or length limits.
   * Populated when the finish reason is 'contentFilter' or 'length'.
   * Raw text in the same format as the input (JSON, YAML, PO, etc.).
   */
  filteredStrings?: string;
}

export interface TranslationUsage {
  charsUsed?: number;
}

export enum FinishReason {
  stop = "stop",
  length = "length",
  contentFilter = "contentFilter",
  error = "error",
}

export interface Language {
  code: string;
  name: string;
}

export interface LanguagePredictionResponse {
  languages: Language[];
}

// ── Supported Languages (v2/languages) ──────────────────────────────────────

export type LanguageProficiencyLevel =
  | "strong"
  | "high"
  | "moderate"
  | "limited";

export interface Region {
  code: string | null;
  name: string | null;
  nativeName: string | null;
}

export interface Script {
  code: string | null;
  name: string | null;
  nativeName: string | null;
}

export interface SupportedLanguage {
  code: string | null;
  name: string | null;
  nativeName: string | null;
  level?: LanguageProficiencyLevel;
  regions?: Region[] | null;
  scripts?: Script[] | null;
}

export interface SupportedLanguagesResponse {
  languages: SupportedLanguage[];
}

// ── Balance ──────────────────────────────────────────────────────────────────

export interface BalanceResponse {
  /** Current balance of characters available for translation. */
  currentBalance: number;
}

// ── Translation Response ─────────────────────────────────────────────────────

export interface TranslationResponse {
  status: "success" | "error";
  /** Machine-readable reason code. */
  reason?:
    | "noApiKey"
    | "unauthorized"
    | "paymentRequired"
    | "badRequest"
    | "requestTooLarge"
    | "serverError"
    | "networkError"
    | "translationError";
  /** Human-readable message (populated on error status). */
  message?: string;
  /** The translation result (populated on success status). */
  result?: TranslationResult;
  /**
   * Remaining character balance.
   * On success: equals result.remainingBalance.
   * On 402 error: the current (insufficient) balance from the API response.
   */
  currentBalance?: number;
}

// ── Translation Service ─────────────────────────────────────────────────────

export class L10nTranslationService {
  constructor(private readonly logger: ILogger = new ConsoleLogger()) {}

  async getBalance(apiKey: string): Promise<BalanceResponse> {
    const response = await fetch(`${URLS.API_BASE}/v2/balance`, {
      headers: {
        "X-API-Key": apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to get balance: ${response.status} ${response.statusText}`,
      );
    }

    return (await response.json()) as BalanceResponse;
  }

  async getLanguages(options?: {
    codes?: string[];
    proficiencyLevels?: LanguageProficiencyLevel[];
  }): Promise<SupportedLanguagesResponse> {
    const url = new URL(`${URLS.API_BASE}/v2/languages`);
    if (options?.codes) {
      for (const c of options.codes) {
        url.searchParams.append("c", c);
      }
    }
    if (options?.proficiencyLevels) {
      for (const p of options.proficiencyLevels) {
        url.searchParams.append("p", p);
      }
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(
        `Failed to get languages: ${response.status} ${response.statusText}`,
      );
    }

    return (await response.json()) as SupportedLanguagesResponse;
  }

  async predictLanguages(
    input: string,
    limit: number = 10,
  ): Promise<Language[]> {
    const url = new URL(`${URLS.API_BASE}/v2/languages/predict`);
    url.searchParams.append("input", input);
    url.searchParams.append("limit", limit.toString());

    this.logger.logInfo(
      `Predicting languages for input (${input.length} characters)`,
    );

    const response = await fetch(url.toString());

    if (!response.ok) {
      this.logger.logWarning(
        `Language prediction failed - ${response.status} ${response.statusText}`,
      );
      const error = new Error(
        `Failed to predict languages: ${response.statusText}`,
      );
      throw error;
    }

    const result: LanguagePredictionResponse =
      (await response.json()) as LanguagePredictionResponse;

    this.logger.logInfo(
      `Successfully predicted ${result.languages.length} languages`,
    );
    return result.languages;
  }

  async translate(
    request: TranslationRequest,
    apiKey: string,
  ): Promise<TranslationResponse> {
    if (!apiKey) {
      this.logger.showAndLogError(
        "API Key not set. Please configure your API Key first.",
        null,
        "",
        "Get API Key",
        URLS.API_KEYS,
      );
      return {
        status: "error",
        reason: "noApiKey",
        message: "API Key not set. Please configure your API Key first.",
      };
    }

    this.logger.logInfo(
      `Starting translation to ${request.targetLanguageCode}`,
    );

    const response = await fetch(`${URLS.API_BASE}/v2/translate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify(request),
    });

    if (response.ok) {
      const result = (await response.json()) as TranslationResult;

      // Note: FinishReason.contentFilter and FinishReason.length return partial results with filteredStrings populated, so we treat them as success cases.
      // Only FinishReason.error is treated as an error status.
      if (result.finishReason === FinishReason.error) {
        const errorMessage = "Translation failed due to an error.";
        this.logger.showAndLogError(errorMessage);
        return {
          status: "error",
          reason: "translationError",
          message: errorMessage,
          result,
          currentBalance: result.remainingBalance,
        };
      }

      if (result.finishReason !== FinishReason.stop) {
        this.logger.logWarning(
          `Translation finished with reason: ${result.finishReason}`,
        );
      }

      const currentBalance = result.remainingBalance;
      return { status: "success", result, currentBalance };
    }

    this.logger.logWarning(
      `Translation API error - ${response.status} ${response.statusText}`,
    );

    // Try to parse error response body
    let errorData: any = null;
    try {
      errorData = await response.json();
      const details = JSON.stringify(errorData);
      this.logger.logWarning(`API error details - ${details}`);
    } catch {
      // Ignore JSON parsing errors
    }

    let errorMessage: string;
    let errorReason:
      | "noApiKey"
      | "unauthorized"
      | "paymentRequired"
      | "badRequest"
      | "requestTooLarge"
      | "serverError"
      | "networkError"
      | "translationError";
    let linkText: string | undefined;
    let url: string | undefined;
    let currentBalance: number | undefined;

    switch (response.status) {
      case 400: {
        // Try to extract validation errors from the error response
        let validationMessage =
          "Invalid request. Please check your input and try again.";
        if (errorData && errorData.errors) {
          const errorDetails = errorData.errors;
          if (Array.isArray(errorDetails)) {
            validationMessage = errorDetails.join(" ");
          } else if (typeof errorDetails === "object") {
            validationMessage = Object.values(errorDetails)
              .map((v) => (Array.isArray(v) ? v.join(" ") : v))
              .join(" ");
          }
        }
        errorMessage = validationMessage;
        errorReason = "badRequest";
        break;
      }
      case 401: {
        errorMessage = "Unauthorized. Please check your API Key.";
        errorReason = "unauthorized";
        linkText = "Get API Key";
        url = URLS.API_KEYS;
        break;
      }
      case 402: {
        // Try to extract required characters from the error response
        errorMessage =
          "Not enough characters remaining for this translation. You can try translating a smaller portion of your file or purchase more characters.";

        currentBalance = errorData?.data?.currentBalance as number;
        const requiredBalance = errorData?.data?.requiredBalance as number;
        if (requiredBalance && currentBalance !== undefined) {
          errorMessage = `This translation requires ${requiredBalance.toLocaleString()} characters, but you only have ${currentBalance.toLocaleString()} characters available. You can try translating a smaller portion of your file or purchase more characters.`;
        }

        errorReason = "paymentRequired";
        linkText = "Visit l10n.dev";
        url = URLS.PRICING;
        break;
      }
      case 413:
        errorMessage = "Request too large. Maximum request size is 5 MB.";
        errorReason = "requestTooLarge";
        break;
      case 500:
        errorMessage = `An internal server error occurred (Error code: ${
          errorData?.errorCode || "unknown"
        }). Please try again later.`;
        errorReason = "serverError";
        break;
      default:
        errorMessage =
          "Failed to translate. Please check your connection and try again.";
        errorReason = "networkError";
    }

    this.logger.showAndLogError(errorMessage, null, "", linkText, url);
    return {
      status: "error",
      reason: errorReason,
      message: errorMessage,
      currentBalance,
    };
  }
}
