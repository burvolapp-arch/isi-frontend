// ============================================================================
// Unit Tests — Comparative Analysis Engine
// ============================================================================
// Tests the bilateral structural diagnostic system.
// All computations must be deterministic and reproducible from ISI composite data.
// ============================================================================

import { describe, it, expect } from "vitest";
import {
  computeAxisPercentiles,
  computeCompositePercentile,
  computeStructuralDiagnostic,
  profileLabel,
  symmetryLabel,
  symmetryDescription,
  divergenceLabel,
  buildExportSnapshot,
} from "../comparativeAnalysis";
import type { ISICompositeCountry } from "../types";

// ─── Test Fixtures ──────────────────────────────────────────────────

function mockCountry(overrides: Partial<ISICompositeCountry> = {}): ISICompositeCountry {
  return {
    country: "XX",
    country_name: "Test Country",
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

const cohort: ISICompositeCountry[] = [
  mockCountry({ country: "A1", isi_composite: 0.10, axis_4_defense: 0.10 }),
  mockCountry({ country: "A2", isi_composite: 0.20, axis_4_defense: 0.30 }),
  mockCountry({ country: "A3", isi_composite: 0.30, axis_4_defense: 0.50 }),
  mockCountry({ country: "A4", isi_composite: 0.40, axis_4_defense: 0.70 }),
  mockCountry({ country: "A5", isi_composite: 0.50, axis_4_defense: 0.90 }),
];

// ─── computeAxisPercentiles ─────────────────────────────────────────

describe("computeAxisPercentiles", () => {
  it("computes percentile rank for each axis", () => {
    const country = mockCountry({ axis_4_defense: 0.50 });
    const percentiles = computeAxisPercentiles(country, cohort);
    // 0.50 defense: 2 countries below (0.10, 0.30) out of 5 = 40%
    expect(percentiles.defense).toBe(40);
  });

  it("returns null for null axis scores", () => {
    const country = mockCountry({ axis_4_defense: null });
    const percentiles = computeAxisPercentiles(country, cohort);
    expect(percentiles.defense).toBeNull();
  });

  it("returns 0 percentile for lowest score", () => {
    const country = mockCountry({ axis_4_defense: 0.10 });
    const percentiles = computeAxisPercentiles(country, cohort);
    expect(percentiles.defense).toBe(0);
  });
});

// ─── computeCompositePercentile ─────────────────────────────────────

describe("computeCompositePercentile", () => {
  it("computes correct percentile for composite score", () => {
    // 0.30: 2 below (0.10, 0.20) out of 5 = 40%
    expect(computeCompositePercentile(0.30, cohort)).toBe(40);
  });

  it("returns null for null score", () => {
    expect(computeCompositePercentile(null, cohort)).toBeNull();
  });

  it("returns 0 for the lowest score", () => {
    expect(computeCompositePercentile(0.10, cohort)).toBe(0);
  });

  it("returns 80 for the highest score", () => {
    // 0.50: 4 below out of 5 = 80%
    expect(computeCompositePercentile(0.50, cohort)).toBe(80);
  });
});

// ─── computeStructuralDiagnostic ────────────────────────────────────

describe("computeStructuralDiagnostic", () => {
  it("returns zero distance for identical countries", () => {
    const a = mockCountry({ country: "XX" });
    const b = mockCountry({ country: "YY" });
    const result = computeStructuralDiagnostic(a, b, cohort);

    expect(result.structuralDistance).toBe(0);
    expect(result.normalizedDistance).toBe(0);
    expect(result.divergenceLevel).toBe("low");
  });

  it("identifies dominant divergence axis", () => {
    const a = mockCountry({ country: "XX", axis_4_defense: 0.80 });
    const b = mockCountry({ country: "YY", axis_4_defense: 0.10 });
    const result = computeStructuralDiagnostic(a, b, cohort);

    expect(result.dominantDivergenceAxis).toBe("defense");
    expect(result.dominantDivergenceMagnitude).toBeCloseTo(0.70, 2);
  });

  it("computes structural distance as sum of absolute deltas", () => {
    const a = mockCountry({
      country: "XX",
      axis_1_financial: 0.30,
      axis_2_energy: 0.40,
    });
    const b = mockCountry({
      country: "YY",
      axis_1_financial: 0.20,
      axis_2_energy: 0.20,
    });
    const result = computeStructuralDiagnostic(a, b, cohort);

    // Δ financial = 0.10, Δ energy = 0.20, rest = 0 → total = 0.30
    expect(result.structuralDistance).toBeCloseTo(0.30, 4);
  });

  it("normalizes distance to 0–1 scale", () => {
    // Max theoretical distance = 6 axes × 1.0 = 6.0
    const a = mockCountry({ country: "XX", axis_4_defense: 1.0 });
    const b = mockCountry({ country: "YY", axis_4_defense: 0.0 });
    const result = computeStructuralDiagnostic(a, b, cohort);

    // Distance = 1.0 on one axis, normalized = 1.0 / 6.0 ≈ 0.1667
    expect(result.normalizedDistance).toBeCloseTo(1.0 / 6.0, 3);
  });

  it("classifies divergence levels correctly", () => {
    // Low: normalized < 0.15
    const lowA = mockCountry({ country: "XX" });
    const lowB = mockCountry({ country: "YY" });
    expect(computeStructuralDiagnostic(lowA, lowB, cohort).divergenceLevel).toBe("low");

    // High: large separation
    const highA = mockCountry({
      country: "XX",
      axis_1_financial: 0.90,
      axis_2_energy: 0.90,
      axis_3_technology: 0.90,
      axis_4_defense: 0.90,
      axis_5_critical_inputs: 0.90,
      axis_6_logistics: 0.90,
    });
    const highB = mockCountry({
      country: "YY",
      axis_1_financial: 0.05,
      axis_2_energy: 0.05,
      axis_3_technology: 0.05,
      axis_4_defense: 0.05,
      axis_5_critical_inputs: 0.05,
      axis_6_logistics: 0.05,
    });
    expect(computeStructuralDiagnostic(highA, highB, cohort).divergenceLevel).toBe("high");
  });

  it("detects concentrated divergence (>40% in one axis)", () => {
    const a = mockCountry({ country: "XX", axis_4_defense: 0.90 });
    const b = mockCountry({ country: "YY", axis_4_defense: 0.10 });
    const result = computeStructuralDiagnostic(a, b, cohort);
    expect(result.divergenceConcentrated).toBe(true);
    expect(result.dominantAxisDivergenceShare).toBeGreaterThan(0.40);
  });

  it("produces 6 axis comparisons", () => {
    const a = mockCountry({ country: "XX" });
    const b = mockCountry({ country: "YY" });
    const result = computeStructuralDiagnostic(a, b, cohort);
    expect(result.axes).toHaveLength(6);
  });

  it("classifies symmetric exposure for similar profiles", () => {
    const a = mockCountry({
      country: "XX",
      axis_1_financial: 0.30,
      axis_2_energy: 0.30,
      axis_3_technology: 0.30,
      axis_4_defense: 0.30,
      axis_5_critical_inputs: 0.30,
      axis_6_logistics: 0.30,
    });
    const b = mockCountry({
      country: "YY",
      axis_1_financial: 0.28,
      axis_2_energy: 0.32,
      axis_3_technology: 0.29,
      axis_4_defense: 0.31,
      axis_5_critical_inputs: 0.30,
      axis_6_logistics: 0.30,
    });
    const result = computeStructuralDiagnostic(a, b, cohort);
    expect(result.symmetry).toBe("symmetric");
  });

  it("classifies complementary profiles (inverse patterns)", () => {
    const a = mockCountry({
      country: "XX",
      axis_1_financial: 0.05,
      axis_2_energy: 0.80,
      axis_3_technology: 0.05,
      axis_4_defense: 0.80,
      axis_5_critical_inputs: 0.05,
      axis_6_logistics: 0.05,
    });
    const b = mockCountry({
      country: "YY",
      axis_1_financial: 0.80,
      axis_2_energy: 0.05,
      axis_3_technology: 0.80,
      axis_4_defense: 0.05,
      axis_5_critical_inputs: 0.05,
      axis_6_logistics: 0.05,
    });
    const result = computeStructuralDiagnostic(a, b, cohort);
    expect(result.symmetry).toBe("complementary");
  });
});

// ─── Label Functions ────────────────────────────────────────────────

describe("label helpers", () => {
  it("profileLabel returns human-readable profile names", () => {
    expect(profileLabel("defense-dominant")).toBe("Defense-Dominant Concentration");
    expect(profileLabel("balanced-low")).toBe("Balanced Low Exposure");
    expect(profileLabel("single-axis-vulnerability")).toBe("Single-Axis Vulnerability");
  });

  it("symmetryLabel returns human-readable symmetry names", () => {
    expect(symmetryLabel("symmetric")).toBe("Symmetric Exposure");
    expect(symmetryLabel("asymmetric")).toBe("Asymmetric Exposure");
    expect(symmetryLabel("complementary")).toBe("Complementary Structural Profile");
  });

  it("symmetryDescription returns descriptions", () => {
    expect(symmetryDescription("symmetric")).toContain("parallel");
    expect(symmetryDescription("complementary")).toContain("inverse");
  });

  it("divergenceLabel returns level labels", () => {
    expect(divergenceLabel("low")).toBe("Low Structural Divergence");
    expect(divergenceLabel("moderate")).toBe("Moderate Structural Divergence");
    expect(divergenceLabel("high")).toBe("High Structural Divergence");
  });
});

// ─── Export Snapshot ────────────────────────────────────────────────

describe("buildExportSnapshot", () => {
  it("produces a complete export object", () => {
    const a = mockCountry({ country: "DE", country_name: "Germany" });
    const b = mockCountry({ country: "FR", country_name: "France" });
    const diag = computeStructuralDiagnostic(a, b, cohort);
    const snapshot = buildExportSnapshot(a, b, diag, 60, 40);

    expect(snapshot.version).toBe("2.0");
    expect(snapshot.countryA.code).toBe("DE");
    expect(snapshot.countryB.code).toBe("FR");
    expect(snapshot.axes).toHaveLength(6);
    expect(snapshot.diagnostic.divergenceLevel).toBeDefined();
    expect(snapshot.generated).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("includes formatted scores", () => {
    const a = mockCountry({ country: "DE", isi_composite: 0.3456 });
    const b = mockCountry({ country: "FR", isi_composite: 0.2345 });
    const diag = computeStructuralDiagnostic(a, b, cohort);
    const snapshot = buildExportSnapshot(a, b, diag, 60, 40);

    expect(snapshot.countryA.composite).toBe("0.3456");
    expect(snapshot.countryB.composite).toBe("0.2345");
  });
});
