import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AiTranslator, URLS } from "ai-l10n-sdk";
import { McpLogger } from "../logger.js";
import { buildMcpResponse, buildErrorResponse } from "../utils/response.js";

const TranslateInputSchema = z
  .object({
    sourceFile: z
      .string()
      .describe(
        "Absolute or relative path to the source i18n file (JSON, JSONC, ARB, YAML, PO, XLIFF, MD, etc.)",
      ),
    targetLanguages: z
      .array(z.string())
      .optional()
      .describe(
        "BCP-47 language codes e.g. ['es','fr','de']. Auto-detected from project structure if omitted.",
      ),
    translateOnlyNewStrings: z
      .boolean()
      .optional()
      .describe(
        "Only translate new/changed strings, skipping strings that already exist in the target file. " +
          "Saves character quota. Default false. " +
          "Note: on first run, only added strings are translated because the hash table is empty. " +
          "Note: when generateGlossary is also enabled, quota is debited for full source content regardless.",
      ),
    generateGlossary: z
      .boolean()
      .optional()
      .describe(
        "Generate and save a glossary from this translation for consistent future translations. " +
          "Costs extra characters (full source content debited upfront). Default false.",
      ),
    instruction: z
      .string()
      .max(1000)
      .optional()
      .describe(
        "Linguistic instruction for this translation e.g. 'Use formal tone, never translate Dashboard'. " +
          "Overrides the active saved instruction for this request. Max 1000 characters.",
      ),
    generatePluralForms: z
      .boolean()
      .optional()
      .describe(
        "Generate plural form strings with suffixes (e.g. for i18next). " +
          "Do not enable for strict source-to-target mapping. Default false.",
      ),
    useShortening: z
      .boolean()
      .optional()
      .describe("Allow shorter translations where appropriate. Default false."),
    translateMetadata: z
      .boolean()
      .optional()
      .describe(
        "Translate metadata entries along with UI strings (e.g. Flutter ARB @key descriptions). " +
          "When false (default), metadata entries are preserved unchanged in target files.",
      ),
    replace: z
      .boolean()
      .optional()
      .describe(
        "Replace existing target files in-place. When false (default), uniquely-named copies are created.",
      ),
    verbose: z
      .boolean()
      .optional()
      .describe("Enable verbose SDK logging in the output. Default false."),
  })
  .strict();

type TranslateInput = z.infer<typeof TranslateInputSchema>;

export function registerTranslateTools(server: McpServer): void {
  server.registerTool(
    "l10n_translate_file",
    {
      title: "Translate i18n File, configs, md documents, and other text-based formats",
      description: `Translate an i18n source file to one or more target languages using l10n.dev AI.

Supports JSON, JSONC, Flutter ARB, YAML, PO (gettext), XLIFF, MD, and all other text-based localization formats.
Format is auto-detected from the file extension.
If targetLanguages is omitted, languages are auto-detected from the project structure.

PRE-TRANSLATION CHECKS — perform all of these BEFORE calling translate:

1. LINGUISTIC INSTRUCTIONS: If the user has not mentioned tone, style, or brand voice in this conversation,
   call l10n_list_instructions first. Check whether a saved instruction exists for each requested target
   language pair (source → target). If instructions exist for OTHER language pairs but NOT the requested
   targets, mention this gap explicitly. Ask the user in one sentence:
   "No instruction found for [language(s)] — would you like to set a tone/style rule before translating?
   (e.g. formal, casual, keep brand terms untranslated)"
   If yes, call l10n_create_instruction and pass the instruction text back via the 'instruction' parameter.
   If no or they want to skip, proceed without it.

2. GLOSSARY: If generateGlossary was not explicitly set by the user, call l10n_list_glossaries and check
   whether an active glossary exists for the requested target language pairs. If glossaries exist for OTHER
   language pairs but NOT the requested targets, mention this gap. Then ask the user:
   "No glossary found for [language(s)] — enabling glossary generation saves key terms for consistent
   future translations (costs extra characters). Enable it for this run?"
   If yes, set generateGlossary: true. If no, proceed without it.
   Do this check BEFORE translating — do not suggest a rerun after the fact.

3. INCREMENTAL UPDATE: For JSON-based formats (.json, .jsonc, .arb) only: if the target language files
   already exist on disk (i.e. this is an update to existing translations, not a first-time run) and
   translateOnlyNewStrings was not explicitly set by the user, suggest enabling it:
   "Target files already exist — enable incremental mode to skip unchanged strings and save quota?"
   If yes, set translateOnlyNewStrings: true.

4. BALANCE: If the translation fails with paymentRequired (HTTP 402 / Insufficient balance), analyze
   the error message (it contains current balance and required balance). Suggest purchasing more
   characters at ${URLS.PRICING}

5. API KEY: If the error indicates unauthorized access or no API key, suggest creating a free account
   and API key at ${URLS.API_KEYS}. Offer to store the key using the l10n_set_api_key tool.`,
      inputSchema: TranslateInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (args: TranslateInput) => {
      try {
        const logger = new McpLogger();
        const translator = new AiTranslator(logger);

        const summary = await translator.translate({
          sourceFile: args.sourceFile,
          targetLanguages: args.targetLanguages,
          translateOnlyNewStrings: args.translateOnlyNewStrings,
          generateGlossary: args.generateGlossary,
          instruction: args.instruction,
          generatePluralForms: args.generatePluralForms,
          useShortening: args.useShortening,
          translateMetadata: args.translateMetadata,
          replace: args.replace,
          verbose: args.verbose ?? false,
        });

        const logOutput = logger.flush();

        const structured: Record<string, unknown> = {
          ...summary,
          glossaryGenerated: args.generateGlossary ?? false,
          instructionUsed: !!args.instruction,
        };

        const textParts: string[] = [];
        if (logOutput) textParts.push(logOutput);

        if (!summary.success && summary.results.length === 0) {
          textParts.push("❌ Translation failed. See details above.");
        }

        return buildMcpResponse(
          textParts.join("\n") || "Translation completed.",
          structured,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return buildErrorResponse(message);
      }
    },
  );
}
