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
import type { ScenarioPayload } from "./scenarioValidation";

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
  // Status 404 from our own proxy — route not deployed
  if (err instanceof ApiError && err.status === 404) {
    return "ROUTE_MISSING";
  }
  // Status 400 — bad input rejected by backend (never retry)
  if (err instanceof ApiError && err.status === 400) {
    return "BAD_INPUT";
  }
  // TypeError: Failed to fetch — network unreachable / blocked
  if (err instanceof TypeError && /failed to fetch/i.test(err.message)) {
    return "TRANSPORT_LAYER_BLOCKED";
  }
  // Status 0 — CORS preflight rejection
  if (err instanceof ApiError && err.status === 0) {
    return "TRANSPORT_LAYER_BLOCKED";
  }
  // 500/502 from proxy — upstream service error
  return "SERVICE_ERROR";
}

// ─── Deduplicated console logging ───────────────────────────────────

const _loggedScenarioErrors = new Set<string>();

function logOnce(key: string, ...args: unknown[]) {
  if (_loggedScenarioErrors.has(key)) return;
  _loggedScenarioErrors.add(key);
  console.error("[ISI Scenario]", ...args);
}

// ─── Scenario simulation (via same-origin proxy) ────────────────────

/**
 * POST /api/scenario — Run scenario simulation via same-origin proxy.
 *
 * GUARANTEES:
 *   - Pre-flight validation blocks invalid payloads (no round-trip)
 *   - Payload is structurally identical every time (all 6 axes, all floats)
 *   - No strings-as-numbers ever leave the client
 *   - 400 errors are NEVER retried
 *   - Only 500/502 are retryable
 *
 * Error classification:
 * - BAD_INPUT (400): invalid payload — never retry
 * - ROUTE_MISSING (404): country or proxy not found — never retry
 * - TRANSPORT_LAYER_BLOCKED: network/CORS — never retry
 * - SERVICE_ERROR (500/502/other): upstream down — retryable
 */
export async function fetchScenario(
  countryCode: string,
  adjustments: Record<string, number>,
  signal?: AbortSignal,
  currentPreset: string | null = null,
): Promise<ScenarioResponse> {
  // ── Pre-flight validation — block invalid requests at source ──
  const validation = validateScenarioInput(countryCode, adjustments, currentPreset);
  if (!validation.valid) {
    const err = new ApiError(400, "/api/scenario", validation.reason);
    logOnce(`BAD_INPUT-preflight`, `BAD_INPUT: ${validation.reason}`);
    throw err;
  }

  const payload: ScenarioPayload = validation.payload;

  try {
    const res = await fetch("/api/scenario", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      cache: "no-store",
      body: JSON.stringify(payload),
      signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const err = new ApiError(res.status, "/api/scenario", text);
      const kind = classifyFetchError(err);

      logOnce(
        `${kind}-${res.status}`,
        `${kind}: status=${res.status}`,
      );

      throw err;
    }

    return (await res.json()) as ScenarioResponse;
  } catch (err) {
    // Re-throw ApiError as-is (already classified above)
    if (err instanceof ApiError) throw err;

    // AbortError — pass through silently
    if (err instanceof DOMException && err.name === "AbortError") throw err;

    // Network-level failure
    const kind = classifyFetchError(err);
    logOnce(`${kind}-network`, `${kind}: ${String(err)}`);

    throw err;
  }
}

export { ApiError };
