import { ConsoleLogger } from "./consoleLogger";
import { URLS } from "./constants";
import { ILogger } from "./logger";
import { ApiResponse } from "./translationService";
import { checkApiKey, handleErrorResponse } from "./serviceHelpers";

// ── Glossary Types ────────────────────────────────────────────────────────────

export interface GlossaryResponse {
  id: number;
  name: string;
  sourceLanguageCode: string;
  targetLanguageCode: string;
  isActive: boolean;
  entryCount: number;
  charsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GlossaryListResponse {
  glossaries: GlossaryResponse[];
}

export interface GlossaryEntryResponse {
  id: number;
  sourceTerm: string;
  targetTerm: string;
  context: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GlossaryEntryListResponse {
  entries: GlossaryEntryResponse[];
  entryCount: number;
  charsCount: number;
}

export interface CreateGlossaryRequest {
  /** BCP-47 source language code (e.g., "en", "en-US"). */
  sourceLanguageCode: string;
  /** BCP-47 target language code (e.g., "es", "de"). */
  targetLanguageCode: string;
  /** Optional display name. Defaults to "sourceCode → targetCode" when omitted. */
  name?: string | null;
  /**
   * Whether this glossary is active and applied during translation.
   * When `true`, all other glossaries for the same language pair are deactivated.
   * Defaults to `true`.
   */
  isActive?: boolean;
}

export interface UpdateGlossaryRequest {
  /**
   * Whether this glossary is active and applied during translation.
   * Setting `true` deactivates all other glossaries for the same language pair.
   */
  isActive: boolean;
  /** Display name. Pass `null` to reset to the default language-pair name. */
  name?: string | null;
}

export interface GlossaryEntryRequest {
  /** The term in the source language. Max length: 255. */
  sourceTerm: string;
  /** The preferred translation of the term in the target language. Max length: 255. */
  targetTerm: string;
  /**
   * Optional context to clarify the meaning when the term is ambiguous.
   * Example: 'bank' could mean 'financial institution' or 'river bank'. Max length: 500.
   */
  context?: string | null;
}

// ── Glossary Service ──────────────────────────────────────────────────────────

/**
 * Low-level client for the l10n.dev Glossary API.
 *
 * Manages translation glossaries and their entries. A glossary maps source-language
 * terms to preferred target-language translations. Only one glossary can be active
 * per language pair — the active glossary is applied automatically during translation.
 *
 * All methods always resolve (never throw). Check `response.success` before accessing `data`.
 */
export class L10nGlossaryService {
  constructor(private readonly logger: ILogger = new ConsoleLogger()) {}

  /**
   * Returns all glossaries belonging to the user, ordered by language pair and name.
   * @param apiKey - API key for authentication
   */
  async listGlossaries(
    apiKey: string,
  ): Promise<ApiResponse<GlossaryListResponse>> {
    const err = checkApiKey(apiKey, this.logger);
    if (err) return err;

    this.logger.logInfo("Fetching glossaries");
    const response = await fetch(`${URLS.API_BASE}/v2/glossaries`, {
      headers: { "X-API-Key": apiKey },
    });

    if (!response.ok) {
      return handleErrorResponse(response, "List glossaries", this.logger);
    } else {
      this.logger.logInfo("Glossaries fetched successfully");
    }
    return {
      success: true,
      data: (await response.json()) as GlossaryListResponse,
    };
  }

  /**
   * Creates a new glossary for the given source/target language pair.
   * Each user may have up to 5 glossaries per language pair.
   * When `isActive` is `true`, all other glossaries for the same pair are deactivated.
   * @param apiKey - API key for authentication
   * @param request - Glossary creation options
   */
  async createGlossary(
    apiKey: string,
    request: CreateGlossaryRequest,
  ): Promise<ApiResponse<GlossaryResponse>> {
    const err = checkApiKey(apiKey, this.logger);
    if (err) return err;

    this.logger.logInfo(
      `Creating glossary ${request.sourceLanguageCode} → ${request.targetLanguageCode}`,
    );
    const response = await fetch(`${URLS.API_BASE}/v2/glossaries`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      return handleErrorResponse(response, "Create glossary", this.logger);
    } else {
      this.logger.logInfo(
        `Glossary ${request.sourceLanguageCode} → ${request.targetLanguageCode} created successfully`,
      );
    }

    return { success: true, data: (await response.json()) as GlossaryResponse };
  }

  /**
   * Returns the glossary with the given ID.
   * @param apiKey - API key for authentication
   * @param glossaryId - The ID of the glossary
   */
  async getGlossary(
    apiKey: string,
    glossaryId: number,
  ): Promise<ApiResponse<GlossaryResponse>> {
    const err = checkApiKey(apiKey, this.logger);
    if (err) return err;

    this.logger.logInfo(`Fetching glossary #${glossaryId}`);
    const response = await fetch(
      `${URLS.API_BASE}/v2/glossaries/${glossaryId}`,
      { headers: { "X-API-Key": apiKey } },
    );

    if (!response.ok) {
      return handleErrorResponse(response, "Get glossary", this.logger);
    } else {
      this.logger.logInfo(`Glossary #${glossaryId} fetched successfully`);
    }
    return { success: true, data: (await response.json()) as GlossaryResponse };
  }

  /**
   * Updates the name and active status of a glossary.
   * Setting `isActive` to `true` deactivates all other glossaries for the same language pair.
   * @param apiKey - API key for authentication
   * @param glossaryId - The ID of the glossary
   * @param request - Fields to update
   */
  async updateGlossary(
    apiKey: string,
    glossaryId: number,
    request: UpdateGlossaryRequest,
  ): Promise<ApiResponse<GlossaryResponse>> {
    const err = checkApiKey(apiKey, this.logger);
    if (err) return err;

    this.logger.logInfo(`Updating glossary #${glossaryId}`);
    const response = await fetch(
      `${URLS.API_BASE}/v2/glossaries/${glossaryId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
        body: JSON.stringify(request),
      },
    );

    if (!response.ok) {
      return handleErrorResponse(response, "Update glossary", this.logger);
    } else {
      this.logger.logInfo(`Glossary #${glossaryId} updated successfully`);
    }
    return { success: true, data: (await response.json()) as GlossaryResponse };
  }

  /**
   * Permanently deletes a glossary and all its entries.
   * If the glossary was active, no other glossary is automatically activated in its place.
   * @param apiKey - API key for authentication
   * @param glossaryId - The ID of the glossary to delete
   */
  async deleteGlossary(
    apiKey: string,
    glossaryId: number,
  ): Promise<ApiResponse<undefined>> {
    const err = checkApiKey(apiKey, this.logger);
    if (err) return err;

    this.logger.logInfo(`Deleting glossary #${glossaryId}`);
    const response = await fetch(
      `${URLS.API_BASE}/v2/glossaries/${glossaryId}`,
      { method: "DELETE", headers: { "X-API-Key": apiKey } },
    );

    if (!response.ok) {
      return handleErrorResponse(response, "Delete glossary", this.logger);
    } else {
      this.logger.logInfo(`Glossary #${glossaryId} deleted successfully`);
    }
    return { success: true, data: undefined };
  }

  /**
   * Returns all term mappings in the glossary, ordered alphabetically by source term.
   * @param apiKey - API key for authentication
   * @param glossaryId - The ID of the glossary
   */
  async listGlossaryEntries(
    apiKey: string,
    glossaryId: number,
  ): Promise<ApiResponse<GlossaryEntryListResponse>> {
    const err = checkApiKey(apiKey, this.logger);
    if (err) return err;

    this.logger.logInfo(`Fetching entries for glossary #${glossaryId}`);
    const response = await fetch(
      `${URLS.API_BASE}/v2/glossaries/${glossaryId}/entries`,
      { headers: { "X-API-Key": apiKey } },
    );

    if (!response.ok) {
      return handleErrorResponse(
        response,
        "List glossary entries",
        this.logger,
      );
    } else {
      this.logger.logInfo(
        `Entries for glossary #${glossaryId} fetched successfully`,
      );
    }
    return {
      success: true,
      data: (await response.json()) as GlossaryEntryListResponse,
    };
  }

  /**
   * Adds a new source → target term mapping to the glossary.
   *
   * Use lowercase for general terms — the AI adapts capitalization to sentence context automatically.
   * Use exact capitalization only for brand names, acronyms, or case-sensitive terms.
   * @param apiKey - API key for authentication
   * @param glossaryId - The ID of the glossary
   * @param request - The term mapping to add
   */
  async addGlossaryEntry(
    apiKey: string,
    glossaryId: number,
    request: GlossaryEntryRequest,
  ): Promise<ApiResponse<GlossaryEntryResponse>> {
    const err = checkApiKey(apiKey, this.logger);
    if (err) return err;

    this.logger.logInfo(
      `Adding entry "${request.sourceTerm}" to glossary #${glossaryId}`,
    );
    const response = await fetch(
      `${URLS.API_BASE}/v2/glossaries/${glossaryId}/entries`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
        body: JSON.stringify(request),
      },
    );

    if (!response.ok) {
      return handleErrorResponse(response, "Add glossary entry", this.logger);
    } else {
      this.logger.logInfo(
        `Entry "${request.sourceTerm}" added successfully to glossary #${glossaryId}`,
      );
    }
    return {
      success: true,
      data: (await response.json()) as GlossaryEntryResponse,
    };
  }

  /**
   * Replaces the source term, target term, and optional context of an existing glossary entry.
   * @param apiKey - API key for authentication
   * @param glossaryId - The ID of the glossary
   * @param entryId - The ID of the entry to update
   * @param request - The new term mapping
   */
  async updateGlossaryEntry(
    apiKey: string,
    glossaryId: number,
    entryId: number,
    request: GlossaryEntryRequest,
  ): Promise<ApiResponse<GlossaryEntryResponse>> {
    const err = checkApiKey(apiKey, this.logger);
    if (err) return err;

    this.logger.logInfo(
      `Updating entry #${entryId} in glossary #${glossaryId}`,
    );
    const response = await fetch(
      `${URLS.API_BASE}/v2/glossaries/${glossaryId}/entries/${entryId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
        body: JSON.stringify(request),
      },
    );

    if (!response.ok) {
      return handleErrorResponse(
        response,
        "Update glossary entry",
        this.logger,
      );
    } else {
      this.logger.logInfo(
        `Entry #${entryId} updated successfully in glossary #${glossaryId}`,
      );
    }
    return {
      success: true,
      data: (await response.json()) as GlossaryEntryResponse,
    };
  }

  /**
   * Permanently removes a single term mapping from the glossary.
   * @param apiKey - API key for authentication
   * @param glossaryId - The ID of the glossary
   * @param entryId - The ID of the entry to delete
   */
  async deleteGlossaryEntry(
    apiKey: string,
    glossaryId: number,
    entryId: number,
  ): Promise<ApiResponse<undefined>> {
    const err = checkApiKey(apiKey, this.logger);
    if (err) return err;

    this.logger.logInfo(
      `Deleting entry #${entryId} from glossary #${glossaryId}`,
    );
    const response = await fetch(
      `${URLS.API_BASE}/v2/glossaries/${glossaryId}/entries/${entryId}`,
      { method: "DELETE", headers: { "X-API-Key": apiKey } },
    );

    if (!response.ok) {
      return handleErrorResponse(
        response,
        "Delete glossary entry",
        this.logger,
      );
    } else {
      this.logger.logInfo(
        `Entry #${entryId} deleted successfully from glossary #${glossaryId}`,
      );
    }
    return { success: true, data: undefined };
  }
}
