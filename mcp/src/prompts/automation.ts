import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const AutomationArgsSchema = {
  sourceLanguage: z
    .string()
    .optional()
    .describe("Source language code e.g. 'en'. Default: en"),
  targetLanguages: z
    .string()
    .optional()
    .describe("Comma-separated target language codes e.g. 'es,fr,de'"),
};

export function registerAutomationPrompt(server: McpServer): void {
  server.registerPrompt(
    "l10n_setup_automation",
    {
      title: "Set up automatic localization for this project",
      description:
        "Scan the project for i18n source files, then interactively configure fully automated " +
        "translation via GitHub Actions or npm scripts. Writes ai-l10n.config.json and the " +
        "workflow/script files. Run when a user wants to automate their localization workflow.",
      argsSchema: AutomationArgsSchema,
    },
    (args) => {
      const sourceLanguage = args.sourceLanguage ?? "en";
      const targetLanguagesLine = args.targetLanguages
        ? `\nPreferred target languages: ${args.targetLanguages}`
        : "";

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Help me set up **automatic localization** for my project using ai-l10n.
Reference docs: https://www.npmjs.com/package/ai-l10n

Source language: ${sourceLanguage}${targetLanguagesLine}

---

## Step 1 — Detect project structure

Scan the project for i18n source files. Common patterns to look for:
- \`locales/en.json\`, \`locales/en-US.json\` (flat file-based)
- \`locales/en/common.json\`, \`locales/en/messages.json\` (folder-based)
- \`app_en.arb\` (Flutter ARB)
- \`*.po\`, \`*.xliff\`, \`*.yaml\` files with language-code naming
- \`ai-l10n.config.json\` if it already exists (read it to find the declared source files)

For each candidate source file found, call \`l10n_detect_project_structure\` and collect:
- Structure type, source language code, and detected target languages
- Which target files already exist on disk

If no source files can be found, ask me which file to use before continuing.
If target languages are not detected, ask me for them.

Show a brief summary of what was found before continuing.

---

## Step 2 — Translation quality setup

Before configuring automation, check that quality settings are in place for the detected language pairs.

1. Call \`l10n_list_instructions\` to check for linguistic instructions.
   - If none exist: ask me what tone and style my app uses (e.g. "formal", "casual, it's a food app"),
     then call \`l10n_create_instruction\` to save it.
   - If some exist: show them and ask if they still apply.

2. Call \`l10n_list_glossaries\` to check for saved glossaries.
   - If none exist: explain that glossaries ensure key terms translate consistently across all runs.
     Recommend adding \`"generateGlossary": true\` to the config entries for the first run,
     so a glossary is built automatically from the translated content.
   - If some exist: show them.

3. Call \`l10n_get_balance\` and show the remaining character balance.
   If balance is below 10,000 characters, flag it now so I can top up before automation goes live.

---

## Step 3 — Choose automation method

After completing the quality setup, ask me exactly this question and wait for my answer before continuing:

> **How would you like to automate translations?**
>
> **A)** GitHub Actions — runs automatically in CI/CD on your repository
> **B)** npm scripts — add \`npm run translate\` to run locally or in any CI

---

## Step 4a — GitHub Actions path

If I chose **A (GitHub Actions)**:

First ask me exactly this question and wait for my answer before continuing:

> **How should translation run automatically?**
>
> **A)** On every push to \`main\` — translate and commit back directly
> **B)** On pull requests — translate and open a PR for review before merging
> **C)** On a schedule — translate nightly or on a cron schedule
> **D)** Manual trigger only — run on demand via \`workflow_dispatch\`

After I answer, do all of the following:

### 4a-1. Create \`ai-l10n.config.json\` in the project root

Use the source files detected in Step 1. Example structure:
\`\`\`json
[
  {
    "sourceFile": "./locales/en/common.json",
    "targetLanguages": ["es", "fr", "de"],
    "translateOnlyNewStrings": true
  }
]
\`\`\`
- Include all detected source files.
- Use auto-detected (or user-specified) target languages.
- Always set \`"translateOnlyNewStrings": true\` for incremental updates.
- If the quality setup in Step 2 saved a new linguistic instruction, add \`"instruction": "<text>"\` to each entry.
- If no glossary existed and you recommended generating one, add \`"generateGlossary": true\` to each entry.
- If \`ai-l10n.config.json\` already exists, update it only if source files or languages differ.

### 4a-2. Create \`\.github/workflows/translate\.yml\`

**Option A — push to main, direct commit:**
\`\`\`yaml
name: Auto-translate i18n files

on:
  push:
    branches:
      - main
      - master
    paths:
      - '<source-file-paths>'
      - 'ai-l10n.config.json'

permissions:
  contents: write

jobs:
  translate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: l10n-dev/ai-l10n@v1
        with:
          api-key: \${{ secrets.L10N_API_KEY }}
          config-file: 'ai-l10n.config.json'
          pull-request: false
          commit-message: 'chore: update translations'
          process-own-commits: false
\`\`\`

**Option B — push to main, open PR:**
Same as A but add \`pull-requests: write\` permission and set \`pull-request: true\`.

**Option C — scheduled:**
Replace the \`on:\` block with a schedule trigger. Ask me for the preferred time if not obvious.
Example (nightly at 02:00 UTC):
\`\`\`yaml
on:
  schedule:
    - cron: '0 2 * * *'
\`\`\`
Use \`pull-request: false\` and direct commit by default for scheduled runs.

**Option D — manual dispatch:**
\`\`\`yaml
on:
  workflow_dispatch:
    inputs:
      config-file:
        description: 'Translation config file'
        required: false
        default: 'ai-l10n.config.json'
      pull-request:
        description: 'Create pull request'
        required: false
        default: 'true'
        type: choice
        options: ['true', 'false']
\`\`\`
Include \`pull-requests: write\` permission. Use \`\${{ github.event.inputs.config-file }}\` and
\`\${{ github.event.inputs.pull-request }}\` in the action inputs.

Always substitute the real detected source file paths into the \`paths:\` filter.
Always include \`process-own-commits: false\` to prevent infinite loops.

### 4a-3. Tell me what to do next

After writing the files, tell me:

1. **Add the API key to GitHub:**
   - Go to your repository → **Settings → Secrets and variables → Actions → New repository secret**
   - Name: \`L10N_API_KEY\`
   - Value: your key from https://l10n.dev/ws/api-keys

2. **What happens on the next trigger** (tailor to the chosen option):
   - A: "Next push to \`main\` that changes a source file will automatically translate and commit."
   - B: "Next push to \`main\` will open a PR with updated translations for your review."
   - C: "The workflow will run on schedule. You can also trigger it manually from the Actions tab."
   - D: "Go to Actions → Auto-translate → Run workflow to translate on demand."

3. **Optional one-time run:** "You can translate right now with: \`npx ai-l10n batch ai-l10n.config.json\`"

---

## Step 4b — npm scripts path

If I chose **B (npm scripts)**:

### 4b-1. Create \`ai-l10n.config.json\` in the project root

Same structure as 4a-1. Skip if it already exists and is up to date.

### 4b-2. Add scripts to \`package\.json\`

Add the following entries to the \`scripts\` section (merge with existing scripts, do not remove others):
\`\`\`json
{
  "scripts": {
    "translate": "ai-l10n batch ai-l10n.config.json",
    "translate:update": "ai-l10n batch ai-l10n.config.json"
  }
}
\`\`\`
Note: both scripts use the same command because \`translateOnlyNewStrings: true\` is already in the
config. Keep \`translate:update\` as a clear alias for incremental-only runs.

### 4b-3. Tell me what to do next

1. **Set your API key once:**
   \`npx ai-l10n config --api-key YOUR_KEY\`
   Get your key at: https://l10n.dev/ws/api-keys

2. **Run translations:**
   \`npm run translate\`

3. **For CI/CD integration** (optional): set the \`L10N_API_KEY\` environment variable in your pipeline
   and add \`npm run translate\` as a build step.

---

## Final summary

After completing all steps, provide a concise summary:
- Which files will be translated and to which languages
- How and when translation will be triggered
- Any remaining manual steps (API key setup, GitHub settings for PRs)
`,
            },
          },
        ],
      };
    },
  );
}
