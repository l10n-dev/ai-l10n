import { ApiKeyManager } from "./apiKeyManager";
import {
  L10nInstructionService,
  InstructionListResponse,
  InstructionResponse,
  CreateInstructionRequest,
  UpdateInstructionRequest,
  ApiResponse,
  ConsoleLogger,
  ILogger,
} from "ai-l10n-core";

/**
 * High-level manager for linguistic instructions.
 *
 * Wraps `L10nInstructionService` with API key management so that callers do not
 * need to supply a key on every call. When `apiKey` is omitted from a method,
 * the key is resolved from the `L10N_API_KEY` environment variable or from the
 * key stored by `ApiKeyManager`.
 *
 * Use instructions for style/tone guidance (e.g., "Use formal tone").
 * For specific term mappings, use `GlossaryManager` instead.
 *
 * @example
 * ```typescript
 * import { LinguisticInstructionsManager } from 'ai-l10n-sdk';
 *
 * const manager = new LinguisticInstructionsManager();
 *
 * // Create an instruction (active by default)
 * const created = await manager.createInstruction({
 *   sourceLanguageCode: 'en',
 *   targetLanguageCode: 'de',
 *   text: 'Use formal tone (Sie, not du)',
 * });
 *
 * // List all instructions
 * const list = await manager.listInstructions();
 * if (list.success) {
 *   console.log(list.data.instructions);
 * }
 * ```
 */
export class LinguisticInstructionsManager {
  private readonly apiKeyManager: ApiKeyManager;
  private readonly instructionService: L10nInstructionService;

  /**
   * Creates an instance of LinguisticInstructionsManager.
   * @param logger - Optional custom logger. Defaults to `ConsoleLogger`.
   */
  constructor(private readonly logger: ILogger = new ConsoleLogger()) {
    this.apiKeyManager = new ApiKeyManager(this.logger);
    this.instructionService = new L10nInstructionService(this.logger);
  }

  /**
   * Returns all instructions belonging to the user, ordered by language pair and name.
   * @param apiKey - Optional API key. Falls back to env var or stored key.
   */
  async listInstructions(
    apiKey?: string,
  ): Promise<ApiResponse<InstructionListResponse>> {
    const key = await this.resolveApiKey(apiKey);
    return this.instructionService.listInstructions(key);
  }

  /**
   * Creates a new linguistic instruction for the given source/target language pair.
   * Each user may have up to 5 instructions per language pair.
   *
   * Use instructions for style/tone guidance (e.g., "Use formal tone").
   * For specific term mappings, use `GlossaryManager` instead.
   * @param request - Instruction creation options
   * @param apiKey - Optional API key. Falls back to env var or stored key.
   */
  async createInstruction(
    request: CreateInstructionRequest,
    apiKey?: string,
  ): Promise<ApiResponse<InstructionResponse>> {
    const key = await this.resolveApiKey(apiKey);
    return this.instructionService.createInstruction(key, request);
  }

  /**
   * Returns the instruction with the given ID.
   * @param instructionId - The ID of the instruction
   * @param apiKey - Optional API key. Falls back to env var or stored key.
   */
  async getInstruction(
    instructionId: number,
    apiKey?: string,
  ): Promise<ApiResponse<InstructionResponse>> {
    const key = await this.resolveApiKey(apiKey);
    return this.instructionService.getInstruction(key, instructionId);
  }

  /**
   * Updates the name, text, and active status of an instruction.
   * Setting `isActive` to `true` deactivates all other instructions for the same language pair.
   * @param instructionId - The ID of the instruction
   * @param request - Fields to update
   * @param apiKey - Optional API key. Falls back to env var or stored key.
   */
  async updateInstruction(
    instructionId: number,
    request: UpdateInstructionRequest,
    apiKey?: string,
  ): Promise<ApiResponse<InstructionResponse>> {
    const key = await this.resolveApiKey(apiKey);
    return this.instructionService.updateInstruction(
      key,
      instructionId,
      request,
    );
  }

  /**
   * Permanently deletes an instruction.
   * If the instruction was active, no other instruction is automatically activated.
   * @param instructionId - The ID of the instruction to delete
   * @param apiKey - Optional API key. Falls back to env var or stored key.
   */
  async deleteInstruction(
    instructionId: number,
    apiKey?: string,
  ): Promise<ApiResponse<undefined>> {
    const key = await this.resolveApiKey(apiKey);
    return this.instructionService.deleteInstruction(key, instructionId);
  }

  private async resolveApiKey(apiKey?: string): Promise<string> {
    if (apiKey) {
      return apiKey;
    }
    return this.apiKeyManager.ensureApiKey();
  }
}
