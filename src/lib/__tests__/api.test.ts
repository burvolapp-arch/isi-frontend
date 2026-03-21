// ============================================================================
// Unit Tests — API Client (Error Classification)
// ============================================================================
// Tests error classification logic without making actual HTTP requests.
// The fetch wrappers require env vars and are tested via integration tests.
// ============================================================================

import { describe, it, expect } from "vitest";
import { ApiError, classifyFetchError } from "../api";

describe("ApiError", () => {
  it("constructs with status, endpoint, and body", () => {
    const err = new ApiError(404, "/country/XX", "Not found");
    expect(err.status).toBe(404);
    expect(err.endpoint).toBe("/country/XX");
    expect(err.body).toBe("Not found");
    expect(err.name).toBe("ApiError");
    expect(err.message).toContain("404");
    expect(err.message).toContain("/country/XX");
  });

  it("is an instance of Error", () => {
    const err = new ApiError(500, "/isi", "Internal error");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
  });
});

describe("classifyFetchError", () => {
  it("classifies 404 as ROUTE_MISSING", () => {
    const err = new ApiError(404, "/country/XX", "");
    expect(classifyFetchError(err)).toBe("ROUTE_MISSING");
  });

  it("classifies 400 as BAD_INPUT", () => {
    const err = new ApiError(400, "/scenario", "Invalid payload");
    expect(classifyFetchError(err)).toBe("BAD_INPUT");
  });

  it("classifies 500 as SERVICE_ERROR", () => {
    const err = new ApiError(500, "/isi", "Internal server error");
    expect(classifyFetchError(err)).toBe("SERVICE_ERROR");
  });

  it("classifies 502 as SERVICE_ERROR", () => {
    const err = new ApiError(502, "/isi", "Bad gateway");
    expect(classifyFetchError(err)).toBe("SERVICE_ERROR");
  });

  it("classifies TypeError with 'failed to fetch' as TRANSPORT_LAYER_BLOCKED", () => {
    const err = new TypeError("Failed to fetch");
    expect(classifyFetchError(err)).toBe("TRANSPORT_LAYER_BLOCKED");
  });

  it("classifies ApiError with status 0 as TRANSPORT_LAYER_BLOCKED", () => {
    const err = new ApiError(0, "/isi", "");
    expect(classifyFetchError(err)).toBe("TRANSPORT_LAYER_BLOCKED");
  });

  it("classifies unknown errors as SERVICE_ERROR", () => {
    expect(classifyFetchError(new Error("Something went wrong"))).toBe("SERVICE_ERROR");
    expect(classifyFetchError("string error")).toBe("SERVICE_ERROR");
    expect(classifyFetchError(null)).toBe("SERVICE_ERROR");
  });
});
