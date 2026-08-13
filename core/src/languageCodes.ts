/**
 * Known BCP 47 subtags used to validate language codes found inside file names.
 *
 * A purely structural regex cannot tell a language code from any other short token:
 * `strings.min.json`, `app-ios.json`, `bundle.new.json` and `config.dev.json` all look
 * like `<name>.<language>.<ext>`. Validating each subtag against these sets keeps
 * file name detection precise. Codes that are not covered here can always be handled
 * with a custom `languageCodeRegex`.
 */

/**
 * ISO 639-1 two-letter language codes.
 */
// prettier-ignore
export const ISO_639_1_LANGUAGE_CODES: ReadonlySet<string> = new Set([
  "aa", "ab", "ae", "af", "ak", "am", "an", "ar", "as", "av", "ay", "az",
  "ba", "be", "bg", "bh", "bi", "bm", "bn", "bo", "br", "bs",
  "ca", "ce", "ch", "co", "cr", "cs", "cu", "cv", "cy",
  "da", "de", "dv", "dz",
  "ee", "el", "en", "eo", "es", "et", "eu",
  "fa", "ff", "fi", "fj", "fo", "fr", "fy",
  "ga", "gd", "gl", "gn", "gu", "gv",
  "ha", "he", "hi", "ho", "hr", "ht", "hu", "hy", "hz",
  "ia", "id", "ie", "ig", "ii", "ik", "io", "is", "it", "iu",
  "ja", "jv",
  "ka", "kg", "ki", "kj", "kk", "kl", "km", "kn", "ko", "kr", "ks", "ku", "kv", "kw", "ky",
  "la", "lb", "lg", "li", "ln", "lo", "lt", "lu", "lv",
  "mg", "mh", "mi", "mk", "ml", "mn", "mr", "ms", "mt", "my",
  "na", "nb", "nd", "ne", "ng", "nl", "nn", "no", "nr", "nv", "ny",
  "oc", "oj", "om", "or", "os",
  "pa", "pi", "pl", "ps", "pt",
  "qu",
  "rm", "rn", "ro", "ru", "rw",
  "sa", "sc", "sd", "se", "sg", "si", "sk", "sl", "sm", "sn", "so", "sq", "sr", "ss", "st", "su", "sv", "sw",
  "ta", "te", "tg", "th", "ti", "tk", "tl", "tn", "to", "tr", "ts", "tt", "tw", "ty",
  "ug", "uk", "ur", "uz",
  "ve", "vi", "vo",
  "wa", "wo",
  "xh",
  "yi", "yo",
  "za", "zh", "zu",
]);

/**
 * Three-letter language codes (ISO 639-2/T and ISO 639-3) commonly used by
 * localization platforms. Intentionally curated rather than exhaustive: the full
 * ISO 639-3 register contains codes such as `min`, `new`, `map` and `set` that occur
 * far more often as ordinary file name tokens than as languages.
 */
// prettier-ignore
export const ISO_639_3_LANGUAGE_CODES: ReadonlySet<string> = new Set([
  // Languages without an ISO 639-1 code
  "arz", "ary", "ast", "azb", "bem", "bho", "ceb", "ckb", "doi", "dsb", "fil",
  "fur", "gsw", "haw", "hmn", "hsb", "kab", "kmr", "lij", "lmo", "lug", "mni",
  "nds", "nso", "nya", "pap", "sat", "scn", "sna", "srn", "szl", "tpi", "tzm",
  "vec", "yue", "zgh",
  // ISO 639-2/T equivalents of common ISO 639-1 languages
  "ara", "bul", "ces", "dan", "deu", "ell", "eng", "est", "fin", "fra", "heb",
  "hin", "hrv", "hun", "ind", "ita", "jpn", "kor", "lav", "lit", "nld", "nor",
  "pol", "por", "ron", "rus", "slk", "slv", "spa", "srp", "swe", "tha", "tur",
  "ukr", "vie", "zho",
]);

/**
 * ISO 15924 four-letter script codes in common localization use.
 */
// prettier-ignore
export const ISO_15924_SCRIPT_CODES: ReadonlySet<string> = new Set([
  "adlm", "arab", "aran", "armn", "bali", "beng", "bopo", "brai", "bugi",
  "cakm", "cans", "cham", "cher", "copt", "cyrl", "deva", "dsrt", "egyp",
  "ethi", "geor", "goth", "grek", "gujr", "guru", "hang", "hani", "hans",
  "hant", "hebr", "hira", "java", "jpan", "kana", "khmr", "knda", "kore",
  "lana", "laoo", "latn", "mlym", "mong", "mtei", "mymr", "newa", "nkoo",
  "ogam", "olck", "orya", "osge", "perm", "phag", "plrd", "rohg", "runr",
  "samr", "saur", "shaw", "sinh", "sund", "sylo", "syrc", "takr", "tale",
  "talu", "taml", "tavt", "telu", "tfng", "tglg", "thaa", "thai", "tibt",
  "tirh", "vaii", "wcho", "xsux", "yiii",
]);

/**
 * ISO 3166-1 alpha-2 region codes.
 */
// prettier-ignore
export const ISO_3166_1_REGION_CODES: ReadonlySet<string> = new Set([
  "ad", "ae", "af", "ag", "ai", "al", "am", "ao", "aq", "ar", "as", "at", "au", "aw", "ax", "az",
  "ba", "bb", "bd", "be", "bf", "bg", "bh", "bi", "bj", "bl", "bm", "bn", "bo", "bq", "br", "bs", "bt", "bv", "bw", "by", "bz",
  "ca", "cc", "cd", "cf", "cg", "ch", "ci", "ck", "cl", "cm", "cn", "co", "cr", "cu", "cv", "cw", "cx", "cy", "cz",
  "de", "dj", "dk", "dm", "do", "dz",
  "ec", "ee", "eg", "eh", "er", "es", "et",
  "fi", "fj", "fk", "fm", "fo", "fr",
  "ga", "gb", "gd", "ge", "gf", "gg", "gh", "gi", "gl", "gm", "gn", "gp", "gq", "gr", "gs", "gt", "gu", "gw", "gy",
  "hk", "hm", "hn", "hr", "ht", "hu",
  "id", "ie", "il", "im", "in", "io", "iq", "ir", "is", "it",
  "je", "jm", "jo", "jp",
  "ke", "kg", "kh", "ki", "km", "kn", "kp", "kr", "kw", "ky", "kz",
  "la", "lb", "lc", "li", "lk", "lr", "ls", "lt", "lu", "lv", "ly",
  "ma", "mc", "md", "me", "mf", "mg", "mh", "mk", "ml", "mm", "mn", "mo", "mp", "mq", "mr", "ms", "mt", "mu", "mv", "mw", "mx", "my", "mz",
  "na", "nc", "ne", "nf", "ng", "ni", "nl", "no", "np", "nr", "nu", "nz",
  "om",
  "pa", "pe", "pf", "pg", "ph", "pk", "pl", "pm", "pn", "pr", "ps", "pt", "pw", "py",
  "qa",
  "re", "ro", "rs", "ru", "rw",
  "sa", "sb", "sc", "sd", "se", "sg", "sh", "si", "sj", "sk", "sl", "sm", "sn", "so", "sr", "ss", "st", "sv", "sx", "sy", "sz",
  "tc", "td", "tf", "tg", "th", "tj", "tk", "tl", "tm", "tn", "to", "tr", "tt", "tv", "tw", "tz",
  "ua", "ug", "um", "us", "uy", "uz",
  "va", "vc", "ve", "vg", "vi", "vn", "vu",
  "wf", "ws",
  "ye", "yt",
  "za", "zm", "zw",
]);

/**
 * Checks whether the subtag is a known two- or three-letter language code.
 * Case-insensitive: both `en` and `EN` are accepted.
 */
export function isKnownLanguageSubtag(subtag: string): boolean {
  const normalized = subtag.toLowerCase();
  return normalized.length === 2
    ? ISO_639_1_LANGUAGE_CODES.has(normalized)
    : normalized.length === 3 && ISO_639_3_LANGUAGE_CODES.has(normalized);
}

/**
 * Checks whether the subtag is a known ISO 15924 script code (e.g. `Latn`, `Hans`).
 * Case-insensitive.
 */
export function isKnownScriptSubtag(subtag: string): boolean {
  return ISO_15924_SCRIPT_CODES.has(subtag.toLowerCase());
}

/**
 * Checks whether the subtag is a known region: an ISO 3166-1 alpha-2 code (e.g. `US`)
 * or a three-digit UN M49 area code (e.g. `001`, `419`). Case-insensitive.
 */
export function isKnownRegionSubtag(subtag: string): boolean {
  if (/^[0-9]{3}$/.test(subtag)) {
    return true;
  }
  return ISO_3166_1_REGION_CODES.has(subtag.toLowerCase());
}

/**
 * Checks whether every subtag of a language code is known.
 * Accepts `-` or `_` as separator and the forms:
 * `language`, `language-region`, `language-Script` and `language-Script-region`.
 * Examples: `en`, `en-US`, `en_US`, `zh-Hans`, `zh-Hans-CN`, `en-001` -> true;
 * `min`, `en-Xyzw`, `en-QQ` -> false.
 */
export function isKnownLocale(code: string): boolean {
  const subtags = code.split(/[-_]/);
  if (subtags.length === 0 || subtags.length > 3) {
    return false;
  }
  if (!isKnownLanguageSubtag(subtags[0])) {
    return false;
  }
  if (subtags.length === 2) {
    return isKnownScriptSubtag(subtags[1]) || isKnownRegionSubtag(subtags[1]);
  }
  if (subtags.length === 3) {
    return isKnownScriptSubtag(subtags[1]) && isKnownRegionSubtag(subtags[2]);
  }
  return true;
}
