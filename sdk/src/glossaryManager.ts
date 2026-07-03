import { ApiKeyManager } from "./apiKeyManager";
import {
  L10nGlossaryService,
  GlossaryListResponse,
  GlossaryResponse,
  GlossaryEntryListResponse,
  GlossaryEntryResponse,
  CreateGlossaryRequest,
  UpdateGlossaryRequest,
  GlossaryEntryRequest,
  ApiResponse,
  ConsoleLogger,
  ILogger,
} from "ai-l10n-core";

/**
 * High-level manager for translation glossaries and linguistic instructions.
 *
 * Wraps `L10nGlossaryService` with API key management
 * so that callers do not need to supply a key on every call. When `apiKey` is
 * omitted from a method, the key is resolved from the `L10N_API_KEY` environment
 * variable or from the key stored by `ApiKeyManager`.
 *
 * For linguistic instructions, use `LinguisticInstructionsManager`.
 *
 * @example
 * ```typescript
 * import { GlossaryManager } from 'ai-l10n-sdk';
 *
 * const manager = new GlossaryManager();
 *
 * // List all glossaries
 * const list = await manager.listGlossaries();
 * if (list.success) {
 *   console.log(list.data.glossaries);
 * }
 *
 * // Create a glossary
 * const created = await manager.createGlossary({
 *   sourceLanguageCode: 'en',
 *   targetLanguageCode: 'de',
 *   name: 'My German Glossary',
 * });
 *
 * // Add a term mapping
 * if (created.success) {
 *   await manager.addGlossaryEntry(created.data.id, {
 *     sourceTerm: 'settings',
 *     targetTerm: 'Einstellungen',
 *   });
 * }
 * ```
 */
export class GlossaryManager {
  private readonly apiKeyManager: ApiKeyManager;
  private readonly glossaryService: L10nGlossaryService;

  /**
   * Creates an instance of GlossaryManager.
   * @param logger - Optional custom logger. Defaults to `ConsoleLogger`.
   */
  constructor(private readonly logger: ILogger = new ConsoleLogger()) {
    this.apiKeyManager = new ApiKeyManager(this.logger);
    this.glossaryService = new L10nGlossaryService(this.logger);
  }

  // ── Glossary methods ────────────────────────────────────────────────────────

  /**
   * Returns all glossaries belonging to the user, ordered by language pair and name.
   * @param apiKey - Optional API key. Falls back to env var or stored key.
   */
  async listGlossaries(
    apiKey?: string,
  ): Promise<ApiResponse<GlossaryListResponse>> {
    const key = await this.resolveApiKey(apiKey);
    return this.glossaryService.listGlossaries(key);
  }

  /**
   * Creates a new glossary for the given source/target language pair.
   * Each user may have up to 5 glossaries per language pair.
   * @param request - Glossary creation options
   * @param apiKey - Optional API key. Falls back to env var or stored key.
   */
  async createGlossary(
    request: CreateGlossaryRequest,
    apiKey?: string,
  ): Promise<ApiResponse<GlossaryResponse>> {
    const key = await this.resolveApiKey(apiKey);
    return this.glossaryService.createGlossary(key, request);
  }

  /**
   * Returns the glossary with the given ID.
   * @param glossaryId - The ID of the glossary
   * @param apiKey - Optional API key. Falls back to env var or stored key.
   */
  async getGlossary(
    glossaryId: number,
    apiKey?: string,
  ): Promise<ApiResponse<GlossaryResponse>> {
    const key = await this.resolveApiKey(apiKey);
    return this.glossaryService.getGlossary(key, glossaryId);
  }

  /**
   * Updates the name and active status of a glossary.
   * Setting `isActive` to `true` deactivates all other glossaries for the same language pair.
   * @param glossaryId - The ID of the glossary
   * @param request - Fields to update
   * @param apiKey - Optional API key. Falls back to env var or stored key.
   */
  async updateGlossary(
    glossaryId: number,
    request: UpdateGlossaryRequest,
    apiKey?: string,
  ): Promise<ApiResponse<GlossaryResponse>> {
    const key = await this.resolveApiKey(apiKey);
    return this.glossaryService.updateGlossary(key, glossaryId, request);
  }

  /**
   * Permanently deletes a glossary and all its entries.
   * If the glossary was active, no other glossary is automatically activated.
   * @param glossaryId - The ID of the glossary to delete
   * @param apiKey - Optional API key. Falls back to env var or stored key.
   */
  async deleteGlossary(
    glossaryId: number,
    apiKey?: string,
  ): Promise<ApiResponse<undefined>> {
    const key = await this.resolveApiKey(apiKey);
    return this.glossaryService.deleteGlossary(key, glossaryId);
  }

  /**
   * Returns all term mappings in the glossary, ordered alphabetically by source term.
   * @param glossaryId - The ID of the glossary
   * @param apiKey - Optional API key. Falls back to env var or stored key.
   */
  async listGlossaryEntries(
    glossaryId: number,
    apiKey?: string,
  ): Promise<ApiResponse<GlossaryEntryListResponse>> {
    const key = await this.resolveApiKey(apiKey);
    return this.glossaryService.listGlossaryEntries(key, glossaryId);
  }

  /**
   * Adds a new source → target term mapping to the glossary.
   *
   * Use lowercase for general terms — the AI adapts capitalization to sentence context.
   * Use exact capitalization only for brand names, acronyms, or case-sensitive terms.
   * @param glossaryId - The ID of the glossary
   * @param request - The term mapping to add
   * @param apiKey - Optional API key. Falls back to env var or stored key.
   */
  async addGlossaryEntry(
    glossaryId: number,
    request: GlossaryEntryRequest,
    apiKey?: string,
  ): Promise<ApiResponse<GlossaryEntryResponse>> {
    const key = await this.resolveApiKey(apiKey);
    return this.glossaryService.addGlossaryEntry(key, glossaryId, request);
  }

  /**
   * Replaces the source term, target term, and optional context of an existing entry.
   * @param glossaryId - The ID of the glossary
   * @param entryId - The ID of the entry to update
   * @param request - The new term mapping
   * @param apiKey - Optional API key. Falls back to env var or stored key.
   */
  async updateGlossaryEntry(
    glossaryId: number,
    entryId: number,
    request: GlossaryEntryRequest,
    apiKey?: string,
  ): Promise<ApiResponse<GlossaryEntryResponse>> {
    const key = await this.resolveApiKey(apiKey);
    return this.glossaryService.updateGlossaryEntry(
      key,
      glossaryId,
      entryId,
      request,
    );
  }

  /**
   * Permanently removes a single term mapping from the glossary.
   * @param glossaryId - The ID of the glossary
   * @param entryId - The ID of the entry to delete
   * @param apiKey - Optional API key. Falls back to env var or stored key.
   */
  async deleteGlossaryEntry(
    glossaryId: number,
    entryId: number,
    apiKey?: string,
  ): Promise<ApiResponse<undefined>> {
    const key = await this.resolveApiKey(apiKey);
    return this.glossaryService.deleteGlossaryEntry(key, glossaryId, entryId);
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private async resolveApiKey(apiKey?: string): Promise<string> {
    if (apiKey) {
      return apiKey;
    }
    return this.apiKeyManager.ensureApiKey();
  }
}
