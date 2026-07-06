import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as path from "path";
import * as fs from "fs";
import { I18nProjectManager, LANGUAGE_CODE_REGEX } from "ai-l10n-sdk";
import { McpLogger } from "../logger.js";
import { buildMcpResponse, buildErrorResponse } from "../utils/response.js";

const DetectInputSchema = z
  .object({
    sourceFile: z
      .string()
      .describe(
        "Absolute or relative path to the i18n source file " +
          "(e.g. './locales/en.json', './lib/l10n/app_en.arb', './locales/en/common.json'). " +
          "This is the file in the source language from which translations are generated.",
      ),
  })
  .strict();

export function registerProjectStructureTool(server: McpServer): void {
  server.registerTool(
    "l10n_detect_project_structure",
    {
      title: "Detect i18n Project Structure",
      description: `Scan an i18n source file to understand the project's localization structure.

Returns: structure type (folder-based or file-based), source language code, all detected target
languages, and the resolved target file path for each language (showing whether files already exist).

Use this before translating or setting up automation to understand what source files and target
languages are in place. Call with the path to the source language file (e.g. locales/en.json,
app_en.arb, locales/en/common.json).`,
      inputSchema: DetectInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ sourceFile }) => {
      try {
        const resolvedPath = path.resolve(sourceFile);
        if (!fs.existsSync(resolvedPath)) {
          return buildErrorResponse(
            `Source file not found: ${resolvedPath}\n` +
              "Provide the path to an existing i18n source file (e.g. './locales/en.json').",
          );
        }

        const logger = new McpLogger();
        const manager = new I18nProjectManager(logger);

        const sourceLanguage =
          manager.extractLanguageCodeFromPath(resolvedPath);
        const targetLanguages =
          manager.detectLanguagesFromProject(resolvedPath);

        // Derive structure type using the same logic as the SDK's private detectProjectStructure:
        // folder-based when parent directory name is a language code, file-based otherwise.
        const parentDirName = path.basename(path.dirname(resolvedPath));
        const structureType = LANGUAGE_CODE_REGEX.test(parentDirName)
          ? "folder-based"
          : sourceLanguage
            ? "file-based"
            : "unknown";

        const targetFilePaths = targetLanguages.map((lang) => {
          const targetPath = manager.generateTargetFilePath(resolvedPath, lang);
          return {
            language: lang,
            path: targetPath,
            exists: fs.existsSync(targetPath),
          };
        });

        const lines: string[] = [
          `📁 **Structure type:** ${structureType}`,
          `🌐 **Source language:** ${sourceLanguage ?? "unknown"}`,
          `🎯 **Target languages (${targetLanguages.length}):** ${
            targetLanguages.length > 0
              ? targetLanguages.join(", ")
              : "none detected"
          }`,
        ];

        if (targetFilePaths.length > 0) {
          lines.push("\n**Target file paths:**");
          for (const { language, path: p, exists } of targetFilePaths) {
            lines.push(
              `- \`${language}\` → \`${p}\` ${exists ? "_(exists)_" : "_(will be created)_"}`,
            );
          }
        } else {
          lines.push(
            "\n⚠️ No target languages detected. " +
              "Add target language files/folders beside the source file, " +
              "or pass `targetLanguages` explicitly to `l10n_translate_file`.",
          );
        }

        return buildMcpResponse(lines.join("\n"), {
          sourceFile: resolvedPath,
          sourceLanguage,
          structureType,
          targetLanguages,
          targetFilePaths,
        });
      } catch (err) {
        return buildErrorResponse(
          err instanceof Error ? err.message : String(err),
        );
      }
    },
  );
}
