import * as path from "path";
import * as fs from "fs";
import {
  ILogger,
  ConsoleLogger,
  LANGUAGE_CODE_REGEX,
  extractLanguageCode,
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
}

export class I18nProjectManager {
  constructor(private readonly logger: ILogger = new ConsoleLogger()) {}

  detectLanguagesFromProject(sourceFilePath: string): string[] {
    const languageCodes = new Set<string>();

    // Detect the source language to exclude it
    const structureInfo = this.detectProjectStructure(sourceFilePath);
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
  ): string {
    const structureInfo = this.detectProjectStructure(sourceFilePath);
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
        if (isArbFile) {
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

  private detectProjectStructure(sourceFilePath: string): ProjectStructureInfo {
    // Check if the parent directory name is a language code (folder-based structure)
    const sourceDir = path.dirname(sourceFilePath);
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
}
