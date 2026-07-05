import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BalanceManager, URLS } from "ai-l10n-sdk";
import { McpLogger } from "../logger.js";
import { buildMcpResponse, buildErrorResponse } from "../utils/response.js";

export function registerBalanceTool(server: McpServer): void {
  server.registerTool(
    "l10n_get_balance",
    {
      title: "Get Account Balance",
      description: `Check the remaining character balance for this l10n.dev account.
Each translation consumes characters from the balance.
Use this when the user asks how many characters they have left, or proactively
if a translation result shows a low remaining balance.

If balance is insufficient, suggest purchasing more characters at ${URLS.PRICING}`,
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
        const balanceManager = new BalanceManager(logger);
        const response = await balanceManager.getBalance();
        if (!response.success) {
          return buildErrorResponse(
            response.message ?? "Failed to retrieve balance.",
          );
        }

        const balance = response.data.currentBalance;
        const formatted = balance.toLocaleString();
        const lowWarning =
          balance < 10_000
            ? `\n\n⚠️ Low balance. Purchase more characters at ${URLS.PRICING}`
            : "";

        return buildMcpResponse(
          `💰 Remaining balance: **${formatted} characters**${lowWarning}`,
          { success: true, balance, formattedBalance: formatted },
        );
      } catch (err) {
        return buildErrorResponse(
          err instanceof Error ? err.message : String(err),
        );
      }
    },
  );
}
