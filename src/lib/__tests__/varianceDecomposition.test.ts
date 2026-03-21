// ============================================================================
// Unit Tests — Variance Decomposition
// ============================================================================

import { describe, it, expect } from "vitest";
import {
  computeVarianceDecomposition,
  computeCompositeVariance,
} from "../varianceDecomposition";
import type { ISICompositeCountry } from "../types";

function mockCountry(overrides: Partial<ISICompositeCountry> = {}): ISICompositeCountry {
  return {
    country: "XX",
    country_name: "Test",
    axis_1_financial: 0.20,
    axis_2_energy: 0.20,
    axis_3_technology: 0.20,
    axis_4_defense: 0.20,
    axis_5_critical_inputs: 0.20,
    axis_6_logistics: 0.20,
    isi_composite: 0.20,
    classification: "mildly_concentrated",
    complete: true,
    ...overrides,
  };
}

describe("computeVarianceDecomposition", () => {
  it("returns 6 entries for standard dataset", () => {
    const countries = [
      mockCountry({ country: "A1" }),
      mockCountry({ country: "A2", axis_4_defense: 0.80 }),
      mockCountry({ country: "A3", axis_4_defense: 0.50 }),
    ];
    const entries = computeVarianceDecomposition(countries);
    expect(entries).toHaveLength(6);
  });

  it("sorted by descending variance share", () => {
    const countries = [
      mockCountry({ country: "A1", axis_4_defense: 0.10, axis_6_logistics: 0.10 }),
      mockCountry({ country: "A2", axis_4_defense: 0.90, axis_6_logistics: 0.80 }),
      mockCountry({ country: "A3", axis_4_defense: 0.50, axis_6_logistics: 0.40 }),
    ];
    const entries = computeVarianceDecomposition(countries);
    for (let i = 1; i < entries.length; i++) {
      expect(entries[i].share).toBeLessThanOrEqual(entries[i - 1].share);
    }
  });

  it("shares sum to 1.0", () => {
    const countries = [
      mockCountry({ country: "A1", axis_4_defense: 0.10, axis_2_energy: 0.30 }),
      mockCountry({ country: "A2", axis_4_defense: 0.90, axis_2_energy: 0.10 }),
      mockCountry({ country: "A3", axis_4_defense: 0.50, axis_2_energy: 0.60 }),
    ];
    const entries = computeVarianceDecomposition(countries);
    const totalShare = entries.reduce((sum, e) => sum + e.share, 0);
    expect(totalShare).toBeCloseTo(1.0, 6);
  });

  it("identifies defense as dominant when it has highest variance", () => {
    const countries = [
      mockCountry({ country: "A1", axis_4_defense: 0.05 }),
      mockCountry({ country: "A2", axis_4_defense: 0.95 }),
    ];
    const entries = computeVarianceDecomposition(countries);
    expect(entries[0].slug).toBe("defense");
  });

  it("computes correct statistics", () => {
    const countries = [
      mockCountry({ country: "A1", axis_1_financial: 0.10 }),
      mockCountry({ country: "A2", axis_1_financial: 0.30 }),
      mockCountry({ country: "A3", axis_1_financial: 0.50 }),
    ];
    const entries = computeVarianceDecomposition(countries);
    const financial = entries.find((e) => e.slug === "financial")!;
    expect(financial.mean).toBeCloseTo(0.30, 4);
    expect(financial.min).toBeCloseTo(0.10, 4);
    expect(financial.max).toBeCloseTo(0.50, 4);
    expect(financial.n).toBe(3);
  });

  it("handles zero variance (all identical scores)", () => {
    const countries = [
      mockCountry({ country: "A1" }),
      mockCountry({ country: "A2" }),
    ];
    const entries = computeVarianceDecomposition(countries);
    // All axes have same value → all variance ≈ 0
    for (const entry of entries) {
      expect(entry.variance).toBeCloseTo(0, 10);
    }
  });
});

describe("computeCompositeVariance", () => {
  it("computes correct composite variance", () => {
    const countries = [
      mockCountry({ isi_composite: 0.10 }),
      mockCountry({ isi_composite: 0.30 }),
      mockCountry({ isi_composite: 0.50 }),
    ];
    const result = computeCompositeVariance(countries);
    expect(result.mean).toBeCloseTo(0.30, 4);
    expect(result.n).toBe(3);
    expect(result.variance).toBeGreaterThan(0);
    expect(result.stdDev).toBeCloseTo(Math.sqrt(result.variance), 8);
  });

  it("returns zero variance for single country", () => {
    const result = computeCompositeVariance([mockCountry()]);
    expect(result.variance).toBe(0);
  });

  it("filters null composites", () => {
    const countries = [
      mockCountry({ isi_composite: 0.20 }),
      mockCountry({ isi_composite: null }),
      mockCountry({ isi_composite: 0.40 }),
    ];
    const result = computeCompositeVariance(countries);
    expect(result.n).toBe(2);
  });
});
