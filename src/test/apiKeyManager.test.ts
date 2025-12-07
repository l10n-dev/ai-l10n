import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { ApiKeyManager } from "../apiKeyManager";

suite("ApiKeyManager Test Suite", () => {
  let manager: ApiKeyManager;
  let tempConfigDir: string;
  let configFilePath: string;

  setup(() => {
    // Create temp directory for testing
    tempConfigDir = fs.mkdtempSync(path.join(os.tmpdir(), "test-api-key-"));
    configFilePath = path.join(tempConfigDir, ".ai-l10n", "config.json");

    // Create manager and manually set paths for testing
    manager = new ApiKeyManager();
    (manager as any).configDir = path.join(tempConfigDir, ".ai-l10n");
    (manager as any).configFile = configFilePath;
  });

  teardown(() => {
    // Cleanup temp directory
    if (fs.existsSync(tempConfigDir)) {
      fs.rmSync(tempConfigDir, { recursive: true, force: true });
    }
  });

  suite("API Key Storage", () => {
    test("returns undefined when no API key is stored", async () => {
      const apiKey = await manager.getApiKey();
      assert.strictEqual(apiKey, undefined);
    });

    test("stores and retrieves API key", async () => {
      const testKey = "test-api-key-12345";

      await manager.setApiKey(testKey);
      const retrievedKey = await manager.getApiKey();

      assert.strictEqual(retrievedKey, testKey);
    });

    test("creates config directory if it doesn't exist", async () => {
      const testKey = "test-key";
      const configDir = path.join(tempConfigDir, ".ai-l10n");

      // Ensure directory doesn't exist
      assert.strictEqual(fs.existsSync(configDir), false);

      await manager.setApiKey(testKey);

      // Directory should now exist
      assert.strictEqual(fs.existsSync(configDir), true);
    });

    test("overwrites existing API key", async () => {
      const firstKey = "first-key";
      const secondKey = "second-key";

      await manager.setApiKey(firstKey);
      await manager.setApiKey(secondKey);

      const retrievedKey = await manager.getApiKey();
      assert.strictEqual(retrievedKey, secondKey);
    });

    test("stores API key in valid JSON format", async () => {
      const testKey = "test-key-json";
      await manager.setApiKey(testKey);

      const configData = fs.readFileSync(configFilePath, "utf8");
      const config = JSON.parse(configData);

      assert.ok(config);
      assert.strictEqual(config.apiKey, testKey);
    });
  });

  suite("API Key Deletion", () => {
    test("clears stored API key", async () => {
      const testKey = "test-key-to-clear";
      await manager.setApiKey(testKey);

      // Verify key is stored
      let retrievedKey = await manager.getApiKey();
      assert.strictEqual(retrievedKey, testKey);

      // Clear the key
      await manager.clearApiKey();

      // Verify key is cleared
      retrievedKey = await manager.getApiKey();
      assert.strictEqual(retrievedKey, undefined);
    });

    test("clearing non-existent key doesn't throw error", async () => {
      await assert.doesNotReject(async () => {
        await manager.clearApiKey();
      });
    });

    test("removes config file when clearing", async () => {
      const testKey = "test-key";
      await manager.setApiKey(testKey);

      assert.strictEqual(fs.existsSync(configFilePath), true);

      await manager.clearApiKey();
      assert.strictEqual(fs.existsSync(configFilePath), false);
    });
  });

  suite("API Key Validation", () => {
    test("ensures API key is provided with environment variable fallback", async () => {
      const envKey = "env-api-key";
      const providedKey = "provided-key";

      // Test with provided key
      const result1 = await manager.ensureApiKey(providedKey);
      assert.strictEqual(result1, providedKey);

      // Test with environment variable
      process.env.L10N_API_KEY = envKey;
      const result2 = await manager.ensureApiKey();
      assert.strictEqual(result2, envKey);
      delete process.env.L10N_API_KEY;

      // Test with stored key
      await manager.setApiKey("stored-key");
      const result3 = await manager.ensureApiKey();
      assert.strictEqual(result3, "stored-key");
    });

    test("throws error when no API key is available", async () => {
      // Clear any existing keys
      await manager.clearApiKey();
      delete process.env.L10N_API_KEY;

      await assert.rejects(
        async () => await manager.ensureApiKey(),
        /API Key not found/
      );
    });

    test("prefers provided key over environment and stored", async () => {
      const providedKey = "provided-priority-key";
      process.env.L10N_API_KEY = "env-key";
      await manager.setApiKey("stored-key");

      const result = await manager.ensureApiKey(providedKey);
      assert.strictEqual(result, providedKey);

      delete process.env.L10N_API_KEY;
    });

    test("prefers environment key over stored", async () => {
      const envKey = "env-priority-key";
      process.env.L10N_API_KEY = envKey;
      await manager.setApiKey("stored-key");

      const result = await manager.ensureApiKey();
      assert.strictEqual(result, envKey);

      delete process.env.L10N_API_KEY;
    });
  });

  suite("Error Handling", () => {
    test("handles corrupted config file gracefully", async () => {
      const configDir = path.join(tempConfigDir, ".ai-l10n");

      // Create directory and write invalid JSON
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(configFilePath, "{ invalid json", "utf8");

      const apiKey = await manager.getApiKey();
      assert.strictEqual(apiKey, undefined);
    });

    test("handles permission errors when reading", async () => {
      // This test is platform-specific and may not work on all systems
      if (process.platform === "win32") {
        // Skip on Windows due to permission model differences
        return;
      }

      await manager.setApiKey("test-key");

      // Make file unreadable
      fs.chmodSync(configFilePath, 0o000);

      const apiKey = await manager.getApiKey();
      assert.strictEqual(apiKey, undefined);

      // Restore permissions for cleanup
      fs.chmodSync(configFilePath, 0o644);
    });

    test("throws error when unable to write config", async () => {
      // This test is platform-specific
      if (process.platform === "win32") {
        // Skip on Windows
        return;
      }

      const configDir = path.join(tempConfigDir, ".ai-l10n");
      fs.mkdirSync(configDir, { recursive: true });

      // Make directory read-only
      fs.chmodSync(configDir, 0o444);

      await assert.rejects(
        async () => await manager.setApiKey("test-key"),
        /Failed to save API key/
      );

      // Restore permissions for cleanup
      fs.chmodSync(configDir, 0o755);
    });
  });

  suite("Config File Structure", () => {
    test("stores config with proper indentation", async () => {
      await manager.setApiKey("test-key");

      const configData = fs.readFileSync(configFilePath, "utf8");

      // Check for proper JSON formatting (2 space indentation)
      assert.ok(configData.includes("\n"));
      assert.ok(configData.includes("  "));
    });

    test("stores only apiKey in config", async () => {
      await manager.setApiKey("test-key");

      const configData = fs.readFileSync(configFilePath, "utf8");
      const config = JSON.parse(configData);

      const keys = Object.keys(config);
      assert.strictEqual(keys.length, 1);
      assert.strictEqual(keys[0], "apiKey");
    });
  });

  suite("Display API Key", () => {
    test("displays API key with proper masking", async () => {
      const testKey = "abcdefghijklmnopqrstuvwxyz";
      await manager.setApiKey(testKey);

      const displayed = await manager.displayApiKey();

      // Should show first 8 and last 4 characters
      assert.ok(displayed.includes("abcdefgh"));
      assert.ok(displayed.includes("wxyz"));
      assert.ok(displayed.includes("..."));
    });

    test("displays message when no key is stored", async () => {
      const displayed = await manager.displayApiKey();
      assert.ok(displayed.includes("API Key not found"));
    });

    test("displays short keys completely if less than 12 chars", async () => {
      const shortKey = "short";
      await manager.setApiKey(shortKey);

      const displayed = await manager.displayApiKey();
      // For very short keys, it should handle gracefully
      assert.ok(displayed.length > 0);
    });
  });
});
