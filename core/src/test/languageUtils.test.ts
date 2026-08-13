import * as assert from "assert";
import {
  LANGUAGE_CODE_REGEX,
  LanguageFileNameMatch,
  buildLanguageFileNameRegex,
  extractLanguageCode,
  findLanguageCodeCandidatesInFileName,
  formatLanguageFileNamePattern,
  matchLanguageCodeInFileName,
  normalizeLanguageCode,
  resolveLanguageCodeRegex,
  validateLanguageCode,
} from "../languageUtils.js";
import {
  isKnownLanguageSubtag,
  isKnownLocale,
  isKnownRegionSubtag,
  isKnownScriptSubtag,
} from "../languageCodes.js";

suite("Language Utils Test Suite", () => {
  suite("validateLanguageCode", () => {
    test("accepts language, script and region subtags", () => {
      for (const code of [
        "en",
        "fil",
        "en-US",
        "en_US",
        "zh-Hans",
        "zh-Hans-CN",
        "zh_Hans_CN",
        "es-419",
      ]) {
        assert.strictEqual(validateLanguageCode(code), true, code);
      }
    });

    test("rejects empty and malformed codes", () => {
      for (const code of ["", "e", "english", "en-United-States"]) {
        assert.strictEqual(validateLanguageCode(code), false, code);
      }
    });
  });

  suite("normalizeLanguageCode", () => {
    test("normalizes separators and casing", () => {
      assert.strictEqual(normalizeLanguageCode("en"), "en");
      assert.strictEqual(normalizeLanguageCode("en_us"), "en-US");
      assert.strictEqual(normalizeLanguageCode("EN-us"), "en-US");
      assert.strictEqual(normalizeLanguageCode("zh_hans"), "zh-Hans");
      assert.strictEqual(normalizeLanguageCode("zh_HANS_CN"), "zh-Hans-CN");
    });

    test("returns unrecognized input unchanged", () => {
      assert.strictEqual(normalizeLanguageCode("not-a-code"), "not-a-code");
    });
  });

  suite("extractLanguageCode", () => {
    test("extracts codes from whole file names", () => {
      assert.strictEqual(extractLanguageCode("en.json"), "en");
      assert.strictEqual(extractLanguageCode("en-US.json"), "en-US");
      assert.strictEqual(extractLanguageCode("app_en_US.arb"), "en_US");
      assert.strictEqual(extractLanguageCode("my_app_fr.arb"), "fr");
      assert.strictEqual(extractLanguageCode("en.default.schema.json"), "en");
      assert.strictEqual(extractLanguageCode("es-ES.schema.json"), "es-ES");
    });

    test("returns null when the file name is not a language code", () => {
      assert.strictEqual(extractLanguageCode("messages.json"), null);
      assert.strictEqual(extractLanguageCode("emails.en.json"), null);
    });
  });

  suite("findLanguageCodeCandidatesInFileName", () => {
    const bestMatch = (fileName: string): LanguageFileNameMatch => {
      const candidates = findLanguageCodeCandidatesInFileName(fileName);
      assert.ok(
        candidates.length > 0,
        `expected a language code candidate in ${fileName}`,
      );
      return candidates[0];
    };

    test("finds a code suffixed to the file name (emails.en.json)", () => {
      assert.deepStrictEqual(bestMatch("emails.en.json"), {
        language: "en",
        prefix: "emails.",
        suffix: ".json",
      });
    });

    test("finds a code joined with a hyphen (emails-en.json)", () => {
      assert.deepStrictEqual(bestMatch("emails-en.json"), {
        language: "en",
        prefix: "emails-",
        suffix: ".json",
      });
    });

    test("finds a code prefixed to the file name (en-US.common.json)", () => {
      assert.deepStrictEqual(bestMatch("en-US.common.json"), {
        language: "en-US",
        prefix: "",
        suffix: ".common.json",
      });
    });

    test("finds a code with script and region (common.en-Latn-Us.yml)", () => {
      assert.deepStrictEqual(bestMatch("common.en-Latn-Us.yml"), {
        language: "en-Latn-Us",
        prefix: "common.",
        suffix: ".yml",
      });
    });

    test("finds a code joined with underscores (messages_en_US.properties)", () => {
      assert.deepStrictEqual(bestMatch("messages_en_US.properties"), {
        language: "en_US",
        prefix: "messages_",
        suffix: ".properties",
      });
    });

    test("finds a three-letter language code (errors.fil.json)", () => {
      assert.deepStrictEqual(bestMatch("errors.fil.json"), {
        language: "fil",
        prefix: "errors.",
        suffix: ".json",
      });
    });

    test("finds a numeric UN M49 region (common.en-001.json)", () => {
      assert.strictEqual(bestMatch("common.en-001.json").language, "en-001");
    });

    test("preserves the casing of the file name", () => {
      assert.deepStrictEqual(bestMatch("Emails.EN.json"), {
        language: "EN",
        prefix: "Emails.",
        suffix: ".json",
      });
      assert.strictEqual(bestMatch("translation.pt-br.json").language, "pt-br");
      assert.strictEqual(bestMatch("admin.pt-PT.yml").language, "pt-PT");
    });

    test("takes the longest code per position (web.zh-Hans-CN.yaml)", () => {
      // "zh", "zh-Hans" and "zh-Hans-CN" all start at the same position, so only the
      // longest one is a candidate
      assert.deepStrictEqual(
        findLanguageCodeCandidatesInFileName("web.zh-Hans-CN.yaml"),
        [{ language: "zh-Hans-CN", prefix: "web.", suffix: ".yaml" }],
      );
      assert.deepStrictEqual(
        findLanguageCodeCandidatesInFileName("messages_en_US.properties"),
        [{ language: "en_US", prefix: "messages_", suffix: ".properties" }],
      );
    });

    test("prefers the last occurrence for codes of equal length", () => {
      const candidates = findLanguageCodeCandidatesInFileName("a.de.b.fr.json");
      assert.deepStrictEqual(
        candidates.map((candidate) => candidate.language),
        ["fr", "de"],
      );
      assert.strictEqual(candidates[0].prefix, "a.de.b.");
    });

    test("finds a code hidden behind an unrelated token (app-en-US.json)", () => {
      // A single global scan would consume "app-en" and never reach "en-US"
      assert.deepStrictEqual(bestMatch("app-en-US.json"), {
        language: "en-US",
        prefix: "app-",
        suffix: ".json",
      });
      assert.deepStrictEqual(bestMatch("app_en_US.arb"), {
        language: "en_US",
        prefix: "app_",
        suffix: ".arb",
      });
    });

    test("rejects tokens that are not known language codes", () => {
      for (const fileName of [
        "strings.min.json",
        "app-ios.json",
        "bundle.new.json",
        "site.map.json",
        "data.set.json",
        "config.dev.json",
        "messages.json",
        "common.i18n.json",
        "index.tsx",
      ]) {
        assert.deepStrictEqual(
          findLanguageCodeCandidatesInFileName(fileName),
          [],
          fileName,
        );
      }
    });

    test("rejects unknown script and region subtags", () => {
      // "docs" is not a script, so only the bare language code is a candidate
      assert.deepStrictEqual(
        findLanguageCodeCandidatesInFileName("app.en-docs.json").map(
          (candidate) => candidate.language,
        ),
        ["en"],
      );
      assert.deepStrictEqual(
        findLanguageCodeCandidatesInFileName("app.en-QQ.json").map(
          (candidate) => candidate.language,
        ),
        ["en"],
      );
    });

    test("only joins subtags with hyphens or underscores", () => {
      // "en.US" is not a language code, so the region is not part of the match
      assert.deepStrictEqual(bestMatch("common.en.US.json"), {
        language: "en",
        prefix: "common.",
        suffix: ".US.json",
      });
    });

    test("keeps the file extension in the suffix", () => {
      assert.strictEqual(bestMatch("emails.en.json").suffix, ".json");
      assert.strictEqual(
        bestMatch("en.default.schema.json").suffix,
        ".default.schema.json",
      );
    });
  });

  suite("buildLanguageFileNameRegex", () => {
    test("matches sibling files following the same pattern", () => {
      const regex = buildLanguageFileNameRegex({
        language: "en",
        prefix: "emails.",
        suffix: ".json",
      });

      assert.strictEqual(regex.exec("emails.es.json")?.groups?.language, "es");
      assert.strictEqual(
        regex.exec("emails.pt-BR.json")?.groups?.language,
        "pt-BR",
      );
      assert.strictEqual(
        regex.exec("emails.zh-Hans-CN.json")?.groups?.language,
        "zh-Hans-CN",
      );
    });

    test("does not match files with a different prefix or suffix", () => {
      const regex = buildLanguageFileNameRegex({
        language: "en",
        prefix: "emails.",
        suffix: ".json",
      });

      for (const fileName of [
        "common.es.json",
        "emails.json",
        "emails.es.yaml",
        "emails.es.json.bak",
      ]) {
        assert.strictEqual(regex.test(fileName), false, fileName);
      }
    });

    test("treats the prefix and suffix as literal text", () => {
      const regex = buildLanguageFileNameRegex({
        language: "en",
        prefix: "a+b.",
        suffix: ".json",
      });

      assert.strictEqual(regex.test("a+b.es.json"), true);
      assert.strictEqual(regex.test("axb.es.json"), false);
    });
  });

  suite("resolveLanguageCodeRegex", () => {
    test("compiles a pattern with a language group", () => {
      const regex = resolveLanguageCodeRegex(
        "^emails\\.(?<language>[\\w-]+)\\.json$",
      );
      assert.strictEqual(regex.test("emails.en.json"), true);
    });

    test("drops global and sticky flags", () => {
      const regex = resolveLanguageCodeRegex(/(?<language>[a-z]{2})/gy);
      assert.strictEqual(regex.flags.includes("g"), false);
      assert.strictEqual(regex.flags.includes("y"), false);
    });

    test("throws when the language group is missing", () => {
      assert.throws(
        () => resolveLanguageCodeRegex("^emails\\.([\\w-]+)\\.json$"),
        /named capture group/,
      );
    });

    test("throws when the pattern is not a valid regex", () => {
      assert.throws(
        () => resolveLanguageCodeRegex("^(?<language>[a-z"),
        /not a valid regular expression/,
      );
    });
  });

  suite("matchLanguageCodeInFileName", () => {
    test("splits the file name around the language group", () => {
      assert.deepStrictEqual(
        matchLanguageCodeInFileName(
          "emails.en.json",
          "^emails\\.(?<language>[\\w-]+)\\.json$",
        ),
        { language: "en", prefix: "emails.", suffix: ".json" },
      );
    });

    test("supports patterns matching part of the file name", () => {
      assert.deepStrictEqual(
        matchLanguageCodeInFileName("ui.en.strings.json", "(?<language>en)"),
        { language: "en", prefix: "ui.", suffix: ".strings.json" },
      );
    });

    test("matches codes the built-in detection rejects", () => {
      assert.deepStrictEqual(
        matchLanguageCodeInFileName(
          "strings.min.json",
          "^strings\\.(?<language>[\\w-]+)\\.json$",
        ),
        { language: "min", prefix: "strings.", suffix: ".json" },
      );
    });

    test("returns null when the pattern does not match", () => {
      assert.strictEqual(
        matchLanguageCodeInFileName(
          "common.en.json",
          "^emails\\.(?<language>[\\w-]+)\\.json$",
        ),
        null,
      );
    });
  });

  suite("formatLanguageFileNamePattern", () => {
    test("renders a readable pattern", () => {
      assert.strictEqual(
        formatLanguageFileNamePattern({
          language: "en",
          prefix: "emails.",
          suffix: ".json",
        }),
        "emails.{language}.json",
      );
    });
  });

  suite("known code sets", () => {
    test("recognizes language subtags", () => {
      for (const code of ["en", "EN", "zh", "fil", "yue", "spa"]) {
        assert.strictEqual(isKnownLanguageSubtag(code), true, code);
      }
      for (const code of ["min", "ios", "new", "map", "set", "dev", "e", "abcd"]) {
        assert.strictEqual(isKnownLanguageSubtag(code), false, code);
      }
    });

    test("recognizes script subtags", () => {
      assert.strictEqual(isKnownScriptSubtag("Latn"), true);
      assert.strictEqual(isKnownScriptSubtag("hans"), true);
      assert.strictEqual(isKnownScriptSubtag("docs"), false);
    });

    test("recognizes region subtags", () => {
      assert.strictEqual(isKnownRegionSubtag("US"), true);
      assert.strictEqual(isKnownRegionSubtag("br"), true);
      assert.strictEqual(isKnownRegionSubtag("419"), true);
      assert.strictEqual(isKnownRegionSubtag("QQ"), false);
    });

    test("validates complete locales", () => {
      for (const code of [
        "en",
        "en-US",
        "en_us",
        "zh-Hans",
        "zh-Hans-CN",
        "en-001",
      ]) {
        assert.strictEqual(isKnownLocale(code), true, code);
      }
      for (const code of [
        "min",
        "en-Xyzw",
        "en-QQ",
        "en-US-Latn",
        "en-Latn-US-extra",
      ]) {
        assert.strictEqual(isKnownLocale(code), false, code);
      }
    });
  });

  suite("LANGUAGE_CODE_REGEX", () => {
    test("is stateless across calls", () => {
      assert.strictEqual(LANGUAGE_CODE_REGEX.test("en"), true);
      assert.strictEqual(LANGUAGE_CODE_REGEX.test("en"), true);
    });
  });
});
