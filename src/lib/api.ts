// ============================================================================
// ISI API Client — Pure fetch wrapper over the ISI backend
// ============================================================================
// Uses NEXT_PUBLIC_API_URL environment variable.
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
  ScenarioRequest,
  ScenarioResponse,
} from "./types";

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

/**
 * POST helper — no ISR caching, no-store.
 * Used for scenario simulation (ephemeral, user-specific).
 *
 * Scenario calls route through the Next.js API proxy (/api/scenario)
 * to eliminate browser-level CORS preflight failures. The proxy
 * forwards server-side to the backend. Other POST endpoints, if any,
 * can still use the direct backend URL.
 */
async function postJsonProxy<TReq, TRes>(
  proxyPath: string,
  body: TReq,
  signal?: AbortSignal,
): Promise<TRes> {
  const res = await fetch(proxyPath, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    cache: "no-store",
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ApiError(res.status, proxyPath, text);
  }

  return res.json() as Promise<TRes>;
}

/**
 * POST /api/scenario — Run scenario simulation via same-origin proxy.
 * Accepts an optional AbortSignal for cancellation.
 */
export function fetchScenario(
  req: ScenarioRequest,
  signal?: AbortSignal,
): Promise<ScenarioResponse> {
  return postJsonProxy<ScenarioRequest, ScenarioResponse>(
    "/api/scenario",
    req,
    signal,
  );
}

export { ApiError };
