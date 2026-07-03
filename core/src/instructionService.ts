import { ConsoleLogger } from "./consoleLogger";
import { URLS } from "./constants";
import { ILogger } from "./logger";
import { ApiResponse } from "./translationService";
import { checkApiKey, handleErrorResponse } from "./serviceHelpers";

// ── Instruction Types ─────────────────────────────────────────────────────────

export interface InstructionResponse {
  id: number;
  name: string;
  sourceLanguageCode: string;
  targetLanguageCode: string;
  isActive: boolean;
  text: string;
  /** Total additional characters debited per translation when this instruction is active. */
  charsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface InstructionListResponse {
  instructions: InstructionResponse[];
}

export interface CreateInstructionRequest {
  /** BCP-47 source language code (e.g., "en", "en-US"). */
  sourceLanguageCode: string;
  /** BCP-47 target language code (e.g., "es", "de"). */
  targetLanguageCode: string;
  /**
   * The linguistic rule or instruction text that guides the AI's translation behavior.
   * Examples: "Use formal tone", "Place adjectives after the noun". Max length: 1000.
   * Do not use instructions to enforce specific translations of words or phrases — use a glossary for that.
   */
  text: string;
  /** Optional display name. Defaults to "sourceCode → targetCode" when omitted. */
  name?: string | null;
  /**
   * Whether this instruction is active and applied during translation.
   * When `true`, all other instructions for the same language pair are deactivated.
   * Defaults to `true`.
   */
  isActive?: boolean;
}

export interface UpdateInstructionRequest {
  /**
   * The linguistic rule or instruction text. Max length: 1000.
   */
  text: string;
  /**
   * Whether this instruction is active and applied during translation.
   * Setting `true` deactivates all other instructions for the same language pair.
   */
  isActive: boolean;
  /** Display name. Pass `null` to reset to the default language-pair name. */
  name?: string | null;
}

// ── Instruction Service ───────────────────────────────────────────────────────

/**
 * Low-level client for the l10n.dev Linguistic Instructions API.
 *
 * Manages linguistic instructions that guide the AI's overall translation behavior
 * (tone, style, grammar rules). Only one instruction can be active per language pair —
 * the active instruction is applied automatically during translation.
 *
 * Use instructions for style/tone guidance (e.g., "Use formal tone").
 * For specific term mappings, use `L10nGlossaryService` instead.
 *
 * All methods always resolve (never throw). Check `response.success` before accessing `data`.
 */
export class L10nInstructionService {
  constructor(private readonly logger: ILogger = new ConsoleLogger()) {}

  /**
   * Returns all instructions belonging to the user, ordered by language pair and name.
   * @param apiKey - API key for authentication
   */
  async listInstructions(
    apiKey: string,
  ): Promise<ApiResponse<InstructionListResponse>> {
    const err = checkApiKey(apiKey, this.logger);
    if (err) return err;

    this.logger.logInfo("Fetching instructions");
    const response = await fetch(`${URLS.API_BASE}/v2/instructions`, {
      headers: { "X-API-Key": apiKey },
    });

    if (!response.ok) {
      return handleErrorResponse(response, "List instructions", this.logger);
    } else {
      this.logger.logInfo("Instructions fetched successfully");
    }
    return {
      success: true,
      data: (await response.json()) as InstructionListResponse,
    };
  }

  /**
   * Creates a new linguistic instruction for the given source/target language pair.
   * Each user may have up to 5 instructions per language pair.
   * When `isActive` is `true`, all other instructions for the same pair are deactivated.
   * @param apiKey - API key for authentication
   * @param request - Instruction creation options
   */
  async createInstruction(
    apiKey: string,
    request: CreateInstructionRequest,
  ): Promise<ApiResponse<InstructionResponse>> {
    const err = checkApiKey(apiKey, this.logger);
    if (err) return err;

    this.logger.logInfo(
      `Creating instruction ${request.sourceLanguageCode} → ${request.targetLanguageCode}`,
    );
    const response = await fetch(`${URLS.API_BASE}/v2/instructions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      return handleErrorResponse(response, "Create instruction", this.logger);
    } else {
      this.logger.logInfo(
        `Instruction ${request.sourceLanguageCode} → ${request.targetLanguageCode} created successfully`,
      );
    }
    return {
      success: true,
      data: (await response.json()) as InstructionResponse,
    };
  }

  /**
   * Returns the instruction with the given ID.
   * @param apiKey - API key for authentication
   * @param instructionId - The ID of the instruction
   */
  async getInstruction(
    apiKey: string,
    instructionId: number,
  ): Promise<ApiResponse<InstructionResponse>> {
    const err = checkApiKey(apiKey, this.logger);
    if (err) return err;

    this.logger.logInfo(`Fetching instruction #${instructionId}`);
    const response = await fetch(
      `${URLS.API_BASE}/v2/instructions/${instructionId}`,
      { headers: { "X-API-Key": apiKey } },
    );

    if (!response.ok) {
      return handleErrorResponse(response, "Get instruction", this.logger);
    } else {
      this.logger.logInfo(`Instruction #${instructionId} fetched successfully`);
    }
    return {
      success: true,
      data: (await response.json()) as InstructionResponse,
    };
  }

  /**
   * Updates the name, text, and active status of an instruction.
   * Setting `isActive` to `true` deactivates all other instructions for the same language pair.
   * @param apiKey - API key for authentication
   * @param instructionId - The ID of the instruction
   * @param request - Fields to update
   */
  async updateInstruction(
    apiKey: string,
    instructionId: number,
    request: UpdateInstructionRequest,
  ): Promise<ApiResponse<InstructionResponse>> {
    const err = checkApiKey(apiKey, this.logger);
    if (err) return err;

    this.logger.logInfo(`Updating instruction #${instructionId}`);
    const response = await fetch(
      `${URLS.API_BASE}/v2/instructions/${instructionId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
        body: JSON.stringify(request),
      },
    );

    if (!response.ok) {
      return handleErrorResponse(response, "Update instruction", this.logger);
    } else {
      this.logger.logInfo(`Instruction #${instructionId} updated successfully`);
    }
    return {
      success: true,
      data: (await response.json()) as InstructionResponse,
    };
  }

  /**
   * Permanently deletes an instruction.
   * If the instruction was active, no other instruction is automatically activated in its place.
   * @param apiKey - API key for authentication
   * @param instructionId - The ID of the instruction to delete
   */
  async deleteInstruction(
    apiKey: string,
    instructionId: number,
  ): Promise<ApiResponse<undefined>> {
    const err = checkApiKey(apiKey, this.logger);
    if (err) return err;

    this.logger.logInfo(`Deleting instruction #${instructionId}`);
    const response = await fetch(
      `${URLS.API_BASE}/v2/instructions/${instructionId}`,
      { method: "DELETE", headers: { "X-API-Key": apiKey } },
    );

    if (!response.ok) {
      return handleErrorResponse(response, "Delete instruction", this.logger);
    } else {
      this.logger.logInfo(`Instruction #${instructionId} deleted successfully`);
    }
    return { success: true, data: undefined };
  }
}
