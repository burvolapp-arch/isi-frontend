// ============================================================================
// Unit Tests — Axis Registry (Single Source of Truth)
// ============================================================================
// The axis registry is the canonical naming authority.
// These tests verify slug resolution, key normalization, and label generation.
// ============================================================================

import { describe, it, expect } from "vitest";
import {
  ALL_AXIS_SLUGS,
  AXIS_CANONICAL_NAMES,
  AXIS_FIELD_MAP,
  FIELD_TO_SLUG,
  getCanonicalAxisName,
  resolveAxisSlug,
  normalizeAxisKey,
  getAxisShortName,
} from "../axisRegistry";

// ─── Registry Constants ─────────────────────────────────────────────

describe("registry constants", () => {
  it("ALL_AXIS_SLUGS contains exactly 6 axes", () => {
    expect(ALL_AXIS_SLUGS).toHaveLength(6);
  });

  it("AXIS_FIELD_MAP maps all slugs to field keys", () => {
    for (const slug of ALL_AXIS_SLUGS) {
      expect(AXIS_FIELD_MAP[slug]).toBeDefined();
      expect(AXIS_FIELD_MAP[slug]).toMatch(/^axis_\d+_/);
    }
  });

  it("FIELD_TO_SLUG is the inverse of AXIS_FIELD_MAP", () => {
    for (const [slug, field] of Object.entries(AXIS_FIELD_MAP)) {
      expect(FIELD_TO_SLUG[field]).toBe(slug);
    }
  });

  it("canonical names all end with 'External Supplier Concentration'", () => {
    for (const name of Object.values(AXIS_CANONICAL_NAMES)) {
      expect(name).toMatch(/External Supplier Concentration$/);
    }
  });
});

// ─── normalizeAxisKey ───────────────────────────────────────────────

describe("normalizeAxisKey", () => {
  it("resolves canonical slugs", () => {
    expect(normalizeAxisKey("financial")).toBe("financial");
    expect(normalizeAxisKey("energy")).toBe("energy");
    expect(normalizeAxisKey("technology")).toBe("technology");
    expect(normalizeAxisKey("defense")).toBe("defense");
    expect(normalizeAxisKey("critical_inputs")).toBe("critical_inputs");
    expect(normalizeAxisKey("logistics")).toBe("logistics");
  });

  it("resolves long-form backend keys", () => {
    expect(normalizeAxisKey("financial_external_supplier_concentration")).toBe("financial");
    expect(normalizeAxisKey("energy_external_supplier_concentration")).toBe("energy");
    expect(normalizeAxisKey("technology_semiconductor_external_supplier_concentration")).toBe("technology");
    expect(normalizeAxisKey("defense_external_supplier_concentration")).toBe("defense");
    expect(normalizeAxisKey("critical_inputs_raw_materials_external_supplier_concentration")).toBe("critical_inputs");
    expect(normalizeAxisKey("logistics_freight_external_supplier_concentration")).toBe("logistics");
  });

  it("returns null for unresolvable keys", () => {
    expect(normalizeAxisKey("unknown_axis")).toBeNull();
    expect(normalizeAxisKey("")).toBeNull();
  });

  it("handles keys with partial suffixes stripped", () => {
    // Fuzzy stripping: _external_supplier_concentration suffix removed
    expect(normalizeAxisKey("financial_external_supplier_concentration")).toBe("financial");
  });
});

// ─── resolveAxisSlug ────────────────────────────────────────────────

describe("resolveAxisSlug", () => {
  it("resolves slugs directly", () => {
    expect(resolveAxisSlug("financial")).toBe("financial");
    expect(resolveAxisSlug("defense")).toBe("defense");
  });

  it("resolves backend axis_name values", () => {
    expect(resolveAxisSlug("Financial Sovereignty")).toBe("financial");
    expect(resolveAxisSlug("Energy Dependency")).toBe("energy");
    expect(resolveAxisSlug("Defense Industrial Dependency")).toBe("defense");
    expect(resolveAxisSlug("Critical Inputs Dependency")).toBe("critical_inputs");
    expect(resolveAxisSlug("Logistics Dependency")).toBe("logistics");
  });

  it("resolves short-form display names", () => {
    expect(resolveAxisSlug("Financial")).toBe("financial");
    expect(resolveAxisSlug("Energy")).toBe("energy");
    expect(resolveAxisSlug("Critical Inputs")).toBe("critical_inputs");
  });

  it("resolves field keys", () => {
    expect(resolveAxisSlug("axis_1_financial")).toBe("financial");
    expect(resolveAxisSlug("axis_4_defense")).toBe("defense");
  });

  it("strips 'Axis N: ' prefix", () => {
    expect(resolveAxisSlug("Axis 1: Financial")).toBe("financial");
    expect(resolveAxisSlug("Axis 4: Defense")).toBe("defense");
  });

  it("returns null for unknown inputs", () => {
    expect(resolveAxisSlug("UnknownAxis")).toBeNull();
    expect(resolveAxisSlug("")).toBeNull();
  });
});

// ─── getCanonicalAxisName ───────────────────────────────────────────

describe("getCanonicalAxisName", () => {
  it("returns canonical name from slug", () => {
    expect(getCanonicalAxisName("financial")).toBe("Financial External Supplier Concentration");
    expect(getCanonicalAxisName("defense")).toBe("Defense External Supplier Concentration");
    expect(getCanonicalAxisName("critical_inputs")).toBe("Critical Inputs External Supplier Concentration");
  });

  it("resolves backend axis_name to canonical", () => {
    expect(getCanonicalAxisName("Financial Sovereignty")).toBe("Financial External Supplier Concentration");
    expect(getCanonicalAxisName("Technology Dependency")).toBe("Technology External Supplier Concentration");
  });

  it("passes through already-canonical names", () => {
    const canonical = "Financial External Supplier Concentration";
    expect(getCanonicalAxisName(canonical)).toBe(canonical);
  });

  it("strips 'Axis N: ' prefix and resolves", () => {
    expect(getCanonicalAxisName("Axis 2: Energy")).toBe("Energy External Supplier Concentration");
  });

  it("resolves long-form backend keys", () => {
    expect(getCanonicalAxisName("logistics_freight_external_supplier_concentration"))
      .toBe("Logistics External Supplier Concentration");
  });
});

// ─── getAxisShortName ───────────────────────────────────────────────

describe("getAxisShortName", () => {
  it("returns short names from slugs", () => {
    expect(getAxisShortName("financial")).toBe("Financial");
    expect(getAxisShortName("critical_inputs")).toBe("Critical Inputs");
    expect(getAxisShortName("logistics")).toBe("Logistics");
  });

  it("resolves long-form keys to short names", () => {
    expect(getAxisShortName("energy_external_supplier_concentration")).toBe("Energy");
  });
});

// ─── assertCanonicalLabel ───────────────────────────────────────────

describe("assertCanonicalLabel", () => {
  // These tests run in test environment (not development), so assertCanonicalLabel
  // is a no-op. We test the logic by checking canonical names don't violate rules.

  it("canonical names pass validation (no forbidden patterns)", () => {
    for (const name of Object.values(AXIS_CANONICAL_NAMES)) {
      // "External Supplier Concentration" should NOT trigger the guard
      expect(name).not.toMatch(/\bDependency\b/i);
      expect(name).not.toMatch(/\bSovereignty\b/i);
    }
  });

  it("canonical names contain 'External Supplier Concentration'", () => {
    for (const name of Object.values(AXIS_CANONICAL_NAMES)) {
      expect(name).toContain("External Supplier Concentration");
    }
  });
});
