// ============================================================================
// ISI Frontend — Formatting & Utility Functions
// ============================================================================
// Pure functions. No side effects. No state. No API calls.
// All display logic centralized here to prevent semantic drift.
// ============================================================================

import type { ScoreClassification, ISICompositeCountry } from "./types";

// ─── Score Formatting ───────────────────────────────────────────────

/** Format a score to 4 decimal places, or em-dash for null */
export function formatScore(score: number | null | undefined): string {
  if (score === null || score === undefined) return "—";
  return score.toFixed(4);
}

/** Format a score as percentage (0–100%), or em-dash for null */
export function formatScorePercent(score: number | null | undefined): string {
  if (score === null || score === undefined) return "—";
  return `${(score * 100).toFixed(1)}%`;
}

/** Format a large number with locale-aware separators */
export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

// ─── Classification ─────────────────────────────────────────────────

const CLASSIFICATION_LABELS: Record<ScoreClassification, string> = {
  highly_concentrated: "Highly Concentrated",
  moderately_concentrated: "Moderately Concentrated",
  mildly_concentrated: "Mildly Concentrated",
  unconcentrated: "Unconcentrated",
};

const CLASSIFICATION_DESCRIPTIONS: Record<ScoreClassification, string> = {
  highly_concentrated:
    "HHI ≥ 0.50 — Extreme concentration in one or very few external sources.",
  moderately_concentrated:
    "HHI 0.25–0.49 — Significant concentration across a small number of sources.",
  mildly_concentrated:
    "HHI 0.15–0.24 — Moderate spread, but notable concentration remains.",
  unconcentrated:
    "HHI < 0.15 — Broadly distributed across many external sources.",
};

export function classificationLabel(
  c: ScoreClassification | null | undefined
): string {
  if (!c) return "N/A";
  return CLASSIFICATION_LABELS[c];
}

export function classificationDescription(
  c: ScoreClassification
): string {
  return CLASSIFICATION_DESCRIPTIONS[c];
}

// ─── Statistics ─────────────────────────────────────────────────────

/** Compute percentile rank (0–100) of a score within a set of scores */
export function computePercentile(
  score: number,
  allScores: number[]
): number {
  if (allScores.length === 0) return 0;
  const below = allScores.filter((s) => s < score).length;
  return Math.round((below / allScores.length) * 100);
}

/** Compute deviation from mean. Positive = above mean = more concentrated. */
export function deviationFromMean(
  score: number | null,
  mean: number | null
): number | null {
  if (score === null || mean === null) return null;
  return score - mean;
}

/** Extract all non-null composite scores from ISI country list */
export function extractCompositeScores(
  countries: ISICompositeCountry[]
): number[] {
  return countries
    .map((c) => c.isi_composite)
    .filter((s): s is number => s !== null);
}

/** Get the axis score fields as an array from a composite country entry */
export function getAxisScores(
  c: ISICompositeCountry
): { key: string; label: string; value: number | null }[] {
  return [
    { key: "axis_1_financial", label: "Financial", value: c.axis_1_financial },
    { key: "axis_2_energy", label: "Energy", value: c.axis_2_energy },
    { key: "axis_3_technology", label: "Technology", value: c.axis_3_technology },
    { key: "axis_4_defense", label: "Defense", value: c.axis_4_defense },
    { key: "axis_5_critical_inputs", label: "Critical Inputs", value: c.axis_5_critical_inputs },
    { key: "axis_6_logistics", label: "Logistics", value: c.axis_6_logistics },
  ];
}

// ─── Slug / Routing ─────────────────────────────────────────────────

/** Country code to lowercase for URL slug (DE → de) */
export function countrySlug(code: string): string {
  return code.toLowerCase();
}

/** Axis slug is already lowercase from backend (e.g. "financial", "energy") */
export function axisHref(slug: string): string {
  return `/axis/${slug}`;
}

export function countryHref(code: string): string {
  return `/country/${countrySlug(code)}`;
}
