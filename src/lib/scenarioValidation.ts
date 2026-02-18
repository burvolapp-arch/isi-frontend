// ============================================================================
// ISI Frontend — Scenario Payload Builder & Validation
// ============================================================================
// Single source of truth for constructing scenario simulation payloads.
// INVARIANT: Every scenario request is structurally identical.
//   - ALWAYS sends all 6 axes (no partials)
//   - ALWAYS coerces values to float (no strings)
//   - ALWAYS clamps to [-0.20, +0.20]
//   - ALWAYS includes meta block with client_version, timestamp, preset
//
// Backend contract (stabilized):
//   POST /scenario
//   Body: { country_code, adjustments: { <canonical_slug>: float, ... }, meta }
// ============================================================================

import { type AxisSlug } from "./axisRegistry";

// ── Canonical Backend Axis Slugs ────────────────────────────────────
// The backend expects FULL canonical slugs — not the short UI slugs.
// This is the ONLY mapping between UI slugs and backend slugs.

export const CANONICAL_BACKEND_AXES = [
  "financial_external_supplier_concentration",
  "energy_external_supplier_concentration",
  "technology_semiconductor_external_supplier_concentration",
  "defense_external_supplier_concentration",
  "critical_inputs_raw_materials_external_supplier_concentration",
  "logistics_freight_external_supplier_concentration",
] as const;

export type CanonicalBackendAxis = (typeof CANONICAL_BACKEND_AXES)[number];

/** Map UI short slug → backend canonical slug */
const UI_TO_BACKEND: Record<AxisSlug, CanonicalBackendAxis> = {
  financial: "financial_external_supplier_concentration",
  energy: "energy_external_supplier_concentration",
  technology: "technology_semiconductor_external_supplier_concentration",
  defense: "defense_external_supplier_concentration",
  critical_inputs: "critical_inputs_raw_materials_external_supplier_concentration",
  logistics: "logistics_freight_external_supplier_concentration",
};

/** Map backend canonical slug → UI short slug */
const BACKEND_TO_UI: Record<CanonicalBackendAxis, AxisSlug> = {
  financial_external_supplier_concentration: "financial",
  energy_external_supplier_concentration: "energy",
  technology_semiconductor_external_supplier_concentration: "technology",
  defense_external_supplier_concentration: "defense",
  critical_inputs_raw_materials_external_supplier_concentration: "critical_inputs",
  logistics_freight_external_supplier_concentration: "logistics",
};

export { UI_TO_BACKEND, BACKEND_TO_UI };

// ── Constants ───────────────────────────────────────────────────────

const MIN_SHIFT = -0.20;
const MAX_SHIFT = 0.20;

/** ISO-2 uppercase country codes for EU-27 */
const EU27_CODES = new Set([
  "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "EL", "ES",
  "FI", "FR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT",
  "NL", "PL", "PT", "RO", "SE", "SI", "SK",
]);

// ── Types ───────────────────────────────────────────────────────────

export interface ScenarioPayloadMeta {
  preset: string | null;
  client_version: string;
  timestamp: string;
}

export interface ScenarioPayload {
  country_code: string;
  adjustments: Record<CanonicalBackendAxis, number>;
  meta: ScenarioPayloadMeta;
}

export interface ValidationFailure {
  valid: false;
  reason: string;
}

export interface ValidationSuccess {
  valid: true;
  payload: ScenarioPayload;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

// ── Canonical Payload Builder ───────────────────────────────────────

/**
 * Build a structurally complete scenario payload from UI-level inputs.
 *
 * GUARANTEES:
 *   - All 6 axes present (unset axes default to 0)
 *   - All values are finite floats clamped to [-0.20, +0.20]
 *   - No strings-as-numbers — every value passes through Number() + clamp
 *   - Backend canonical slugs used (not UI short slugs)
 *   - Meta block always present
 *
 * @param countryCode - 2-letter ISO code (uppercased internally)
 * @param adjustments - UI-level adjustments (short slug → number)
 * @param currentPreset - Active preset label, or null
 */
export function buildScenarioPayload(
  countryCode: string,
  adjustments: Record<string, number>,
  currentPreset: string | null = null,
): ScenarioPayload {
  const normalized: Record<string, number> = {};

  for (const canonicalAxis of CANONICAL_BACKEND_AXES) {
    // Lookup: try backend canonical slug first, then UI short slug
    const uiSlug = BACKEND_TO_UI[canonicalAxis];
    const rawValue = adjustments[canonicalAxis] ?? adjustments[uiSlug] ?? 0;
    const numValue = Number(rawValue) || 0;
    normalized[canonicalAxis] = Math.max(MIN_SHIFT, Math.min(MAX_SHIFT, numValue));
  }

  return {
    country_code: countryCode.toUpperCase().trim(),
    adjustments: normalized as Record<CanonicalBackendAxis, number>,
    meta: {
      preset: currentPreset,
      client_version: "v2",
      timestamp: new Date().toISOString(),
    },
  };
}

// ── Pre-flight Validator ────────────────────────────────────────────

/**
 * Validate inputs BEFORE building the payload.
 * Returns a structurally complete payload or a failure reason.
 * Invalid inputs are BLOCKED — no request leaves the client.
 */
export function validateScenarioInput(
  countryCode: string,
  adjustments: Record<string, number>,
  currentPreset: string | null = null,
): ValidationResult {
  const code = countryCode.toUpperCase().trim();

  if (code.length !== 2) {
    return { valid: false, reason: `Invalid country code length: "${code}"` };
  }
  if (!EU27_CODES.has(code)) {
    return { valid: false, reason: `Country code not in EU-27: "${code}"` };
  }

  // Validate each adjustment value is a usable number
  for (const [key, rawValue] of Object.entries(adjustments)) {
    const value = Number(rawValue);
    if (!Number.isFinite(value)) {
      return { valid: false, reason: `Non-numeric shift for ${key}: ${rawValue}` };
    }
  }

  // Build payload (clamps and normalizes internally)
  const payload = buildScenarioPayload(code, adjustments, currentPreset);

  return { valid: true, payload };
}

// ── Proxy-side Validator (for route.ts) ─────────────────────────────

/**
 * Validate an incoming proxy request body.
 * Accepts the stabilized format: { country_code, adjustments, meta? }
 *
 * Returns a clean backend-ready payload or null.
 */
export function validateProxyBody(
  body: unknown,
): ScenarioPayload | null {
  if (typeof body !== "object" || body === null) return null;

  const obj = body as Record<string, unknown>;

  // Extract country code
  const rawCode = obj.country_code;
  if (typeof rawCode !== "string") return null;

  const code = rawCode.toUpperCase().trim();
  if (code.length !== 2) return null;

  // Extract adjustments
  const rawAdj = obj.adjustments;
  if (typeof rawAdj !== "object" || rawAdj === null) return null;

  const shifts = rawAdj as Record<string, unknown>;

  // Build normalized adjustments — ALL 6 canonical axes, always
  const normalized: Record<string, number> = {};
  for (const canonicalAxis of CANONICAL_BACKEND_AXES) {
    const raw = shifts[canonicalAxis] ?? 0;
    const value = Number(raw);
    if (!Number.isFinite(value)) return null; // reject non-numeric
    normalized[canonicalAxis] = Math.max(MIN_SHIFT, Math.min(MAX_SHIFT, value));
  }

  // Extract or construct meta
  const rawMeta = obj.meta as Record<string, unknown> | undefined;
  const meta: ScenarioPayloadMeta = {
    preset: typeof rawMeta?.preset === "string" ? rawMeta.preset : null,
    client_version: typeof rawMeta?.client_version === "string" ? rawMeta.client_version : "v2",
    timestamp: typeof rawMeta?.timestamp === "string" ? rawMeta.timestamp : new Date().toISOString(),
  };

  return {
    country_code: code,
    adjustments: normalized as Record<CanonicalBackendAxis, number>,
    meta,
  };
}

// ── Response Validation ─────────────────────────────────────────────

/** Required top-level fields in a valid backend scenario response */
const REQUIRED_RESPONSE_FIELDS = ["composite", "rank", "classification", "axes"] as const;

/**
 * Check if a backend response has all required fields.
 * Returns true if valid, false otherwise.
 * Used by proxy to detect malformed 200s.
 */
export function isValidScenarioResponse(data: unknown): boolean {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;

  for (const field of REQUIRED_RESPONSE_FIELDS) {
    if (!(field in obj)) return false;
  }

  if (typeof obj.composite !== "number") return false;
  if (typeof obj.rank !== "number") return false;
  if (typeof obj.classification !== "string") return false;
  if (!Array.isArray(obj.axes)) return false;

  // Validate each axis entry
  for (const a of obj.axes) {
    if (typeof a !== "object" || a === null) return false;
    const ax = a as Record<string, unknown>;
    if (typeof ax.slug !== "string") return false;
    if (typeof ax.value !== "number") return false;
    if (typeof ax.delta !== "number") return false;
  }

  return true;
}
