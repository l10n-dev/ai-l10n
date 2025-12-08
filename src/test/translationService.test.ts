import * as assert from "assert";
import * as sinon from "sinon";
import { URLS } from "../constants";
import { ILogger } from "../logger";
import { L10nTranslationService, FileSchema } from "../translationService";

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
    returnTranslationsAsString: true,
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
      };

      mockFetch.resolves(mockFetchResponse);

      const result = await service.predictLanguages("spanish", 5);

      assert.strictEqual(result.length, 2);
      assert.deepStrictEqual(result, mockResponse.languages);
    });

    test("predictLanguages throws error on failed API call", async () => {
      const mockFetchResponse = {
        ok: false,
        statusText: "Bad Request",
      };

      mockFetch.resolves(mockFetchResponse);

      await assert.rejects(
        async () => await service.predictLanguages("test"),
        /Failed to predict languages: Bad Request/
      );
    });
  });

  suite("JSON Translation", () => {
    test("translate throws error when no API Key is set", async () => {
      await assert.rejects(
        async () => await service.translate(createRequest(), ""),
        /API Key not set. Please configure your API Key first./
      );
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
        returnTranslationsAsString: true,
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

      const result = await service.translate(request, apiKey);

      assert.deepStrictEqual(result, mockTranslationResult);

      // Verify fetch was called with correct parameters
      assert.ok(mockFetch.called);
      const fetchCall = mockFetch.getCall(0);
      assert.strictEqual(fetchCall.args[0], `${URLS.API_BASE}/translate`);

      const requestOptions = fetchCall.args[1];
      assert.strictEqual(requestOptions.method, "POST");
      assert.strictEqual(
        requestOptions.headers["Content-Type"],
        "application/json"
      );
      assert.strictEqual(requestOptions.headers["X-API-Key"], apiKey);

      const requestBody = JSON.parse(requestOptions.body);
      assert.strictEqual(requestBody.sourceStrings, JSON.stringify(sourceStrings));
      assert.strictEqual(requestBody.targetLanguageCode, targetLanguage);
      assert.strictEqual(requestBody.useContractions, false);
      assert.strictEqual(requestBody.useShortening, true);
      assert.strictEqual(requestBody.returnTranslationsAsString, true);
      assert.strictEqual(requestBody.client, "test");
      assert.strictEqual(requestBody.schema, null);
    });

    test("translate handles 400 Bad Request error", async () => {
      const apiKey = "valid-api-key";

      const mockErrorResponse = {
        ok: false,
        status: 400,
        json: sinon.stub().resolves({
          errors: ["Invalid source strings format"],
        }),
      };

      mockFetch.resolves(mockErrorResponse);

      await assert.rejects(
        async () => await service.translate(createRequest(), apiKey),
        /Invalid source strings format/
      );
    });

    test("translate handles 401 Unauthorized error", async () => {
      const apiKey = "invalid-api-key";

      const mockErrorResponse = {
        ok: false,
        status: 401,
        json: sinon.stub().resolves({}),
      };

      mockFetch.resolves(mockErrorResponse);

      await assert.rejects(
        async () => await service.translate(createRequest(), apiKey),
        /Unauthorized. Please check your API Key./
      );
    });

    test("translate handles 402 Payment Required error with specific message", async () => {
      const apiKey = "valid-api-key";

      const mockErrorResponse = {
        ok: false,
        status: 402,
        json: sinon.stub().resolves({
          data: {
            requiredBalance: 1000,
            currentBalance: 500,
          },
        }),
      };

      mockFetch.resolves(mockErrorResponse);

      const result = await service.translate(createRequest(), apiKey);

      // 402 errors now return null instead of throwing
      assert.strictEqual(result, null);
    });

    test("translate handles 413 Request Too Large error", async () => {
      const apiKey = "valid-api-key";

      const mockErrorResponse = {
        ok: false,
        status: 413,
        json: sinon.stub().resolves({}),
      };

      mockFetch.resolves(mockErrorResponse);

      await assert.rejects(
        async () => await service.translate(createRequest(), apiKey),
        /Request too large. Maximum request size is 5 MB./
      );
    });

    test("translate handles 500 Internal Server Error", async () => {
      const apiKey = "valid-api-key";

      const mockErrorResponse = {
        ok: false,
        status: 500,
        json: sinon.stub().resolves({
          errorCode: "INTERNAL_ERROR_123",
        }),
      };

      mockFetch.resolves(mockErrorResponse);

      await assert.rejects(
        async () => await service.translate(createRequest(), apiKey),
        /An internal server error occurred \(Error code: INTERNAL_ERROR_123\)/
      );
    });
  });

  suite("Error Handling", () => {
    test("handles complex validation error structure", async () => {
      const apiKey = "valid-api-key";

      const mockErrorResponse = {
        ok: false,
        status: 400,
        json: sinon.stub().resolves({
          errors: {
            sourceStrings: ["is required"],
            targetLanguageCode: ["is invalid", "must be BCP-47 format"],
          },
        }),
      };

      mockFetch.resolves(mockErrorResponse);

      await assert.rejects(
        async () => await service.translate(createRequest(), apiKey),
        /is required is invalid must be BCP-47 format/
      );
    });

    test("handles array validation error structure", async () => {
      const apiKey = "valid-api-key";

      const mockErrorResponse = {
        ok: false,
        status: 400,
        json: sinon.stub().resolves({
          errors: ["Field validation failed", "Invalid input format"],
        }),
      };

      mockFetch.resolves(mockErrorResponse);

      await assert.rejects(
        async () => await service.translate(createRequest(), apiKey),
        /Field validation failed Invalid input format/
      );
    });

    test("handles JSON parsing failure in error response", async () => {
      const apiKey = "valid-api-key";

      const mockErrorResponse = {
        ok: false,
        status: 500,
        json: sinon.stub().rejects(new Error("JSON parse error")),
      };

      mockFetch.resolves(mockErrorResponse);

      await assert.rejects(
        async () => await service.translate(createRequest(), apiKey),
        /An internal server error occurred \(Error code: unknown\)/
      );
    });
  });

  suite("Finish Reason Handling", () => {
    test("handles insufficientBalance finish reason", async () => {
      const apiKey = "valid-api-key";

      const mockResponse = {
        ok: true,
        json: sinon.stub().resolves({
          targetLanguageCode: "es",
          translations: JSON.stringify({ hello: "hola" }),
          usage: { charsUsed: 5 },
          finishReason: "insufficientBalance",
          completedChunks: 1,
          totalChunks: 1,
        }),
      };

      mockFetch.resolves(mockResponse);

      const result = await service.translate(createRequest(), apiKey);

      // insufficientBalance finish reason now returns null instead of throwing
      assert.strictEqual(result, null);
    });

    test("throws error for error finish reason", async () => {
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

      await assert.rejects(
        async () => await service.translate(createRequest(), apiKey),
        /Translation failed due to an error\./
      );
    });

    test("does not throw error for length finish reason", async () => {
      const apiKey = "valid-api-key";

      const expectedResult = {
        targetLanguageCode: "es",
        translations: JSON.stringify({ hello: "hola" }),
        usage: { charsUsed: 5 },
        finishReason: "length",
        filteredStrings: { hello: "hola" },
        filteredStringsCount: 1,
        completedChunks: 1,
        totalChunks: 1,
      };

      const mockResponse = {
        ok: true,
        json: sinon.stub().resolves({
          targetLanguageCode: "es",
          translations: JSON.stringify({ hello: "hola" }),
          usage: { charsUsed: 5 },
          finishReason: "length",
          filteredStrings: { hello: "hola" },
          completedChunks: 1,
          totalChunks: 1,
        }),
      };

      mockFetch.resolves(mockResponse);

      const result = await service.translate(createRequest(), apiKey);
      assert.deepStrictEqual(result, expectedResult);
    });

    test("does not throw error for contentFilter finish reason", async () => {
      const apiKey = "valid-api-key";

      const expectedResult = {
        targetLanguageCode: "es",
        translations: JSON.stringify({ hello: "hola" }),
        usage: { charsUsed: 5 },
        finishReason: "contentFilter",
        filteredStrings: { hello: "hola" },
        filteredStringsCount: 1,
        completedChunks: 1,
        totalChunks: 1,
      };

      const mockResponse = {
        ok: true,
        json: sinon.stub().resolves({
          targetLanguageCode: "es",
          translations: JSON.stringify({ hello: "hola" }),
          usage: { charsUsed: 5 },
          finishReason: "contentFilter",
          filteredStrings: { hello: "hola" },
          completedChunks: 1,
          totalChunks: 1,
        }),
      };

      mockFetch.resolves(mockResponse);

      const result = await service.translate(createRequest(), apiKey);
      assert.deepStrictEqual(result, expectedResult);
    });

    test("does not throw error for stop finish reason", async () => {
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

      const result = await service.translate(createRequest(), apiKey);
      assert.deepStrictEqual(result, expectedResult);
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

      const result = await service.translate(createRequest(), apiKey);
      assert.deepStrictEqual(result, expectedResult);
    });
  });

  suite("Filtered Strings Count", () => {
    test("counts filtered strings correctly for flat structure", async () => {
      const apiKey = "valid-api-key";

      const apiResponse = {
        targetLanguageCode: "es",
        translations: JSON.stringify({ hello: "hola", world: "mundo" }),
        usage: { charsUsed: 5 },
        finishReason: "contentFilter",
        filteredStrings: {
          badWord1: "inappropriate content",
          badWord2: "another bad word",
          badWord3: "offensive term",
        },
        completedChunks: 1,
        totalChunks: 1,
      };

      const mockResponse = {
        ok: true,
        json: sinon.stub().resolves(apiResponse),
      };

      mockFetch.resolves(mockResponse);

      const result = await service.translate(createRequest(), apiKey);

      assert.strictEqual(result?.filteredStringsCount, 3);
    });

    test("counts filtered strings correctly for nested structure", async () => {
      const apiKey = "valid-api-key";

      const apiResponse = {
        targetLanguageCode: "es",
        translations: JSON.stringify({ hello: "hola" }),
        usage: { charsUsed: 5 },
        finishReason: "length",
        filteredStrings: {
          section1: {
            key1: "value1",
            key2: "value2",
          },
          section2: {
            nested: {
              deep1: "value3",
              deep2: "value4",
            },
            key3: "value5",
          },
        },
        completedChunks: 1,
        totalChunks: 1,
      };

      const mockResponse = {
        ok: true,
        json: sinon.stub().resolves(apiResponse),
      };

      mockFetch.resolves(mockResponse);

      const result = await service.translate(createRequest(), apiKey);

      assert.strictEqual(result?.filteredStringsCount, 5);
    });

    test("counts filtered strings correctly with mixed array structure", async () => {
      const apiKey = "valid-api-key";

      const apiResponse = {
        targetLanguageCode: "es",
        translations: JSON.stringify({ hello: "hola" }),
        usage: { charsUsed: 5 },
        finishReason: "contentFilter",
        filteredStrings: {
          items: ["item1", "item2", "item3"],
          nested: {
            array: ["nested1", "nested2"],
          },
          single: "single value",
        },
        completedChunks: 1,
        totalChunks: 1,
      };

      const mockResponse = {
        ok: true,
        json: sinon.stub().resolves(apiResponse),
      };

      mockFetch.resolves(mockResponse);

      const result = await service.translate(createRequest(), apiKey);

      assert.strictEqual(result?.filteredStringsCount, 6);
    });

    test("returns zero count for empty filtered strings", async () => {
      const apiKey = "valid-api-key";

      const apiResponse = {
        targetLanguageCode: "es",
        translations: JSON.stringify({ hello: "hola" }),
        usage: { charsUsed: 5 },
        finishReason: "contentFilter",
        filteredStrings: {},
        completedChunks: 1,
        totalChunks: 1,
      };

      const mockResponse = {
        ok: true,
        json: sinon.stub().resolves(apiResponse),
      };

      mockFetch.resolves(mockResponse);

      const result = await service.translate(createRequest(), apiKey);

      assert.strictEqual(result?.filteredStringsCount, 0);
    });

    test("does not add filteredStringsCount when no filtered strings present", async () => {
      const apiKey = "valid-api-key";

      const apiResponse = {
        targetLanguageCode: "es",
        translations: JSON.stringify({ hello: "hola" }),
        usage: { charsUsed: 5 },
        finishReason: "stop",
        completedChunks: 1,
        totalChunks: 1,
      };

      const mockResponse = {
        ok: true,
        json: sinon.stub().resolves(apiResponse),
      };

      mockFetch.resolves(mockResponse);

      const result = await service.translate(createRequest(), apiKey);

      assert.strictEqual(result?.filteredStringsCount, undefined);
    });

    test("ignores non-string values in count", async () => {
      const apiKey = "valid-api-key";

      const apiResponse = {
        targetLanguageCode: "es",
        translations: JSON.stringify({ hello: "hola" }),
        usage: { charsUsed: 5 },
        finishReason: "contentFilter",
        filteredStrings: {
          string1: "value1",
          number: 123,
          boolean: true,
          nullValue: null,
          string2: "value2",
          nested: {
            string3: "value3",
            number2: 456,
          },
        },
        completedChunks: 1,
        totalChunks: 1,
      };

      const mockResponse = {
        ok: true,
        json: sinon.stub().resolves(apiResponse),
      };

      mockFetch.resolves(mockResponse);

      const result = await service.translate(createRequest(), apiKey);

      // Should only count string1, string2, and string3 (3 string values)
      assert.strictEqual(result?.filteredStringsCount, 3);
    });
  });
});
