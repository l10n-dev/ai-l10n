// Configuration constants shared across the package
export const CONFIG = {
  SECTION: "ai-l10n",
  KEYS: {
    API_KEY: "apiKey",
    USE_CONTRACTIONS: "useContractions",
    USE_SHORTENING: "useShortening",
    GENERATE_PLURAL_FORMS: "generatePluralForms",
    SAVE_FILTERED_STRINGS: "saveFilteredStrings",
  },
} as const;

// URL constants for l10n.dev service
export const URLS = {
  BASE: "https://l10n.dev",
  API_BASE: "https://l10n.dev/api",
  API_KEYS: "https://l10n.dev/ws/keys",
  PRICING: "https://l10n.dev/#pricing",
  CONTENT_POLICY: "https://l10n.dev/terms-of-service#content-policy",
} as const;
