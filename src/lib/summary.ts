// ============================================================================
// ISI Frontend — Structural Summary Generator
// ============================================================================
// Produces a single-paragraph narrative describing a country's structural
// exposure profile. Pure function. No side effects. No state.
// ============================================================================

import type { CountryDetail } from "./types";
import {
  formatScore,
  classificationLabel,
  computePercentile,
} from "./format";

/**
 * Generate a human-readable structural summary for a country.
 *
 * The paragraph covers:
 * 1. Composite score + classification + percentile rank
 * 2. Top two axes (highest concentration drivers)
 * 3. Lowest-scoring axis (structural strength)
 * 4. Spread between highest and lowest axis
 *
 * Returns an empty string if the country has fewer than 2 scored axes.
 */
export function generateStructuralSummary(
  country: CountryDetail,
  euMean: number | null,
  allScores: number[]
): string {
  const scored = country.axes
    .filter((a) => a.score !== null)
    .map((a) => ({ name: a.axis_name, score: a.score as number }));

  if (scored.length < 2) return "";

  // Sort descending by score (highest concentration first)
  const sorted = [...scored].sort((a, b) => b.score - a.score);

  const top1 = sorted[0];
  const top2 = sorted[1];
  const lowest = sorted[sorted.length - 1];
  const spread = top1.score - lowest.score;

  // Percentile
  const composite = country.isi_composite;
  const classification = classificationLabel(country.isi_classification);
  const pct =
    composite !== null && allScores.length > 0
      ? computePercentile(composite, allScores)
      : null;

  // Opening clause — composite context
  let summary = `${country.country_name} records a composite ISI of ${formatScore(composite)}`;
  summary += `, classified as ${classification}`;
  if (pct !== null) {
    summary += ` (P${pct} — ${pct >= 50 ? "above" : "below"} the EU-27 median)`;
  }
  summary += ". ";

  // Concentration drivers
  summary += `Structural exposure is led by ${top1.name} (${formatScore(top1.score)})`;
  summary += ` and ${top2.name} (${formatScore(top2.score)})`;
  summary += ", which together represent the primary concentration vectors. ";

  // Structural strength
  summary += `The lowest axis score is ${lowest.name} at ${formatScore(lowest.score)}`;
  summary += `, indicating relative diversification in this domain`;

  // EU mean comparison for lowest axis
  if (euMean !== null && lowest.score < euMean) {
    summary += " and performance below the EU-27 composite mean";
  }
  summary += ". ";

  // Spread
  if (spread > 0.15) {
    summary += `The ${formatScore(spread)} spread between the highest and lowest axes signals an uneven exposure profile across domains.`;
  } else {
    summary += `The ${formatScore(spread)} spread between axes suggests a relatively uniform structural profile.`;
  }

  return summary;
}
