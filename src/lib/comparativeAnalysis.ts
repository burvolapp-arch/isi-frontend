// ============================================================================
// ISI Frontend — Comparative Structural Analysis Engine
// ============================================================================
// Pure deterministic computations for bilateral country comparison.
// No side effects. No API calls. No state.
// All metrics derived client-side from ISI composite data.
// ============================================================================

import {
  ALL_AXIS_SLUGS,
  AXIS_FIELD_MAP,
  type AxisSlug,
} from "./axisRegistry";
import { formatAxisShort, formatScore, formatDelta } from "./presentation";
import type { ISICompositeCountry } from "./types";

// ─── Types ──────────────────────────────────────────────────────────

export interface AxisComparison {
  slug: AxisSlug;
  label: string;
  scoreA: number | null;
  scoreB: number | null;
  delta: number | null;
  absDelta: number;
  moreConcentrated: "A" | "B" | "equal" | null;
  percentileA: number | null;
  percentileB: number | null;
  contributionShareA: number | null;
  contributionShareB: number | null;
}

export type DivergenceLevel = "low" | "moderate" | "high";

export type VulnerabilitySymmetry =
  | "symmetric"
  | "asymmetric"
  | "complementary";

export type StructuralProfile =
  | "defense-dominant"
  | "energy-dominant"
  | "technology-dominant"
  | "financial-dominant"
  | "critical-inputs-dominant"
  | "logistics-dominant"
  | "multi-axis-moderate"
  | "balanced-low"
  | "single-axis-vulnerability";

export interface StructuralDiagnostic {
  /** Sum of absolute axis deltas */
  structuralDistance: number;
  /** Normalized distance (0–1 scale relative to theoretical max) */
  normalizedDistance: number;
  /** Qualitative divergence label */
  divergenceLevel: DivergenceLevel;
  /** Axis with largest absolute gap */
  dominantDivergenceAxis: AxisSlug | null;
  /** Largest absolute axis gap value */
  dominantDivergenceMagnitude: number;
  /** Whether divergence is concentrated in one axis */
  divergenceConcentrated: boolean;
  /** Top divergence axis's share of total divergence */
  dominantAxisDivergenceShare: number;
  /** Vulnerability symmetry classification */
  symmetry: VulnerabilitySymmetry;
  /** Structural profile for country A */
  profileA: StructuralProfile;
  /** Structural profile for country B */
  profileB: StructuralProfile;
  /** Per-axis comparison data */
  axes: AxisComparison[];
}

// ─── Axis Score Extraction ──────────────────────────────────────────

function getAxisScore(c: ISICompositeCountry, slug: AxisSlug): number | null {
  const field = AXIS_FIELD_MAP[slug];
  const val = (c as unknown as Record<string, unknown>)[field];
  return typeof val === "number" ? val : null;
}

function getAxisScores(c: ISICompositeCountry): Record<AxisSlug, number | null> {
  const result = {} as Record<AxisSlug, number | null>;
  for (const slug of ALL_AXIS_SLUGS) {
    result[slug] = getAxisScore(c, slug);
  }
  return result;
}

// ─── EU Percentiles ─────────────────────────────────────────────────

/**
 * Compute percentile rank (0–100) for each axis across all EU countries.
 * Percentile = % of countries with a LOWER score (less concentrated).
 */
export function computeAxisPercentiles(
  country: ISICompositeCountry,
  allCountries: ISICompositeCountry[],
): Record<AxisSlug, number | null> {
  const result = {} as Record<AxisSlug, number | null>;
  for (const slug of ALL_AXIS_SLUGS) {
    const score = getAxisScore(country, slug);
    if (score === null) {
      result[slug] = null;
      continue;
    }
    const allScores = allCountries
      .map((c) => getAxisScore(c, slug))
      .filter((s): s is number => s !== null);
    if (allScores.length === 0) {
      result[slug] = null;
      continue;
    }
    const below = allScores.filter((s) => s < score).length;
    result[slug] = Math.round((below / allScores.length) * 100);
  }
  return result;
}

/**
 * Compute composite percentile rank.
 */
export function computeCompositePercentile(
  score: number | null,
  allCountries: ISICompositeCountry[],
): number | null {
  if (score === null) return null;
  const allScores = allCountries
    .map((c) => c.isi_composite)
    .filter((s): s is number => s !== null);
  if (allScores.length === 0) return null;
  const below = allScores.filter((s) => s < score).length;
  return Math.round((below / allScores.length) * 100);
}

// ─── Contribution Share ─────────────────────────────────────────────

/**
 * Compute each axis's contribution share to composite.
 * Share = axis_score / sum_of_all_axis_scores.
 * This is the structural weight of each dimension in the overall profile.
 */
function computeContributionShares(
  c: ISICompositeCountry,
): Record<AxisSlug, number | null> {
  const scores = getAxisScores(c);
  const nonNull = Object.values(scores).filter((v): v is number => v !== null);
  const total = nonNull.reduce((a, b) => a + b, 0);
  const result = {} as Record<AxisSlug, number | null>;
  for (const slug of ALL_AXIS_SLUGS) {
    const s = scores[slug];
    result[slug] = s !== null && total > 0 ? s / total : null;
  }
  return result;
}

// ─── Structural Profile Classification ──────────────────────────────

function classifyStructuralProfile(c: ISICompositeCountry): StructuralProfile {
  const scores = getAxisScores(c);
  const entries = ALL_AXIS_SLUGS
    .map((slug) => ({ slug, score: scores[slug] }))
    .filter((e): e is { slug: AxisSlug; score: number } => e.score !== null)
    .sort((a, b) => b.score - a.score);

  if (entries.length < 2) return "multi-axis-moderate";

  const top = entries[0];
  const second = entries[1];
  const mean = entries.reduce((a, b) => a + b.score, 0) / entries.length;
  const variance = entries.reduce((a, b) => a + (b.score - mean) ** 2, 0) / entries.length;
  const stdDev = Math.sqrt(variance);
  const composite = c.isi_composite;

  // Balanced low: all axes below 0.15 (unconcentrated threshold)
  if (entries.every((e) => e.score < 0.15)) return "balanced-low";

  // Single-axis vulnerability: top axis ≥ 0.50 and dominates by 2x over second
  if (top.score >= 0.50 && top.score >= second.score * 2) {
    return "single-axis-vulnerability";
  }

  // Dominant axis: top axis is more than 1.5 stdDev above mean
  if (stdDev > 0.01 && top.score > mean + 1.5 * stdDev) {
    const domainMap: Record<AxisSlug, StructuralProfile> = {
      defense: "defense-dominant",
      energy: "energy-dominant",
      technology: "technology-dominant",
      financial: "financial-dominant",
      critical_inputs: "critical-inputs-dominant",
      logistics: "logistics-dominant",
    };
    return domainMap[top.slug] ?? "multi-axis-moderate";
  }

  // Multi-axis moderate: composite ≥ 0.15 with relatively even spread
  return "multi-axis-moderate";
}

const PROFILE_LABELS: Record<StructuralProfile, string> = {
  "defense-dominant": "Defense-Dominant Concentration",
  "energy-dominant": "Energy-Dominant Concentration",
  "technology-dominant": "Technology-Dominant Concentration",
  "financial-dominant": "Financial-Dominant Concentration",
  "critical-inputs-dominant": "Critical Inputs-Dominant Concentration",
  "logistics-dominant": "Logistics-Dominant Concentration",
  "multi-axis-moderate": "Multi-Axis Moderate Exposure",
  "balanced-low": "Balanced Low Exposure",
  "single-axis-vulnerability": "Single-Axis Vulnerability",
};

export function profileLabel(p: StructuralProfile): string {
  return PROFILE_LABELS[p];
}

// ─── Vulnerability Symmetry ─────────────────────────────────────────

function classifySymmetry(
  scoresA: Record<AxisSlug, number | null>,
  scoresB: Record<AxisSlug, number | null>,
): VulnerabilitySymmetry {
  const pairs: { a: number; b: number }[] = [];
  for (const slug of ALL_AXIS_SLUGS) {
    const a = scoresA[slug];
    const b = scoresB[slug];
    if (a !== null && b !== null) pairs.push({ a, b });
  }
  if (pairs.length < 2) return "symmetric";

  // Count axes where both are high (>0.25), both are low (<0.15), or divergent
  let bothHigh = 0;
  let bothLow = 0;
  let divergent = 0;
  let complementary = 0;

  for (const { a, b } of pairs) {
    const aHigh = a >= 0.25;
    const bHigh = b >= 0.25;
    const aLow = a < 0.15;
    const bLow = b < 0.15;

    if (aHigh && bHigh) bothHigh++;
    else if (aLow && bLow) bothLow++;
    else if ((aHigh && bLow) || (aLow && bHigh)) complementary++;
    else divergent++;
  }

  // Complementary: at least 2 axes where one is high and the other is low
  if (complementary >= 2) return "complementary";

  // Symmetric: most axes have similar exposure levels
  const symmetric = bothHigh + bothLow;
  if (symmetric >= pairs.length * 0.6) return "symmetric";

  return "asymmetric";
}

const SYMMETRY_LABELS: Record<VulnerabilitySymmetry, string> = {
  symmetric: "Symmetric Exposure",
  asymmetric: "Asymmetric Exposure",
  complementary: "Complementary Structural Profile",
};

export function symmetryLabel(s: VulnerabilitySymmetry): string {
  return SYMMETRY_LABELS[s];
}

const SYMMETRY_DESCRIPTIONS: Record<VulnerabilitySymmetry, string> = {
  symmetric:
    "Both countries exhibit similar concentration patterns across axes. Structural vulnerabilities are broadly parallel.",
  asymmetric:
    "Concentration profiles diverge across multiple axes. Structural vulnerabilities differ in both domain and magnitude.",
  complementary:
    "Countries show inverse concentration patterns — axes where one is concentrated, the other is diversified.",
};

export function symmetryDescription(s: VulnerabilitySymmetry): string {
  return SYMMETRY_DESCRIPTIONS[s];
}

// ─── Divergence Level ───────────────────────────────────────────────

function classifyDivergence(normalizedDistance: number): DivergenceLevel {
  // Normalized 0–1. Thresholds calibrated to 6-axis HHI comparison.
  if (normalizedDistance < 0.15) return "low";
  if (normalizedDistance < 0.35) return "moderate";
  return "high";
}

const DIVERGENCE_LABELS: Record<DivergenceLevel, string> = {
  low: "Low Structural Divergence",
  moderate: "Moderate Structural Divergence",
  high: "High Structural Divergence",
};

export function divergenceLabel(d: DivergenceLevel): string {
  return DIVERGENCE_LABELS[d];
}

// ─── Main Diagnostic Function ───────────────────────────────────────

/**
 * Compute complete structural diagnostic for two countries.
 * All metrics are deterministic and derived from ISI composite data.
 */
export function computeStructuralDiagnostic(
  countryA: ISICompositeCountry,
  countryB: ISICompositeCountry,
  allCountries: ISICompositeCountry[],
): StructuralDiagnostic {
  const scoresA = getAxisScores(countryA);
  const scoresB = getAxisScores(countryB);
  const percentilesA = computeAxisPercentiles(countryA, allCountries);
  const percentilesB = computeAxisPercentiles(countryB, allCountries);
  const sharesA = computeContributionShares(countryA);
  const sharesB = computeContributionShares(countryB);

  // Build per-axis comparison
  const axes: AxisComparison[] = ALL_AXIS_SLUGS.map((slug) => {
    const sA = scoresA[slug];
    const sB = scoresB[slug];
    const delta = sA !== null && sB !== null ? sA - sB : null;
    const absDelta = delta !== null ? Math.abs(delta) : 0;
    return {
      slug,
      label: formatAxisShort(slug),
      scoreA: sA,
      scoreB: sB,
      delta,
      absDelta,
      moreConcentrated:
        delta !== null
          ? delta > 0
            ? "A"
            : delta < 0
              ? "B"
              : "equal"
          : null,
      percentileA: percentilesA[slug],
      percentileB: percentilesB[slug],
      contributionShareA: sharesA[slug],
      contributionShareB: sharesB[slug],
    };
  });

  // Structural distance = sum of absolute axis deltas
  const totalAbsDelta = axes.reduce((sum, a) => sum + a.absDelta, 0);

  // Theoretical max: 6 axes × 1.0 max delta = 6.0
  const theoreticalMax = ALL_AXIS_SLUGS.length * 1.0;
  const normalizedDistance = theoreticalMax > 0 ? totalAbsDelta / theoreticalMax : 0;

  // Dominant divergence axis
  const sorted = [...axes].sort((a, b) => b.absDelta - a.absDelta);
  const dominant = sorted[0];
  const dominantAxisDivergenceShare =
    totalAbsDelta > 0 && dominant ? dominant.absDelta / totalAbsDelta : 0;
  const divergenceConcentrated = dominantAxisDivergenceShare > 0.40;

  return {
    structuralDistance: totalAbsDelta,
    normalizedDistance,
    divergenceLevel: classifyDivergence(normalizedDistance),
    dominantDivergenceAxis: dominant?.slug ?? null,
    dominantDivergenceMagnitude: dominant?.absDelta ?? 0,
    dominantAxisDivergenceShare,
    divergenceConcentrated,
    symmetry: classifySymmetry(scoresA, scoresB),
    profileA: classifyStructuralProfile(countryA),
    profileB: classifyStructuralProfile(countryB),
    axes,
  };
}

// ─── Export Snapshot ─────────────────────────────────────────────────

export interface ComparisonExportSnapshot {
  generated: string;
  version: string;
  countryA: {
    code: string;
    name: string;
    composite: string;
    classification: string;
    compositePercentile: number | null;
    profile: string;
  };
  countryB: {
    code: string;
    name: string;
    composite: string;
    classification: string;
    compositePercentile: number | null;
    profile: string;
  };
  diagnostic: {
    structuralDistance: string;
    normalizedDistance: string;
    divergenceLevel: string;
    dominantDivergenceAxis: string;
    dominantDivergenceMagnitude: string;
    symmetry: string;
    divergenceConcentrated: boolean;
  };
  axes: {
    axis: string;
    scoreA: string;
    scoreB: string;
    delta: string;
    moreConcentrated: string;
    percentileA: string;
    percentileB: string;
    contributionShareA: string;
    contributionShareB: string;
  }[];
}

export function buildExportSnapshot(
  countryA: ISICompositeCountry,
  countryB: ISICompositeCountry,
  diagnostic: StructuralDiagnostic,
  compositePercentileA: number | null,
  compositePercentileB: number | null,
): ComparisonExportSnapshot {
  return {
    generated: new Date().toISOString(),
    version: "2.0",
    countryA: {
      code: countryA.country,
      name: countryA.country_name,
      composite: formatScore(countryA.isi_composite),
      classification: countryA.classification ?? "N/A",
      compositePercentile: compositePercentileA,
      profile: profileLabel(diagnostic.profileA),
    },
    countryB: {
      code: countryB.country,
      name: countryB.country_name,
      composite: formatScore(countryB.isi_composite),
      classification: countryB.classification ?? "N/A",
      compositePercentile: compositePercentileB,
      profile: profileLabel(diagnostic.profileB),
    },
    diagnostic: {
      structuralDistance: diagnostic.structuralDistance.toFixed(4),
      normalizedDistance: diagnostic.normalizedDistance.toFixed(4),
      divergenceLevel: divergenceLabel(diagnostic.divergenceLevel),
      dominantDivergenceAxis: diagnostic.dominantDivergenceAxis
        ? formatAxisShort(diagnostic.dominantDivergenceAxis)
        : "N/A",
      dominantDivergenceMagnitude: diagnostic.dominantDivergenceMagnitude.toFixed(4),
      symmetry: symmetryLabel(diagnostic.symmetry),
      divergenceConcentrated: diagnostic.divergenceConcentrated,
    },
    axes: diagnostic.axes.map((a) => ({
      axis: a.label,
      scoreA: formatScore(a.scoreA),
      scoreB: formatScore(a.scoreB),
      delta: a.delta !== null ? formatDelta(a.delta) : "—",
      moreConcentrated:
        a.moreConcentrated === "A"
          ? countryA.country
          : a.moreConcentrated === "B"
            ? countryB.country
            : a.moreConcentrated === "equal"
              ? "Equal"
              : "—",
      percentileA: a.percentileA !== null ? `${a.percentileA}` : "—",
      percentileB: a.percentileB !== null ? `${a.percentileB}` : "—",
      contributionShareA:
        a.contributionShareA !== null
          ? `${(a.contributionShareA * 100).toFixed(1)}%`
          : "—",
      contributionShareB:
        a.contributionShareB !== null
          ? `${(a.contributionShareB * 100).toFixed(1)}%`
          : "—",
    })),
  };
}
