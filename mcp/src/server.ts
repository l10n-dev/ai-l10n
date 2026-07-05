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
    version: "1.10.0",
  });

  registerTranslateTools(server);
  registerInstructionTools(server);
  registerGlossaryTools(server);
  registerBalanceTool(server);
  registerApiKeyTools(server);
  registerSetupPrompt(server);

  return server;
}
