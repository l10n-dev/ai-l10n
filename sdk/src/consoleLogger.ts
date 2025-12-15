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
    url?: string
  ): void {
    console.error(`❌ ${message}`);

    if (context) {
      console.error(`Context: ${context}`);
    }

    if (error) {
      this.logErrorDetails(error, console.error);
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
    console.warn(`⚠️  ${message}`);
    if (error) {
      this.logErrorDetails(error, console.warn);
    }
  }

  /**
   * Log error message
   */
  logError(message: string, error?: unknown): void {
    console.error(`❌ ${message}`);
    if (error) {
      this.logErrorDetails(error, console.error);
    }
  }

  /**
   * Log error details to console
   */
  private logErrorDetails(
    error: unknown,
    logFn: (message: string) => void
  ): void {
    if (error instanceof Error) {
      logFn(`Error: ${error.message}`);
      if (error.stack) {
        logFn(error.stack);
      }
    } else {
      logFn(`Error: ${String(error)}`);
    }
  }
}
