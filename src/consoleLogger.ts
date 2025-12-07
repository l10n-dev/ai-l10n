import { ILogger } from "./logger";

/**
 * Console-based logger implementation
 */
export class ConsoleLogger implements ILogger {
  /**
   * Show and log error message
   */
  showAndLogError(
    userMessage: string,
    error?: unknown,
    context?: string,
    linkBtnText?: string,
    url?: string
  ): void {
    console.error(`❌ ${userMessage}`);

    if (context) {
      console.error(`Context: ${context}`);
    }

    if (error) {
      if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
        if (error.stack) {
          console.error(error.stack);
        }
      } else {
        console.error(`Error: ${String(error)}`);
      }
    }

    if (linkBtnText && url) {
      console.error(`${linkBtnText}: ${url}`);
    }
  }

  /**
   * Log informational message
   */
  logInfo(message: string): void {
    console.log(message);
  }

  /**
   * Log warning message
   */
  logWarning(message: string): void {
    console.warn(`⚠️ ${message}`);
  }
}
