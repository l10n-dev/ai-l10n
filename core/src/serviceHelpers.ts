import { URLS } from "./constants";
import { ILogger } from "./logger";

/**
 * Checks that an API key is present. Returns a structured error response if the key is missing.
 * @internal Shared helper for service classes.
 */
export function checkApiKey(
  apiKey: string,
  logger: ILogger,
): { success: false; reason: "noApiKey"; message: string } | null {
  if (!apiKey) {
    const message = "API Key not set. Please configure your API Key first.";
    logger.showAndLogError(message, null, "", "Get API Key", URLS.API_KEYS);
    return { success: false, reason: "noApiKey", message };
  }
  return null;
}

/**
 * Maps an HTTP error response to a structured ApiResponse error object.
 * Handles 400 (with validation-error extraction), 401, 403, 404, 429, 500, 502, and 503.
 * @internal Shared helper for service classes.
 */
export async function handleErrorResponse(
  response: Response,
  title: string,
  logger: ILogger,
): Promise<{
  success: false;
  reason:
    | "badRequest"
    | "unauthorized"
    | "forbidden"
    | "notFound"
    | "rateLimited"
    | "serverError"
    | "networkError";
  message: string;
}> {
  logger.logWarning(
    `${title} failed - ${response.status} ${response.statusText}`,
  );
  const errorData = await parseErrorBody(response, logger);
  const status = response.status;

  switch (status) {
    case 400: {
      let message = "Invalid request. Please check your input and try again.";
      if (
        errorData?.errors &&
        typeof errorData.errors === "object" &&
        !Array.isArray(errorData.errors)
      ) {
        const e = errorData.errors;
        message = Object.keys(e)
          .map((k) => {
            const v = e[k];
            if (k) {
              return Array.isArray(v)
                ? `${k}: ${v.join(" ")}`
                : `${k}: ${String(v)}`;
            }
            return Array.isArray(v) ? v.join(" ") : String(v);
          })
          .join("; \r\n");
        logger.showAndLogError(message);
      } else {
        logger.showAndLogError(message, errorData);
      }
      return { success: false, reason: "badRequest", message };
    }
    case 401: {
      const message = "Unauthorized. Please check your API Key.";
      logger.showAndLogError(
        message,
        errorData,
        "",
        "Get API Key",
        URLS.API_KEYS,
      );
      return { success: false, reason: "unauthorized", message };
    }
    case 403: {
      const message =
        "Forbidden. You don't have permission to access this resource.";
      logger.showAndLogError(message, errorData);
      return { success: false, reason: "forbidden", message };
    }
    case 404: {
      const message = "Not found. The requested resource does not exist.";
      logger.showAndLogError(message, errorData);
      return { success: false, reason: "notFound", message };
    }
    case 429: {
      const message =
        "Too many requests. You're being rate limited. Please try again later.";
      logger.showAndLogError(message, errorData);
      return { success: false, reason: "rateLimited", message };
    }
    case 500:
    case 502:
    case 503: {
      const message = `An internal server error occurred (Error code: ${
        errorData?.errorCode ?? "unknown"
      }). Please try again later.`;
      logger.showAndLogError(message, errorData);
      return { success: false, reason: "serverError", message };
    }
    default: {
      const message = `Failed to ${title.toLowerCase()}: ${response.status} ${response.statusText}`;
      logger.showAndLogError(message, errorData);
      return { success: false, reason: "networkError", message };
    }
  }
}

/**
 * Attempts to parse the response body as JSON. Falls back to the raw text on failure.
 * @internal Shared helper for service classes.
 */
export async function parseErrorBody(
  response: Response,
  logger: ILogger,
): Promise<any> {
  let rawBody: string | undefined;
  try {
    rawBody = await response.text();
    return JSON.parse(rawBody);
  } catch {
    logger.logWarning("Failed to parse error response");
    return rawBody;
  }
}
