import { isKnownLanguageSubtag, isKnownLocale } from "./languageCodes.js";

/**
 * BCP 47 language code regex with optional script and region subtags.
 * Matches patterns like: en, en-US, en_US, zh-Hans, zh-Hans-CN, zh_Hans_CN
 */
export const LANGUAGE_CODE_REGEX =
  /^(?<language>[a-z]{2,3})([-|_](?<script>[A-Z][a-z]{3}))?([-|_](?<region>[A-Z]{2,3}|[0-9]{3}))?$/i;

/** Structural pattern of a language code, used to match sibling files. */
const LANGUAGE_CODE_PATTERN_SOURCE =
  "[a-z]{2,3}(?:[-_][a-z]{4})?(?:[-_](?:[a-z]{2,3}|[0-9]{3}))?";

/** File name parts separated by `.`, `-` or `_`. */
const FILE_NAME_TOKEN_REGEX = /[^._-]+/g;

/**
 * A language code found inside a file name, split so that
 * `prefix + language + suffix === fileName`.
 *
 * The same match therefore drives both detection (matching sibling files) and
 * generation (building the target file name for another language).
 * For example `emails.en.json` yields
 * `{ language: "en", prefix: "emails.", suffix: ".json" }`.
 */
export interface LanguageFileNameMatch {
  /** The language code as it appears in the file name (e.g. `"en"`, `"en-US"`, `"en_US"`) */
  language: string;
  /** Everything before the language code (e.g. `"emails."`) */
  prefix: string;
  /** Everything after the language code, including the extension (e.g. `".json"`) */
  suffix: string;
}

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

// ── Language codes embedded in file names ───────────────────────────────────

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Finds language codes embedded as tokens in a file name, for layouts where the
 * name is not a language code by itself: `emails.en.json`, `emails-en.json`,
 * `en-US.common.json`, `common.en-Latn-US.yml`, `messages_en_US.properties`.
 *
 * Every subtag is validated against the known ISO code sets, because the structure
 * alone cannot tell a language code from any other short token — otherwise
 * `strings.min.json` or `config.dev.json` would look like localization files.
 *
 * One candidate is produced per position holding a language code — the longest code
 * starting there, so `web.zh-Hans-CN.yaml` yields `zh-Hans-CN` rather than `zh`.
 * Names with several language codes, such as `a.de.b.fr.json`, produce one candidate
 * each, ranked by likelihood: longest code first, then the one appearing last in the
 * name. The caller decides between them, for example by checking which naming pattern
 * existing sibling files follow.
 *
 * @param fileName File name (not a full path), e.g. `"emails.en.json"`
 * @returns Ranked candidates, or an empty array when no language code is found
 */
export function findLanguageCodeCandidatesInFileName(
  fileName: string,
): LanguageFileNameMatch[] {
  const extension = fileName.match(/\.[^.]+$/)?.[0] ?? "";
  const stem = extension
    ? fileName.slice(0, fileName.length - extension.length)
    : fileName;

  const tokens: { text: string; index: number }[] = [];
  for (const token of stem.matchAll(FILE_NAME_TOKEN_REGEX)) {
    tokens.push({ text: token[0], index: token.index ?? 0 });
  }

  const candidates: LanguageFileNameMatch[] = [];
  for (let start = 0; start < tokens.length; start++) {
    // A language code always starts with a language subtag
    if (!isKnownLanguageSubtag(tokens[start].text)) {
      continue;
    }

    // Take the longest valid code starting here: language, language + script/region,
    // language + script + region. Spanning tokens (instead of scanning with a single
    // global regex) makes sure an invalid leading token cannot hide a valid code behind
    // it - in `app_en_US.arb` a global scan consumes `app_en` and never reaches `en_US`.
    let end: number | undefined;
    for (
      let length = 1;
      length <= 3 && start + length <= tokens.length;
      length++
    ) {
      const lastToken = tokens[start + length - 1];
      const spanEnd = lastToken.index + lastToken.text.length;

      // Validates the subtags and, implicitly, the separators between them:
      // only `-` and `_` join the subtags of a language code
      if (isKnownLocale(stem.slice(tokens[start].index, spanEnd))) {
        end = spanEnd;
      }
    }

    if (end !== undefined) {
      candidates.push({
        language: stem.slice(tokens[start].index, end),
        prefix: stem.slice(0, tokens[start].index),
        suffix: stem.slice(end) + extension,
      });
    }
  }

  return candidates.sort(
    (a, b) =>
      b.language.length - a.language.length ||
      b.prefix.length - a.prefix.length,
  );
}

/**
 * Compiles a user-supplied language code pattern into a usable regex.
 * The pattern must contain a `(?<language>...)` named capture group marking the
 * language code within the file name, for example
 * `^emails\.(?<language>[\w-]+)\.json$`.
 *
 * @throws Error when the pattern is not a valid regex or has no `language` group
 */
export function resolveLanguageCodeRegex(pattern: string | RegExp): RegExp {
  const source = typeof pattern === "string" ? pattern : pattern.source;

  if (!source.includes("(?<language>")) {
    throw new Error(
      "languageCodeRegex must contain a named capture group for the language code, " +
        `for example "^emails\\.(?<language>[\\w-]+)\\.json$". Received: ${source}`,
    );
  }

  // Drop the sticky/global flags so matching stays stateless, and request match
  // indices to locate the language group inside the file name
  const flags = (typeof pattern === "string" ? "" : pattern.flags).replace(
    /[gy]/g,
    "",
  );

  try {
    return new RegExp(source, flags.includes("d") ? flags : `${flags}d`);
  } catch {
    try {
      // Match indices ("d" flag) require Node 16+; fall back to locating the
      // language code by value on older runtimes
      return new RegExp(source, flags);
    } catch (error) {
      throw new Error(
        `languageCodeRegex is not a valid regular expression: ${source}. ` +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }
}

/**
 * Matches a file name against a user-supplied language code pattern.
 *
 * @param fileName File name (not a full path), e.g. `"emails.en.json"`
 * @param pattern Regex containing a `(?<language>...)` group
 * @returns The matched language code with its surrounding parts, or `null` when the
 *  pattern does not match the file name
 * @throws Error when the pattern is not a valid regex or has no `language` group
 */
export function matchLanguageCodeInFileName(
  fileName: string,
  pattern: string | RegExp,
): LanguageFileNameMatch | null {
  const regex = resolveLanguageCodeRegex(pattern);
  const match = regex.exec(fileName);
  const language = match?.groups?.language;
  if (!match || !language) {
    return null;
  }

  // `indices` is only available with the "d" flag (Node 16+)
  const indices = (
    match as RegExpExecArray & {
      indices?: { groups?: Record<string, [number, number] | undefined> };
    }
  ).indices?.groups?.language;

  const start = indices ? indices[0] : match.index + match[0].indexOf(language);

  return {
    language,
    prefix: fileName.slice(0, start),
    suffix: fileName.slice(start + language.length),
  };
}

/**
 * Builds a regex that matches sibling files following the same naming pattern as the
 * given match, capturing their language code as `language`.
 * For `{ prefix: "emails.", suffix: ".json" }` it matches `emails.es.json` and
 * `emails.pt-BR.json`, but not `common.es.json`.
 *
 * Language codes of sibling files are not validated against the known ISO code sets:
 * the anchored prefix and suffix already make the match unambiguous, and target
 * languages may legitimately use codes outside those sets.
 */
export function buildLanguageFileNameRegex(
  match: LanguageFileNameMatch,
): RegExp {
  return new RegExp(
    `^${escapeRegExp(match.prefix)}(?<language>${LANGUAGE_CODE_PATTERN_SOURCE})${escapeRegExp(
      match.suffix,
    )}$`,
    "i",
  );
}

/**
 * Formats a match as a human-readable file name pattern, e.g. `emails.{language}.json`.
 */
export function formatLanguageFileNamePattern(
  match: LanguageFileNameMatch,
): string {
  return `${match.prefix}{language}${match.suffix}`;
}
