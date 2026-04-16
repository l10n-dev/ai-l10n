import * as assert from "assert";
import * as sinon from "sinon";
import { ConsoleLogger } from "../consoleLogger";

suite("ConsoleLogger Test Suite", () => {
  let logger: ConsoleLogger;
  let consoleErrorStub: sinon.SinonStub;
  let consoleLogStub: sinon.SinonStub;
  let consoleWarnStub: sinon.SinonStub;

  setup(() => {
    logger = new ConsoleLogger();
    consoleErrorStub = sinon.stub(console, "error");
    consoleLogStub = sinon.stub(console, "log");
    consoleWarnStub = sinon.stub(console, "warn");
  });

  teardown(() => {
    sinon.restore();
  });

  suite("showAndLogError", () => {
    test("logs error message with emoji", () => {
      logger.showAndLogError("Test error message");

      assert.ok(consoleErrorStub.calledOnce);
      assert.ok(consoleErrorStub.firstCall.args[0].includes("❌"));
      assert.ok(
        consoleErrorStub.firstCall.args[0].includes("Test error message"),
      );
    });

    test("logs context when provided", () => {
      logger.showAndLogError("Error", undefined, "Test context");

      assert.ok(consoleErrorStub.calledOnce);
      assert.ok(consoleErrorStub.firstCall.args[0].includes("❌ Error"));
      assert.ok(consoleErrorStub.firstCall.args[1].includes("Test context"));
    });

    test("logs Error object with message and stack", () => {
      const error = new Error("Test error");
      logger.showAndLogError("Error occurred", error);

      assert.ok(consoleErrorStub.calledOnce);
      assert.ok(
        consoleErrorStub.firstCall.args[0].includes("❌ Error occurred"),
      );
      assert.strictEqual(consoleErrorStub.firstCall.args[2], error);
    });

    test("logs non-Error objects as strings", () => {
      const error = { message: "Custom error" };
      logger.showAndLogError("Error occurred", error);

      assert.ok(consoleErrorStub.calledOnce);
      assert.strictEqual(consoleErrorStub.firstCall.args[2], error);
    });

    test("logs link when both linkBtnText and url provided", () => {
      logger.showAndLogError(
        "Error",
        undefined,
        undefined,
        "Visit docs",
        "https://example.com",
      );

      const calls = consoleErrorStub.getCalls();
      const linkCall = calls.find(
        (call) =>
          call.args[0].includes("Visit docs") &&
          call.args[0].includes("https://example.com"),
      );
      assert.ok(linkCall, "Should log link with button text");
    });

    test("does not log link when only linkBtnText provided", () => {
      logger.showAndLogError("Error", undefined, undefined, "Visit docs");

      // Should only log the main error message, not the link
      assert.strictEqual(consoleErrorStub.callCount, 1);
    });

    test("does not log link when only url provided", () => {
      logger.showAndLogError(
        "Error",
        undefined,
        undefined,
        undefined,
        "https://example.com",
      );

      // Should only log the main error message, not the link
      assert.strictEqual(consoleErrorStub.callCount, 1);
    });

    test("handles all parameters together", () => {
      const error = new Error("Full test error");
      logger.showAndLogError(
        "Complete error",
        error,
        "Full context",
        "Help link",
        "https://help.com",
      );

      assert.strictEqual(consoleErrorStub.callCount, 2);

      const firstCall = consoleErrorStub.firstCall;
      assert.ok(firstCall.args[0].includes("❌ Complete error"));
      assert.strictEqual(firstCall.args[1], "Full context");
      assert.strictEqual(firstCall.args[2], error);

      const secondCall = consoleErrorStub.secondCall;
      assert.ok(secondCall.args[0].includes("Help link: https://help.com"));
    });

    test("handles Error without stack trace", () => {
      const error = new Error("No stack error");
      delete error.stack;

      logger.showAndLogError("Error", error);

      assert.ok(consoleErrorStub.calledOnce);
      assert.strictEqual(consoleErrorStub.firstCall.args[2], error);
    });

    test("handles null error", () => {
      logger.showAndLogError("Error", null);

      // Should only log main message, null is falsy so no error details
      assert.strictEqual(consoleErrorStub.callCount, 1);
    });

    test("handles undefined error", () => {
      logger.showAndLogError("Error", undefined);

      // Should only log main message
      assert.strictEqual(consoleErrorStub.callCount, 1);
    });

    test("handles number as error", () => {
      logger.showAndLogError("Error", 404);

      assert.ok(consoleErrorStub.calledOnce);
      assert.strictEqual(consoleErrorStub.firstCall.args[2], 404);
    });

    test("handles string as error", () => {
      logger.showAndLogError("Error", "String error message");

      assert.ok(consoleErrorStub.calledOnce);
      assert.strictEqual(
        consoleErrorStub.firstCall.args[2],
        "String error message",
      );
    });
  });

  suite("logInfo", () => {
    test("logs info message", () => {
      logger.logInfo("Information message");

      assert.ok(consoleLogStub.calledOnce);
      assert.strictEqual(
        consoleLogStub.firstCall.args[0],
        "Information message",
      );
    });

    test("logs empty string", () => {
      logger.logInfo("");

      assert.ok(consoleLogStub.calledOnce);
      assert.strictEqual(consoleLogStub.firstCall.args[0], "");
    });

    test("logs multiline message", () => {
      const multiline = "Line 1\nLine 2\nLine 3";
      logger.logInfo(multiline);

      assert.ok(consoleLogStub.calledOnce);
      assert.strictEqual(consoleLogStub.firstCall.args[0], multiline);
    });

    test("logs message with special characters", () => {
      const message = "Message with 🎉 emoji and special chars: @#$%";
      logger.logInfo(message);

      assert.ok(consoleLogStub.calledOnce);
      assert.strictEqual(consoleLogStub.firstCall.args[0], message);
    });
  });

  suite("logWarning", () => {
    test("logs warning with emoji", () => {
      logger.logWarning("Warning message");

      assert.ok(consoleWarnStub.calledOnce);
      assert.ok(consoleWarnStub.firstCall.args[0].includes("⚠️  "));
      assert.ok(consoleWarnStub.firstCall.args[0].includes("Warning message"));
    });

    test("logs empty warning", () => {
      logger.logWarning("");

      assert.ok(consoleWarnStub.calledOnce);
      assert.strictEqual(consoleWarnStub.firstCall.args[0], "⚠️  ");
    });

    test("logs multiline warning", () => {
      const multiline = "Warning line 1\nWarning line 2";
      logger.logWarning(multiline);

      assert.ok(consoleWarnStub.calledOnce);
      assert.ok(consoleWarnStub.firstCall.args[0].includes(multiline));
    });

    test("preserves warning message format", () => {
      logger.logWarning("Detailed warning with info");

      const output = consoleWarnStub.firstCall.args[0];
      assert.strictEqual(output, "⚠️  Detailed warning with info");
    });
  });

  suite("Logger Interface Compliance", () => {
    test("implements all required ILogger methods", () => {
      assert.strictEqual(typeof logger.showAndLogError, "function");
      assert.strictEqual(typeof logger.logInfo, "function");
      assert.strictEqual(typeof logger.logWarning, "function");
    });

    test("showAndLogError returns void", () => {
      const result = logger.showAndLogError("Test");
      assert.strictEqual(result, undefined);
    });

    test("logInfo returns void", () => {
      const result = logger.logInfo("Test");
      assert.strictEqual(result, undefined);
    });

    test("logWarning returns void", () => {
      const result = logger.logWarning("Test");
      assert.strictEqual(result, undefined);
    });
  });

  suite("Edge Cases", () => {
    test("handles very long messages", () => {
      const longMessage = "A".repeat(10000);
      logger.logInfo(longMessage);

      assert.ok(consoleLogStub.calledOnce);
      assert.strictEqual(consoleLogStub.firstCall.args[0].length, 10000);
    });

    test("handles messages with null bytes", () => {
      const messageWithNull = "Message\x00with\x00nulls";
      logger.logInfo(messageWithNull);

      assert.ok(consoleLogStub.calledOnce);
    });

    test("handles Unicode characters", () => {
      const unicode = "Hello 世界 🌍 Привет";
      logger.logInfo(unicode);

      assert.ok(consoleLogStub.calledOnce);
      assert.strictEqual(consoleLogStub.firstCall.args[0], unicode);
    });

    test("does not throw on multiple calls", () => {
      assert.doesNotThrow(() => {
        logger.logInfo("Message 1");
        logger.logWarning("Warning 1");
        logger.showAndLogError("Error 1");
        logger.logInfo("Message 2");
      });

      assert.strictEqual(consoleLogStub.callCount, 2);
      assert.strictEqual(consoleWarnStub.callCount, 1);
      assert.ok(consoleErrorStub.callCount >= 1);
    });
  });
});
