# Example Usage

This directory contains example code demonstrating how to use ai-l10n.

## TypeScript Examples

### Basic Usage

```bash
ts-node examples/basic-usage.ts
```

### Advanced Configuration

```bash
ts-node examples/advanced-usage.ts
```

### Update Existing Translations

```bash
ts-node examples/update-existing.ts
```

### Flutter ARB Files

```bash
ts-node examples/flutter-arb.ts
```

### Batch Translation

```bash
ts-node examples/batch-translate.ts
```

## CLI Examples

### Single File with Config

```bash
npx ai-l10n batch examples/translate-config.json
```

### Multiple Files

```bash
npx ai-l10n batch examples/translate-config-multi.json
```

## Configuration Files

- `translate-config.json` - Simple single file translation, plus an entry using a custom `languageCodeRegex`
- `translate-config-multi.json` - Multiple files with different settings

### Custom file name patterns

Language codes embedded in file names (`emails.en.json`, `emails-en.json`, `en-US.common.json`,
`messages_en_US.properties`) are detected automatically. When a naming convention is not
recognized, describe it with `languageCodeRegex` — a regex containing a `(?<language>...)`
group that marks the language code in the file name:

```json
{
  "sourceFile": "./test-data/emails.en.json",
  "targetLanguages": ["es", "ru-RU"],
  "languageCodeRegex": "^emails\\.(?<language>[\\w-]+)\\.json$"
}
```

The text before and after the group is reused for the target files, so this writes
`emails.es.json` and `emails.ru-RU.json`. The same pattern is available on the CLI as
`--language-regex`.

## Running Examples

1. Install dependencies:
   ```bash
   npm install
   npm install -g ts-node
   ```

2. Set your API key:
   ```bash
   export L10N_API_KEY=your_api_key_here
   # or
   npx ai-l10n config --api-key YOUR_API_KEY
   ```

3. Run any example:
   ```bash
   ts-node examples/basic-usage.ts
   ```
