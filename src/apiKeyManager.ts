import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export class ApiKeyManager {
  private readonly configDir: string;
  private readonly configFile: string;

  constructor() {
    // Store API key in user's home directory
    this.configDir = path.join(os.homedir(), ".ai-l10n");
    this.configFile = path.join(this.configDir, "config.json");
  }

  async getApiKey(): Promise<string | undefined> {
    try {
      if (!fs.existsSync(this.configFile)) {
        return undefined;
      }

      const configData = fs.readFileSync(this.configFile, "utf8");
      const config = JSON.parse(configData);
      return config.apiKey;
    } catch (error) {
      console.warn("Failed to read API key from config:", error);
      return undefined;
    }
  }

  async setApiKey(apiKey: string): Promise<void> {
    try {
      // Create config directory if it doesn't exist
      if (!fs.existsSync(this.configDir)) {
        fs.mkdirSync(this.configDir, { recursive: true });
      }

      const config = { apiKey };
      fs.writeFileSync(
        this.configFile,
        JSON.stringify(config, null, 2),
        "utf8"
      );
      console.log("✅ API Key saved successfully!");
    } catch (error) {
      throw new Error(
        `Failed to save API key: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async ensureApiKey(providedApiKey?: string): Promise<string> {
    // First, check if API key was provided as parameter
    if (providedApiKey) {
      return providedApiKey;
    }

    // Check environment variable
    const envApiKey = process.env.L10N_API_KEY;
    if (envApiKey) {
      return envApiKey;
    }

    // Check stored config
    const storedApiKey = await this.getApiKey();
    if (storedApiKey) {
      return storedApiKey;
    }

    throw new Error(
      "API Key not found. Please provide it via:\n" +
        "1. Configuration option (apiKey)\n" +
        "2. Environment variable (L10N_API_KEY)\n" +
        "3. Run 'ai-l10n config --api-key YOUR_KEY' to save it\n" +
        "Get your API key from https://l10n.dev/ws/keys"
    );
  }

  async clearApiKey(): Promise<void> {
    try {
      if (fs.existsSync(this.configFile)) {
        fs.unlinkSync(this.configFile);
        console.log("✅ API Key cleared successfully!");
      } else {
        console.log("ℹ️ No API Key found to clear.");
      }
    } catch (error) {
      throw new Error(
        `Failed to clear API key: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}
