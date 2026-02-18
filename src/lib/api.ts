// ============================================================================
// ISI API Client — Pure fetch wrapper over the ISI backend
// ============================================================================
// Uses NEXT_PUBLIC_API_URL environment variable for GET endpoints.
// Scenario simulation uses the same-origin /api/scenario proxy.
// Throws on non-200 responses. Returns typed data. No `any`.
//
// Caching strategy:
//   Server-side fetches use next.revalidate=300 (5 min ISR).
//   Data changes infrequently (backend re-materializes on schedule).
//   This eliminates per-request round-trips while staying fresh.
// ============================================================================

import type {
  ISIComposite,
  CountryDetail,
  AxisRegistryEntry,
  AxisDetail,
  ScenarioResponse,
} from "./types";
import { validateScenarioInput } from "./scenarioValidation";

function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_API_URL is not set. " +
        "Configure it in .env.local (e.g. http://localhost:8000)."
    );
  }
  // Strip trailing slash
  return url.replace(/\/+$/, "");
}

class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly endpoint: string,
    public readonly body: string
  ) {
    super(`API ${status} on ${endpoint}: ${body}`);
    this.name = "ApiError";
  }
}

async function fetchJson<T>(path: string): Promise<T> {
  const base = getBaseUrl();
  const url = `${base}${path}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(res.status, path, body);
  }

  return res.json() as Promise<T>;
}

// ─── Endpoint wrappers ──────────────────────────────────────────────

/** GET /isi — Composite ISI scores for all countries */
export function fetchISI(): Promise<ISIComposite> {
  return fetchJson<ISIComposite>("/isi");
}

/** GET /country/{code} — Full country detail */
export function fetchCountry(code: string): Promise<CountryDetail> {
  return fetchJson<CountryDetail>(`/country/${encodeURIComponent(code)}`);
}

/** GET /axes — Axis registry */
export function fetchAxes(): Promise<AxisRegistryEntry[]> {
  return fetchJson<AxisRegistryEntry[]>("/axes");
}

/** GET /axis/{axis_id} — Full axis detail across all countries */
export function fetchAxis(axisId: number): Promise<AxisDetail> {
  return fetchJson<AxisDetail>(`/axis/${axisId}`);
}

// ─── Transport error classification ─────────────────────────────────

export type FailureKind =
  | "ROUTE_MISSING"
  | "BAD_INPUT"
  | "SERVICE_ERROR"
  | "TRANSPORT_LAYER_BLOCKED";

export function classifyFetchError(err: unknown): FailureKind {
  if (err instanceof ApiError && err.status === 404) return "ROUTE_MISSING";
  if (err instanceof ApiError && err.status === 400) return "BAD_INPUT";
  if (err instanceof TypeError && /failed to fetch/i.test(err.message)) return "TRANSPORT_LAYER_BLOCKED";
  if (err instanceof ApiError && err.status === 0) return "TRANSPORT_LAYER_BLOCKED";
  return "SERVICE_ERROR";
}

// ─── Deduplicated console logging (dev only) ────────────────────────

const isDev = typeof process !== "undefined" && process.env?.NODE_ENV !== "production";
const _loggedKeys = new Set<string>();

function logOnce(key: string, ...args: unknown[]) {
  if (!isDev) return;
  if (_loggedKeys.has(key)) return;
  _loggedKeys.add(key);
  console.error("[ISI Scenario]", ...args);
}

// ─── Scenario simulation (via same-origin proxy) ────────────────────

/**
 * POST /api/scenario — Run scenario simulation via same-origin proxy.
 *
 * Contract (scenario-v1):
 *   { country: "SE", adjustments: { <AXIS_KEY>: float } }
 *
 * - Pre-flight validation blocks invalid payloads (no round-trip)
 * - Outgoing payload logged in dev before POST
 * - Client-side Zod validation of response shape
 * - 400 errors surface backend message, NEVER retried
 * - 500/502 → retryable by caller
 */
export async function fetchScenario(
  countryCode: string,
  adjustments: Record<string, number>,
  signal?: AbortSignal,
): Promise<ScenarioResponse> {
  // ── Pre-flight validation — block invalid requests at source ──
  const validation = validateScenarioInput(countryCode, adjustments);
  if (!validation.valid) {
    const err = new ApiError(400, "/api/scenario", validation.reason);
    logOnce("preflight", `BAD_INPUT: ${validation.reason}`);
    throw err;
  }

  const payload = validation.payload;

  if (isDev) {
    // eslint-disable-next-line no-console
    console.log("SCENARIO PAYLOAD", payload);
  }

  try {
    const res = await fetch("/api/scenario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let errorMessage = text;
      try {
        const parsed = JSON.parse(text);
        if (typeof parsed.detail === "string") errorMessage = parsed.detail;
        else if (typeof parsed.error === "string") errorMessage = parsed.error;
        else if (typeof parsed.message === "string") errorMessage = parsed.message;
      } catch {
        // text is already the message
      }

      const err = new ApiError(res.status, "/api/scenario", errorMessage);
      const kind = classifyFetchError(err);
      logOnce(`${kind}-${res.status}`, `${kind}: status=${res.status} body=${errorMessage}`);
      throw err;
    }

    const json = await res.json();
    return json as ScenarioResponse;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") throw err;

    const kind = classifyFetchError(err);
    logOnce(`${kind}-network`, `${kind}: ${String(err)}`);
    throw err;
  }
}

export { ApiError };
