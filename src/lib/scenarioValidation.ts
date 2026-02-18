// ============================================================================
// ISI Frontend — Scenario Validation (zero external dependencies)
// ============================================================================
// Pre-flight validator for the client. No Zod. No heavy imports.
// Keeps the client bundle minimal and production-safe.
// ============================================================================

import { ALL_AXIS_SLUGS, type AxisSlug } from "./axisRegistry";

const MIN_SHIFT = -0.20;
const MAX_SHIFT = 0.20;

const UI_SLUG_TO_BACKEND_KEY: Record<AxisSlug, string> = {
  financial: "financial_external_supplier_concentration",
  energy: "energy_external_supplier_concentration",
  technology: "technology_semiconductor_external_supplier_concentration",
  defense: "defense_external_supplier_concentration",
  critical_inputs: "critical_inputs_raw_materials_external_supplier_concentration",
  logistics: "logistics_freight_external_supplier_concentration",
};

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

// ── Payload Builder ─────────────────────────────────────────────────

export function buildScenarioPayload(
  countryCode: string,
  uiAdjustments: Record<string, number>,
): ScenarioPayload {
  const adjustments: Record<string, number> = {};

  for (const slug of ALL_AXIS_SLUGS) {
    const backendKey = UI_SLUG_TO_BACKEND_KEY[slug];
    const raw = uiAdjustments[slug];
    const value = raw !== undefined && raw !== null ? parseFloat(String(raw)) : 0;
    const clamped = Number.isFinite(value)
      ? Math.max(MIN_SHIFT, Math.min(MAX_SHIFT, value))
      : 0.0;
    adjustments[backendKey] = clamped;
  }

  return {
    country: countryCode.toUpperCase().trim(),
    adjustments,
  };
}

// ── Pre-flight Validator ────────────────────────────────────────────

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

  for (const [key, rawValue] of Object.entries(adjustments)) {
    const value = parseFloat(String(rawValue));
    if (!Number.isFinite(value)) {
      return { valid: false, reason: `Non-numeric adjustment for ${key}: ${rawValue}` };
    }
  }

  const payload = buildScenarioPayload(code, adjustments);
  return { valid: true, payload };
}
