// ============================================================================
// ISI Frontend — Scenario Validation (delegates to scenarioContract.ts)
// ============================================================================
// Thin validation layer. The canonical contract lives in scenarioContract.ts.
// This file provides the pre-flight validator for the client and the
// proxy-side body validator for route.ts.
// ============================================================================

import {
  buildScenarioRequest,
  ScenarioRequestSchema,
  BackendResponseSchema,
  isEU27,
  type ScenarioRequestPayload,
} from "./scenarioContract";

// ── Re-exports (for backward compat) ────────────────────────────────

export type ScenarioPayload = ScenarioRequestPayload;
export { buildScenarioRequest as buildScenarioPayload };

// ── Types ───────────────────────────────────────────────────────────

export interface ValidationFailure {
  valid: false;
  reason: string;
}

export interface ValidationSuccess {
  valid: true;
  payload: ScenarioPayload;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

// ── Pre-flight Validator (client-side) ──────────────────────────────

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
  if (!isEU27(code)) {
    return { valid: false, reason: `Country code not in EU-27: "${code}"` };
  }

  // Validate each adjustment value is a usable number
  for (const [key, rawValue] of Object.entries(adjustments)) {
    const value = parseFloat(String(rawValue));
    if (!Number.isFinite(value)) {
      return { valid: false, reason: `Non-numeric adjustment for ${key}: ${rawValue}` };
    }
  }

  const payload = buildScenarioRequest(code, adjustments);
  return { valid: true, payload };
}

// ── Proxy-side Validator (for route.ts) — Zod-based ─────────────────

/**
 * Validate an incoming proxy request body using Zod.
 * Returns a clean backend-ready payload or null.
 */
export function validateProxyBody(
  body: unknown,
): ScenarioPayload | null {
  const result = ScenarioRequestSchema.safeParse(body);
  if (!result.success) return null;
  return result.data;
}

// ── Response Validation — Zod-based ─────────────────────────────────

/**
 * Validate a backend scenario response using Zod.
 * Returns { success: true, data } or { success: false, issues }.
 */
export function validateBackendResponse(data: unknown) {
  return BackendResponseSchema.safeParse(data);
}

/**
 * Legacy boolean check — delegates to Zod.
 */
export function isValidScenarioResponse(data: unknown): boolean {
  return BackendResponseSchema.safeParse(data).success;
}
