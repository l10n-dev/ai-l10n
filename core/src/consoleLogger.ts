import { ILogger } from "./logger";

/**
 * Console-based logger implementation
 */
export class ConsoleLogger implements ILogger {
  /**
   * Show and log error message
   */
  showAndLogError(
    message: string,
    error?: unknown,
    context?: string,
    linkBtnText?: string,
    url?: string,
  ): void {
    if (error) {
      console.error(`❌ ${message}`, context ?? "", error);
    } else {
      console.error(`❌ ${message}`, context ?? "");
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
  logWarning(message: string, error?: unknown): void {
    if (error) {
      console.warn(`⚠️  ${message}`, error);
    } else {
      console.warn(`⚠️  ${message}`);
    }
  }

  /**
   * Log error message
   */
  logError(message: string, error?: unknown): void {
    if (error) {
      console.error(`❌ ${message}`, error);
    } else {
      console.error(`❌ ${message}`);
    }
  }
}
