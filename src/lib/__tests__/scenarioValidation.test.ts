// ============================================================================
// Unit Tests — Scenario Validation
// ============================================================================
// Pre-flight validation prevents invalid payloads from reaching the backend.
// These tests verify boundary conditions, EU-27 whitelist, clamping, and
// payload construction — all critical for deterministic simulation.
// ============================================================================

import { describe, it, expect } from "vitest";
import {
  validateScenarioInput,
  buildScenarioPayload,
} from "../scenarioValidation";

// ─── validateScenarioInput ──────────────────────────────────────────

describe("validateScenarioInput", () => {
  it("accepts valid EU-27 country with valid adjustments", () => {
    const result = validateScenarioInput("DE", { financial: 0.10 });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.payload.country).toBe("DE");
      // Payload should contain backend long-form keys
      expect(result.payload.adjustments).toHaveProperty(
        "financial_external_supplier_concentration",
      );
    }
  });

  it("accepts all EU-27 country codes", () => {
    const eu27 = [
      "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "EL", "ES",
      "FI", "FR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT",
      "NL", "PL", "PT", "RO", "SE", "SI", "SK",
    ];
    for (const code of eu27) {
      const result = validateScenarioInput(code, {});
      expect(result.valid).toBe(true);
    }
  });

  it("rejects non-EU-27 country codes", () => {
    const result = validateScenarioInput("US", { financial: 0.10 });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain("not in EU-27");
    }
  });

  it("rejects invalid country code length (3 chars)", () => {
    const result = validateScenarioInput("DEU", { financial: 0.10 });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain("length");
    }
  });

  it("rejects single-character country codes", () => {
    const result = validateScenarioInput("D", { financial: 0.10 });
    expect(result.valid).toBe(false);
  });

  it("rejects empty country code", () => {
    const result = validateScenarioInput("", { financial: 0.10 });
    expect(result.valid).toBe(false);
  });

  it("rejects NaN adjustments", () => {
    const result = validateScenarioInput("DE", { financial: NaN });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain("Non-numeric");
    }
  });

  it("rejects Infinity adjustments", () => {
    const result = validateScenarioInput("DE", { financial: Infinity });
    expect(result.valid).toBe(false);
  });

  it("is case-insensitive on country code", () => {
    const result = validateScenarioInput("de", { financial: 0.10 });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.payload.country).toBe("DE");
    }
  });

  it("trims whitespace from country code", () => {
    const result = validateScenarioInput("  DE  ", { financial: 0.10 });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.payload.country).toBe("DE");
    }
  });

  it("accepts empty adjustments (all-zero scenario)", () => {
    const result = validateScenarioInput("DE", {});
    expect(result.valid).toBe(true);
    if (result.valid) {
      // All 6 backend keys should be present, all zero
      expect(Object.keys(result.payload.adjustments)).toHaveLength(6);
      expect(Object.values(result.payload.adjustments).every((v) => v === 0)).toBe(true);
    }
  });
});

// ─── buildScenarioPayload ───────────────────────────────────────────

describe("buildScenarioPayload", () => {
  it("maps UI slugs to backend long-form keys", () => {
    const payload = buildScenarioPayload("DE", { financial: 0.05 });
    expect(payload.adjustments).toHaveProperty("financial_external_supplier_concentration", 0.05);
    expect(payload.adjustments).toHaveProperty("energy_external_supplier_concentration", 0);
    expect(payload.adjustments).toHaveProperty("technology_semiconductor_external_supplier_concentration", 0);
    expect(payload.adjustments).toHaveProperty("defense_external_supplier_concentration", 0);
    expect(payload.adjustments).toHaveProperty("critical_inputs_raw_materials_external_supplier_concentration", 0);
    expect(payload.adjustments).toHaveProperty("logistics_freight_external_supplier_concentration", 0);
  });

  it("clamps adjustments to +0.20 maximum", () => {
    const payload = buildScenarioPayload("DE", { financial: 0.50 });
    expect(payload.adjustments["financial_external_supplier_concentration"]).toBe(0.20);
  });

  it("clamps adjustments to -0.20 minimum", () => {
    const payload = buildScenarioPayload("DE", { financial: -0.50 });
    expect(payload.adjustments["financial_external_supplier_concentration"]).toBe(-0.20);
  });

  it("defaults missing axes to 0", () => {
    const payload = buildScenarioPayload("DE", {});
    expect(Object.values(payload.adjustments).every((v) => v === 0)).toBe(true);
    expect(Object.keys(payload.adjustments)).toHaveLength(6);
  });

  it("uppercases country code", () => {
    const payload = buildScenarioPayload("de", { financial: 0.10 });
    expect(payload.country).toBe("DE");
  });

  it("handles boundary values exactly at ±0.20", () => {
    const payloadPos = buildScenarioPayload("DE", { financial: 0.20 });
    expect(payloadPos.adjustments["financial_external_supplier_concentration"]).toBe(0.20);

    const payloadNeg = buildScenarioPayload("DE", { financial: -0.20 });
    expect(payloadNeg.adjustments["financial_external_supplier_concentration"]).toBe(-0.20);
  });

  it("converts string-like numbers to floats", () => {
    // The function uses parseFloat(String(raw))
    const payload = buildScenarioPayload("DE", { financial: "0.15" as unknown as number });
    expect(payload.adjustments["financial_external_supplier_concentration"]).toBe(0.15);
  });

  it("treats null/undefined adjustments as 0", () => {
    const payload = buildScenarioPayload("DE", { financial: null as unknown as number });
    expect(payload.adjustments["financial_external_supplier_concentration"]).toBe(0);
  });
});
