import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTranslateTools } from "./tools/translate.js";
import { registerInstructionTools } from "./tools/instructions.js";
import { registerGlossaryTools } from "./tools/glossary.js";
import { registerBalanceTool } from "./tools/balance.js";
import { registerApiKeyTools } from "./tools/apiKey.js";
import { registerSetupPrompt } from "./prompts/setup.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "l10n-mcp-server",
    version: "1.0.0",
    websiteUrl: "https://l10n.dev",
    description:
      "A Model Context Protocol (MCP) server for l10n.dev — AI translation of i18n files to 165 languages preserving format and structure, AI glossary generation, and linguistic instructions.",
    icons: [
      {
        src: "https://l10n.dev/favicon.svg",
        mimeType: "image/svg+xml",
      },
      {
        src: "https://l10n.dev/favicon-96x96.png",
        mimeType: "image/png",
        sizes: ["96x96"],
      },
      {
        src: "https://l10n.dev/apple-touch-icon.png",
        mimeType: "image/png",
        sizes: ["180x180"],
      },
    ],
  });

  registerTranslateTools(server);
  registerInstructionTools(server);
  registerGlossaryTools(server);
  registerBalanceTool(server);
  registerApiKeyTools(server);
  registerSetupPrompt(server);

  return server;
}
