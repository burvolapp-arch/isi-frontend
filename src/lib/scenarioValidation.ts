// ============================================================================
// ISI Frontend — Scenario Payload Builder & Validation
// ============================================================================
// Single source of truth for constructing scenario simulation payloads.
//
// Backend contract (hardened):
//   POST /scenario
//   Body: { country: string (2-letter uppercase), shifts: { [canonicalAxisName]: number } }
//
// INVARIANTS:
//   - country is ALWAYS 2-letter uppercase
//   - shifts only include canonical axis names from axisRegistry
//   - all values are parseFloat-coerced, bounded to [-0.2, 0.2]
//   - zero-value shifts are EXCLUDED from payload
//   - no meta block, no extra keys
// ============================================================================

import {
  AXIS_CANONICAL_NAMES,
  ALL_AXIS_SLUGS,
  type AxisSlug,
} from "./axisRegistry";

// ── Constants ───────────────────────────────────────────────────────

const MIN_SHIFT = -0.20;
const MAX_SHIFT = 0.20;

/** Set of valid canonical axis names (display-name form, from axisRegistry) */
const VALID_CANONICAL_NAMES: Set<string> = new Set(Object.values(AXIS_CANONICAL_NAMES));

/** ISO-2 uppercase country codes for EU-27 */
const EU27_CODES = new Set([
  "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "EL", "ES",
  "FI", "FR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT",
  "NL", "PL", "PT", "RO", "SE", "SI", "SK",
]);

// ── Types ───────────────────────────────────────────────────────────

export interface ScenarioPayload {
  country: string;
  shifts: Record<string, number>;
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
 *   - shifts keys are canonical axis names from AXIS_CANONICAL_NAMES
 *   - all values are parseFloat-coerced, clamped to [-0.2, 0.2]
 *   - zero-value shifts are EXCLUDED
 *   - no extra keys, no meta block
 *
 * @param countryCode - 2-letter ISO code (uppercased internally)
 * @param adjustments - UI-level adjustments (short slug → number)
 */
export function buildScenarioPayload(
  countryCode: string,
  adjustments: Record<string, number>,
): ScenarioPayload {
  const shifts: Record<string, number> = {};

  for (const slug of ALL_AXIS_SLUGS) {
    const raw = adjustments[slug];
    if (raw === undefined || raw === null) continue;

    const value = parseFloat(String(raw));
    if (!Number.isFinite(value)) continue;

    const clamped = Math.max(MIN_SHIFT, Math.min(MAX_SHIFT, value));
    if (clamped === 0) continue; // exclude zero shifts

    const canonicalName = AXIS_CANONICAL_NAMES[slug];
    shifts[canonicalName] = clamped;
  }

  return {
    country: countryCode.toUpperCase().trim(),
    shifts,
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
 * Accepts: { country: string, shifts: { [canonicalAxisName]: number } }
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

  // Extract shifts
  const rawShifts = obj.shifts;
  if (typeof rawShifts !== "object" || rawShifts === null) return null;

  const inputShifts = rawShifts as Record<string, unknown>;
  const shifts: Record<string, number> = {};

  for (const [key, rawValue] of Object.entries(inputShifts)) {
    // Only allow canonical axis names from axisRegistry
    if (!VALID_CANONICAL_NAMES.has(key)) continue;

    const value = parseFloat(String(rawValue));
    if (!Number.isFinite(value)) return null; // reject non-numeric

    const clamped = Math.max(MIN_SHIFT, Math.min(MAX_SHIFT, value));
    if (clamped === 0) continue; // exclude zero shifts

    shifts[key] = clamped;
  }

  return { country, shifts };
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
