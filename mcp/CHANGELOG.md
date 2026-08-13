# Changelog

## [1.2.0] - 2026-08-13

### Added
- `l10n_detect_project_structure` recognizes projects whose file names contain the language
  code next to other parts (`locales/emails.en.json`, `locales/en-US.common.json`,
  `messages_en_US.properties`). These are reported as `file-based` together with the detected
  file name pattern (e.g. `emails.{language}.json`); they previously came back as `unknown`
  with no target languages.
- Both `l10n_detect_project_structure` and `l10n_translate_file` accept a
  `languageCodeRegex` input — a regex with a `(?<language>...)` group describing how file
  names embed the language code — for conventions that are not detected automatically.
- `l10n_setup_automation` adds `languageCodeRegex` to the generated `ai-l10n.config.json`
  when the detected project needs it.

### Changed
- Structure types now come from the SDK instead of being re-derived in the tool. The reported
  values are unchanged (`folder-based`, `file-based`, `unknown`), but they are now consistent
  with the paths the SDK actually generates.
- Updated SDK dependency to `ai-l10n-sdk` ^1.12.0.

## [1.1.2] - 2026-07-13
- Updated server.json

## [1.1.1] - 2026-07-11
- Added mcpName for publishing to the MCP registry
- Updated SDK dependency to pass client identification

## [1.1.0] - 2026-07-06

### Added
- `l10n_setup_automation` MCP Prompt — scans the project for i18n source files, asks GitHub Actions or npm scripts, guides trigger selection (push/PR/schedule/manual), and writes `ai-l10n.config.json` plus the workflow YAML or `package.json` scripts
- `l10n_detect_project_structure` tool — wraps `I18nProjectManager` from the SDK; given a source file path returns structure type (folder-based / file-based), source language, detected target languages, and resolved target file paths with existence flags
- Updated `l10n_setup_automation` prompt — now calls `l10n_detect_project_structure` for accurate project scanning, and adds linguistic instruction, glossary, and balance checks (matching `l10n_project_setup`) before writing automation files

## [1.0.0] - 2026-07-06

### Added
- Initial release of `ai-l10n-mcp` — local stdio MCP server for l10n.dev
- `l10n_translate_file` tool with proactive quality hints for instructions, glossary, incremental update, balance, and API key issues
- `l10n_list_instructions`, `l10n_create_instruction`, `l10n_update_instruction`, `l10n_delete_instruction` tools
- `l10n_list_glossaries`, `l10n_get_glossary`, `l10n_create_glossary`, `l10n_update_glossary`, `l10n_delete_glossary` tools
- `l10n_add_glossary_entry`, `l10n_delete_glossary_entry` tools
- `l10n_get_balance` tool for checking remaining character balance
- `l10n_set_api_key` and `l10n_get_api_key_status` tools for API key management
- `l10n_project_setup` MCP Prompt for guided project configuration
- `McpLogger` that buffers SDK log output for inclusion in tool responses (avoids corrupting stdio MCP wire format)
- Structured content on all tool responses for AI reasoning
- Support for Claude Desktop, Cursor, Windsurf, GitHub Copilot, and Claude Code
