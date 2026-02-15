// ============================================================================
// ISI Map Classification — Deterministic score-to-color mapping
// ============================================================================
// Pure functions. No side effects. No state. No imports beyond types.
//
// Color scale follows HHI concentration thresholds:
//   < 0.15  → Unconcentrated (lightest)
//   0.15–0.24 → Mildly concentrated
//   0.25–0.49 → Moderately concentrated
//   ≥ 0.50  → Highly concentrated (darkest)
//   null    → No data (neutral gray)
// ============================================================================

// ─── Thresholds (HHI standard bands) ───────────────────────────────

const THRESHOLD_MILDLY = 0.15;
const THRESHOLD_MODERATELY = 0.25;
const THRESHOLD_HIGHLY = 0.50;

// ─── Color Palette ──────────────────────────────────────────────────

const COLOR_UNCONCENTRATED = "#e2e8f0";
const COLOR_MILDLY = "#94a3b8";
const COLOR_MODERATELY = "#475569";
const COLOR_HIGHLY = "#0f172a";
const COLOR_NO_DATA = "#e5e7eb";

// ─── Classification Bands ───────────────────────────────────────────

export type ClassificationBand =
  | "unconcentrated"
  | "mildly_concentrated"
  | "moderately_concentrated"
  | "highly_concentrated"
  | "no_data";

// ─── Deterministic Score → Color ────────────────────────────────────

/**
 * Map a composite ISI score to its fill color.
 *
 * Deterministic: same input always produces same output.
 * Handles null/undefined gracefully with no-data color.
 */
export function classify(score: number | null | undefined): string {
  if (score === null || score === undefined || !Number.isFinite(score)) {
    return COLOR_NO_DATA;
  }
  if (score < THRESHOLD_MILDLY) return COLOR_UNCONCENTRATED;
  if (score < THRESHOLD_MODERATELY) return COLOR_MILDLY;
  if (score < THRESHOLD_HIGHLY) return COLOR_MODERATELY;
  return COLOR_HIGHLY;
}

/**
 * Map a composite ISI score to its classification band label.
 *
 * Used for tooltip display and diagnostics.
 */
export function classifyBand(
  score: number | null | undefined,
): ClassificationBand {
  if (score === null || score === undefined || !Number.isFinite(score)) {
    return "no_data";
  }
  if (score < THRESHOLD_MILDLY) return "unconcentrated";
  if (score < THRESHOLD_MODERATELY) return "mildly_concentrated";
  if (score < THRESHOLD_HIGHLY) return "moderately_concentrated";
  return "highly_concentrated";
}

/**
 * Human-readable label for a classification band.
 */
export function classificationBandLabel(band: ClassificationBand): string {
  switch (band) {
    case "unconcentrated":
      return "Unconcentrated";
    case "mildly_concentrated":
      return "Mildly Concentrated";
    case "moderately_concentrated":
      return "Moderately Concentrated";
    case "highly_concentrated":
      return "Highly Concentrated";
    case "no_data":
      return "No Data";
  }
}

// ─── Legend Items ────────────────────────────────────────────────────

export interface LegendItem {
  readonly color: string;
  readonly label: string;
  readonly band: ClassificationBand;
}

export const LEGEND_ITEMS: readonly LegendItem[] = [
  {
    color: COLOR_UNCONCENTRATED,
    label: "< 0.15",
    band: "unconcentrated",
  },
  {
    color: COLOR_MILDLY,
    label: "0.15\u20130.24",
    band: "mildly_concentrated",
  },
  {
    color: COLOR_MODERATELY,
    label: "0.25\u20130.49",
    band: "moderately_concentrated",
  },
  {
    color: COLOR_HIGHLY,
    label: "\u2265 0.50",
    band: "highly_concentrated",
  },
  {
    color: COLOR_NO_DATA,
    label: "No data",
    band: "no_data",
  },
] as const;

// ─── Statistics Helpers ─────────────────────────────────────────────

/**
 * Compute the arithmetic mean of a set of scores.
 * Returns null if the array is empty.
 */
export function computeMean(scores: readonly number[]): number | null {
  if (scores.length === 0) return null;
  const sum = scores.reduce((acc, s) => acc + s, 0);
  return sum / scores.length;
}

/**
 * Format a score to 4 decimal places, or em-dash for null.
 */
export function formatMapScore(
  score: number | null | undefined,
): string {
  if (score === null || score === undefined || !Number.isFinite(score)) {
    return "\u2014";
  }
  return score.toFixed(4);
}

/**
 * Format a delta value with +/- prefix.
 */
export function formatDelta(delta: number | null | undefined): string {
  if (delta === null || delta === undefined || !Number.isFinite(delta)) {
    return "\u2014";
  }
  const prefix = delta > 0 ? "+" : "";
  return `${prefix}${delta.toFixed(4)}`;
}
