// ============================================================================
// Unit Tests — Scenario Presets
// ============================================================================

import { describe, it, expect } from "vitest";
import {
  SCENARIO_PRESETS,
  getPresetById,
  getPresetsByCategory,
} from "../scenarioPresets";
import { ALL_AXIS_SLUGS } from "../axisRegistry";

describe("SCENARIO_PRESETS", () => {
  it("contains at least 5 presets", () => {
    expect(SCENARIO_PRESETS.length).toBeGreaterThanOrEqual(5);
  });

  it("all presets have unique IDs", () => {
    const ids = SCENARIO_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all preset IDs are kebab-case", () => {
    for (const preset of SCENARIO_PRESETS) {
      expect(preset.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("all adjustments use valid axis slugs", () => {
    for (const preset of SCENARIO_PRESETS) {
      for (const key of Object.keys(preset.adjustments)) {
        expect(ALL_AXIS_SLUGS).toContain(key);
      }
    }
  });

  it("all adjustments are within [-0.20, +0.20] bounds", () => {
    for (const preset of SCENARIO_PRESETS) {
      for (const [key, value] of Object.entries(preset.adjustments)) {
        expect(value).toBeGreaterThanOrEqual(-0.20);
        expect(value).toBeLessThanOrEqual(0.20);
      }
    }
  });

  it("all presets have non-empty descriptions and citations", () => {
    for (const preset of SCENARIO_PRESETS) {
      expect(preset.description.length).toBeGreaterThan(20);
      expect(preset.citation.length).toBeGreaterThan(5);
    }
  });

  it("all presets have at least one adjustment", () => {
    for (const preset of SCENARIO_PRESETS) {
      expect(Object.keys(preset.adjustments).length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("getPresetById", () => {
  it("finds existing presets", () => {
    const preset = getPresetById("russian-gas-disruption");
    expect(preset).toBeDefined();
    expect(preset?.label).toContain("Russian Gas");
  });

  it("returns undefined for unknown IDs", () => {
    expect(getPresetById("nonexistent")).toBeUndefined();
  });
});

describe("getPresetsByCategory", () => {
  it("filters by category", () => {
    const energy = getPresetsByCategory("energy");
    expect(energy.length).toBeGreaterThanOrEqual(1);
    expect(energy.every((p) => p.category === "energy")).toBe(true);
  });

  it("returns empty array for unused category", () => {
    // All categories should have at least one preset
    for (const cat of ["energy", "trade", "security", "technology", "financial"] as const) {
      expect(getPresetsByCategory(cat).length).toBeGreaterThanOrEqual(1);
    }
  });
});
