// ============================================================================
// ISI Frontend — Scenario Contract v1 (Single Source of Truth)
// ============================================================================
// This file defines the EXACT contract between frontend and backend for
// scenario simulation. Every request/response MUST conform to these schemas.
//
// Backend endpoint: POST /scenario
// Request:  { country: "SE", adjustments: { <AXIS_KEY>: float } }
// Response: { composite, rank, classification, axes[], request_id? }
//
// NO other file may define axis keys for the scenario payload.
// NO other file may define request/response shapes.
// ============================================================================

import { z } from "zod";

// ── Canonical Backend Axis Keys ─────────────────────────────────────
// These are the ONLY keys the backend accepts in `adjustments`.
// Order matches the 6 ISI axes.

export const AXIS_KEYS = [
  "financial_external_supplier_concentration",
  "energy_external_supplier_concentration",
  "technology_semiconductor_external_supplier_concentration",
  "defense_external_supplier_concentration",
  "critical_inputs_raw_materials_external_supplier_concentration",
  "logistics_freight_external_supplier_concentration",
] as const;

export type AxisKey = (typeof AXIS_KEYS)[number];

/** Set for O(1) membership checks */
export const AXIS_KEY_SET: ReadonlySet<string> = new Set(AXIS_KEYS);

// ── UI Slug → Backend Key ───────────────────────────────────────────

import type { AxisSlug } from "./axisRegistry";

export const UI_SLUG_TO_BACKEND_KEY: Record<AxisSlug, AxisKey> = {
  financial: "financial_external_supplier_concentration",
  energy: "energy_external_supplier_concentration",
  technology: "technology_semiconductor_external_supplier_concentration",
  defense: "defense_external_supplier_concentration",
  critical_inputs: "critical_inputs_raw_materials_external_supplier_concentration",
  logistics: "logistics_freight_external_supplier_concentration",
};

export const BACKEND_KEY_TO_UI_SLUG: Record<AxisKey, AxisSlug> = Object.fromEntries(
  Object.entries(UI_SLUG_TO_BACKEND_KEY).map(([ui, be]) => [be, ui as AxisSlug]),
) as Record<AxisKey, AxisSlug>;

// ── Constants ───────────────────────────────────────────────────────

export const MIN_SHIFT = -0.20;
export const MAX_SHIFT = 0.20;

const EU27_CODES = new Set([
  "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "EL", "ES",
  "FI", "FR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT",
  "NL", "PL", "PT", "RO", "SE", "SI", "SK",
]);

export function isEU27(code: string): boolean {
  return EU27_CODES.has(code.toUpperCase().trim());
}

// ── Zod Schemas ─────────────────────────────────────────────────────

/** Schema for the adjustments object — all values must be finite floats */
const AdjustmentsSchema = z.record(
  z.string(),
  z.number().finite(),
).refine(
  (obj) => Object.keys(obj).every((k) => AXIS_KEY_SET.has(k)),
  { message: "adjustments contains unknown axis key" },
);

/** Schema for the full scenario request payload */
export const ScenarioRequestSchema = z.object({
  country: z.string().length(2).transform((s) => s.toUpperCase()),
  adjustments: AdjustmentsSchema,
});

export type ScenarioRequestPayload = z.infer<typeof ScenarioRequestSchema>;

/** Schema for a single axis in the backend response */
const BackendAxisSchema = z.object({
  slug: z.string(),
  value: z.number(),
  delta: z.number(),
});

/** Schema for the raw backend response */
export const BackendResponseSchema = z.object({
  composite: z.number(),
  rank: z.number(),
  classification: z.string(),
  axes: z.array(BackendAxisSchema),
  request_id: z.string().optional(),
});

export type BackendResponse = z.infer<typeof BackendResponseSchema>;

// ── Frontend-shaped response (transformed from backend) ─────────────

export const FrontendAxisResultSchema = z.object({
  axis_slug: z.string(),
  baseline: z.number().nullable(),
  simulated: z.number().nullable(),
  delta: z.number().nullable(),
});

export const FrontendResponseSchema = z.object({
  country: z.string(),
  simulated_axes: z.array(FrontendAxisResultSchema),
  simulated_composite: z.number().nullable(),
  simulated_rank: z.number().nullable(),
  simulated_classification: z.string().nullable(),
  baseline_composite: z.number().nullable(),
  baseline_rank: z.number().nullable(),
  baseline_classification: z.string().nullable(),
  delta_from_baseline: z.number().nullable(),
});

export type FrontendResponse = z.infer<typeof FrontendResponseSchema>;

// ── Request Builder ─────────────────────────────────────────────────

/**
 * Build a backend-ready scenario request from UI-level inputs.
 *
 * GUARANTEES:
 *   - country is 2-letter uppercase
 *   - adjustments uses ONLY backend axis keys
 *   - ALL 6 axes always present (zeros included)
 *   - values are float-coerced, clamped to [-0.20, +0.20]
 */
export function buildScenarioRequest(
  countryCode: string,
  uiAdjustments: Record<string, number>,
): ScenarioRequestPayload {
  const adjustments: Record<string, number> = {};

  for (const [uiSlug, backendKey] of Object.entries(UI_SLUG_TO_BACKEND_KEY)) {
    const raw = uiAdjustments[uiSlug];
    const value =
      raw !== undefined && raw !== null ? parseFloat(String(raw)) : 0;
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

// ── Response Transformer ────────────────────────────────────────────

/**
 * Transform a validated backend response into the frontend shape.
 */
export function transformBackendResponse(
  country: string,
  resp: BackendResponse,
): FrontendResponse {
  const simulatedAxes = resp.axes.map((a) => ({
    axis_slug: a.slug,
    baseline: a.value - a.delta,
    simulated: a.value,
    delta: a.delta,
  }));

  const baselineValues = simulatedAxes.map((a) => a.baseline);
  const baselineComposite =
    baselineValues.length > 0
      ? baselineValues.reduce((s, v) => s + (v ?? 0), 0) / baselineValues.length
      : null;

  return {
    country,
    simulated_axes: simulatedAxes,
    simulated_composite: resp.composite,
    simulated_rank: resp.rank,
    simulated_classification: resp.classification,
    baseline_composite: baselineComposite,
    baseline_rank: null,
    baseline_classification: null,
    delta_from_baseline:
      baselineComposite !== null ? resp.composite - baselineComposite : null,
  };
}
