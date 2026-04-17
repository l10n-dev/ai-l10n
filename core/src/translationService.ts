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

// ── Generic API Response ─────────────────────────────────────────────────────

/**
 * Discriminated union returned by all public service methods.
 * Check `success` to narrow to the data or error branch.
 */
export type ApiResponse<T> =
  | { success: true; data: T }
  | {
      success: false;
      reason:
        | "paymentRequired"
        | "translationError"
        | "requestTooLarge"
        | "badRequest"
        | "unauthorized"
        | "forbidden"
        | "rateLimited"
        | "serverError"
        | "networkError"
        | "noApiKey";
      message: string;
    };

// ── Translation Response ─────────────────────────────────────────────────────

/**
 * Response from translate(). Extends ApiResponse<TranslationResult> with an
 * optional currentBalance field present on both the success and error branches.
 *
 * On success: data contains the TranslationResult; currentBalance is the remaining balance.
 * On error: reason and message describe the failure; currentBalance is set on 402 errors.
 */
export type TranslationResponse = ApiResponse<TranslationResult> & {
  currentBalance?: number;
};

// ── Translation Service ─────────────────────────────────────────────────────

export class L10nTranslationService {
  constructor(private readonly logger: ILogger = new ConsoleLogger()) {}

  async getBalance(apiKey: string): Promise<ApiResponse<BalanceResponse>> {
    const apiKeyError = this.checkApiKey(apiKey);
    if (apiKeyError) {
      return apiKeyError;
    }

    this.logger.logInfo("Fetching current balance");

    const response = await fetch(`${URLS.API_BASE}/v2/balance`, {
      headers: {
        "X-API-Key": apiKey,
      },
    });

    if (!response.ok) {
      return this.handleErrorResponse(response, "Get balance");
    }
    const result = (await response.json()) as BalanceResponse;
    return { success: true, data: result };
  }

  async getLanguages(
    apiKey: string,
    options?: {
      codes?: string[];
      proficiencyLevels?: LanguageProficiencyLevel[];
    },
  ): Promise<ApiResponse<SupportedLanguagesResponse>> {
    const apiKeyError = this.checkApiKey(apiKey);
    if (apiKeyError) {
      return apiKeyError;
    }

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

    this.logger.logInfo(
      `Fetching supported languages with filters - codes: ${
        options?.codes ? options.codes.join(",") : "none"
      }, proficiency levels: ${
        options?.proficiencyLevels
          ? options.proficiencyLevels.join(",")
          : "none"
      }`,
    );

    const response = await fetch(url.toString(), {
      headers: {
        "X-API-Key": apiKey,
      },
    });

    if (!response.ok) {
      return this.handleErrorResponse(response, "Get languages");
    }
    const result = (await response.json()) as SupportedLanguagesResponse;
    this.logger.logInfo(
      `Successfully fetched ${result.languages.length} languages`,
    );
    return { success: true, data: result };
  }

  async predictLanguages(
    input: string,
    limit: number = 10,
  ): Promise<ApiResponse<Language[]>> {
    const url = new URL(`${URLS.API_BASE}/v2/languages/predict`);
    url.searchParams.append("input", input);
    url.searchParams.append("limit", limit.toString());

    this.logger.logInfo(
      `Predicting languages for input (${input.length} characters)`,
    );

    const response = await fetch(url.toString());

    if (!response.ok) {
      return this.handleErrorResponse(response, "Predict languages");
    }
    const result: LanguagePredictionResponse =
      (await response.json()) as LanguagePredictionResponse;

    this.logger.logInfo(
      `Successfully predicted ${result.languages.length} languages`,
    );
    return { success: true, data: result.languages };
  }

  async translate(
    request: TranslationRequest,
    apiKey: string,
  ): Promise<TranslationResponse> {
    const apiKeyError = this.checkApiKey(apiKey);
    if (apiKeyError) {
      return apiKeyError;
    }

    this.logger.logInfo(
      `Starting translation to ${request.targetLanguageCode}`,
    );

    if (!request.client) {
      request.client = "ai-l10n-core-npmjs";
    }

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
      const currentBalance = result?.remainingBalance;

      // Note: FinishReason.contentFilter and FinishReason.length return partial results with filteredStrings populated, so we treat them as success cases.
      // Only FinishReason.error is treated as an error status.
      if (!result || result.finishReason === FinishReason.error) {
        const message = "Translation failed due to an error.";
        this.logger.showAndLogError(message);
        return {
          success: false,
          reason: "translationError",
          message,
          currentBalance,
        };
      }

      if (result.finishReason !== FinishReason.stop) {
        this.logger.logWarning(
          `Translation finished with reason: ${result.finishReason}`,
        );
      }

      return { success: true, data: result, currentBalance };
    }

    if (response.status === 402) {
      this.logger.logWarning(
        `Translation error - ${response.status} ${response.statusText}`,
      );
      const errorData = await this.parseErrorBody(response);
      let message =
        "Not enough characters remaining for this translation. You can try translating a smaller portion of your content or purchase more characters.";
      const requiredBalance = errorData?.data?.requiredBalance as number;
      const currentBalance = errorData?.data?.currentBalance as number;
      if (requiredBalance && currentBalance !== undefined) {
        message = `This translation requires ${requiredBalance.toLocaleString()} characters, but you only have ${currentBalance.toLocaleString()} characters available. You can try translating a smaller portion of your content or purchase more characters.`;
      }
      this.logger.showAndLogError(
        message,
        !requiredBalance ? errorData : undefined,
        "",
        "Visit l10n.dev",
        URLS.PRICING,
      );
      return {
        success: false,
        reason: "paymentRequired",
        message,
        currentBalance,
      };
    } else if (response.status === 413) {
      this.logger.logWarning(
        `Translation error - ${response.status} ${response.statusText}`,
      );
      const errorData = await this.parseErrorBody(response);
      const message = "Request too large. Maximum request size is 5 MB.";
      this.logger.showAndLogError(message, errorData);
      return { success: false, reason: "requestTooLarge", message };
    }

    return this.handleErrorResponse(response, "Translate");
  }

  private checkApiKey(
    apiKey: string,
  ): { success: false; reason: "noApiKey"; message: string } | null {
    if (!apiKey) {
      const message = "API Key not set. Please configure your API Key first.";
      this.logger.showAndLogError(
        message,
        null,
        "",
        "Get API Key",
        URLS.API_KEYS,
      );
      return { success: false, reason: "noApiKey", message };
    }
    return null;
  }

  /**
   * Maps an HTTP error to a structured ApiResponse error.
   * Handles 400 (with validation error extraction), 401, 403, 429, 502, 503, and 500.
   */
  private async handleErrorResponse(
    response: Response,
    title: string,
  ): Promise<{
    success: false;
    reason:
      | "badRequest"
      | "unauthorized"
      | "forbidden"
      | "rateLimited"
      | "serverError"
      | "networkError";
    message: string;
  }> {
    this.logger.logWarning(
      `${title} failed - ${response.status} ${response.statusText}`,
    );
    const errorData = await this.parseErrorBody(response);
    const status = response.status;
    switch (status) {
      case 400: {
        let message = "Invalid request. Please check your input and try again.";
        if (
          errorData?.errors &&
          typeof errorData.errors === "object" &&
          !Array.isArray(errorData.errors)
        ) {
          const e = errorData.errors;
          message = Object.keys(e)
            .map((k) => {
              const v = e[k];
              if (k) {
                // not empty key
                if (Array.isArray(v)) {
                  return `${k}: ${v.join(" ")}`;
                } else {
                  return `${k}: ${String(v)}`;
                }
              }
              return Array.isArray(v) ? v.join(" ") : String(v);
            })
            .join("; \r\n");
          this.logger.showAndLogError(message);
        } else {
          this.logger.showAndLogError(message, errorData);
        }
        return { success: false, reason: "badRequest", message };
      }
      case 401: {
        const message = "Unauthorized. Please check your API Key.";
        this.logger.showAndLogError(
          message,
          errorData,
          "",
          "Get API Key",
          URLS.API_KEYS,
        );
        return { success: false, reason: "unauthorized", message: message };
      }
      case 403: {
        const message =
          "Forbidden. You don't have permission to access this resource.";
        this.logger.showAndLogError(message, errorData);
        return { success: false, reason: "forbidden", message: message };
      }
      case 429: {
        const message =
          "Too many requests. You're being rate limited. Please try again later.";
        this.logger.showAndLogError(message, errorData);
        return { success: false, reason: "rateLimited", message: message };
      }
      case 502:
      case 503:
      case 500: {
        const message = `An internal server error occurred (Error code: ${
          errorData?.errorCode ?? "unknown"
        }). Please try again later.`;
        this.logger.showAndLogError(message, errorData);
        return { success: false, reason: "serverError", message: message };
      }
      default: {
        const message = `Failed to ${title.toLowerCase()}: ${response.status} ${response.statusText}`;
        this.logger.showAndLogError(message, errorData);
        return { success: false, reason: "networkError", message: message };
      }
    }
  }

  /**
   * Attempts to parse the response body as JSON. If parsing fails, returns the raw text.
   * Logs a warning if JSON parsing fails.
   */
  private async parseErrorBody(response: Response): Promise<any> {
    let rawBody: string | undefined;

    try {
      rawBody = await response.text();
      return JSON.parse(rawBody);
    } catch {
      this.logger.logWarning("Failed to parse error response");
      return rawBody;
    }
  }
}
