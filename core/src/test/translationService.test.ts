import * as assert from "assert";
import * as sinon from "sinon";
import { URLS } from "../constants";
import { ILogger } from "../logger";
import {
  L10nTranslationService,
  FileSchema,
  TranslationResponse,
} from "../translationService";

// Mock fetch globally
const mockFetch = sinon.stub();
(global as any).fetch = mockFetch;

// Mock URL constructor
(global as any).URL = function (url: string) {
  this.searchParams = {
    append: sinon.stub(),
  };
  this.toString = () => url;
};

suite("L10nTranslationService Test Suite", () => {
  let service: any;
  let mockLogger: ILogger;

  // Helper function to create a proper translation request
  const createRequest = (overrides: Partial<any> = {}) => ({
    sourceStrings: JSON.stringify({}),
    targetLanguageCode: "es",
    useContractions: false,
    useShortening: false,
    client: "test",
    schema: null,
    ...overrides,
  });

  setup(() => {
    // Reset all stubs
    sinon.resetHistory();

    // Reset fetch mock
    mockFetch.reset();

    // Create mock logger
    mockLogger = {
      logInfo: sinon.stub(),
      logWarning: sinon.stub(),
      logError: sinon.stub(),
      showAndLogError: sinon.stub(),
    };

    // Create service instance with mocked logger only
    service = new L10nTranslationService(mockLogger);
  });

  teardown(() => {
    sinon.restore();
  });

  suite("Language Prediction", () => {
    test("predictLanguages returns parsed results on success", async () => {
      const mockResponse = {
        languages: [
          { code: "es", name: "Spanish" },
          { code: "fr", name: "French" },
        ],
      };

      const mockFetchResponse = {
        ok: true,
        json: sinon.stub().resolves(mockResponse),
        text: sinon.stub().resolves(JSON.stringify(mockResponse)),
      };

      mockFetch.resolves(mockFetchResponse);

      const result = await service.predictLanguages("spanish", 5);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.length, 2);
      assert.deepStrictEqual(result.data, mockResponse.languages);
    });

    test("predictLanguages throws error on failed API call", async () => {
      const mockFetchResponse = {
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
        json: sinon.stub().rejects(new Error("no body")),
        text: sinon.stub().resolves("Service Unavailable"),
      };

      mockFetch.resolves(mockFetchResponse);

      const result = await service.predictLanguages("test");
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.reason, "serverError");
      assert.ok(/An internal server error occurred/.test(result.message));
    });

    test("predictLanguages returns bad request error on 400 with validation errors", async () => {
      mockFetch.resolves({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: sinon.stub().resolves({
          status: 400,
          traceId: "",
          errors: { "": ["invalid data."] },
        }),
        text: sinon.stub().resolves(
          JSON.stringify({
            status: 400,
            traceId: "",
            errors: { "": ["invalid data."] },
          }),
        ),
      });

      const result = await service.predictLanguages("test");
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.reason, "badRequest");
      assert.ok(
        /invalid data\./.test(result.message),
        `Expected message to contain 'invalid data.', got: ${result.message}`,
      );
    });
  });

  suite("JSON Translation", () => {
    test("translate set client to 'ai-l10n-core-npmjs' if not provided", async () => {
      const apiKey = "valid-api-key";

      const request = {
        sourceStrings: JSON.stringify({ hello: "Hello" }),
        targetLanguageCode: "es",
        useContractions: false,
        useShortening: false,
        schema: null,
      };
      const mockTranslationResult = {
        targetLanguageCode: "es",
        translations: JSON.stringify({ hello: "Hola" }),
        usage: { charsUsed: 10 },
        completedChunks: 1,
        totalChunks: 1,
      };
      const mockFetchResponse = {
        ok: true,
        json: sinon.stub().resolves(mockTranslationResult),
      };
      mockFetch.resolves(mockFetchResponse);
      const result: TranslationResponse = await service.translate(
        request,
        apiKey,
      );
      assert.strictEqual(result.success, true);
      assert.deepStrictEqual(result.data, mockTranslationResult);
      // Verify fetch was called with correct parameters
      assert.ok(mockFetch.called);
      const fetchCall = mockFetch.getCall(0);
      const requestOptions = fetchCall.args[1];
      const requestBody = JSON.parse(requestOptions.body);
      assert.strictEqual(requestBody.client, "ai-l10n-core-npmjs");
    });

    test("translate returns error when no API Key is set", async () => {
      const result: TranslationResponse = await service.translate(
        createRequest(),
        "",
      );
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.reason, "noApiKey");

      // Verify error was logged
      assert.ok((mockLogger.showAndLogError as sinon.SinonStub).called);
    });

    test("translate makes correct API call with valid API Key", async () => {
      const apiKey = "valid-api-key";

      const sourceStrings = { hello: "Hello", world: "World" };
      const targetLanguage = "es";
      const useContractions = false;
      const useShortening = true;
      const request = {
        sourceStrings: JSON.stringify(sourceStrings),
        targetLanguageCode: targetLanguage,
        useContractions,
        useShortening,
        client: "test",
        schema: null,
      };

      const mockTranslationResult = {
        targetLanguageCode: "es",
        translations: JSON.stringify({ hello: "Hola", world: "Mundo" }),
        usage: { charsUsed: 10 },
        completedChunks: 1,
        totalChunks: 1,
      };

      const mockFetchResponse = {
        ok: true,
        json: sinon.stub().resolves(mockTranslationResult),
      };

      mockFetch.resolves(mockFetchResponse);

      const result: TranslationResponse = await service.translate(
        request,
        apiKey,
      );

      assert.strictEqual(result.success, true);
      assert.deepStrictEqual(result.data, mockTranslationResult);

      // Verify fetch was called with correct parameters
      assert.ok(mockFetch.called);
      const fetchCall = mockFetch.getCall(0);
      assert.strictEqual(fetchCall.args[0], `${URLS.API_BASE}/v2/translate`);

      const requestOptions = fetchCall.args[1];
      assert.strictEqual(requestOptions.method, "POST");
      assert.strictEqual(
        requestOptions.headers["Content-Type"],
        "application/json",
      );
      assert.strictEqual(requestOptions.headers["X-API-Key"], apiKey);

      const requestBody = JSON.parse(requestOptions.body);
      assert.strictEqual(
        requestBody.sourceStrings,
        JSON.stringify(sourceStrings),
      );
      assert.strictEqual(requestBody.targetLanguageCode, targetLanguage);
      assert.strictEqual(requestBody.useContractions, false);
      assert.strictEqual(requestBody.useShortening, true);
      assert.strictEqual(requestBody.client, "test");
      assert.strictEqual(requestBody.schema, null);
    });

    test("includes translateMetadata in API request when set to true", async () => {
      const apiKey = "valid-api-key";

      const request = {
        sourceStrings: JSON.stringify({ hello: "Hello" }),
        targetLanguageCode: "es",
        useContractions: true,
        useShortening: false,
        translateMetadata: true,
        client: "test",
        schema: null,
      };

      const mockTranslationResult = {
        targetLanguageCode: "es",
        translations: JSON.stringify({ hello: "Hola" }),
        usage: { charsUsed: 10 },
        completedChunks: 1,
        totalChunks: 1,
      };

      const mockFetchResponse = {
        ok: true,
        json: sinon.stub().resolves(mockTranslationResult),
      };

      mockFetch.resolves(mockFetchResponse);

      const r = await service.translate(request, apiKey);
      assert.strictEqual(r.success, true);

      const fetchCall = mockFetch.getCall(0);
      const requestOptions = fetchCall.args[1];
      const requestBody = JSON.parse(requestOptions.body);

      assert.strictEqual(requestBody.translateMetadata, true);
    });

    test("includes translateMetadata in API request when set to false", async () => {
      const apiKey = "valid-api-key";

      const request = {
        sourceStrings: JSON.stringify({ hello: "Hello" }),
        targetLanguageCode: "es",
        useContractions: true,
        useShortening: false,
        translateMetadata: false,
        client: "test",
        schema: null,
      };

      const mockTranslationResult = {
        targetLanguageCode: "es",
        translations: JSON.stringify({ hello: "Hola" }),
        usage: { charsUsed: 10 },
        completedChunks: 1,
        totalChunks: 1,
      };

      const mockFetchResponse = {
        ok: true,
        json: sinon.stub().resolves(mockTranslationResult),
      };

      mockFetch.resolves(mockFetchResponse);

      const r = await service.translate(request, apiKey);
      assert.strictEqual(r.success, true);

      const fetchCall = mockFetch.getCall(0);
      const requestOptions = fetchCall.args[1];
      const requestBody = JSON.parse(requestOptions.body);

      assert.strictEqual(requestBody.translateMetadata, false);
    });

    test("translate handles 400 Bad Request error", async () => {
      const apiKey = "valid-api-key";

      const mockErrorResponse = {
        ok: false,
        status: 400,
        text: sinon.stub().resolves(
          JSON.stringify({
            errors: { "": ["Invalid source strings format"] },
          }),
        ),
      };

      mockFetch.resolves(mockErrorResponse);

      const result: TranslationResponse = await service.translate(
        createRequest(),
        apiKey,
      );
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.reason, "badRequest");
      assert.ok(/Invalid source strings format/.test(result.message ?? ""));
    });

    test("translate handles 401 Unauthorized error", async () => {
      const apiKey = "invalid-api-key";

      const mockErrorResponse = {
        ok: false,
        status: 401,
        json: sinon.stub().resolves({}),
      };

      mockFetch.resolves(mockErrorResponse);

      const result: TranslationResponse = await service.translate(
        createRequest(),
        apiKey,
      );

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.reason, "unauthorized");

      // Verify error was logged
      assert.ok((mockLogger.showAndLogError as sinon.SinonStub).called);
    });

    test("translate handles 402 Payment Required error with specific message", async () => {
      const apiKey = "valid-api-key";

      const mockErrorResponse = {
        ok: false,
        status: 402,
        text: sinon.stub().resolves(
          JSON.stringify({
            data: {
              requiredBalance: 1000,
              currentBalance: 500,
            },
          }),
        ),
      };

      mockFetch.resolves(mockErrorResponse);

      const result: TranslationResponse = await service.translate(
        createRequest(),
        apiKey,
      );

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.reason, "paymentRequired");
      assert.strictEqual(result.currentBalance, 500);
      assert.ok(/1,000 characters/.test(result.message ?? ""));
    });

    test("translate handles 413 Request Too Large error", async () => {
      const apiKey = "valid-api-key";

      const mockErrorResponse = {
        ok: false,
        status: 413,
        json: sinon.stub().resolves({}),
      };

      mockFetch.resolves(mockErrorResponse);

      const result: TranslationResponse = await service.translate(
        createRequest(),
        apiKey,
      );
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.reason, "requestTooLarge");
      assert.ok(
        /Request too large. Maximum request size is 5 MB./.test(
          result.message ?? "",
        ),
      );
    });

    test("translate handles 500 Internal Server Error", async () => {
      const apiKey = "valid-api-key";

      const mockErrorResponse = {
        ok: false,
        status: 500,
        text: sinon.stub().resolves(
          JSON.stringify({
            errorCode: "INTERNAL_ERROR_123",
          }),
        ),
      };

      mockFetch.resolves(mockErrorResponse);

      const result: TranslationResponse = await service.translate(
        createRequest(),
        apiKey,
      );
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.reason, "serverError");
      assert.ok(
        /An internal server error occurred \(Error code: INTERNAL_ERROR_123\)/.test(
          result.message ?? "",
        ),
      );
    });
  });

  suite("Error Handling", () => {
    test("handles complex validation error structure", async () => {
      const apiKey = "valid-api-key";

      const mockErrorResponse = {
        ok: false,
        status: 400,
        text: sinon.stub().resolves(
          JSON.stringify({
            errors: {
              sourceStrings: ["is required"],
              targetLanguageCode: ["is invalid", "must be BCP-47 format"],
            },
          }),
        ),
      };

      mockFetch.resolves(mockErrorResponse);

      const result: TranslationResponse = await service.translate(
        createRequest(),
        apiKey,
      );
      assert.strictEqual(result.success, false);
      assert.ok(
        /sourceStrings: is required; \r\ntargetLanguageCode: is invalid must be BCP-47 format/.test(
          result.message ?? "",
        ),
      );
    });

    test("handles array validation error structure", async () => {
      const apiKey = "valid-api-key";

      const details = JSON.stringify({
        errors: ["Field validation failed", "Invalid input format"],
      });
      const mockErrorResponse = {
        ok: false,
        status: 400,
        text: sinon.stub().resolves(details),
      };

      mockFetch.resolves(mockErrorResponse);

      const result: TranslationResponse = await service.translate(
        createRequest(),
        apiKey,
      );
      assert.strictEqual(result.success, false);
      assert.ok(
        /Invalid request. Please check your input and try again/.test(
          result.message ?? "",
        ),
      );
    });

    test("handles JSON parsing failure in error response", async () => {
      const apiKey = "valid-api-key";

      const mockErrorResponse = {
        ok: false,
        status: 500,
        json: sinon.stub().rejects(new Error("JSON parse error")),
        text: sinon.stub().resolves("Internal Server Error"),
      };

      mockFetch.resolves(mockErrorResponse);

      const result: TranslationResponse = await service.translate(
        createRequest(),
        apiKey,
      );
      assert.strictEqual(result.success, false);
      assert.ok(
        /An internal server error occurred \(Error code: unknown\)/.test(
          result.message ?? "",
        ),
      );
    });
  });

  suite("Finish Reason Handling", () => {
    test("handles insufficientBalance finish reason", async () => {
      const apiKey = "valid-api-key";

      const expectedResult = {
        targetLanguageCode: "es",
        translations: JSON.stringify({ hello: "hola" }),
        usage: { charsUsed: 5 },
        finishReason: "insufficientBalance",
        completedChunks: 1,
        totalChunks: 1,
      };

      const mockResponse = {
        ok: true,
        json: sinon.stub().resolves(expectedResult),
      };

      mockFetch.resolves(mockResponse);

      const result: TranslationResponse = await service.translate(
        createRequest(),
        apiKey,
      );

      // insufficientBalance finish reason returns result with partial translations
      assert.strictEqual(result.success, true);
      assert.deepStrictEqual(result.data, expectedResult);
    });

    test("returns error status for error finish reason", async () => {
      const apiKey = "valid-api-key";

      const mockResponse = {
        ok: true,
        json: sinon.stub().resolves({
          targetLanguageCode: "es",
          translations: JSON.stringify({ hello: "hola" }),
          usage: { charsUsed: 5 },
          finishReason: "error",
          completedChunks: 1,
          totalChunks: 1,
        }),
      };

      mockFetch.resolves(mockResponse);

      const result: TranslationResponse = await service.translate(
        createRequest(),
        apiKey,
      );
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.reason, "translationError");
      assert.ok(
        /Translation failed due to an error\./.test(result.message ?? ""),
      );
    });

    test("returns success with partial result for length finish reason", async () => {
      const apiKey = "valid-api-key";

      const expectedResult = {
        targetLanguageCode: "es",
        translations: JSON.stringify({ hello: "hola" }),
        usage: { charsUsed: 5 },
        finishReason: "length",
        filteredStrings: '{"hello":"hola"}',
        completedChunks: 1,
        totalChunks: 1,
      };

      const mockResponse = {
        ok: true,
        json: sinon.stub().resolves(expectedResult),
      };

      mockFetch.resolves(mockResponse);

      const result: TranslationResponse = await service.translate(
        createRequest(),
        apiKey,
      );
      assert.strictEqual(result.success, true);
      assert.deepStrictEqual(result.data, expectedResult);
    });

    test("returns success with partial result for contentFilter finish reason", async () => {
      const apiKey = "valid-api-key";

      const expectedResult = {
        targetLanguageCode: "es",
        translations: JSON.stringify({ hello: "hola" }),
        usage: { charsUsed: 5 },
        finishReason: "contentFilter",
        filteredStrings: '{"hello":"hola"}',
        completedChunks: 1,
        totalChunks: 1,
      };

      const mockResponse = {
        ok: true,
        json: sinon.stub().resolves(expectedResult),
      };

      mockFetch.resolves(mockResponse);

      const result: TranslationResponse = await service.translate(
        createRequest(),
        apiKey,
      );
      assert.strictEqual(result.success, true);
      assert.deepStrictEqual(result.data, expectedResult);
    });

    test("returns success for stop finish reason", async () => {
      const apiKey = "valid-api-key";

      const expectedResult = {
        targetLanguageCode: "es",
        translations: JSON.stringify({ hello: "hola" }),
        usage: { charsUsed: 5 },
        finishReason: "stop",
        completedChunks: 1,
        totalChunks: 1,
      };

      const mockResponse = {
        ok: true,
        json: sinon.stub().resolves(expectedResult),
      };

      mockFetch.resolves(mockResponse);

      const result: TranslationResponse = await service.translate(
        createRequest(),
        apiKey,
      );
      assert.strictEqual(result.success, true);
      assert.deepStrictEqual(result.data, expectedResult);
    });

    test("works normally when no finish reason is present", async () => {
      const apiKey = "valid-api-key";

      const expectedResult = {
        targetLanguageCode: "es",
        translations: JSON.stringify({ hello: "hola" }),
        usage: { charsUsed: 5 },
        completedChunks: 1,
        totalChunks: 1,
      };

      const mockResponse = {
        ok: true,
        json: sinon.stub().resolves(expectedResult),
      };

      mockFetch.resolves(mockResponse);

      const result: TranslationResponse = await service.translate(
        createRequest(),
        apiKey,
      );
      assert.strictEqual(result.success, true);
      assert.deepStrictEqual(result.data, expectedResult);
    });

    test("sets currentBalance from result.remainingBalance on success", async () => {
      const apiKey = "valid-api-key";

      const mockResponse = {
        ok: true,
        json: sinon.stub().resolves({
          targetLanguageCode: "es",
          translations: JSON.stringify({ hello: "hola" }),
          usage: { charsUsed: 5 },
          completedChunks: 1,
          totalChunks: 1,
          remainingBalance: 9500,
        }),
      };

      mockFetch.resolves(mockResponse);

      const result: TranslationResponse = await service.translate(
        createRequest(),
        apiKey,
      );
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.currentBalance, 9500);
    });
  });

  suite("Balance", () => {
    test("getBalance returns error when no API key", async () => {
      const result = await service.getBalance("");
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.reason, "noApiKey");
    });

    test("getBalance returns current balance on success", async () => {
      const apiKey = "valid-api-key";

      const mockResponse = {
        ok: true,
        json: sinon.stub().resolves({ currentBalance: 25000 }),
      };

      mockFetch.resolves(mockResponse);

      const result = await service.getBalance(apiKey);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data.currentBalance, 25000);

      const fetchCall = mockFetch.getCall(0);
      assert.ok(fetchCall.args[0].endsWith("/v2/balance"));
      assert.strictEqual(fetchCall.args[1].headers["X-API-Key"], apiKey);
    });

    test("getBalance returns bad request error on 400 with validation errors", async () => {
      const apiKey = "valid-api-key";

      mockFetch.resolves({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        text: sinon.stub().resolves(
          JSON.stringify({
            type: "https://tools.ietf.org/html/rfc9110#section-15.5.1",
            title: "One or more validation errors occurred.",
            status: 400,
            traceId: "",
            errors: {
              sourceStrings: [
                "Failed to deserialize source strings. Ensure the content matches the specified format.",
              ],
            },
          }),
        ),
      });

      const result = await service.getBalance(apiKey);
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.reason, "badRequest");
      assert.ok(
        /Failed to deserialize source strings/.test(result.message),
        `Expected message to contain validation detail, got: ${result.message}`,
      );
    });

    test("getBalance returns bad request error on 400 with empty-key errors", async () => {
      const apiKey = "valid-api-key";

      mockFetch.resolves({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        text: sinon.stub().resolves(
          JSON.stringify({
            status: 400,
            traceId: "",
            errors: { "": ["invalid data."] },
          }),
        ),
      });

      const result = await service.getBalance(apiKey);
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.reason, "badRequest");
      assert.ok(
        /invalid data\./.test(result.message),
        `Expected message to contain 'invalid data.', got: ${result.message}`,
      );
    });

    test("getBalance returns unauthorized error on 401", async () => {
      const apiKey = "bad-key";

      mockFetch.resolves({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      });

      const result = await service.getBalance(apiKey);
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.reason, "unauthorized");
    });

    test("getBalance returns server error on 500", async () => {
      const apiKey = "valid-api-key";

      mockFetch.resolves({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      const result = await service.getBalance(apiKey);
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.reason, "serverError");
      assert.ok(
        /An internal server error occurred \(Error code: unknown\)/.test(
          result.message,
        ),
      );
    });
  });

  suite("Languages", () => {
    test("getLanguages returns error when no API key", async () => {
      const result = await service.getLanguages("");
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.reason, "noApiKey");
    });

    test("getLanguages returns unauthorized error on 401", async () => {
      mockFetch.resolves({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      });

      const result = await service.getLanguages("api-key");
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.reason, "unauthorized");
    });

    test("getLanguages returns bad request with validation message on 400", async () => {
      mockFetch.resolves({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        text: sinon.stub().resolves(
          JSON.stringify({
            type: "https://tools.ietf.org/html/rfc9110#section-15.5.1",
            title: "One or more validation errors occurred.",
            status: 400,
            traceId: "",
            errors: {
              sourceStrings: [
                "Failed to deserialize source strings. Ensure the content matches the specified format.",
              ],
            },
          }),
        ),
      });

      const result = await service.getLanguages("api-key");
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.reason, "badRequest");
      assert.ok(
        /Failed to deserialize source strings/.test(result.message),
        `Expected message to contain validation detail, got: ${result.message}`,
      );
    });

    test("getLanguages returns bad request error on 400", async () => {
      mockFetch.resolves({ ok: false, status: 400, statusText: "Bad Request" });

      const result = await service.getLanguages("api-key");
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.reason, "badRequest");
    });

    test("getLanguages returns language list on success", async () => {
      const apiKey = "valid-api-key";
      const mockData = {
        languages: [{ code: "es", name: "Spanish", nativeName: "Español" }],
      };

      mockFetch.resolves({
        ok: true,
        json: sinon.stub().resolves(mockData),
      });

      const result = await service.getLanguages(apiKey);
      assert.strictEqual(result.success, true);
      assert.deepStrictEqual(result.data, mockData);

      const fetchCall = mockFetch.getCall(0);
      assert.strictEqual(fetchCall.args[1].headers["X-API-Key"], apiKey);
    });

    test("getLanguages sends codes and proficiencyLevels as query params", async () => {
      const apiKey = "valid-api-key";
      const appendStub = sinon.stub();
      (global as any).URL = function (url: string) {
        this.searchParams = { append: appendStub };
        this.toString = () => url;
      };

      mockFetch.resolves({
        ok: true,
        json: sinon.stub().resolves({ languages: [] }),
      });

      const result = await service.getLanguages(apiKey, {
        codes: ["es", "fr"],
        proficiencyLevels: ["strong"],
      });

      assert.strictEqual(result.success, true);
      assert.ok(appendStub.calledWith("c", "es"));
      assert.ok(appendStub.calledWith("c", "fr"));
      assert.ok(appendStub.calledWith("p", "strong"));
    });
  });
});
