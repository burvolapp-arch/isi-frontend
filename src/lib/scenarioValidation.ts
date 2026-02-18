// ============================================================================
// ISI Frontend — Scenario Payload Builder & Validation
// ============================================================================
// Single source of truth for constructing scenario simulation payloads.
//
// Backend contract (hardened):
//   POST /scenario
//   Body: { country: string (2-letter uppercase), adjustments: { [longBackendSlug]: number } }
//
// INVARIANTS:
//   - country is ALWAYS 2-letter uppercase
//   - adjustments keys are long-form backend axis slugs
//   - ALL 6 axes are ALWAYS present (including zeros)
//   - all values are parseFloat-coerced, bounded to [-0.2, 0.2]
//   - no meta block, no extra keys
// ============================================================================

import {
  ALL_AXIS_SLUGS,
  type AxisSlug,
} from "./axisRegistry";

// ── Constants ───────────────────────────────────────────────────────

const MIN_SHIFT = -0.20;
const MAX_SHIFT = 0.20;

/** Long-form backend axis slugs — the ONLY keys the backend accepts */
const UI_TO_BACKEND: Record<AxisSlug, string> = {
  financial: "financial_external_supplier_concentration",
  energy: "energy_external_supplier_concentration",
  technology: "technology_semiconductor_external_supplier_concentration",
  defense: "defense_external_supplier_concentration",
  critical_inputs: "critical_inputs_raw_materials_external_supplier_concentration",
  logistics: "logistics_freight_external_supplier_concentration",
};

/** Set of valid long-form backend axis slugs */
const VALID_BACKEND_SLUGS: Set<string> = new Set(Object.values(UI_TO_BACKEND));

/** ISO-2 uppercase country codes for EU-27 */
const EU27_CODES = new Set([
  "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "EL", "ES",
  "FI", "FR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT",
  "NL", "PL", "PT", "RO", "SE", "SI", "SK",
]);

// ── Types ───────────────────────────────────────────────────────────

export interface ScenarioPayload {
  country: string;
  adjustments: Record<string, number>;
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
 * Build a scenario payload from UI-level inputs.
 *
 * GUARANTEES:
 *   - country is 2-letter uppercase
 *   - adjustments keys are long-form backend axis slugs
 *   - ALL 6 axes are ALWAYS present (including zeros)
 *   - all values are parseFloat-coerced, clamped to [-0.2, 0.2]
 *   - no extra keys, no meta block
 *
 * @param countryCode - 2-letter ISO code (uppercased internally)
 * @param uiAdjustments - UI-level adjustments (short slug → number)
 */
export function buildScenarioPayload(
  countryCode: string,
  uiAdjustments: Record<string, number>,
): ScenarioPayload {
  const adjustments: Record<string, number> = {};

  for (const slug of ALL_AXIS_SLUGS) {
    const raw = uiAdjustments[slug];
    const value = raw !== undefined && raw !== null
      ? parseFloat(String(raw))
      : 0;

    const clamped = Number.isFinite(value)
      ? Math.max(MIN_SHIFT, Math.min(MAX_SHIFT, value))
      : 0.0;

    const backendSlug = UI_TO_BACKEND[slug];
    adjustments[backendSlug] = clamped;
  }

  return {
    country: countryCode.toUpperCase().trim(),
    adjustments,
  };
}

// ── Pre-flight Validator ────────────────────────────────────────────

/**
 * Validate inputs BEFORE building the payload.
 * Returns a structurally correct payload or a failure reason.
 * Invalid inputs are BLOCKED — no request leaves the client.
 */
export function validateScenarioInput(
  countryCode: string,
  adjustments: Record<string, number>,
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
    const value = parseFloat(String(rawValue));
    if (!Number.isFinite(value)) {
      return { valid: false, reason: `Non-numeric shift for ${key}: ${rawValue}` };
    }
  }

  const payload = buildScenarioPayload(code, adjustments);
  return { valid: true, payload };
}

// ── Proxy-side Validator (for route.ts) ─────────────────────────────

/**
 * Validate an incoming proxy request body.
 * Accepts: { country: string, adjustments: { [longBackendSlug]: number } }
 *
 * Returns a clean backend-ready payload or null.
 */
export function validateProxyBody(
  body: unknown,
): ScenarioPayload | null {
  if (typeof body !== "object" || body === null) return null;

  const obj = body as Record<string, unknown>;

  // Extract and validate country
  const rawCountry = obj.country;
  if (typeof rawCountry !== "string") return null;

  const country = rawCountry.toUpperCase().trim();
  if (country.length !== 2) return null;

  // Extract adjustments
  const rawAdj = obj.adjustments;
  if (typeof rawAdj !== "object" || rawAdj === null) return null;

  const inputAdj = rawAdj as Record<string, unknown>;
  const adjustments: Record<string, number> = {};

  for (const [key, rawValue] of Object.entries(inputAdj)) {
    // Only allow long-form backend axis slugs
    if (!VALID_BACKEND_SLUGS.has(key)) continue;

    const value = parseFloat(String(rawValue));
    if (!Number.isFinite(value)) return null; // reject non-numeric

    adjustments[key] = Math.max(MIN_SHIFT, Math.min(MAX_SHIFT, value));
  }

  return { country, adjustments };
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

  for (const a of obj.axes) {
    if (typeof a !== "object" || a === null) return false;
    const ax = a as Record<string, unknown>;
    if (typeof ax.slug !== "string") return false;
    if (typeof ax.value !== "number") return false;
    if (typeof ax.delta !== "number") return false;
  }

  return true;
}
