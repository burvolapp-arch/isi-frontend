// ============================================================================
// ISI Backend — TypeScript Data Contract
// ============================================================================
// These types mirror the JSON artifacts produced by export_isi_backend_v01.py
// and served by isi_api_v01.py. ZERO interpretation. ZERO invention.
// Every field here corresponds to a real backend field.
// ============================================================================

// --- GET / ---
export interface Meta {
  project: string;
  version: string;
  reference_window: string;
  scope: string;
  num_axes: number;
  num_countries: number;
  aggregation_rule: string;
  aggregation_formula: string;
  score_range: [number, number];
  interpretation: string;
  generated_by: string;
}

// --- GET /health ---
export interface Health {
  status: "ok" | "degraded";
  backend_root: string;
  meta: boolean;
  countries_summary: boolean;
  isi_composite: boolean;
  country_detail_files: number;
  axis_detail_files: number;
}

// --- Shared sub-types ---

export interface Warning {
  id: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  text: string;
}

export interface ChannelSummary {
  id: string;
  name: string;
  source: string;
}

export interface Partner {
  partner: string;
  share: number;
}

export interface Subcategory {
  category: string;
  concentration: number;
  volume?: number;
}

export interface ChannelDetail {
  channel_id: string;
  channel_name: string;
  source: string;
  top_partners?: Partner[];
  total_partners?: number;
  subcategories?: Subcategory[];
}

export interface AuditBreakdown {
  [key: string]: number | string;
}

export type ScoreClassification =
  | "highly_concentrated"
  | "moderately_concentrated"
  | "mildly_concentrated"
  | "unconcentrated";

// --- GET /countries ---
// Array of CountrySummary
export interface CountrySummary {
  country: string;
  country_name: string;
  axis_1_financial: number | null;
  axis_2_energy: number | null;
  axis_3_technology: number | null;
  axis_4_defense: number | null;
  axis_5_critical_inputs: number | null;
  axis_6_logistics: number | null;
  isi_composite: number | null;
}

// --- GET /axes ---
// Array of AxisRegistryEntry
export interface AxisRegistryEntry {
  id: number;
  slug: string;
  name: string;
  description: string;
  unit: string;
  version: string;
  status: string;
  materialized: boolean;
  channels: ChannelSummary[];
  warnings: Warning[];
}

// --- GET /isi ---
export interface ISICompositeCountry {
  country: string;
  country_name: string;
  axis_1_financial: number | null;
  axis_2_energy: number | null;
  axis_3_technology: number | null;
  axis_4_defense: number | null;
  axis_5_critical_inputs: number | null;
  axis_6_logistics: number | null;
  isi_composite: number | null;
  classification: ScoreClassification | null;
  complete: boolean;
}

export interface ISIComposite {
  version: string;
  window: string;
  aggregation_rule: string;
  formula: string;
  countries_complete: number;
  countries_total: number;
  statistics: {
    min: number | null;
    max: number | null;
    mean: number | null;
  };
  countries: ISICompositeCountry[];
}

// --- GET /country/{code} ---
export interface CountryAxisDetail {
  axis_id: number;
  axis_slug: string;
  axis_name: string;
  score: number | null;
  classification: ScoreClassification | null;
  driver_statement: string;
  audit?: AuditBreakdown;
  channels?: ChannelDetail[];
  fuel_concentrations?: Record<string, number>;
  warnings: Warning[];
}

export interface CountryDetail {
  country: string;
  country_name: string;
  version: string;
  window: string;
  isi_composite: number | null;
  isi_classification: ScoreClassification | null;
  axes_available: number;
  axes_required: number;
  axes: CountryAxisDetail[];
}

// --- GET /country/{code}/axes ---
export interface CountryAxesSummary {
  country: string;
  country_name: string;
  isi_composite: number | null;
  axes: {
    axis_id: number;
    axis_slug: string;
    score: number | null;
    classification: ScoreClassification | null;
  }[];
}

// --- GET /country/{code}/axis/{axis_id} ---
export interface CountryAxisResponse {
  country: string;
  country_name: string;
  axis: CountryAxisDetail;
}

// --- GET /axis/{axis_id} ---
export interface AxisCountryEntry {
  country: string;
  country_name: string;
  score: number | null;
  classification: ScoreClassification | null;
  audit?: AuditBreakdown;
}

export interface AxisDetail {
  axis_id: number;
  axis_slug: string;
  axis_name: string;
  description: string;
  version: string;
  status: string;
  materialized: boolean;
  unit: string;
  countries_scored: number;
  statistics: {
    min: number | null;
    max: number | null;
    mean: number | null;
  };
  channels: ChannelSummary[];
  warnings: Warning[];
  countries: AxisCountryEntry[];
}

// --- POST /scenario ---

/**
 * Request body for scenario simulation endpoint.
 * Stabilized backend contract: { country_code, adjustments, meta }.
 * The adjustments use full canonical backend axis slugs.
 * All 6 axes MUST be present. Values are floats in [-0.20, +0.20].
 */
export interface ScenarioRequest {
  country_code: string;
  adjustments: Record<string, number>;
  meta: {
    preset: string | null;
    client_version: string;
    timestamp: string;
  };
}

/** Simulated axis score returned by scenario endpoint */
export interface ScenarioAxisResult {
  axis_slug: string;
  baseline: number | null;
  simulated: number | null;
  delta: number | null;
}

/** Response from scenario simulation endpoint */
export interface ScenarioResponse {
  country: string;
  simulated_axes: ScenarioAxisResult[];
  simulated_composite: number | null;
  simulated_rank: number | null;
  simulated_classification: ScoreClassification | null;
  baseline_composite: number | null;
  baseline_rank: number | null;
  baseline_classification: ScoreClassification | null;
  delta_from_baseline: number | null;
}
