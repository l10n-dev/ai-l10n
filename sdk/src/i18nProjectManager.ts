import * as path from "path";
import * as fs from "fs";
import {
  ILogger,
  ConsoleLogger,
  LANGUAGE_CODE_REGEX,
  LanguageFileNameMatch,
  buildLanguageFileNameRegex,
  extractLanguageCode,
  findLanguageCodeCandidatesInFileName,
  isKnownLocale,
  matchLanguageCodeInFileName,
} from "ai-l10n-core";

enum ProjectStructureType {
  FolderBased = "folder",
  FileBased = "file",
  Unknown = "unknown",
}

interface ProjectStructureInfo {
  type: ProjectStructureType;
  basePath: string;
  sourceLanguage?: string;
  /**
   * How the language code is embedded in the source file name, for file-based structures
   * where the name holds more than the code itself (e.g. `emails.en.json`).
   * Used to match sibling files and to build target file names.
   */
  fileNameMatch?: LanguageFileNameMatch;
}

/**
 * Options controlling how language codes are detected in a project.
 */
export interface LanguageDetectionOptions {
  /**
   * Regex used to locate the language code in file names, overriding the built-in
   * detection. Must contain a `(?<language>...)` named capture group, for example
   * `^emails\.(?<language>[\w-]+)\.json$`.
   * The text before and after the group is used to match sibling files and to build
   * target file names.
   */
  languageCodeRegex?: string | RegExp;
}

export class I18nProjectManager {
  constructor(
    private readonly logger: ILogger = new ConsoleLogger(),
    private readonly detectionOptions: LanguageDetectionOptions = {},
  ) {}

  detectLanguagesFromProject(
    sourceFilePath: string,
    options?: LanguageDetectionOptions,
  ): string[] {
    const languageCodes = new Set<string>();

    // Detect the source language to exclude it
    const structureInfo = this.detectProjectStructure(sourceFilePath, options);
    const sourceLanguage = structureInfo.sourceLanguage;

    // Start scanning from the appropriate directory
    if (structureInfo.type === ProjectStructureType.FolderBased) {
      // For folder-based, scan the base path for language directories
      try {
        const entries = fs.readdirSync(structureInfo.basePath, {
          withFileTypes: true,
        });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            if (LANGUAGE_CODE_REGEX.test(entry.name)) {
              languageCodes.add(entry.name);
            }
          }
        }
      } catch (error) {
        this.logger.logWarning(
          "Error scanning for language directories:",
          error,
        );
      }
    } else if (
      structureInfo.type === ProjectStructureType.FileBased &&
      structureInfo.fileNameMatch
    ) {
      // The file name holds more than the language code, so scan the base path for files
      // following the same naming pattern (e.g. emails.en.json -> emails.<language>.json)
      const siblingRegex = buildLanguageFileNameRegex(
        structureInfo.fileNameMatch,
      );
      try {
        const entries = fs.readdirSync(structureInfo.basePath, {
          withFileTypes: true,
        });
        for (const entry of entries) {
          if (entry.isFile()) {
            const languageCode = siblingRegex.exec(entry.name)?.groups
              ?.language;
            if (languageCode) {
              languageCodes.add(languageCode);
            }
          }
        }
      } catch (error) {
        this.logger.logWarning("Error scanning for language files:", error);
      }
    } else if (structureInfo.type === ProjectStructureType.FileBased) {
      // For file-based, scan the base path for language files
      const fileExtension = path.extname(sourceFilePath);
      const fileExtensions =
        fileExtension === ".json" || fileExtension === ".jsonc"
          ? [".json", ".jsonc"]
          : fileExtension === ".yaml" || fileExtension === ".yml"
            ? [".yaml", ".yml"]
            : fileExtension === ".xliff" || fileExtension === ".xlf"
              ? [".xliff", ".xlf"]
              : fileExtension === ".po" || fileExtension === ".pot"
                ? [".po", ".pot"]
                : [fileExtension];
      try {
        const entries = fs.readdirSync(structureInfo.basePath, {
          withFileTypes: true,
        });
        for (const entry of entries) {
          if (entry.isFile()) {
            for (const ext of fileExtensions) {
              if (entry.name.endsWith(ext)) {
                const languageCode = extractLanguageCode(entry.name);
                if (languageCode) {
                  languageCodes.add(languageCode);
                }
                break;
              }
            }
          }
        }
      } catch (error) {
        this.logger.logWarning("Error scanning for language files:", error);
      }
    }

    // Remove source language from the set if it exists
    if (sourceLanguage) {
      languageCodes.delete(sourceLanguage);
    }

    // Return sorted list of unique language codes
    return Array.from(languageCodes).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
  }

  generateTargetFilePath(
    sourceFilePath: string,
    targetLanguage: string,
    options?: LanguageDetectionOptions,
  ): string {
    const structureInfo = this.detectProjectStructure(sourceFilePath, options);
    const fileExtension = path.extname(sourceFilePath);
    const sourceFileName = path.basename(sourceFilePath, fileExtension);
    const isArbFile = fileExtension === ".arb";
    const languageCode = isArbFile
      ? targetLanguage.replace(/-/g, "_")
      : targetLanguage;

    switch (structureInfo.type) {
      case ProjectStructureType.FolderBased: {
        // Create target language folder if it doesn't exist
        const targetDir = path.join(structureInfo.basePath, languageCode);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        // Use the same file name as source
        const targetFilePath = path.join(
          targetDir,
          `${sourceFileName}${fileExtension}`,
        );
        return targetFilePath;
      }

      case ProjectStructureType.FileBased: {
        const fileNameMatch = structureInfo.fileNameMatch;
        if (fileNameMatch) {
          // The file name holds more than the language code, so replace just the code
          // and keep everything else: emails.en.json -> emails.ru-RU.json,
          // en-US.common.json -> ja.common.json

          // Follow the separator style of the source file name
          // messages_en_US.properties -> messages_ru_RU.properties
          const targetCode = fileNameMatch.language.includes("_")
            ? languageCode.replace(/-/g, "_")
            : languageCode;

          const targetFilePath = path.join(
            structureInfo.basePath,
            `${fileNameMatch.prefix}${targetCode}${fileNameMatch.suffix}`,
          );
          return targetFilePath;
        } else if (isArbFile) {
          // For ARB files, extract prefix and append target language
          // app_en_US.arb -> app_es.arb
          const sourceLanguage = structureInfo.sourceLanguage;
          let prefix = "";

          if (sourceLanguage) {
            const langIndex = sourceFileName.indexOf(sourceLanguage);
            if (langIndex > 0) {
              prefix = sourceFileName.substring(0, langIndex);
            }
          }

          const targetFilePath = path.join(
            structureInfo.basePath,
            `${prefix}${languageCode}${fileExtension}`,
          );
          return targetFilePath;
        } else {
          // Handle Shopify theme pattern: en.default.schema.json -> es-ES.schema.json
          // Extract suffix (e.g., ".schema") if present
          const schemaMatch = sourceFileName.match(/\.(schema)$/);
          const suffix = schemaMatch ? `.${schemaMatch[1]}` : "";

          // Save in the same directory with target language as filename
          const targetFilePath = path.join(
            structureInfo.basePath,
            `${languageCode}${suffix}${fileExtension}`,
          );
          return targetFilePath;
        }
      }

      default: {
        // Unknown structure - fallback to current behavior
        const sourceDir = path.dirname(sourceFilePath);
        const targetFilePath = path.join(
          sourceDir,
          `${sourceFileName}.${languageCode}${fileExtension}`,
        );
        return targetFilePath;
      }
    }
  }

  /**
   * Extracts the source language code from the file path using project structure detection.
   * Returns the language code (e.g., `"en"`, `"en-US"`) or `null` if it cannot be determined.
   */
  extractLanguageCodeFromPath(
    sourceFilePath: string,
    options?: LanguageDetectionOptions,
  ): string | null {
    const structureInfo = this.detectProjectStructure(sourceFilePath, options);
    return structureInfo.sourceLanguage ?? null;
  }

  /**
   * Describes how the localization files of a project are organized.
   * Returns the structure type (`"folder"`, `"file"` or `"unknown"`), the directory
   * translations live in, the detected source language and, when the file name holds
   * more than the language code, how that code is embedded in the file name.
   */
  describeProjectStructure(
    sourceFilePath: string,
    options?: LanguageDetectionOptions,
  ): {
    type: string;
    basePath: string;
    sourceLanguage?: string;
    fileNameMatch?: LanguageFileNameMatch;
  } {
    return this.detectProjectStructure(sourceFilePath, options);
  }

  getUniqueFilePath(filePath: string): string {
    if (!fs.existsSync(filePath)) {
      return filePath;
    }

    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const baseName = path.basename(filePath, ext);

    let counter = 1;
    let uniquePath: string;

    do {
      uniquePath = path.join(dir, `${baseName} (${counter})${ext}`);
      counter++;
    } while (fs.existsSync(uniquePath));

    return uniquePath;
  }

  private detectProjectStructure(
    sourceFilePath: string,
    options?: LanguageDetectionOptions,
  ): ProjectStructureInfo {
    const sourceDir = path.dirname(sourceFilePath);
    const languageCodeRegex =
      options?.languageCodeRegex ?? this.detectionOptions.languageCodeRegex;

    // A custom regex is an explicit choice, so it takes precedence over detection
    if (languageCodeRegex) {
      const fileNameMatch = matchLanguageCodeInFileName(
        path.basename(sourceFilePath),
        languageCodeRegex,
      );
      if (fileNameMatch) {
        return {
          type: ProjectStructureType.FileBased,
          basePath: sourceDir,
          sourceLanguage: fileNameMatch.language,
          fileNameMatch,
        };
      }
      this.logger.logWarning(
        `The configured language code regex does not match the source file name: ${path.basename(
          sourceFilePath,
        )}. Falling back to automatic detection.`,
      );
    }

    // Check if the parent directory name is a language code (folder-based structure)
    const parentDirName = path.basename(sourceDir);
    if (LANGUAGE_CODE_REGEX.test(parentDirName)) {
      return {
        type: ProjectStructureType.FolderBased,
        basePath: path.dirname(sourceDir),
        sourceLanguage: parentDirName,
      };
    }

    // Check if the source file name is a language code (file-based structure)
    const sourceFileName = path.basename(sourceFilePath);
    const languageCode = extractLanguageCode(sourceFileName);

    // A structurally valid code can still be a coincidence: `app-en` parses as a
    // language with a region. When its subtags are not known codes, a language code
    // embedded in the file name (`app-en.json` -> `en`) is the better reading.
    const isCompleteLanguageCode =
      !!languageCode && isKnownLocale(languageCode);

    if (languageCode && isCompleteLanguageCode) {
      return {
        type: ProjectStructureType.FileBased,
        basePath: sourceDir,
        sourceLanguage: languageCode,
      };
    }

    // Last resort: the language code may be embedded in the file name next to other
    // parts (e.g. emails.en.json, emails-en.json, en-US.common.json)
    const fileNameMatch = this.findLanguageCodeInFileName(
      sourceDir,
      sourceFileName,
    );
    if (fileNameMatch) {
      return {
        type: ProjectStructureType.FileBased,
        basePath: sourceDir,
        sourceLanguage: fileNameMatch.language,
        fileNameMatch,
      };
    }

    // The whole file name is a language code of unknown subtags (e.g. `bal-PK.json`)
    if (languageCode) {
      return {
        type: ProjectStructureType.FileBased,
        basePath: sourceDir,
        sourceLanguage: languageCode,
      };
    }

    // Unknown structure
    return {
      type: ProjectStructureType.Unknown,
      basePath: sourceDir,
    };
  }

  /**
   * Picks the language code embedded in a file name.
   * When several candidates are possible, one whose naming pattern is shared with an
   * existing sibling file wins - those files are the strongest evidence that the
   * candidate really is the language code. Otherwise the highest ranked candidate is used.
   */
  private findLanguageCodeInFileName(
    sourceDir: string,
    sourceFileName: string,
  ): LanguageFileNameMatch | undefined {
    const candidates = findLanguageCodeCandidatesInFileName(sourceFileName);
    if (candidates.length === 0) {
      return undefined;
    }

    if (candidates.length > 1) {
      let siblings: string[] = [];
      try {
        siblings = fs
          .readdirSync(sourceDir, { withFileTypes: true })
          .filter((entry) => entry.isFile() && entry.name !== sourceFileName)
          .map((entry) => entry.name);
      } catch (error) {
        this.logger.logWarning("Error scanning for language files:", error);
      }

      const corroborated = candidates.find((candidate) => {
        const siblingRegex = buildLanguageFileNameRegex(candidate);
        return siblings.some((sibling) => siblingRegex.test(sibling));
      });
      if (corroborated) {
        return corroborated;
      }
    }

    return candidates[0];
  }
}
