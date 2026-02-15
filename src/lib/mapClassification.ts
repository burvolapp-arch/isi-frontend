// ============================================================================
// ISI Map Classification — Deterministic score-to-color mapping
// ============================================================================
//
// Pure functions. No side effects. No state. No external imports.
//
// Band thresholds follow HHI concentration convention:
//   null/NaN → No data        (#e5e7eb)
//   < 0.15   → Unconcentrated (#e2e8f0)
//   0.15–0.24 → Mildly        (#94a3b8)
//   0.25–0.49 → Moderately    (#475569)
//   ≥ 0.50   → Highly         (#0f172a)
//
// Every function is deterministic: same input → same output, always.
// ============================================================================

// ─── Thresholds ─────────────────────────────────────────────────────

const T_MILD = 0.15;
const T_MODERATE = 0.25;
const T_HIGH = 0.50;

// ─── Color Palette ──────────────────────────────────────────────────

const C_UNCONCENTRATED = "#e2e8f0";
const C_MILD = "#94a3b8";
const C_MODERATE = "#475569";
const C_HIGH = "#0f172a";
const C_NO_DATA = "#e5e7eb";

// ─── Classification Bands ───────────────────────────────────────────

export type ClassificationBand =
  | "unconcentrated"
  | "mildly_concentrated"
  | "moderately_concentrated"
  | "highly_concentrated"
  | "no_data";

// ─── Score → Fill Color ─────────────────────────────────────────────

/**
 * Deterministic: same input always produces same output.
 * Handles null, undefined, NaN, Infinity gracefully.
 */
export function classify(score: number | null | undefined): string {
  if (score === null || score === undefined || !Number.isFinite(score)) {
    return C_NO_DATA;
  }
  if (score < T_MILD) return C_UNCONCENTRATED;
  if (score < T_MODERATE) return C_MILD;
  if (score < T_HIGH) return C_MODERATE;
  return C_HIGH;
}

// ─── Score → Band Enum ──────────────────────────────────────────────

export function classifyBand(
  score: number | null | undefined,
): ClassificationBand {
  if (score === null || score === undefined || !Number.isFinite(score)) {
    return "no_data";
  }
  if (score < T_MILD) return "unconcentrated";
  if (score < T_MODERATE) return "mildly_concentrated";
  if (score < T_HIGH) return "moderately_concentrated";
  return "highly_concentrated";
}

// ─── Band → Human Label ─────────────────────────────────────────────

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
  { color: C_UNCONCENTRATED, label: "< 0.15", band: "unconcentrated" },
  { color: C_MILD, label: "0.15\u20130.24", band: "mildly_concentrated" },
  { color: C_MODERATE, label: "0.25\u20130.49", band: "moderately_concentrated" },
  { color: C_HIGH, label: "\u2265 0.50", band: "highly_concentrated" },
  { color: C_NO_DATA, label: "No data", band: "no_data" },
] as const;

// ─── Display Formatters ─────────────────────────────────────────────

/** Format score to 4 decimal places, or em-dash for null. */
export function formatMapScore(score: number | null | undefined): string {
  if (score === null || score === undefined || !Number.isFinite(score)) {
    return "\u2014";
  }
  return score.toFixed(4);
}

/** Format delta with +/- prefix, or em-dash for null. */
export function formatDelta(delta: number | null | undefined): string {
  if (delta === null || delta === undefined || !Number.isFinite(delta)) {
    return "\u2014";
  }
  const prefix = delta > 0 ? "+" : "";
  return `${prefix}${delta.toFixed(4)}`;
}
