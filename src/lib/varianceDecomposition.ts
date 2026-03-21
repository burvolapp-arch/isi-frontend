// ============================================================================
// ISI Frontend — Variance Decomposition Engine
// ============================================================================
// Computes cross-country variance contribution by axis.
// Pure functions. No side effects. No API calls.
//
// Key empirical finding: Defence (~35%) + Logistics (~34%) explain ~69% of
// cross-country variance in ISI scores across EU-27.
// ============================================================================

import { ALL_AXIS_SLUGS, AXIS_FIELD_MAP, type AxisSlug } from "./axisRegistry";
import type { ISICompositeCountry } from "./types";

// ─── Types ──────────────────────────────────────────────────────────

export interface AxisVarianceEntry {
  /** Canonical axis slug */
  slug: AxisSlug;
  /** Population variance of this axis across countries */
  variance: number;
  /** Share of total cross-axis variance (0–1) */
  share: number;
  /** Coefficient of variation (σ / μ) */
  cv: number;
  /** Minimum score observed */
  min: number;
  /** Maximum score observed */
  max: number;
  /** Arithmetic mean */
  mean: number;
  /** Number of countries with non-null scores */
  n: number;
}

// ─── Computation ────────────────────────────────────────────────────

/**
 * Compute variance decomposition across all axes.
 *
 * For each axis:
 *   1. Extract non-null scores from all countries
 *   2. Compute population variance, mean, min, max, CV
 *   3. Compute share = axis_variance / sum_of_all_axis_variances
 *
 * Returns entries sorted by descending variance share (most dominant first).
 */
export function computeVarianceDecomposition(
  countries: ISICompositeCountry[],
): AxisVarianceEntry[] {
  const entries: AxisVarianceEntry[] = [];
  let totalVariance = 0;

  for (const slug of ALL_AXIS_SLUGS) {
    const field = AXIS_FIELD_MAP[slug];
    const scores = countries
      .map((c) => (c as unknown as Record<string, unknown>)[field])
      .filter((v): v is number => typeof v === "number" && !Number.isNaN(v));

    if (scores.length < 2) {
      entries.push({
        slug,
        variance: 0,
        share: 0,
        cv: 0,
        min: 0,
        max: 0,
        mean: 0,
        n: scores.length,
      });
      continue;
    }

    const n = scores.length;
    const mean = scores.reduce((a, b) => a + b, 0) / n;
    const variance = scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / n;
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? stdDev / mean : 0;

    totalVariance += variance;
    entries.push({
      slug,
      variance,
      share: 0, // filled below
      cv,
      min: Math.min(...scores),
      max: Math.max(...scores),
      mean,
      n,
    });
  }

  // Compute shares
  if (totalVariance > 0) {
    for (const entry of entries) {
      entry.share = entry.variance / totalVariance;
    }
  }

  return entries.sort((a, b) => b.share - a.share);
}

/**
 * Compute composite variance across all countries.
 * Used as a reference for total cross-country dispersion.
 */
export function computeCompositeVariance(
  countries: ISICompositeCountry[],
): { variance: number; stdDev: number; mean: number; n: number } {
  const scores = countries
    .map((c) => c.isi_composite)
    .filter((v): v is number => typeof v === "number");

  if (scores.length < 2) {
    return { variance: 0, stdDev: 0, mean: 0, n: scores.length };
  }

  const n = scores.length;
  const mean = scores.reduce((a, b) => a + b, 0) / n;
  const variance = scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / n;

  return { variance, stdDev: Math.sqrt(variance), mean, n };
}
