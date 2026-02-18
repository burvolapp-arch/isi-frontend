// ============================================================================
// ISI Frontend — Scenario Request Validation
// ============================================================================
// Pre-flight validation for scenario simulation requests.
// Eliminates invalid payloads BEFORE they reach the network layer.
// Backend contract (v0.2): { country_code, axis_shifts }
//
// INVARIANT: No request leaves the client unless it passes this gate.
// ============================================================================

import { ALL_AXIS_SLUGS, type AxisSlug } from "./axisRegistry";

// ── Constants ───────────────────────────────────────────────────────

/** Exact set of valid axis slugs the backend accepts */
const VALID_AXIS_SLUGS = new Set<string>(ALL_AXIS_SLUGS);

/** Backend-enforced range for each axis shift */
const MIN_SHIFT = -0.20;
const MAX_SHIFT = 0.20;

/** ISO-2 uppercase country codes for EU-27 */
const EU27_CODES = new Set([
  "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "EL", "ES",
  "FI", "FR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT",
  "NL", "PL", "PT", "RO", "SE", "SI", "SK",
]);

// ── Types ───────────────────────────────────────────────────────────

export interface ValidatedScenarioPayload {
  country_code: string;
  axis_shifts: Record<AxisSlug, number>;
}

export interface ValidationFailure {
  valid: false;
  reason: string;
}

export interface ValidationSuccess {
  valid: true;
  payload: ValidatedScenarioPayload;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

// ── Validator ───────────────────────────────────────────────────────

/**
 * Validate and construct a scenario request payload.
 *
 * @param countryCode - Route parameter (will be uppercased)
 * @param adjustments - Raw user adjustments (slug → shift)
 * @returns Validated payload or structured failure reason
 *
 * Rules:
 *   - country_code must be 2-char EU-27 ISO code
 *   - All keys must be canonical axis slugs
 *   - All values must be finite numbers in [-0.20, +0.20]
 *   - Builds full 6-axis axis_shifts map (unset axes default to 0)
 */
export function validateScenarioInput(
  countryCode: string,
  adjustments: Record<string, number>,
): ValidationResult {
  // ── Country code ──
  const code = countryCode.toUpperCase().trim();
  if (code.length !== 2) {
    return { valid: false, reason: `Invalid country code length: "${code}"` };
  }
  if (!EU27_CODES.has(code)) {
    return { valid: false, reason: `Country code not in EU-27: "${code}"` };
  }

  // ── Build axis_shifts with full 6-axis coverage ──
  const axisShifts: Record<string, number> = {};

  // Initialize all axes to 0
  for (const slug of ALL_AXIS_SLUGS) {
    axisShifts[slug] = 0;
  }

  // Apply user adjustments
  for (const [key, rawValue] of Object.entries(adjustments)) {
    // Reject unknown axis slugs
    if (!VALID_AXIS_SLUGS.has(key)) {
      return { valid: false, reason: `Unknown axis slug: "${key}"` };
    }

    // Coerce to number — reject NaN
    const value = Number(rawValue);
    if (!Number.isFinite(value)) {
      return { valid: false, reason: `Non-numeric shift for ${key}: ${rawValue}` };
    }

    // Range check
    if (value < MIN_SHIFT || value > MAX_SHIFT) {
      return {
        valid: false,
        reason: `Shift for ${key} out of range [-0.20, +0.20]: ${value}`,
      };
    }

    axisShifts[key] = value;
  }

  return {
    valid: true,
    payload: {
      country_code: code,
      axis_shifts: axisShifts as Record<AxisSlug, number>,
    },
  };
}

// ── Proxy-side validator (for route.ts) ─────────────────────────────

/**
 * Validate an incoming proxy request body.
 * Accepts either frontend format { country, adjustments }
 * or direct format { country_code, axis_shifts }.
 *
 * Returns a clean backend-ready payload or null.
 */
export function validateProxyBody(
  body: unknown,
): ValidatedScenarioPayload | null {
  if (typeof body !== "object" || body === null) return null;

  const obj = body as Record<string, unknown>;

  // Extract country code from either field name
  const rawCode = obj.country_code ?? obj.country;
  if (typeof rawCode !== "string") return null;

  // Extract shifts from either field name
  const rawShifts = obj.axis_shifts ?? obj.adjustments;
  if (typeof rawShifts !== "object" || rawShifts === null) return null;

  const code = rawCode.toUpperCase().trim();
  if (code.length !== 2) return null;

  // Build sanitized axis_shifts — only canonical slugs, only valid numbers
  const axisShifts: Record<string, number> = {};

  for (const slug of ALL_AXIS_SLUGS) {
    axisShifts[slug] = 0;
  }

  for (const [key, rawValue] of Object.entries(rawShifts as Record<string, unknown>)) {
    if (!VALID_AXIS_SLUGS.has(key)) continue; // silently drop unknown keys
    const value = Number(rawValue);
    if (!Number.isFinite(value)) return null;
    if (value < MIN_SHIFT || value > MAX_SHIFT) return null;
    axisShifts[key] = value;
  }

  return {
    country_code: code,
    axis_shifts: axisShifts as Record<AxisSlug, number>,
  };
}
