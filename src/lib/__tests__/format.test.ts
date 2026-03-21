// ============================================================================
// Unit Tests — Format Utilities
// ============================================================================
// Tests formatting, statistics, classification, and dynamic axis discovery.
// All functions must be deterministic and side-effect-free.
// ============================================================================

import { describe, it, expect } from "vitest";
import {
  humanizeKey,
  formatScorePercent,
  formatNumber,
  classificationLabel,
  classificationDescription,
  classifyScore,
  computePercentile,
  deviationFromMean,
  extractCompositeScores,
  computeStdDev,
  computeMedian,
  discoverAxisFieldKeys,
  computeRank,
  computeAxisVariance,
  formatCompactVolume,
  isAggregatePartner,
  countrySlug,
  axisHref,
  countryHref,
} from "../format";
import type { ISICompositeCountry } from "../types";

// ─── Test Fixtures ──────────────────────────────────────────────────

function mockCountry(overrides: Partial<ISICompositeCountry> = {}): ISICompositeCountry {
  return {
    country: "XX",
    country_name: "Test Country",
    axis_1_financial: 0.20,
    axis_2_energy: 0.30,
    axis_3_technology: 0.15,
    axis_4_defense: 0.60,
    axis_5_critical_inputs: 0.10,
    axis_6_logistics: 0.45,
    isi_composite: 0.30,
    classification: "moderately_concentrated",
    complete: true,
    ...overrides,
  };
}

// ─── humanizeKey ────────────────────────────────────────────────────

describe("humanizeKey", () => {
  it("converts snake_case to Title Case", () => {
    expect(humanizeKey("fuel_gas_natural")).toBe("Fuel Gas Natural");
    expect(humanizeKey("hhi_normalized")).toBe("HHI Normalized");
  });

  it("preserves domain acronyms", () => {
    expect(humanizeKey("isi_composite")).toBe("ISI Composite");
    expect(humanizeKey("eu_aggregate")).toBe("EU Aggregate");
    expect(humanizeKey("usd_amount")).toBe("USD Amount");
  });
});

// ─── formatScorePercent ─────────────────────────────────────────────

describe("formatScorePercent", () => {
  it("formats score as percentage", () => {
    expect(formatScorePercent(0.5)).toBe("50.0%");
    expect(formatScorePercent(1)).toBe("100.0%");
    expect(formatScorePercent(0)).toBe("0.0%");
  });

  it("returns em-dash for null/undefined", () => {
    expect(formatScorePercent(null)).toBe("—");
    expect(formatScorePercent(undefined)).toBe("—");
  });
});

// ─── Classification ─────────────────────────────────────────────────

describe("classifyScore", () => {
  it("classifies ≥0.50 as highly_concentrated", () => {
    expect(classifyScore(0.50)).toBe("highly_concentrated");
    expect(classifyScore(0.80)).toBe("highly_concentrated");
    expect(classifyScore(1.0)).toBe("highly_concentrated");
  });

  it("classifies 0.25–0.49 as moderately_concentrated", () => {
    expect(classifyScore(0.25)).toBe("moderately_concentrated");
    expect(classifyScore(0.49)).toBe("moderately_concentrated");
  });

  it("classifies 0.15–0.24 as mildly_concentrated", () => {
    expect(classifyScore(0.15)).toBe("mildly_concentrated");
    expect(classifyScore(0.24)).toBe("mildly_concentrated");
  });

  it("classifies <0.15 as unconcentrated", () => {
    expect(classifyScore(0.14)).toBe("unconcentrated");
    expect(classifyScore(0.0)).toBe("unconcentrated");
  });
});

describe("classificationLabel", () => {
  it("returns human-readable labels", () => {
    expect(classificationLabel("highly_concentrated")).toBe("Highly Concentrated");
    expect(classificationLabel("moderately_concentrated")).toBe("Moderately Concentrated");
    expect(classificationLabel("mildly_concentrated")).toBe("Mildly Concentrated");
    expect(classificationLabel("unconcentrated")).toBe("Unconcentrated");
  });

  it("returns N/A for null", () => {
    expect(classificationLabel(null)).toBe("N/A");
    expect(classificationLabel(undefined)).toBe("N/A");
  });
});

describe("classificationDescription", () => {
  it("returns descriptions with HHI thresholds", () => {
    const desc = classificationDescription("highly_concentrated");
    expect(desc).toContain("0.50");
  });
});

// ─── Statistics ─────────────────────────────────────────────────────

describe("computePercentile", () => {
  it("computes correct percentile rank", () => {
    const scores = [0.10, 0.20, 0.30, 0.40, 0.50];
    expect(computePercentile(0.30, scores)).toBe(40); // 2 below out of 5 = 40%
    expect(computePercentile(0.50, scores)).toBe(80); // 4 below out of 5 = 80%
    expect(computePercentile(0.10, scores)).toBe(0);  // 0 below out of 5 = 0%
  });

  it("returns 0 for empty array", () => {
    expect(computePercentile(0.5, [])).toBe(0);
  });
});

describe("computeStdDev", () => {
  it("computes standard deviation correctly", () => {
    const scores = [2, 4, 4, 4, 5, 5, 7, 9];
    const result = computeStdDev(scores);
    expect(result).toBeCloseTo(2.0, 1);
  });

  it("returns 0 for empty array", () => {
    expect(computeStdDev([])).toBe(0);
  });

  it("returns 0 for single element", () => {
    expect(computeStdDev([5])).toBe(0);
  });

  it("returns 0 for identical elements", () => {
    expect(computeStdDev([3, 3, 3, 3])).toBe(0);
  });
});

describe("computeMedian", () => {
  it("computes median for odd-length array", () => {
    expect(computeMedian([1, 3, 5])).toBe(3);
    expect(computeMedian([1, 2, 3, 4, 5])).toBe(3);
  });

  it("computes median for even-length array", () => {
    expect(computeMedian([1, 2, 3, 4])).toBe(2.5);
  });

  it("returns 0 for empty array", () => {
    expect(computeMedian([])).toBe(0);
  });

  it("handles unsorted input", () => {
    expect(computeMedian([5, 1, 3])).toBe(3);
  });
});

describe("computeRank", () => {
  it("returns 1-based rank (highest = rank 1)", () => {
    const scores = [0.10, 0.30, 0.50, 0.20, 0.40];
    expect(computeRank(0.50, scores)).toBe(1);
    expect(computeRank(0.40, scores)).toBe(2);
    expect(computeRank(0.10, scores)).toBe(5);
  });

  it("returns null for empty array", () => {
    expect(computeRank(0.5, [])).toBeNull();
  });

  it("returns null if score not found", () => {
    expect(computeRank(0.99, [0.1, 0.2, 0.3])).toBeNull();
  });
});

describe("deviationFromMean", () => {
  it("computes positive deviation (above mean)", () => {
    expect(deviationFromMean(0.40, 0.30)).toBeCloseTo(0.10);
  });

  it("computes negative deviation (below mean)", () => {
    expect(deviationFromMean(0.20, 0.30)).toBeCloseTo(-0.10);
  });

  it("returns null when score is null", () => {
    expect(deviationFromMean(null, 0.30)).toBeNull();
  });

  it("returns null when mean is null", () => {
    expect(deviationFromMean(0.40, null)).toBeNull();
  });
});

describe("extractCompositeScores", () => {
  it("extracts non-null composite scores", () => {
    const countries = [
      mockCountry({ isi_composite: 0.30 }),
      mockCountry({ isi_composite: null }),
      mockCountry({ isi_composite: 0.50 }),
    ];
    expect(extractCompositeScores(countries)).toEqual([0.30, 0.50]);
  });

  it("returns empty array when all scores are null", () => {
    const countries = [
      mockCountry({ isi_composite: null }),
      mockCountry({ isi_composite: null }),
    ];
    expect(extractCompositeScores(countries)).toEqual([]);
  });
});

// ─── Dynamic Axis Discovery ─────────────────────────────────────────

describe("discoverAxisFieldKeys", () => {
  it("discovers all axis fields from a sample country", () => {
    const country = mockCountry();
    const keys = discoverAxisFieldKeys(country);
    expect(keys).toEqual([
      "axis_1_financial",
      "axis_2_energy",
      "axis_3_technology",
      "axis_4_defense",
      "axis_5_critical_inputs",
      "axis_6_logistics",
    ]);
  });

  it("returns keys sorted by axis number", () => {
    const keys = discoverAxisFieldKeys(mockCountry());
    const numbers = keys.map((k) => parseInt(k.match(/^axis_(\d+)_/)?.[1] ?? "0"));
    for (let i = 1; i < numbers.length; i++) {
      expect(numbers[i]).toBeGreaterThan(numbers[i - 1]);
    }
  });
});

// ─── Axis Variance ──────────────────────────────────────────────────

describe("computeAxisVariance", () => {
  it("computes variance across axis scores", () => {
    const country = mockCountry({
      axis_1_financial: 0.20,
      axis_2_energy: 0.20,
      axis_3_technology: 0.20,
      axis_4_defense: 0.20,
      axis_5_critical_inputs: 0.20,
      axis_6_logistics: 0.20,
    });
    expect(computeAxisVariance(country)).toBeCloseTo(0, 10); // all equal (FP precision)
  });

  it("returns null with insufficient axes", () => {
    const country = mockCountry({
      axis_1_financial: 0.20,
      axis_2_energy: null,
      axis_3_technology: null,
      axis_4_defense: null,
      axis_5_critical_inputs: null,
      axis_6_logistics: null,
    });
    expect(computeAxisVariance(country)).toBeNull();
  });

  it("handles mixed null and non-null scores", () => {
    const country = mockCountry({
      axis_1_financial: 0.10,
      axis_2_energy: 0.30,
      axis_3_technology: 0.50,
      axis_4_defense: null,
      axis_5_critical_inputs: null,
      axis_6_logistics: null,
    });
    expect(computeAxisVariance(country)).toBeCloseTo(0.02667, 4);
  });
});

// ─── Compact Volume Formatting ──────────────────────────────────────

describe("formatCompactVolume", () => {
  it("formats billions", () => {
    expect(formatCompactVolume(2.5e9)).toBe("2.5B");
    expect(formatCompactVolume(1e9)).toBe("1B");
  });

  it("formats millions", () => {
    expect(formatCompactVolume(15e6)).toBe("15M");
    expect(formatCompactVolume(1.5e6)).toBe("1.5M");
  });

  it("strips trailing zeros", () => {
    expect(formatCompactVolume(1e6)).toBe("1M");
    expect(formatCompactVolume(2e9)).toBe("2B");
  });
});

// ─── Partner Filtering ──────────────────────────────────────────────

describe("isAggregatePartner", () => {
  it("identifies aggregate partner labels", () => {
    expect(isAggregatePartner("TOTAL")).toBe(true);
    expect(isAggregatePartner("Total")).toBe(true);
    expect(isAggregatePartner("WORLD")).toBe(true);
    expect(isAggregatePartner("World")).toBe(true);
  });

  it("does not flag actual bilateral partners", () => {
    expect(isAggregatePartner("Germany")).toBe(false);
    expect(isAggregatePartner("China")).toBe(false);
    expect(isAggregatePartner("US")).toBe(false);
  });
});

// ─── URL / Routing Helpers ──────────────────────────────────────────

describe("URL helpers", () => {
  it("generates lowercase country slugs", () => {
    expect(countrySlug("DE")).toBe("de");
    expect(countrySlug("AT")).toBe("at");
  });

  it("generates axis hrefs", () => {
    expect(axisHref("financial")).toBe("/axis/financial");
    expect(axisHref("defense")).toBe("/axis/defense");
  });

  it("generates country hrefs", () => {
    expect(countryHref("DE")).toBe("/country/de");
    expect(countryHref("AT")).toBe("/country/at");
  });
});
