/**
 * BCP 47 language code regex with optional script and region subtags.
 * Matches patterns like: en, en-US, en_US, zh-Hans, zh-Hans-CN, zh_Hans_CN
 */
export const LANGUAGE_CODE_REGEX =
  /^(?<language>[a-z]{2,3})([-|_](?<script>[A-Z][a-z]{3}))?([-|_](?<region>[A-Z]{2,3}|[0-9]{3}))?$/i;

/**
 * Normalizes language codes to a consistent BCP 47 format with optional script and region subtags
 * Examples:
 * - "en" -> "en"
 * - "en-us", "en_US" -> "en-US"
 * - "zh_hans", "zh-Hans" -> "zh-Hans"
 * - "zh_HANS_CN", "zh-Hans-CN" -> "zh-Hans-CN"
 * @param code Language code to normalize
 * @returns Normalized language code in the format: language[-Script][-REGION]
 */
export function normalizeLanguageCode(code: string): string {
  const match = code.match(LANGUAGE_CODE_REGEX);
  if (!match?.groups) {
    return code; // Return as-is if it doesn't match the pattern
  }

  const { language, script, region } = match.groups;
  let normalized = language.toLowerCase();

  if (script) {
    // Script codes: first letter uppercase, rest lowercase
    normalized +=
      "-" + script.charAt(0).toUpperCase() + script.slice(1).toLowerCase();
  }

  if (region) {
    // Region codes: all uppercase
    normalized += "-" + region.toUpperCase();
  }

  return normalized;
}

/**
 * Validates whether the given string is a valid BCP 47 language code
 */
export function validateLanguageCode(code: string): boolean {
  return !!code && LANGUAGE_CODE_REGEX.test(code);
}

/**
 * Extracts language code from file name, handling custom prefixes and suffixes for different file types
 * ARB files: app_en_US.arb -> en_US, my_app_fr.arb -> fr
 * JSON files: en-US.json -> en-US
 * Shopify theme: en.default.schema.json -> en, es-ES.schema.json -> es-ES
 */
export function extractLanguageCode(fileName: string): string | null {
  const isArbFile = fileName.endsWith(".arb");
  const nameWithoutExt = fileName.replace(/\.[^.]+$/, ""); // Remove extension
  if (isArbFile) {
    // ARB files use underscores instead of hyphens
    const arbLanguageCodeRegex =
      /^(?<language>[a-z]{2,3})(_(?<script>[A-Z][a-z]{3}))?(_(?<region>[A-Z]{2,3}|[0-9]{3}))?$/;

    // For ARB files, try to extract language code after potential prefix
    // Pattern: [prefix_]language[_script][_region]
    const parts = nameWithoutExt.split("_");

    // Try combinations from right to left to find valid language code
    // For example, for "my_app_en_US.arb", parts = ["my", "app", "en", "US"]
    // Check "en_US", then "app_en_US", then "my_app_en_US" until we find a match
    for (let i = 0; i < parts.length; i++) {
      const potentialCode = parts.slice(i).join("_");
      if (arbLanguageCodeRegex.test(potentialCode)) {
        return potentialCode;
      }
    }
    return null;
  }

  // Handle Shopify theme pattern: en.default.schema, es-ES.schema
  // Remove .schema first, then .default before extracting language code
  const cleanedFileName = nameWithoutExt
    .replace(/\.schema$/, "")
    .replace(/\.default$/, "");

  // For JSON files, the entire filename should be the language code
  return LANGUAGE_CODE_REGEX.test(cleanedFileName) ? cleanedFileName : null;
}
