// ============================================================================
// ISI Frontend — Formatting & Utility Functions
// ============================================================================
// Pure functions. No side effects. No state. No API calls.
// All display logic centralized here to prevent semantic drift.
// ============================================================================

import type {
  ScoreClassification,
  ISICompositeCountry,
  AxisRegistryEntry,
} from "./types";

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

/** Return the HHI classification for a given score */
export function classifyScore(score: number): ScoreClassification {
  if (score >= 0.5) return "highly_concentrated";
  if (score >= 0.25) return "moderately_concentrated";
  if (score >= 0.15) return "mildly_concentrated";
  return "unconcentrated";
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

/** Compute standard deviation from a set of scores */
export function computeStdDev(scores: number[]): number {
  if (scores.length === 0) return 0;
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance =
    scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / scores.length;
  return Math.sqrt(variance);
}

/** Compute median from a set of scores */
export function computeMedian(scores: number[]): number {
  if (scores.length === 0) return 0;
  const sorted = [...scores].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ─── Dynamic Axis Extraction (SEMANTIC SAFEGUARD) ───────────────────
// NEVER hardcode axis count, names, or field keys.
// Axis fields are discovered dynamically from the registry + data shape.

/**
 * Discover axis field keys dynamically from an ISICompositeCountry object.
 * Matches keys like "axis_N_*" where the value is number | null.
 * Returns keys sorted by axis number.
 */
export function discoverAxisFieldKeys(
  sample: ISICompositeCountry
): string[] {
  return Object.keys(sample)
    .filter((key) => /^axis_\d+_/.test(key))
    .sort((a, b) => {
      const numA = parseInt(a.match(/^axis_(\d+)_/)?.[1] ?? "0", 10);
      const numB = parseInt(b.match(/^axis_(\d+)_/)?.[1] ?? "0", 10);
      return numA - numB;
    });
}

/**
 * Derive axis column metadata by matching discovered field keys to
 * the axis registry. This is the ONLY way to build axis columns.
 */
export function deriveAxisColumns(
  sample: ISICompositeCountry,
  registry: AxisRegistryEntry[]
): { fieldKey: string; axisId: number; label: string; slug: string; tooltip: string }[] {
  const fieldKeys = discoverAxisFieldKeys(sample);
  const registryMap = new Map<number, AxisRegistryEntry>();
  for (const entry of registry) registryMap.set(entry.id, entry);

  return fieldKeys.map((key) => {
    const axisNum = parseInt(key.match(/^axis_(\d+)_/)?.[1] ?? "0", 10);
    const entry = registryMap.get(axisNum);
    return {
      fieldKey: key,
      axisId: axisNum,
      label: entry?.name ?? key.replace(/^axis_\d+_/, "").replace(/_/g, " "),
      slug: entry?.slug ?? key.replace(/^axis_\d+_/, ""),
      tooltip: entry
        ? `${entry.description} (${entry.unit})`
        : "Axis metadata unavailable",
    };
  });
}

/**
 * Get axis scores dynamically from a composite country entry.
 * Uses field key discovery — never a hardcoded list.
 */
export function getAxisScores(
  c: ISICompositeCountry
): { key: string; label: string; value: number | null }[] {
  const fieldKeys = discoverAxisFieldKeys(c);
  return fieldKeys.map((key) => ({
    key,
    label: key
      .replace(/^axis_\d+_/, "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (ch) => ch.toUpperCase()),
    value: (c as unknown as Record<string, unknown>)[key] as number | null,
  }));
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
