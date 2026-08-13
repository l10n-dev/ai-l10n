import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as path from "path";
import * as fs from "fs";
import {
  I18nProjectManager,
  formatLanguageFileNamePattern,
  type LanguageDetectionOptions,
} from "ai-l10n-sdk";
import { McpLogger } from "../logger.js";
import { buildMcpResponse, buildErrorResponse } from "../utils/response.js";

const DetectInputSchema = z
  .object({
    sourceFile: z
      .string()
      .describe(
        "Absolute or relative path to the i18n source file " +
          "(e.g. './locales/en.json', './lib/l10n/app_en.arb', './locales/en/common.json', " +
          "'./locales/common.en.json'). " +
          "This is the file in the source language from which translations are generated.",
      ),
    languageCodeRegex: z
      .string()
      .optional()
      .describe(
        "Regex locating the language code in file names, overriding the built-in detection. " +
          "Must contain a (?<language>...) named capture group, e.g. " +
          "'^common\\\\.(?<language>[\\\\w-]+)\\\\.json$'. " +
          "Only needed when the structure is reported as 'unknown' even though language files exist.",
      ),
  })
  .strict();

export function registerProjectStructureTool(server: McpServer): void {
  server.registerTool(
    "l10n_detect_project_structure",
    {
      title: "Detect i18n Project Structure",
      description: `Scan an i18n source file to understand the project's localization structure.

Returns: structure type (folder-based, file-based or unknown), source language code, all detected
target languages, and the resolved target file path for each language (showing whether files
already exist).

Structure types:
- folder-based: a language-code directory per language (locales/en/common.json)
- file-based: the language code is in the file name, either as the whole name
  (locales/en.json) or next to other parts (app_en.arb, locales/common.en.json,
  locales/en-US.common.json, locales/messages_en_US.properties). In the latter case the
  detected naming pattern is reported as well.

Use this before translating or setting up automation to understand what source files and target
languages are in place. Call with the path to the source language file (e.g. locales/en.json,
app_en.arb, locales/en/common.json). If the structure comes back as unknown even though
localization files exist, pass languageCodeRegex to describe the naming pattern.`,
      inputSchema: DetectInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ sourceFile, languageCodeRegex }) => {
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
        const detectionOptions: LanguageDetectionOptions = {
          languageCodeRegex,
        };

        const structure = manager.describeProjectStructure(
          resolvedPath,
          detectionOptions,
        );
        const sourceLanguage = structure.sourceLanguage ?? null;
        const structureType =
          structure.type === "unknown" ? "unknown" : `${structure.type}-based`;
        const fileNamePattern = structure.fileNameMatch
          ? formatLanguageFileNamePattern(structure.fileNameMatch)
          : undefined;

        const targetLanguages = manager.detectLanguagesFromProject(
          resolvedPath,
          detectionOptions,
        );

        const targetFilePaths = targetLanguages.map((lang) => {
          const targetPath = manager.generateTargetFilePath(
            resolvedPath,
            lang,
            detectionOptions,
          );
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

        if (fileNamePattern) {
          lines.push(`🔤 **File name pattern:** \`${fileNamePattern}\``);
        }

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
              "pass `languageCodeRegex` if the language code in the file names follows an " +
              "unusual pattern, or pass `targetLanguages` explicitly to `l10n_translate_file`.",
          );
        }

        return buildMcpResponse(lines.join("\n"), {
          sourceFile: resolvedPath,
          sourceLanguage,
          structureType,
          fileNamePattern,
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
