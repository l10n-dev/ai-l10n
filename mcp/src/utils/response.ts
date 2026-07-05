import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/**
 * Build a standard MCP tool result with both human-readable text and structured
 * content. The text block is displayed to the user; the structured content is used
 * by the AI to reason about follow-up actions.
 */
export function buildMcpResponse(
  text: string,
  structured: Record<string, unknown>,
): CallToolResult {
  return {
    content: [{ type: "text", text }],
    structuredContent: structured,
  };
}

/**
 * Build an error response. The isError flag signals the MCP runtime that the
 * tool call failed, while still returning a message for the AI to act on.
 */
export function buildErrorResponse(message: string): CallToolResult {
  return {
    content: [{ type: "text", text: `❌ ${message}` }],
    isError: true,
  };
}
