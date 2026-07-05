import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GlossaryManager } from "ai-l10n-sdk";
import { McpLogger } from "../logger.js";
import { buildMcpResponse, buildErrorResponse } from "../utils/response.js";
import { langPair, truncate } from "../utils/format.js";

export function registerGlossaryTools(server: McpServer): void {
  // ── l10n_list_glossaries ──────────────────────────────────────────────────

  server.registerTool(
    "l10n_list_glossaries",
    {
      title: "List Glossaries",
      description: `List all saved glossaries for this l10n.dev account.
Each glossary maps source terms to preferred translations for a language pair.
Active glossaries are applied automatically during translation.
Call this when the user asks about their glossaries, or to check whether
a glossary exists for a language pair before suggesting generateGlossary.`,
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
        const manager = new GlossaryManager(logger);
        const response = await manager.listGlossaries();

        if (!response.success) {
          return buildErrorResponse(
            response.message ?? "Failed to list glossaries.",
          );
        }

        const glossaries = response.data.glossaries;
        if (glossaries.length === 0) {
          return buildMcpResponse(
            "No glossaries found. Use l10n_create_glossary to create one, or enable generateGlossary in l10n_translate_file to auto-generate one.",
            { success: true, count: 0, glossaries: [] },
          );
        }

        const lines = glossaries.map(
          (g) =>
            `- **${g.name}** (ID: ${g.id}) | ${langPair(g.sourceLanguageCode, g.targetLanguageCode)} | ` +
            `${g.entryCount} entries | ${g.isActive ? "✅ active" : "inactive"}`,
        );
        const text = `Found ${glossaries.length} glossar${glossaries.length === 1 ? "y" : "ies"}:\n\n${lines.join("\n")}`;

        return buildMcpResponse(text, {
          success: true,
          count: glossaries.length,
          glossaries: glossaries.map((g) => ({
            id: g.id,
            name: g.name,
            sourceLanguageCode: g.sourceLanguageCode,
            targetLanguageCode: g.targetLanguageCode,
            isActive: g.isActive,
            entryCount: g.entryCount,
          })),
        });
      } catch (err) {
        return buildErrorResponse(
          err instanceof Error ? err.message : String(err),
        );
      }
    },
  );

  // ── l10n_get_glossary ─────────────────────────────────────────────────────

  server.registerTool(
    "l10n_get_glossary",
    {
      title: "Get Glossary",
      description: `Get the full details and all term entries of a specific glossary by ID.
Use when the user wants to review or audit the terms in a glossary.`,
      inputSchema: z
        .object({
          glossaryId: z
            .number()
            .int()
            .describe("Numeric ID of the glossary to retrieve"),
        })
        .strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const logger = new McpLogger();
        const manager = new GlossaryManager(logger);

        const [glossaryRes, entriesRes] = await Promise.all([
          manager.getGlossary(args.glossaryId),
          manager.listGlossaryEntries(args.glossaryId),
        ]);

        if (!glossaryRes.success) {
          return buildErrorResponse(
            glossaryRes.message ?? "Failed to get glossary.",
          );
        }
        if (!entriesRes.success) {
          return buildErrorResponse(
            entriesRes.message ?? "Failed to get glossary entries.",
          );
        }

        const g = glossaryRes.data;
        const entries = entriesRes.data.entries;

        const header = [
          `**${g.name}** (ID: ${g.id})`,
          `Language pair: ${langPair(g.sourceLanguageCode, g.targetLanguageCode)}`,
          `Status: ${g.isActive ? "✅ active" : "inactive"}`,
          `Entries: ${g.entryCount}`,
          "",
        ].join("\n");

        const entryLines =
          entries.length === 0
            ? "_No entries yet._"
            : entries
                .map(
                  (e) =>
                    `| ${e.id} | ${e.sourceTerm} | ${e.targetTerm} | ${e.context ?? ""} |`,
                )
                .join("\n");

        const tableHeader =
          entries.length > 0
            ? "| ID | Source | Target | Context |\n|---|---|---|---|\n"
            : "";

        return buildMcpResponse(`${header}${tableHeader}${entryLines}`, {
          success: true,
          glossary: {
            id: g.id,
            name: g.name,
            sourceLanguageCode: g.sourceLanguageCode,
            targetLanguageCode: g.targetLanguageCode,
            isActive: g.isActive,
            entryCount: g.entryCount,
          },
          entries: entries.map((e) => ({
            id: e.id,
            sourceTerm: e.sourceTerm,
            targetTerm: e.targetTerm,
            context: e.context,
          })),
        });
      } catch (err) {
        return buildErrorResponse(
          err instanceof Error ? err.message : String(err),
        );
      }
    },
  );

  // ── l10n_create_glossary ──────────────────────────────────────────────────

  server.registerTool(
    "l10n_create_glossary",
    {
      title: "Create Glossary",
      description: `Create a new empty glossary for a source→target language pair.
After creating, use l10n_add_glossary_entry to add term mappings.
Note: to auto-generate a glossary from a translation, use generateGlossary: true
in l10n_translate_file instead.`,
      inputSchema: z
        .object({
          sourceLanguageCode: z
            .string()
            .describe("Source language BCP-47 code e.g. 'en'"),
          targetLanguageCode: z
            .string()
            .describe("Target language BCP-47 code e.g. 'de'"),
          name: z
            .string()
            .describe(
              "Display name for this glossary e.g. 'My App German Glossary'",
            ),
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
        const manager = new GlossaryManager(logger);
        const response = await manager.createGlossary({
          sourceLanguageCode: args.sourceLanguageCode,
          targetLanguageCode: args.targetLanguageCode,
          name: args.name,
        });

        if (!response.success) {
          return buildErrorResponse(
            response.message ?? "Failed to create glossary.",
          );
        }

        const g = response.data;
        return buildMcpResponse(
          `✅ Glossary created: **${g.name}** (ID: ${g.id})\n` +
            `Language pair: ${langPair(g.sourceLanguageCode, g.targetLanguageCode)}\n` +
            `Use l10n_add_glossary_entry to add term mappings.`,
          {
            success: true,
            glossaryId: g.id,
            name: g.name,
            sourceLanguageCode: g.sourceLanguageCode,
            targetLanguageCode: g.targetLanguageCode,
            isActive: g.isActive,
          },
        );
      } catch (err) {
        return buildErrorResponse(
          err instanceof Error ? err.message : String(err),
        );
      }
    },
  );

  // ── l10n_update_glossary ──────────────────────────────────────────────────

  server.registerTool(
    "l10n_update_glossary",
    {
      title: "Update Glossary",
      description: `Update the name or active status of an existing glossary.
Setting isActive to true deactivates all other glossaries for the same language pair.`,
      inputSchema: z
        .object({
          glossaryId: z
            .number()
            .int()
            .describe("Numeric ID of the glossary to update"),
          name: z.string().optional().describe("New display name"),
          isActive: z
            .boolean()
            .optional()
            .describe(
              "Enable or disable this glossary. Setting true deactivates all other glossaries for the same language pair.",
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
        const manager = new GlossaryManager(logger);
        const response = await manager.updateGlossary(args.glossaryId, {
          isActive: args.isActive ?? false,
          name: args.name,
        });

        if (!response.success) {
          return buildErrorResponse(
            response.message ?? "Failed to update glossary.",
          );
        }

        const g = response.data;
        return buildMcpResponse(
          `✅ Glossary updated: **${g.name}** (ID: ${g.id})\n` +
            `Status: ${g.isActive ? "✅ active" : "inactive"}`,
          {
            success: true,
            glossaryId: g.id,
            name: g.name,
            isActive: g.isActive,
          },
        );
      } catch (err) {
        return buildErrorResponse(
          err instanceof Error ? err.message : String(err),
        );
      }
    },
  );

  // ── l10n_delete_glossary ──────────────────────────────────────────────────

  server.registerTool(
    "l10n_delete_glossary",
    {
      title: "Delete Glossary",
      description: `Permanently delete a glossary and all its term entries. This cannot be undone.`,
      inputSchema: z
        .object({
          glossaryId: z
            .number()
            .int()
            .describe("Numeric ID of the glossary to delete"),
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
        const manager = new GlossaryManager(logger);
        const response = await manager.deleteGlossary(args.glossaryId);

        if (!response.success) {
          return buildErrorResponse(
            response.message ?? "Failed to delete glossary.",
          );
        }

        return buildMcpResponse(
          `✅ Glossary ${args.glossaryId} deleted successfully.`,
          { success: true, glossaryId: args.glossaryId },
        );
      } catch (err) {
        return buildErrorResponse(
          err instanceof Error ? err.message : String(err),
        );
      }
    },
  );

  // ── l10n_add_glossary_entry ───────────────────────────────────────────────

  server.registerTool(
    "l10n_add_glossary_entry",
    {
      title: "Add Glossary Entry",
      description: `Add a term mapping to an existing glossary.
Maps a source term to a preferred translation, with an optional context note
for disambiguating polysemous terms (e.g. 'bank' = financial institution vs. river bank).`,
      inputSchema: z
        .object({
          glossaryId: z
            .number()
            .int()
            .describe("Numeric ID of the glossary to add to"),
          sourceTerm: z
            .string()
            .max(255)
            .describe("Term in the source language"),
          targetTerm: z
            .string()
            .max(255)
            .describe("Preferred translation of the term"),
          context: z
            .string()
            .max(500)
            .optional()
            .describe(
              "Disambiguation note e.g. 'financial institution' to clarify the intended meaning",
            ),
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
        const manager = new GlossaryManager(logger);
        const response = await manager.addGlossaryEntry(args.glossaryId, {
          sourceTerm: args.sourceTerm,
          targetTerm: args.targetTerm,
          context: args.context,
        });

        if (!response.success) {
          return buildErrorResponse(
            response.message ?? "Failed to add glossary entry.",
          );
        }

        const e = response.data;
        return buildMcpResponse(
          `✅ Entry added (ID: ${e.id}): **${truncate(e.sourceTerm, 60)}** → **${truncate(e.targetTerm, 60)}**` +
            (e.context ? `\nContext: ${e.context}` : ""),
          {
            success: true,
            entryId: e.id,
            sourceTerm: e.sourceTerm,
            targetTerm: e.targetTerm,
            context: e.context,
          },
        );
      } catch (err) {
        return buildErrorResponse(
          err instanceof Error ? err.message : String(err),
        );
      }
    },
  );

  // ── l10n_delete_glossary_entry ────────────────────────────────────────────

  server.registerTool(
    "l10n_delete_glossary_entry",
    {
      title: "Delete Glossary Entry",
      description: `Remove a single term mapping from a glossary.`,
      inputSchema: z
        .object({
          glossaryId: z.number().int().describe("Numeric ID of the glossary"),
          entryId: z
            .number()
            .int()
            .describe("Numeric ID of the entry to remove"),
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
        const manager = new GlossaryManager(logger);
        const response = await manager.deleteGlossaryEntry(
          args.glossaryId,
          args.entryId,
        );

        if (!response.success) {
          return buildErrorResponse(
            response.message ?? "Failed to delete glossary entry.",
          );
        }

        return buildMcpResponse(
          `✅ Entry ${args.entryId} removed from glossary ${args.glossaryId}.`,
          { success: true, glossaryId: args.glossaryId, entryId: args.entryId },
        );
      } catch (err) {
        return buildErrorResponse(
          err instanceof Error ? err.message : String(err),
        );
      }
    },
  );
}
