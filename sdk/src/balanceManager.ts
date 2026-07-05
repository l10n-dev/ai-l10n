import {
  L10nTranslationService,
  ILogger,
  ConsoleLogger,
  ApiResponse,
  BalanceResponse,
} from "ai-l10n-core";
import { ApiKeyManager } from "./apiKeyManager";

/**
 * High-level manager for account balance.
 * Wraps `L10nTranslationService` with API key management
 * so that callers do not need to supply a key on every call. When `apiKey` is
 * omitted from a method, the key is resolved from the `L10N_API_KEY` environment
 * variable or from the key stored by `ApiKeyManager`.
 */

export class BalanceManager {
  private readonly apiKeyManager: ApiKeyManager;
  private readonly translationService: L10nTranslationService;

  constructor(private readonly logger: ILogger = new ConsoleLogger()) {
    this.apiKeyManager = new ApiKeyManager(this.logger);
    this.translationService = new L10nTranslationService(this.logger);
  }

  /**
   * Returns the current balance of the user's account.
   * @param apiKey - Optional API key. Falls back to env var or stored key.
   */
  async getBalance(apiKey?: string): Promise<ApiResponse<BalanceResponse>> {
    const key = await this.resolveApiKey(apiKey);
    return this.translationService.getBalance(key);
  }

  private async resolveApiKey(apiKey?: string): Promise<string> {
    if (apiKey) {
      return apiKey;
    }
    return this.apiKeyManager.ensureApiKey();
  }
}
