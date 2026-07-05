# ai-l10n-mcp

[![npm version](https://img.shields.io/npm/v/ai-l10n-mcp.svg)](https://www.npmjs.com/package/ai-l10n-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

MCP server that gives AI agents access to l10n.dev — a **professional [localization service](https://l10n.dev)** purpose-built for software i18n files.

When an AI agent needs to translate your app, the naive approach is to paste file contents into the chat. That breaks down fast: localization files are large, formats are strict, placeholders must survive verbatim, glossaries drift across sessions, and the agent has no memory between runs. **This MCP replaces that fragile workflow** with a dedicated localization engine that the agent calls as a tool — getting professional-grade output without wasting context window on raw file contents.

> **Think of it as giving your AI agent a professional localization co-pilot:** the agent handles intent and orchestration; l10n.dev handles the actual translation with accuracy, consistency, and format guarantees.

---

## Why use this instead of asking your AI agent directly?

| | AI agent alone | ai-l10n-mcp |
|---|---|---|
| **165 language support** | Varies, often limited | ✅ Full coverage |
| **Large file handling** | Truncates or skips | ✅ Handled entirely server-side |
| **Format preservation** | Fragile — breaks placeholders, keys, structure | ✅ Guaranteed — source format validated after translation |
| **Glossary consistency** | Lost between sessions and file chunks | ✅ Persisted glossary applied across all files and chunks |
| **Post-editing required?** | Usually yes | ✅ No — output is production-ready |
| **Token cost** | High — raw file in context | ✅ Low — only metadata returned |
| **Incremental updates** | Full reading and retranslation every time | ✅ Only new/changed strings |

---

## Features

- **165 Languages** — translate to the full range of world languages in one call
- **Format guaranteed** — JSON, JSONC, Flutter ARB, YAML, PO (gettext), XLIFF, MD and all text-based i18n formats; placeholders, keys, and structure preserved and validated after translation
- **Auto-detect** target languages from project structure
- **Persistent glossary** — generate a glossary from your content, save it, and have it applied automatically across every subsequent file and chunk for consistent terminology
- **Linguistic instructions** — save style/tone rules per language pair (e.g. "Use formal tone")
- **Incremental translation** — hash-based change detection skips strings already translated, saving quota and protecting existing translations
- **Proactive quality control** — checks instructions and glossary for each language pair before translating, not after

Connect Claude Desktop, Cursor, Windsurf, GitHub Copilot, OpenAI Codex, or any MCP-compatible agent directly to l10n.dev's translation engine.

---

## Installation & Configuration

### Getting an API key

Create a free account and get your API key at **https://l10n.dev/ws/api-keys**

### Claude Desktop

In Claude Desktop, open **Settings > Developer > Edit Config**. Claude Desktop will open the correct MCP config file for your install. On macOS this is typically `~/Library/Application Support/Claude/claude_desktop_config.json`. On Windows, the backing path can vary by installation, so prefer **Edit Config** instead of navigating manually. Add:

```json
{
  "mcpServers": {
    "l10n": {
      "command": "npx",
      "args": ["-y", "ai-l10n-mcp"],
      "env": {
        "L10N_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Cursor

Open **Customize** in Cursor to add and manage MCP servers. For a file-based setup, create one of these configs:

- `~/.cursor/mcp.json` for a user-wide setup
- `.cursor/mcp.json` in your project for a workspace-specific setup

Add:

```json
{
  "mcpServers": {
    "l10n": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "ai-l10n-mcp"],
      "env": {
        "L10N_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Windsurf

In Windsurf, open the **MCPs** panel in Cascade, or go to **Devin Settings > Cascade > MCP Servers**. If you need to add it manually, edit `~/.codeium/windsurf/mcp_config.json` and add:

```json
{
  "mcpServers": {
    "l10n": {
      "command": "npx",
      "args": ["-y", "ai-l10n-mcp"],
      "env": {
        "L10N_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### GitHub Copilot (VS Code)

Open the Command Palette and select MCP: Open User Configuration. Alternatively, create a `.vscode/mcp.json` file in your workspace or user settings. Add:

```json
{
  "servers": {
    "l10n": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "ai-l10n-mcp"],
      "env": {
        "L10N_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### OpenAI Codex (CLI and IDE)

Add to `~/.codex/config.toml` for a user-wide setup, or `.codex/config.toml` in a trusted project:

```toml
[mcp_servers.l10n]
command = "npx"
args = ["-y", "ai-l10n-mcp"]

[mcp_servers.l10n.env]
L10N_API_KEY = "your-api-key-here"
```

You can also add it from the terminal:

```bash
codex mcp add l10n --env L10N_API_KEY=your-api-key-here -- npx -y ai-l10n-mcp
```

### Claude Code (CLI and VS Code extension)

Add the server from the terminal:

```bash
claude mcp add --env L10N_API_KEY=your-api-key-here --transport stdio l10n -- npx -y ai-l10n-mcp
```

For a shared project setup, Claude Code can also store MCP servers in a `.mcp.json` file at your project root.

> **Tip:** Instead of setting `L10N_API_KEY` in each config, you can ask the AI to store your key with `l10n_set_api_key`. The key is saved to `~/.ai-l10n/config.json` and used automatically.

---

## Available Tools

### Translation
| Tool | Description |
|------|-------------|
| `l10n_translate_file` | Translate an i18n source file to one or more target languages |

### Linguistic Instructions
| Tool | Description |
|------|-------------|
| `l10n_list_instructions` | List all saved linguistic instructions (tone, style, brand voice) |
| `l10n_create_instruction` | Create a new instruction for a language pair |
| `l10n_update_instruction` | Update an existing instruction |
| `l10n_delete_instruction` | Delete an instruction |

### Glossary
| Tool | Description |
|------|-------------|
| `l10n_list_glossaries` | List all saved glossaries |
| `l10n_get_glossary` | Get full details and entries of a specific glossary |
| `l10n_create_glossary` | Create a new empty glossary |
| `l10n_update_glossary` | Update glossary name or active status |
| `l10n_delete_glossary` | Permanently delete a glossary |
| `l10n_add_glossary_entry` | Add a term mapping to a glossary |
| `l10n_delete_glossary_entry` | Remove a term mapping from a glossary |

### Account
| Tool | Description |
|------|-------------|
| `l10n_get_balance` | Check remaining character balance |
| `l10n_set_api_key` | Store an API key locally for automatic use |
| `l10n_get_api_key_status` | Check whether an API key is configured |

---

## Available Prompts

### `l10n_project_setup`

Guides through checking and configuring linguistic instructions and glossaries for optimal translation quality. Invoke it at the start of a new project or when reviewing l10n.dev settings.

**Arguments:**
- `sourceLanguage` — source language code (default: `en`)
- `targetLanguages` — comma-separated target language codes (e.g. `es,fr,de`)

---

## Example Workflow

**User:** "Translate my app to Spanish and French"

**Claude (with this MCP server) will:**
1. Call `l10n_list_instructions` — finds no instruction for `es`/`fr` language pairs
2. Ask: *"No instruction found for Spanish/French — would you like to set a tone/style rule before translating? (e.g. formal, casual, keep brand terms untranslated)"*
3. User says: *"Tone should be informal, it's for a food app in Latin America"*
4. Call `l10n_create_instruction` with the style rule
5. Call `l10n_list_glossaries` — finds no active glossary for `es`/`fr`
6. Ask: *"No glossary found for Spanish/French — enable glossary generation for this run? It saves key terms for consistent future translations."*
7. User says: *"Yes"*
8. Detect that `es.json` and `fr.json` already exist — ask: *"Target files already exist — enable incremental mode to skip unchanged strings and save quota?"*
9. User says: *"Yes"*
10. Call `l10n_translate_file` with `sourceFile`, `targetLanguages: ["es", "fr"]`, `instruction`, `generateGlossary: true`, `translateOnlyNewStrings: true`
11. Report results

---

## Incremental Translation

For JSON-based formats, enable `translateOnlyNewStrings: true` to skip strings that are already translated. A hash of each source string (not content itself) is stored on the l10n.dev server for change detection — only added or changed strings are translating, saving your character quota.

> **Note:** First translation it translates only added strings, because hash table is empty to detect changed strings.

---

## Automation: CLI and GitHub Actions

For CI/CD automation and command-line usage, see:
- **[ai-l10n CLI](https://www.npmjs.com/package/ai-l10n)** — translate files from the terminal or CI pipelines
- **[GitHub Action](https://github.com/marketplace/actions/ai-l10n)** — auto-translate on push, PR, or manual trigger

---

## Pricing

- **Free tier** — 10,000 characters free every month, no credit card required.
- **Pay-as-you-go** — Affordable character-based pricing with no subscription required.
- **Current packages** — Visit [l10n.dev/#pricing](https://l10n.dev/#pricing) for up-to-date pricing.

---

## Privacy & Security

- **No data retention** — Source text and translations are not stored on l10n.dev servers beyond the time needed to process the request.
- **Encrypted communication** — All API calls use HTTPS.
- **Privacy first** — Built by developers for developers, with privacy, reliability, and quality as core priorities.

---

## Support

| | |
|---|---|
| 📧 Email | [support@l10n.dev](mailto:support@l10n.dev) |
| 🐛 Issues | [GitHub Issues](https://github.com/l10n-dev/ai-l10n/issues) |
| 📚 API Docs | [api.l10n.dev/doc](https://api.l10n.dev/doc) |
| 🌐 Website | [l10n](https://l10n.dev).dev |

---

## License

MIT
