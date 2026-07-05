import { ILogger } from "ai-l10n-sdk";

interface LogEntry {
  level: "info" | "warn" | "error";
  text: string;
}

/**
 * MCP-safe logger that buffers all SDK log output.
 * The SDK's ConsoleLogger writes to stdout which corrupts the stdio MCP wire format.
 * This logger intercepts everything and exposes a flush() method to include
 * log lines in tool responses.
 */
export class McpLogger implements ILogger {
  private entries: LogEntry[] = [];

  logInfo(message: string): void {
    this.entries.push({ level: "info", text: message });
  }

  logWarning(message: string, _error?: unknown): void {
    this.entries.push({ level: "warn", text: message });
  }

  logError(message: string, _error?: unknown): void {
    this.entries.push({ level: "error", text: message });
  }

  showAndLogError(
    message: string,
    error?: unknown,
    _context?: string,
    _linkBtnText?: string,
    _url?: string,
  ): void {
    const detail =
      error instanceof Error
        ? `: ${error.message}`
        : error
          ? `: ${String(error)}`
          : "";
    this.entries.push({ level: "error", text: `${message}${detail}` });
  }

  /** Render captured log to a human-readable string and clear the buffer. */
  flush(): string {
    const lines = this.entries.map((e) => {
      return e.text;
    });
    this.entries = [];
    return lines.join("\n");
  }

  /** Return structured log entries without clearing, for error inspection. */
  getEntries(): readonly LogEntry[] {
    return [...this.entries];
  }

  hasErrors(): boolean {
    return this.entries.some((e) => e.level === "error");
  }
}
