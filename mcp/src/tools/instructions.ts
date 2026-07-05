import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { LinguisticInstructionsManager } from "ai-l10n-sdk";
import { McpLogger } from "../logger.js";
import { buildMcpResponse, buildErrorResponse } from "../utils/response.js";
import { langPair, truncate } from "../utils/format.js";

export function registerInstructionTools(server: McpServer): void {
  // ── l10n_list_instructions ────────────────────────────────────────────────

  server.registerTool(
    "l10n_list_instructions",
    {
      title: "List Linguistic Instructions",
      description: `List all saved linguistic instructions for this l10n.dev account.
Linguistic instructions guide AI translation style, tone, and brand voice
(e.g. "Use formal tone", "Never translate the word Dashboard").
Call this before translating if the user hasn't specified tone preferences,
to check whether instructions are already configured.`,
      inputSchema: z.object({}).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async () => {
      try {
        const logger = new McpLogger();
        const manager = new LinguisticInstructionsManager(logger);
        const response = await manager.listInstructions();

        if (!response.success) {
          return buildErrorResponse(
            response.message ?? "Failed to list instructions.",
          );
        }

        const instructions = response.data.instructions;
        if (instructions.length === 0) {
          return buildMcpResponse(
            "No linguistic instructions found. Use l10n_create_instruction to set tone/style preferences for a language pair.",
            { success: true, count: 0, instructions: [] },
          );
        }

        const lines = instructions.map(
          (inst) =>
            `- **${inst.name}** (ID: ${inst.id}) | ${langPair(inst.sourceLanguageCode, inst.targetLanguageCode)} | ` +
            `${inst.isActive ? "✅ active" : "inactive"}\n  _"${truncate(inst.text, 120)}"_`,
        );
        const text = `Found ${instructions.length} instruction${instructions.length === 1 ? "" : "s"}:\n\n${lines.join("\n")}`;

        return buildMcpResponse(text, {
          success: true,
          count: instructions.length,
          instructions: instructions.map((inst) => ({
            id: inst.id,
            name: inst.name,
            sourceLanguageCode: inst.sourceLanguageCode,
            targetLanguageCode: inst.targetLanguageCode,
            isActive: inst.isActive,
            text: inst.text,
          })),
        });
      } catch (err) {
        return buildErrorResponse(
          err instanceof Error ? err.message : String(err),
        );
      }
    },
  );

  // ── l10n_create_instruction ───────────────────────────────────────────────

  server.registerTool(
    "l10n_create_instruction",
    {
      title: "Create Linguistic Instruction",
      description: `Create and save a new linguistic instruction for a source→target language pair.
The instruction is stored in l10n.dev and applied automatically to future translations
for that language pair (unless overridden per-request).
Use this when the user wants to set a tone, style, or brand rule — for example after
they answer the suggestion made during translation.

Examples:
- "Use formal tone (Sie, not du)"
- "Keep product names Dashboard, Workspace, and Settings untranslated"
- "Use simple, friendly language suitable for children"`,
      inputSchema: z
        .object({
          sourceLanguageCode: z
            .string()
            .describe("Source language BCP-47 code e.g. 'en'"),
          targetLanguageCode: z
            .string()
            .describe("Target language BCP-47 code e.g. 'de'"),
          text: z
            .string()
            .max(1000)
            .describe(
              "The instruction text e.g. 'Use formal tone (Sie, not du)'. Max 1000 characters. " +
                "Use instructions for style/tone guidance. For specific term mappings, use glossaries instead.",
            ),
          name: z
            .string()
            .optional()
            .describe("Optional display name for this instruction"),
        })
        .strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const logger = new McpLogger();
        const manager = new LinguisticInstructionsManager(logger);
        const response = await manager.createInstruction({
          sourceLanguageCode: args.sourceLanguageCode,
          targetLanguageCode: args.targetLanguageCode,
          text: args.text,
          name: args.name,
        });

        if (!response.success) {
          return buildErrorResponse(
            response.message ?? "Failed to create instruction.",
          );
        }

        const inst = response.data;
        return buildMcpResponse(
          `✅ Instruction created: **${inst.name}** (ID: ${inst.id})\n` +
            `Language pair: ${langPair(inst.sourceLanguageCode, inst.targetLanguageCode)}\n` +
            `Text: "${inst.text}"\n` +
            `Status: ${inst.isActive ? "✅ active" : "inactive"}\n\n` +
            `This instruction will be applied automatically to future translations for ${langPair(inst.sourceLanguageCode, inst.targetLanguageCode)}.`,
          {
            success: true,
            instructionId: inst.id,
            name: inst.name,
            sourceLanguageCode: inst.sourceLanguageCode,
            targetLanguageCode: inst.targetLanguageCode,
            text: inst.text,
            isActive: inst.isActive,
          },
        );
      } catch (err) {
        return buildErrorResponse(
          err instanceof Error ? err.message : String(err),
        );
      }
    },
  );

  // ── l10n_update_instruction ───────────────────────────────────────────────

  server.registerTool(
    "l10n_update_instruction",
    {
      title: "Update Linguistic Instruction",
      description: `Update the text, name, or active status of an existing linguistic instruction.
Use to edit a previously saved instruction without deleting and recreating it.
Setting isActive to true deactivates all other instructions for the same language pair.`,
      inputSchema: z
        .object({
          instructionId: z
            .number()
            .int()
            .describe("Numeric ID of the instruction to update"),
          text: z
            .string()
            .max(1000)
            .optional()
            .describe("New instruction text. Max 1000 characters."),
          name: z.string().optional().describe("New display name"),
          isActive: z
            .boolean()
            .optional()
            .describe(
              "Enable or disable this instruction. Setting true deactivates all other instructions for the same language pair.",
            ),
        })
        .strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const logger = new McpLogger();
        const manager = new LinguisticInstructionsManager(logger);
        const response = await manager.updateInstruction(args.instructionId, {
          text: args.text ?? "",
          name: args.name,
          isActive: args.isActive ?? false,
        });

        if (!response.success) {
          return buildErrorResponse(
            response.message ?? "Failed to update instruction.",
          );
        }

        const inst = response.data;
        return buildMcpResponse(
          `✅ Instruction updated: **${inst.name}** (ID: ${inst.id})\n` +
            `Status: ${inst.isActive ? "✅ active" : "inactive"}\n` +
            `Text: "${truncate(inst.text, 200)}"`,
          {
            success: true,
            instructionId: inst.id,
            name: inst.name,
            isActive: inst.isActive,
            text: inst.text,
          },
        );
      } catch (err) {
        return buildErrorResponse(
          err instanceof Error ? err.message : String(err),
        );
      }
    },
  );

  // ── l10n_delete_instruction ───────────────────────────────────────────────

  server.registerTool(
    "l10n_delete_instruction",
    {
      title: "Delete Linguistic Instruction",
      description: `Permanently delete a linguistic instruction. This cannot be undone.
If the deleted instruction was active, no other instruction is automatically activated.`,
      inputSchema: z
        .object({
          instructionId: z
            .number()
            .int()
            .describe("Numeric ID of the instruction to delete"),
        })
        .strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const logger = new McpLogger();
        const manager = new LinguisticInstructionsManager(logger);
        const response = await manager.deleteInstruction(args.instructionId);

        if (!response.success) {
          return buildErrorResponse(
            response.message ?? "Failed to delete instruction.",
          );
        }

        return buildMcpResponse(
          `✅ Instruction ${args.instructionId} deleted successfully.`,
          { success: true, instructionId: args.instructionId },
        );
      } catch (err) {
        return buildErrorResponse(
          err instanceof Error ? err.message : String(err),
        );
      }
    },
  );
}
