// ============================================================================
// Unit Tests — Presentation Layer
// ============================================================================
// Tests the single source of truth for all display string formatting.
// Every function in presentation.ts must produce deterministic, reproducible output.
// ============================================================================

import { describe, it, expect } from "vitest";
import {
  formatAxisShort,
  formatAxisFull,
  formatEnum,
  formatPercentage,
  formatScore,
  formatDelta,
  formatSeverity,
  formatDataset,
  formatVolume,
  formatAxisLabel,
} from "../presentation";

// ─── formatScore ────────────────────────────────────────────────────

describe("formatScore", () => {
  it("formats a score to exactly 4 decimal places", () => {
    expect(formatScore(0.3456)).toBe("0.3456");
    expect(formatScore(0.1)).toBe("0.1000");
    expect(formatScore(1)).toBe("1.0000");
    expect(formatScore(0)).toBe("0.0000");
  });

  it("returns em-dash for null", () => {
    expect(formatScore(null)).toBe("—");
  });

  it("returns em-dash for undefined", () => {
    expect(formatScore(undefined)).toBe("—");
  });

  it("handles very small numbers", () => {
    expect(formatScore(0.0001)).toBe("0.0001");
    expect(formatScore(0.00005)).toBe("0.0001"); // rounds to 4dp
  });
});

// ─── formatDelta ────────────────────────────────────────────────────

describe("formatDelta", () => {
  it("formats positive deltas with + prefix", () => {
    expect(formatDelta(0.0123)).toBe("+0.0123");
  });

  it("formats negative deltas with typographic minus", () => {
    expect(formatDelta(-0.0456)).toBe("−0.0456");
  });

  it("formats zero as positive", () => {
    expect(formatDelta(0)).toBe("+0.0000");
  });

  it("uses exactly 4 decimal places", () => {
    expect(formatDelta(0.1)).toBe("+0.1000");
    expect(formatDelta(-0.1)).toBe("−0.1000");
  });
});

// ─── formatEnum ─────────────────────────────────────────────────────

describe("formatEnum", () => {
  it("converts snake_case to Title Case", () => {
    expect(formatEnum("highly_concentrated")).toBe("Highly Concentrated");
    expect(formatEnum("moderately_concentrated")).toBe("Moderately Concentrated");
  });

  it("converts UPPER_CASE to Title Case", () => {
    expect(formatEnum("BOTH_CHANNELS")).toBe("Both Channels");
    expect(formatEnum("CHANNEL_A")).toBe("Channel A");
  });

  it("handles single words", () => {
    expect(formatEnum("simple")).toBe("Simple");
    expect(formatEnum("HIGH")).toBe("High");
  });

  it("preserves domain acronyms", () => {
    expect(formatEnum("hhi_normalized")).toBe("HHI Normalized");
    expect(formatEnum("isi_composite")).toBe("ISI Composite");
    expect(formatEnum("eu_aggregate")).toBe("EU Aggregate");
  });

  it("handles empty string", () => {
    expect(formatEnum("")).toBe("");
  });

  it("returns numeric strings as-is", () => {
    expect(formatEnum("123")).toBe("123");
    expect(formatEnum("45.67")).toBe("45.67");
  });
});

// ─── formatPercentage ───────────────────────────────────────────────

describe("formatPercentage", () => {
  describe("control mode (default)", () => {
    it("formats positive values with + and %", () => {
      expect(formatPercentage(0.10)).toBe("+10%");
      expect(formatPercentage(0.20)).toBe("+20%");
    });

    it("formats negative values with − and %", () => {
      expect(formatPercentage(-0.15)).toBe("−15%");
      expect(formatPercentage(-0.05)).toBe("−5%");
    });

    it("formats zero as 'Base'", () => {
      expect(formatPercentage(0)).toBe("Base");
    });
  });

  describe("share mode", () => {
    it("formats as percentage with 1 decimal, unsigned", () => {
      expect(formatPercentage(0.4312, "share")).toBe("43.1%");
      expect(formatPercentage(1, "share")).toBe("100.0%");
      expect(formatPercentage(0, "share")).toBe("0.0%");
    });
  });

  describe("delta mode", () => {
    it("formats with sign and 4 decimal places", () => {
      expect(formatPercentage(0.0150, "delta")).toBe("+0.0150");
      expect(formatPercentage(-0.0023, "delta")).toBe("−0.0023");
    });
  });
});

// ─── formatAxisShort ────────────────────────────────────────────────

describe("formatAxisShort", () => {
  it("resolves canonical slugs", () => {
    expect(formatAxisShort("financial")).toBe("Financial");
    expect(formatAxisShort("energy")).toBe("Energy");
    expect(formatAxisShort("technology")).toBe("Technology");
    expect(formatAxisShort("defense")).toBe("Defense");
    expect(formatAxisShort("critical_inputs")).toBe("Critical Inputs");
    expect(formatAxisShort("logistics")).toBe("Logistics");
  });

  it("resolves long-form backend keys", () => {
    expect(formatAxisShort("financial_external_supplier_concentration")).toBe("Financial");
    expect(formatAxisShort("energy_external_supplier_concentration")).toBe("Energy");
    expect(formatAxisShort("technology_semiconductor_external_supplier_concentration")).toBe("Technology");
    expect(formatAxisShort("defense_external_supplier_concentration")).toBe("Defense");
    expect(formatAxisShort("critical_inputs_raw_materials_external_supplier_concentration")).toBe("Critical Inputs");
    expect(formatAxisShort("logistics_freight_external_supplier_concentration")).toBe("Logistics");
  });

  it("falls back to formatEnum for unknown keys", () => {
    expect(formatAxisShort("some_unknown_key")).toBe("Some Unknown Key");
  });
});

// ─── formatAxisFull ─────────────────────────────────────────────────

describe("formatAxisFull", () => {
  it("returns full institutional titles from slugs", () => {
    expect(formatAxisFull("financial")).toBe("Financial External Supplier Concentration");
    expect(formatAxisFull("defense")).toBe("Defense External Supplier Concentration");
    expect(formatAxisFull("critical_inputs")).toBe("Critical Inputs External Supplier Concentration");
  });

  it("resolves long-form backend keys to full titles", () => {
    expect(formatAxisFull("logistics_freight_external_supplier_concentration"))
      .toBe("Logistics External Supplier Concentration");
  });
});

// ─── formatAxisLabel ────────────────────────────────────────────────

describe("formatAxisLabel", () => {
  it("is an alias for formatAxisShort", () => {
    expect(formatAxisLabel("financial")).toBe(formatAxisShort("financial"));
    expect(formatAxisLabel("defense")).toBe(formatAxisShort("defense"));
  });
});

// ─── formatSeverity ─────────────────────────────────────────────────

describe("formatSeverity", () => {
  it("converts severity enums to display strings", () => {
    expect(formatSeverity("HIGH")).toBe("High");
    expect(formatSeverity("MEDIUM")).toBe("Medium");
    expect(formatSeverity("LOW")).toBe("Low");
  });
});

// ─── formatDataset ──────────────────────────────────────────────────

describe("formatDataset", () => {
  it("cleans Eurostat dataset codes", () => {
    expect(formatDataset("Eurostat nrg_ti_sff")).toBe("Eurostat Energy Trade");
    expect(formatDataset("Eurostat Comext ds-045409")).toBe("Eurostat Comext Trade Statistics");
  });

  it("cleans UN Comtrade codes", () => {
    expect(formatDataset("UN Comtrade HS6 rev4")).toBe("UN Comtrade Trade Statistics");
  });

  it("strips version suffixes from SIPRI", () => {
    expect(formatDataset("SIPRI Arms Transfers Database v2.1")).toBe("SIPRI Arms Transfers Database");
  });

  it("returns unknown sources unchanged", () => {
    expect(formatDataset("World Bank WDI")).toBe("World Bank WDI");
  });
});

// ─── formatVolume ───────────────────────────────────────────────────

describe("formatVolume", () => {
  it("formats billions", () => {
    expect(formatVolume(2448506954.27)).toBe("2.45B");
    expect(formatVolume(1000000000)).toBe("1B");
  });

  it("formats millions", () => {
    expect(formatVolume(15000000)).toBe("15M");
    expect(formatVolume(1500000)).toBe("1.5M");
  });

  it("formats thousands", () => {
    expect(formatVolume(1500)).toBe("1.5K");
    expect(formatVolume(1000)).toBe("1K");
  });

  it("formats small numbers", () => {
    expect(formatVolume(123.456)).toBe("123.46");
    expect(formatVolume(0)).toBe("0");
  });

  it("formats trillions", () => {
    expect(formatVolume(2.5e12)).toBe("2.5T");
  });

  it("strips trailing zeros", () => {
    expect(formatVolume(1000000)).toBe("1M");
    expect(formatVolume(2000000000)).toBe("2B");
  });
});
