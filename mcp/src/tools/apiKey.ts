import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ApiKeyManager, URLS } from "ai-l10n-sdk";
import { McpLogger } from "../logger.js";
import { buildMcpResponse, buildErrorResponse } from "../utils/response.js";

export function registerApiKeyTools(server: McpServer): void {
  // ── l10n_set_api_key ──────────────────────────────────────────────────────

  server.registerTool(
    "l10n_set_api_key",
    {
      title: "Set API Key",
      description: `Store an l10n.dev API key locally in the user's home directory (~/.ai-l10n/config.json).
Once stored, the key is used automatically by all l10n tools without needing to set L10N_API_KEY.
      
Get a free API key at ${URLS.API_KEYS}

Use this when:
- The user provides an API key and wants to save it
- A translation fails with an authorization error and the user wants to persist their key

Note: if L10N_API_KEY environment variable is set in the MCP config, that takes precedence
over the stored key and this tool is not needed.`,
      inputSchema: z
        .object({
          apiKey: z
            .string()
            .min(1)
            .describe(`The l10n.dev API key to store. Get yours at ${URLS.API_KEYS}`),
        })
        .strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (args) => {
      try {
        const logger = new McpLogger();
        const manager = new ApiKeyManager(logger);
        await manager.storeApiKey(args.apiKey);

        // Mask for display
        const key = args.apiKey;
        const masked =
          key.length <= 12
            ? `${key.substring(0, 4)}...`
            : `${key.substring(0, 8)}...${key.substring(key.length - 4)}`;

        return buildMcpResponse(
          `✅ API key saved successfully (${masked}).\nAll l10n tools will now use this key automatically.`,
          { success: true },
        );
      } catch (err) {
        return buildErrorResponse(err instanceof Error ? err.message : String(err));
      }
    },
  );

  // ── l10n_get_api_key_status ───────────────────────────────────────────────

  server.registerTool(
    "l10n_get_api_key_status",
    {
      title: "Get API Key Status",
      description: `Check whether an l10n.dev API key is configured (via environment variable or stored config).
Use this to diagnose authorization errors or to confirm the key is set up correctly.`,
      inputSchema: z.object({}).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      try {
        const logger = new McpLogger();
        const manager = new ApiKeyManager(logger);

        const envKey = process.env.L10N_API_KEY;
        const storedDisplay = await manager.displayStoredApiKey();
        const storedKey = await manager.getStoredApiKey();

        const parts: string[] = [];
        if (envKey) {
          const masked =
            envKey.length <= 12
              ? `${envKey.substring(0, 4)}...`
              : `${envKey.substring(0, 8)}...${envKey.substring(envKey.length - 4)}`;
          parts.push(`✅ **Environment variable** (L10N_API_KEY): ${masked} _(takes precedence)_`);
        } else {
          parts.push("❌ **Environment variable** (L10N_API_KEY): not set");
        }

        if (storedKey) {
          parts.push(`✅ **Stored config** (~/.ai-l10n/config.json): ${storedDisplay.replace("✅ API Key is configured. Key: ", "")}`);
        } else {
          parts.push("❌ **Stored config**: not found");
        }

        const hasKey = !!(envKey || storedKey);
        if (!hasKey) {
          parts.push(
            `\nNo API key found. Get a free key at ${URLS.API_KEYS} then use l10n_set_api_key to store it.`,
          );
        }

        return buildMcpResponse(parts.join("\n"), {
          success: true,
          hasEnvKey: !!envKey,
          hasStoredKey: !!storedKey,
          isConfigured: hasKey,
        });
      } catch (err) {
        return buildErrorResponse(err instanceof Error ? err.message : String(err));
      }
    },
  );
}
