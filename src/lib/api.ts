// ============================================================================
// ISI API Client — Pure fetch wrapper over the ISI backend
// ============================================================================
// Uses NEXT_PUBLIC_API_URL environment variable.
// Throws on non-200 responses. Returns typed data. No `any`.
// ============================================================================

import type {
  Meta,
  Health,
  CountrySummary,
  ISIComposite,
  CountryDetail,
  CountryAxesSummary,
  CountryAxisResponse,
  AxisRegistryEntry,
  AxisDetail,
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
    cache: "no-store", // SSR: always fresh from backend
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(res.status, path, body);
  }

  return res.json() as Promise<T>;
}

// ─── Endpoint wrappers ──────────────────────────────────────────────

/** GET / — API metadata */
export function fetchMeta(): Promise<Meta> {
  return fetchJson<Meta>("/");
}

/** GET /health — Backend health check */
export function fetchHealth(): Promise<Health> {
  return fetchJson<Health>("/health");
}

/** GET /countries — All EU-27 countries with summary scores */
export function fetchCountries(): Promise<CountrySummary[]> {
  return fetchJson<CountrySummary[]>("/countries");
}

/** GET /isi — Composite ISI scores for all countries */
export function fetchISI(): Promise<ISIComposite> {
  return fetchJson<ISIComposite>("/isi");
}

/** GET /country/{code} — Full country detail */
export function fetchCountry(code: string): Promise<CountryDetail> {
  return fetchJson<CountryDetail>(`/country/${encodeURIComponent(code)}`);
}

/** GET /country/{code}/axes — All axis scores for one country */
export function fetchCountryAxes(code: string): Promise<CountryAxesSummary> {
  return fetchJson<CountryAxesSummary>(
    `/country/${encodeURIComponent(code)}/axes`
  );
}

/** GET /country/{code}/axis/{axis_id} — Single axis for one country */
export function fetchCountryAxis(
  code: string,
  axisId: number
): Promise<CountryAxisResponse> {
  return fetchJson<CountryAxisResponse>(
    `/country/${encodeURIComponent(code)}/axis/${axisId}`
  );
}

/** GET /axes — Axis registry */
export function fetchAxes(): Promise<AxisRegistryEntry[]> {
  return fetchJson<AxisRegistryEntry[]>("/axes");
}

/** GET /axis/{axis_id} — Full axis detail across all countries */
export function fetchAxis(axisId: number): Promise<AxisDetail> {
  return fetchJson<AxisDetail>(`/axis/${axisId}`);
}

export { ApiError };
