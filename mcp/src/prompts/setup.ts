import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const SetupArgsSchema = {
  sourceLanguage: z
    .string()
    .optional()
    .describe("Source language code e.g. 'en'. Default: en"),
  targetLanguages: z
    .string()
    .optional()
    .describe("Comma-separated target language codes e.g. 'es,fr,de'"),
};

export function registerSetupPrompt(server: McpServer): void {
  server.registerPrompt(
    "l10n_project_setup",
    {
      title: "Set up l10n.dev for this project",
      description:
        "Check and configure linguistic instructions and glossary for optimal translation quality. " +
        "Run this when starting a new project or when a user wants to review their l10n.dev settings.",
      argsSchema: SetupArgsSchema,
    },
    (args) => {
      const sourceLanguage = args.sourceLanguage ?? "en";
      const targetLanguagesLine = args.targetLanguages
        ? `Target languages: ${args.targetLanguages}`
        : "";

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Help me configure l10n.dev for best translation quality.

Please do the following in order:
1. Call l10n_list_instructions to check if I have any linguistic instructions saved.
   - If none: ask me what tone and style my app uses, then create an instruction.
   - If some exist: show me them and ask if they still apply.

2. Call l10n_list_glossaries to check if I have any glossaries saved.
   - If none: explain that glossaries ensure key terms are translated consistently,
     and ask if I want to auto-generate it on the next translation.
   - If some exist: show me them.

3. Call l10n_get_balance to show my current character balance.

4. Summarise what is now configured and what will happen on the next translation.

Source language: ${sourceLanguage}
${targetLanguagesLine}`,
            },
          },
        ],
      };
    },
  );
}
