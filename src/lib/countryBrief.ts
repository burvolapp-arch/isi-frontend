// ============================================================================
// ISI Frontend — Country Brief Generator
// ============================================================================
// Produces a structured analytical brief for each country. Deterministic
// output — same input always produces same text. Pure function.
//
// This extends the existing summary.ts with a richer, multi-paragraph
// brief suitable for the country profile page and press materials.
// ============================================================================

import type { CountryDetail, ISICompositeCountry } from "./types";
import { formatScore, classificationLabel, computeRank } from "./format";
import { formatAxisShort } from "./presentation";
import { AXIS_FIELD_MAP } from "./axisRegistry";

// ─── Types ──────────────────────────────────────────────────────────

export interface CountryBrief {
  /** One-sentence headline finding */
  headline: string;
  /** Multi-paragraph analytical text */
  paragraphs: string[];
  /** Top 2 vulnerability axes (highest scores) */
  topVulnerabilities: { axis: string; score: number }[];
  /** Top 2 strengths (lowest scores) */
  topStrengths: { axis: string; score: number }[];
  /** Whether the country is above or below cohort mean */
  positionVsMean: "above" | "below" | "equal" | null;
}

// ─── Helpers ────────────────────────────────────────────────────────

function classifyPosition(
  composite: number | null,
  mean: number | null,
): "above" | "below" | "equal" | null {
  if (composite === null || mean === null) return null;
  const delta = composite - mean;
  if (Math.abs(delta) < 0.0001) return "equal";
  return delta > 0 ? "above" : "below";
}

function describeConcentration(score: number): string {
  if (score >= 0.50) return "extreme";
  if (score >= 0.25) return "significant";
  if (score >= 0.15) return "moderate";
  return "low";
}

// ─── Main Generator ─────────────────────────────────────────────────

/**
 * Generate a deterministic analytical brief for a country.
 *
 * Requires:
 * - CountryDetail from /country/{code}
 * - EU cohort mean (from ISI statistics)
 * - All composite scores (for rank computation)
 *
 * Returns null if fewer than 3 axes have scores.
 */
export function generateCountryBrief(
  country: CountryDetail,
  euMean: number | null,
  allScores: number[],
): CountryBrief | null {
  const scored = country.axes
    .filter((a) => a.score !== null)
    .map((a) => ({
      slug: a.axis_slug,
      name: formatAxisShort(a.axis_slug),
      score: a.score as number,
    }));

  if (scored.length < 3) return null;

  const sorted = [...scored].sort((a, b) => b.score - a.score);
  const composite = country.isi_composite;
  const classification = classificationLabel(country.isi_classification);
  const rank =
    composite !== null && allScores.length > 0
      ? computeRank(composite, allScores)
      : null;
  const position = classifyPosition(composite, euMean);

  const topVulnerabilities = sorted.slice(0, 2).map((a) => ({
    axis: a.name,
    score: a.score,
  }));
  const topStrengths = sorted
    .slice(-2)
    .reverse()
    .map((a) => ({ axis: a.name, score: a.score }));

  // ── Headline ──
  const positionWord =
    position === "above"
      ? "above-average"
      : position === "below"
        ? "below-average"
        : "average";
  const headline =
    composite !== null
      ? `${country.country_name} shows ${positionWord} structural concentration (${formatScore(composite)}), classified as ${classification}.`
      : `${country.country_name} has insufficient axis coverage for a complete assessment.`;

  // ── Paragraphs ──
  const paragraphs: string[] = [];

  // P1: Composite overview
  if (composite !== null) {
    let p1 = `${country.country_name} records a composite ISI score of ${formatScore(composite)}`;
    if (rank !== null) {
      p1 += `, ranking ${rank} of ${allScores.length} in the EU-27 cohort`;
    }
    p1 += `. This places the country in the ${classification.toLowerCase()} band of the HHI classification framework.`;
    if (euMean !== null && position !== null && position !== "equal") {
      const delta = Math.abs(composite - euMean);
      p1 += ` The composite is ${formatScore(delta)} ${position === "above" ? "above" : "below"} the cohort mean of ${formatScore(euMean)}.`;
    }
    paragraphs.push(p1);
  }

  // P2: Vulnerability analysis
  const top1 = sorted[0];
  const top2 = sorted[1];
  let p2 = `The largest structural vulnerability is ${top1.name} (${formatScore(top1.score)}), indicating ${describeConcentration(top1.score)} supplier concentration in this domain.`;
  p2 += ` ${top2.name} follows at ${formatScore(top2.score)}, with ${describeConcentration(top2.score)} concentration.`;

  // Check if top two axes account for majority of exposure
  const topTwoSum = top1.score + top2.score;
  const totalSum = scored.reduce((s, a) => s + a.score, 0);
  if (totalSum > 0) {
    const topTwoShare = (topTwoSum / totalSum) * 100;
    if (topTwoShare > 50) {
      p2 += ` Together, these two axes account for ${topTwoShare.toFixed(0)}% of total axis-level concentration.`;
    }
  }
  paragraphs.push(p2);

  // P3: Structural strength
  const lowest = sorted[sorted.length - 1];
  const secondLowest = sorted[sorted.length - 2];
  let p3 = `${lowest.name} shows the most diversified supplier base at ${formatScore(lowest.score)}, indicating ${describeConcentration(lowest.score)} external concentration.`;
  if (secondLowest.score < 0.25) {
    p3 += ` ${secondLowest.name} (${formatScore(secondLowest.score)}) also demonstrates relative diversification.`;
  }
  paragraphs.push(p3);

  // P4: Structural profile characterization
  const spread = top1.score - lowest.score;
  if (spread > 0.20) {
    paragraphs.push(
      `The ${formatScore(spread)} spread between the highest and lowest axis scores signals an uneven exposure profile. Concentration risk is domain-specific rather than uniformly distributed.`,
    );
  } else {
    paragraphs.push(
      `The ${formatScore(spread)} spread between axes suggests a relatively uniform structural profile, with no single axis dominating the country's overall concentration.`,
    );
  }

  return {
    headline,
    paragraphs,
    topVulnerabilities,
    topStrengths,
    positionVsMean: position,
  };
}

// ─── EU-27 Variance Analysis Utilities ──────────────────────────────

export interface VarianceDecomposition {
  axis: string;
  slug: string;
  variance: number;
  /** Share of total cross-axis variance (0–1) */
  share: number;
}

/**
 * Decompose cross-country variance by axis.
 * Returns each axis's contribution to total inter-country dispersion.
 * Used on the EU analysis page to highlight dominant variance drivers.
 */
export function decomposeVarianceByAxis(
  countries: ISICompositeCountry[],
): VarianceDecomposition[] {
  const scored = countries.filter((c) => c.isi_composite !== null);
  if (scored.length === 0) return [];

  const results: VarianceDecomposition[] = [];

  for (const [slug, field] of Object.entries(AXIS_FIELD_MAP)) {
    const values = scored
      .map((c) => (c as unknown as Record<string, unknown>)[field])
      .filter((v): v is number => typeof v === "number");

    if (values.length < 2) continue;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
      values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;

    results.push({
      axis: formatAxisShort(slug),
      slug,
      variance,
      share: 0, // computed below
    });
  }

  const totalVariance = results.reduce((s, r) => s + r.variance, 0);
  if (totalVariance > 0) {
    for (const r of results) {
      r.share = r.variance / totalVariance;
    }
  }

  return results.sort((a, b) => b.variance - a.variance);
}
