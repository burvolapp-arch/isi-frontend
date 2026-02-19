// ============================================================================
// ISI Map Classification — Deterministic score-to-color mapping
// ============================================================================
//
// Pure functions. No side effects. No state. No external imports.
//
// Band thresholds follow HHI concentration convention:
//   null/NaN → No data        (#f3f4f6)  stone-100
//   < 0.15   → Unconcentrated (#dbeafe)  blue-100
//   0.15–0.24 → Mildly        (#60a5fa)  blue-400
//   0.25–0.49 → Moderately    (#2563eb)  blue-600
//   ≥ 0.50   → Highly         (#1e3a5f)  navy-800
//
// Sequential blue palette: light → dark correlates with low → high
// concentration. Perceptually ordered, colourblind-safe, print-friendly.
// ============================================================================

// ─── Thresholds ─────────────────────────────────────────────────────

const T_MILD = 0.15;
const T_MODERATE = 0.25;
const T_HIGH = 0.50;

// ─── Color Palette — Sequential Blues ───────────────────────────────
// Aligned with the institutional navy design system.
// Each step has clear perceptual distance from its neighbors.

const C_UNCONCENTRATED = "#dbeafe"; // blue-100 — lightest
const C_MILD           = "#60a5fa"; // blue-400
const C_MODERATE       = "#2563eb"; // blue-600
const C_HIGH           = "#1e3a5f"; // navy-800 — darkest
const C_NO_DATA        = "#f3f4f6"; // stone-100 — neutral grey

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

/** Format delta with +/− prefix (typographic minus), or em-dash for null. */
export function formatDelta(delta: number | null | undefined): string {
  if (delta === null || delta === undefined || !Number.isFinite(delta)) {
    return "\u2014";
  }
  if (delta >= 0) return `+${delta.toFixed(4)}`;
  return `\u2212${Math.abs(delta).toFixed(4)}`;
}
