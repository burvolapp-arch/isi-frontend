// ============================================================================
// ISI Analytical Validation Tests
// ============================================================================
// Deterministic unit tests for core analytical functions.
// These ensure the ISI platform produces reproducible, correct outputs.
//
// Coverage:
//   1. Score classification (HHI band boundaries)
//   2. Rank computation
//   3. Percentile computation
//   4. Standard deviation & median
//   5. Axis variance
//   6. Country brief generation
//   7. Variance decomposition
//   8. Scenario validation
//   9. Source traceability
//  10. Scenario explanation lookup
// ============================================================================

import { describe, it, expect } from "vitest";
import {
  classifyScore,
  computeRank,
  computePercentile,
  computeStdDev,
  computeMedian,
  computeAxisVariance,
  extractCompositeScores,
  isAggregatePartner,
  formatCompactVolume,
} from "@/lib/format";
import { generateCountryBrief, decomposeVarianceByAxis } from "@/lib/countryBrief";
import { validateScenarioInput } from "@/lib/scenarioValidation";
import { getAxisSources } from "@/lib/axisSources";
import { getScenarioExplanation, SCENARIO_EXPLANATIONS } from "@/lib/scenarioExplanations";
import type { CountryDetail, ISICompositeCountry } from "@/lib/types";

// ── Test Fixtures ──────────────────────────────────────────────────

function makeCompositeCountry(overrides: Record<string, unknown> = {}): ISICompositeCountry {
  return {
    country: "DE",
    country_name: "Germany",
    isi_composite: 0.3500,
    classification: "moderately_concentrated",
    complete: true,
    axis_1_financial: 0.1200,
    axis_2_energy: 0.4500,
    axis_3_technology: 0.2800,
    axis_4_defense: 0.6200,
    axis_5_critical_inputs: 0.3100,
    axis_6_logistics: 0.3200,
    ...overrides,
  } as ISICompositeCountry;
}

function makeCountryDetail(overrides: Record<string, unknown> = {}): CountryDetail {
  return {
    country: "DE",
    country_name: "Germany",
    isi_composite: 0.3500,
    isi_classification: "moderately_concentrated",
    version: "1.0",
    window: "2024",
    axes_available: 6,
    axes_required: 6,
    axes: [
      { axis_id: 1, axis_slug: "financial", axis_name: "Financial", score: 0.12, classification: "unconcentrated", driver_statement: "", channels: [], warnings: [] },
      { axis_id: 2, axis_slug: "energy", axis_name: "Energy", score: 0.45, classification: "moderately_concentrated", driver_statement: "", channels: [], warnings: [] },
      { axis_id: 3, axis_slug: "technology", axis_name: "Technology", score: 0.28, classification: "moderately_concentrated", driver_statement: "", channels: [], warnings: [] },
      { axis_id: 4, axis_slug: "defense", axis_name: "Defense", score: 0.62, classification: "highly_concentrated", driver_statement: "", channels: [], warnings: [] },
      { axis_id: 5, axis_slug: "critical_inputs", axis_name: "Critical Inputs", score: 0.31, classification: "moderately_concentrated", driver_statement: "", channels: [], warnings: [] },
      { axis_id: 6, axis_slug: "logistics", axis_name: "Logistics", score: 0.32, classification: "moderately_concentrated", driver_statement: "", channels: [], warnings: [] },
    ],
    ...overrides,
  } as CountryDetail;
}

// ══════════════════════════════════════════════════════════════════════
// 1. Score Classification
// ══════════════════════════════════════════════════════════════════════

describe("classifyScore", () => {
  it("classifies ≥ 0.50 as highly concentrated", () => {
    expect(classifyScore(0.50)).toBe("highly_concentrated");
    expect(classifyScore(0.75)).toBe("highly_concentrated");
    expect(classifyScore(1.00)).toBe("highly_concentrated");
  });

  it("classifies 0.25–0.4999 as moderately concentrated", () => {
    expect(classifyScore(0.25)).toBe("moderately_concentrated");
    expect(classifyScore(0.35)).toBe("moderately_concentrated");
    expect(classifyScore(0.4999)).toBe("moderately_concentrated");
  });

  it("classifies 0.15–0.2499 as mildly concentrated", () => {
    expect(classifyScore(0.15)).toBe("mildly_concentrated");
    expect(classifyScore(0.20)).toBe("mildly_concentrated");
    expect(classifyScore(0.2499)).toBe("mildly_concentrated");
  });

  it("classifies < 0.15 as unconcentrated", () => {
    expect(classifyScore(0.00)).toBe("unconcentrated");
    expect(classifyScore(0.10)).toBe("unconcentrated");
    expect(classifyScore(0.1499)).toBe("unconcentrated");
  });

  it("is deterministic — same input always produces same output", () => {
    const results = Array.from({ length: 100 }, () => classifyScore(0.2500));
    expect(new Set(results).size).toBe(1);
  });

  it("handles exact boundary values correctly", () => {
    // Boundaries: 0.15, 0.25, 0.50
    expect(classifyScore(0.15)).toBe("mildly_concentrated");
    expect(classifyScore(0.25)).toBe("moderately_concentrated");
    expect(classifyScore(0.50)).toBe("highly_concentrated");
    // Just below each boundary
    expect(classifyScore(0.1499)).toBe("unconcentrated");
    expect(classifyScore(0.2499)).toBe("mildly_concentrated");
    expect(classifyScore(0.4999)).toBe("moderately_concentrated");
  });
});

// ══════════════════════════════════════════════════════════════════════
// 2. Rank Computation
// ══════════════════════════════════════════════════════════════════════

describe("computeRank", () => {
  const scores = [0.10, 0.25, 0.40, 0.55, 0.70];

  it("rank 1 = highest score (most concentrated)", () => {
    expect(computeRank(0.70, scores)).toBe(1);
  });

  it("last rank = lowest score (least concentrated)", () => {
    expect(computeRank(0.10, scores)).toBe(5);
  });

  it("returns correct intermediate ranks", () => {
    expect(computeRank(0.55, scores)).toBe(2);
    expect(computeRank(0.40, scores)).toBe(3);
    expect(computeRank(0.25, scores)).toBe(4);
  });

  it("returns null for score not in set", () => {
    expect(computeRank(0.99, scores)).toBeNull();
  });

  it("returns null for empty set", () => {
    expect(computeRank(0.50, [])).toBeNull();
  });

  it("handles identical scores", () => {
    const tied = [0.30, 0.30, 0.50];
    // First occurrence
    expect(computeRank(0.30, tied)).toBe(2);
    expect(computeRank(0.50, tied)).toBe(1);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 3. Percentile Computation
// ══════════════════════════════════════════════════════════════════════

describe("computePercentile", () => {
  const scores = [0.10, 0.20, 0.30, 0.40, 0.50];

  it("highest score → 80th percentile (4 below out of 5)", () => {
    expect(computePercentile(0.50, scores)).toBe(80);
  });

  it("lowest score → 0th percentile (0 below)", () => {
    expect(computePercentile(0.10, scores)).toBe(0);
  });

  it("middle score → 40th percentile (2 below out of 5)", () => {
    expect(computePercentile(0.30, scores)).toBe(40);
  });

  it("returns 0 for empty set", () => {
    expect(computePercentile(0.30, [])).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 4. Standard Deviation & Median
// ══════════════════════════════════════════════════════════════════════

describe("computeStdDev", () => {
  it("returns 0 for empty array", () => {
    expect(computeStdDev([])).toBe(0);
  });

  it("returns 0 for single element", () => {
    expect(computeStdDev([0.50])).toBe(0);
  });

  it("returns 0 for uniform values", () => {
    expect(computeStdDev([0.30, 0.30, 0.30])).toBe(0);
  });

  it("computes correct standard deviation", () => {
    // [2, 4, 4, 4, 5, 5, 7, 9] → mean = 5, variance = 4, std = 2
    const result = computeStdDev([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(result).toBeCloseTo(2.0, 5);
  });
});

describe("computeMedian", () => {
  it("returns 0 for empty array", () => {
    expect(computeMedian([])).toBe(0);
  });

  it("returns the single element", () => {
    expect(computeMedian([0.42])).toBe(0.42);
  });

  it("returns middle element for odd-length array", () => {
    expect(computeMedian([0.10, 0.30, 0.50])).toBe(0.30);
  });

  it("returns average of two middle elements for even-length array", () => {
    expect(computeMedian([0.10, 0.20, 0.30, 0.40])).toBe(0.25);
  });

  it("handles unsorted input", () => {
    expect(computeMedian([0.50, 0.10, 0.30])).toBe(0.30);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 5. Axis Variance
// ══════════════════════════════════════════════════════════════════════

describe("computeAxisVariance", () => {
  it("computes variance for a country with 6 axis scores", () => {
    const country = makeCompositeCountry();
    const variance = computeAxisVariance(country);
    expect(variance).not.toBeNull();
    expect(variance).toBeGreaterThan(0);
  });

  it("returns null for country with fewer than minAxes scores", () => {
    // Only 2 axis fields set, rest null
    const country = makeCompositeCountry({
      axis_1_financial: 0.10,
      axis_2_energy: 0.20,
      axis_3_technology: null as unknown as number,
      axis_4_defense: null as unknown as number,
      axis_5_critical_inputs: null as unknown as number,
      axis_6_logistics: null as unknown as number,
    });
    expect(computeAxisVariance(country)).toBeNull();
  });

  it("returns 0 for uniform axis scores", () => {
    const country = makeCompositeCountry({
      axis_1_financial: 0.30,
      axis_2_energy: 0.30,
      axis_3_technology: 0.30,
      axis_4_defense: 0.30,
      axis_5_critical_inputs: 0.30,
      axis_6_logistics: 0.30,
    });
    expect(computeAxisVariance(country)).toBeCloseTo(0, 10);
  });

  it("is deterministic", () => {
    const country = makeCompositeCountry();
    const v1 = computeAxisVariance(country);
    const v2 = computeAxisVariance(country);
    expect(v1).toBe(v2);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 6. Country Brief Generation
// ══════════════════════════════════════════════════════════════════════

describe("generateCountryBrief", () => {
  const allScores = [0.2000, 0.2500, 0.3000, 0.3500, 0.4000, 0.4500, 0.5000];

  it("generates a non-null brief for a country with sufficient axes", () => {
    const country = makeCountryDetail();
    const brief = generateCountryBrief(country, 0.3500, allScores);
    expect(brief).not.toBeNull();
  });

  it("returns null for country with fewer than 3 scored axes", () => {
    const country = makeCountryDetail({
      axes: [
        { axis_id: 1, axis_slug: "financial", axis_name: "Financial", score: 0.12, classification: "unconcentrated", driver_statement: "", channels: [], warnings: [] },
        { axis_id: 2, axis_slug: "energy", axis_name: "Energy", score: 0.45, classification: "moderately_concentrated", driver_statement: "", channels: [], warnings: [] },
      ],
    });
    const brief = generateCountryBrief(country, 0.35, allScores);
    expect(brief).toBeNull();
  });

  it("headline contains the country name", () => {
    const country = makeCountryDetail();
    const brief = generateCountryBrief(country, 0.3500, allScores);
    expect(brief!.headline).toContain("Germany");
  });

  it("identifies correct top vulnerabilities (highest scores)", () => {
    const country = makeCountryDetail();
    const brief = generateCountryBrief(country, 0.3500, allScores);
    // Defense (0.62) and Energy (0.45) are the top two
    expect(brief!.topVulnerabilities[0].score).toBe(0.62);
    expect(brief!.topVulnerabilities[1].score).toBe(0.45);
  });

  it("identifies correct top strengths (lowest scores)", () => {
    const country = makeCountryDetail();
    const brief = generateCountryBrief(country, 0.3500, allScores);
    // Financial (0.12) and Technology (0.28) are the lowest two
    expect(brief!.topStrengths[0].score).toBe(0.12);
    expect(brief!.topStrengths[1].score).toBe(0.28);
  });

  it("position vs mean is correct", () => {
    const country = makeCountryDetail();
    // Composite = 0.3500, mean = 0.3000 → above
    const brief = generateCountryBrief(country, 0.3000, allScores);
    expect(brief!.positionVsMean).toBe("above");

    // Mean = 0.4000 → below
    const brief2 = generateCountryBrief(country, 0.4000, allScores);
    expect(brief2!.positionVsMean).toBe("below");
  });

  it("generates multiple paragraphs", () => {
    const country = makeCountryDetail();
    const brief = generateCountryBrief(country, 0.3500, allScores);
    expect(brief!.paragraphs.length).toBeGreaterThanOrEqual(3);
  });

  it("is deterministic — same input always produces same output", () => {
    const country = makeCountryDetail();
    const b1 = generateCountryBrief(country, 0.3500, allScores);
    const b2 = generateCountryBrief(country, 0.3500, allScores);
    expect(JSON.stringify(b1)).toBe(JSON.stringify(b2));
  });
});

// ══════════════════════════════════════════════════════════════════════
// 7. Variance Decomposition
// ══════════════════════════════════════════════════════════════════════

describe("decomposeVarianceByAxis", () => {
  it("returns one entry per axis", () => {
    const countries = [
      makeCompositeCountry({ country: "DE" }),
      makeCompositeCountry({ country: "FR", axis_4_defense: 0.20 }),
      makeCompositeCountry({ country: "IT", axis_4_defense: 0.80 }),
    ];
    const result = decomposeVarianceByAxis(countries);
    expect(result.length).toBe(6); // 6 axes
  });

  it("shares sum to 1.0", () => {
    const countries = [
      makeCompositeCountry({ country: "DE" }),
      makeCompositeCountry({ country: "FR", axis_2_energy: 0.10, axis_4_defense: 0.20 }),
      makeCompositeCountry({ country: "IT", axis_2_energy: 0.80, axis_4_defense: 0.80 }),
    ];
    const result = decomposeVarianceByAxis(countries);
    const totalShare = result.reduce((s, r) => s + r.share, 0);
    expect(totalShare).toBeCloseTo(1.0, 5);
  });

  it("returns empty array for empty input", () => {
    expect(decomposeVarianceByAxis([])).toEqual([]);
  });

  it("results are sorted by variance descending", () => {
    const countries = [
      makeCompositeCountry({ country: "DE" }),
      makeCompositeCountry({ country: "FR", axis_4_defense: 0.10 }),
    ];
    const result = decomposeVarianceByAxis(countries);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].variance).toBeLessThanOrEqual(result[i - 1].variance);
    }
  });

  it("is deterministic", () => {
    const countries = [
      makeCompositeCountry({ country: "DE" }),
      makeCompositeCountry({ country: "FR", axis_2_energy: 0.10 }),
    ];
    const r1 = decomposeVarianceByAxis(countries);
    const r2 = decomposeVarianceByAxis(countries);
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
  });
});

// ══════════════════════════════════════════════════════════════════════
// 8. Scenario Validation
// ══════════════════════════════════════════════════════════════════════

describe("validateScenarioInput", () => {
  it("accepts valid EU-27 country code with valid adjustments", () => {
    const result = validateScenarioInput("DE", { financial: 0.10 });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.payload.country).toBe("DE");
    }
  });

  it("normalizes lowercase country code", () => {
    const result = validateScenarioInput("de", { financial: 0.10 });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.payload.country).toBe("DE");
    }
  });

  it("rejects non-EU-27 country code", () => {
    const result = validateScenarioInput("US", { financial: 0.10 });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain("not in EU-27");
    }
  });

  it("rejects invalid country code length", () => {
    const result = validateScenarioInput("DEU", { financial: 0.10 });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain("Invalid country code length");
    }
  });

  it("rejects NaN adjustment values", () => {
    const result = validateScenarioInput("DE", { financial: NaN });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain("Non-numeric");
    }
  });

  it("clamps adjustments to ±0.20 in payload", () => {
    const result = validateScenarioInput("DE", { financial: 0.50, energy: -0.50 });
    expect(result.valid).toBe(true);
    if (result.valid) {
      const adj = result.payload.adjustments;
      const values = Object.values(adj);
      for (const v of values) {
        expect(v).toBeGreaterThanOrEqual(-0.20);
        expect(v).toBeLessThanOrEqual(0.20);
      }
    }
  });

  it("accepts all 27 EU member state codes", () => {
    const EU27 = [
      "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "EL", "ES",
      "FI", "FR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT",
      "NL", "PL", "PT", "RO", "SE", "SI", "SK",
    ];
    for (const code of EU27) {
      const result = validateScenarioInput(code, {});
      expect(result.valid).toBe(true);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════
// 9. Source Traceability
// ══════════════════════════════════════════════════════════════════════

describe("getAxisSources", () => {
  it("returns sources for all 6 axis slugs", () => {
    const slugs = ["financial", "energy", "technology", "defense", "critical_inputs", "logistics"];
    for (const slug of slugs) {
      const sources = getAxisSources(slug);
      expect(sources.length).toBeGreaterThan(0);
    }
  });

  it("each source has required fields", () => {
    const sources = getAxisSources("financial");
    for (const s of sources) {
      expect(s.dataset).toBeTruthy();
      expect(s.publisher).toBeTruthy();
      expect(s.url).toBeTruthy();
      expect(s.description).toBeTruthy();
    }
  });

  it("returns empty array for unknown slug", () => {
    const sources = getAxisSources("unknown_axis");
    expect(sources).toEqual([]);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 10. Scenario Explanation Lookup
// ══════════════════════════════════════════════════════════════════════

describe("getScenarioExplanation", () => {
  it("returns an explanation for each of the 5 presets", () => {
    const ids = [
      "energy-diversification",
      "defense-reindustrialization",
      "logistics-disruption",
      "technology-decoupling",
      "financial-fragmentation",
    ];
    for (const id of ids) {
      const explanation = getScenarioExplanation(id);
      expect(explanation).not.toBeNull();
      expect(explanation!.title).toBeTruthy();
      expect(explanation!.context).toBeTruthy();
      expect(explanation!.impacts.length).toBeGreaterThan(0);
      expect(explanation!.axisEffects.length).toBeGreaterThan(0);
      expect(explanation!.referenceEvents.length).toBeGreaterThan(0);
    }
  });

  it("returns null for unknown preset ID", () => {
    expect(getScenarioExplanation("nonexistent-preset")).toBeNull();
  });

  it("all explanations have unique IDs", () => {
    const ids = SCENARIO_EXPLANATIONS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("axis effects reference valid axis slugs", () => {
    const validSlugs = new Set(["financial", "energy", "technology", "defense", "critical_inputs", "logistics"]);
    for (const exp of SCENARIO_EXPLANATIONS) {
      for (const effect of exp.axisEffects) {
        expect(validSlugs.has(effect.axis)).toBe(true);
      }
    }
  });
});

// ══════════════════════════════════════════════════════════════════════
// Utility Functions
// ══════════════════════════════════════════════════════════════════════

describe("extractCompositeScores", () => {
  it("filters out null composites", () => {
    const countries = [
      makeCompositeCountry({ isi_composite: 0.30 }),
      makeCompositeCountry({ isi_composite: null as unknown as number }),
      makeCompositeCountry({ isi_composite: 0.50 }),
    ];
    expect(extractCompositeScores(countries)).toEqual([0.30, 0.50]);
  });

  it("returns empty for all nulls", () => {
    const countries = [
      makeCompositeCountry({ isi_composite: null as unknown as number }),
    ];
    expect(extractCompositeScores(countries)).toEqual([]);
  });
});

describe("isAggregatePartner", () => {
  it("identifies aggregate labels", () => {
    expect(isAggregatePartner("TOTAL")).toBe(true);
    expect(isAggregatePartner("Total")).toBe(true);
    expect(isAggregatePartner("WORLD")).toBe(true);
    expect(isAggregatePartner("World")).toBe(true);
  });

  it("does not flag real partner names", () => {
    expect(isAggregatePartner("Germany")).toBe(false);
    expect(isAggregatePartner("China")).toBe(false);
    expect(isAggregatePartner("United States")).toBe(false);
  });
});

describe("formatCompactVolume", () => {
  it("formats billions", () => {
    expect(formatCompactVolume(15_410_000_000)).toBe("15.41B");
  });

  it("formats millions", () => {
    expect(formatCompactVolume(2_310_000)).toBe("2.31M");
  });

  it("formats thousands", () => {
    expect(formatCompactVolume(1_500)).toBe("1.5K");
  });

  it("strips trailing zeros", () => {
    expect(formatCompactVolume(1_000_000_000)).toBe("1B");
    expect(formatCompactVolume(2_000_000)).toBe("2M");
  });
});
