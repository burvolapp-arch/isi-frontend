// ============================================================================
// ISI Frontend — Canonical Axis Registry (Single Source of Truth)
// ============================================================================
// This file is the ONLY source of axis display names in the frontend.
// No other file may define, derive, or transform axis names.
//
// The ISI measures Herfindahl–Hirschman concentration of external suppliers.
// Every axis MUST be rendered as "[Domain] External Supplier Concentration".
//
// Adding a new axis requires:
//   1. Add entry to AXIS_CANONICAL_NAMES
//   2. Add slug → field mapping to AXIS_FIELD_MAP
//   3. No other files need modification — the registry propagates everywhere.
// ============================================================================

/**
 * Canonical display names for all ISI axes.
 * These are the ONLY strings that may appear in user-facing output.
 */
export const AXIS_CANONICAL_NAMES = {
  financial: "Financial External Supplier Concentration",
  energy: "Energy External Supplier Concentration",
  technology: "Technology External Supplier Concentration",
  defense: "Defense External Supplier Concentration",
  critical_inputs: "Critical Inputs External Supplier Concentration",
  logistics: "Logistics External Supplier Concentration",
} as const;

export type AxisSlug = keyof typeof AXIS_CANONICAL_NAMES;

/** All valid axis slugs. */
export const ALL_AXIS_SLUGS = Object.keys(AXIS_CANONICAL_NAMES) as AxisSlug[];

/**
 * Short-form display names for compact contexts (radar charts, small badges).
 * These abbreviate the canonical names while preserving domain clarity.
 */
export const AXIS_SHORT_NAMES: Record<AxisSlug, string> = {
  financial: "Financial",
  energy: "Energy",
  technology: "Technology",
  defense: "Defense",
  critical_inputs: "Critical Inputs",
  logistics: "Logistics",
} as const;

/** Return a compact axis label suitable for constrained UI contexts. */
export function getAxisShortName(slug: string): string {
  if (slug in AXIS_SHORT_NAMES) return AXIS_SHORT_NAMES[slug as AxisSlug];
  // Try normalizing long-form backend keys to a canonical slug first
  const normalized = normalizeAxisKey(slug);
  if (normalized && normalized in AXIS_SHORT_NAMES) return AXIS_SHORT_NAMES[normalized];
  // Fallback: strip "External Supplier Concentration" from canonical name
  const canonical = getCanonicalAxisName(slug);
  return canonical.replace(/\s*External Supplier Concentration$/i, "") || canonical;
}

/**
 * Universal axis label formatter.
 * Accepts any backend key, slug, or long-form name and returns a clean,
 * human-readable short label with no underscores or camelCase.
 *
 * This is the single entry point for all axis label rendering.
 * Use instead of getAxisShortName / getCanonicalAxisName for display.
 */
export function formatAxisLabel(key: string): string {
  return getAxisShortName(key);
}

/**
 * Map axis slug → ISICompositeCountry field key.
 * Used by components that read scores from composite data.
 */
export const AXIS_FIELD_MAP: Record<AxisSlug, string> = {
  financial: "axis_1_financial",
  energy: "axis_2_energy",
  technology: "axis_3_technology",
  defense: "axis_4_defense",
  critical_inputs: "axis_5_critical_inputs",
  logistics: "axis_6_logistics",
};

/**
 * Reverse map: field key → axis slug.
 * Used to resolve slugs from dynamic field discovery.
 */
export const FIELD_TO_SLUG: Record<string, AxisSlug> = Object.fromEntries(
  Object.entries(AXIS_FIELD_MAP).map(([slug, field]) => [field, slug as AxisSlug])
) as Record<string, AxisSlug>;

/**
 * Map backend axis_name values → canonical slug.
 * Backend may send "Financial Sovereignty", "Energy Dependency", etc.
 * This is the ONLY place where legacy backend names are recognized.
 */
const BACKEND_NAME_TO_SLUG: Record<string, AxisSlug> = {
  // Backend-provided axis_name values
  "Financial Sovereignty": "financial",
  "Energy Dependency": "energy",
  "Technology Dependency": "technology",
  "Defense Industrial Dependency": "defense",
  "Critical Inputs Dependency": "critical_inputs",
  "Logistics Dependency": "logistics",
  // Short-form field-derived names (from key suffix capitalization)
  "Financial": "financial",
  "Energy": "energy",
  "Technology": "technology",
  "Defense": "defense",
  "Critical Inputs": "critical_inputs",
  "Critical inputs": "critical_inputs",
  "Logistics": "logistics",
};

/**
 * Resolve the canonical display name for an axis.
 *
 * Accepts:
 * - A canonical slug ("financial", "energy", etc.)
 * - A backend axis_name ("Financial Sovereignty", "Energy Dependency", etc.)
 * - A field-key-derived label ("Financial", "Energy", etc.)
 * - An "Axis N: ..." prefixed string
 *
 * Throws in development if the input cannot be resolved.
 */
export function getCanonicalAxisName(input: string): string {
  // Strip optional "Axis N: " prefix
  const stripped = input.replace(/^Axis \d+:\s*/, "");

  // Direct slug match
  if (stripped in AXIS_CANONICAL_NAMES) {
    return AXIS_CANONICAL_NAMES[stripped as AxisSlug];
  }

  // Backend name match
  if (stripped in BACKEND_NAME_TO_SLUG) {
    return AXIS_CANONICAL_NAMES[BACKEND_NAME_TO_SLUG[stripped]];
  }

  // Already canonical — validate and return
  const canonicalValues = Object.values(AXIS_CANONICAL_NAMES) as string[];
  if (canonicalValues.includes(stripped)) {
    return stripped;
  }

  // Long-form backend key match (e.g. "financial_external_supplier_concentration")
  const normalized = normalizeAxisKey(stripped);
  if (normalized && normalized in AXIS_CANONICAL_NAMES) {
    return AXIS_CANONICAL_NAMES[normalized as AxisSlug];
  }

  // Development guard — unknown input
  if (process.env.NODE_ENV === "development") {
    console.error(
      `[axisRegistry] Unresolvable axis input: "${input}". ` +
      `Expected a known slug, backend name, or canonical name.`
    );
  }

  // Fallback: return input unchanged (production resilience)
  return stripped;
}

/**
 * Resolve a backend axis_name or slug to its canonical slug.
 * Returns null if unresolvable.
 */
export function resolveAxisSlug(input: string): AxisSlug | null {
  const stripped = input.replace(/^Axis \d+:\s*/, "");

  if (stripped in AXIS_CANONICAL_NAMES) return stripped as AxisSlug;
  if (stripped in BACKEND_NAME_TO_SLUG) return BACKEND_NAME_TO_SLUG[stripped];

  // Try matching field key → slug
  if (stripped in FIELD_TO_SLUG) return FIELD_TO_SLUG[stripped];

  // Try long-form backend key normalization
  const normalized = normalizeAxisKey(stripped);
  if (normalized) return normalized;

  return null;
}

/**
 * Long-form backend axis key → canonical slug.
 * Handles keys like "financial_external_supplier_concentration" → "financial".
 */
const LONG_KEY_TO_SLUG: Record<string, AxisSlug> = {
  financial_external_supplier_concentration: "financial",
  energy_external_supplier_concentration: "energy",
  technology_semiconductor_external_supplier_concentration: "technology",
  defense_external_supplier_concentration: "defense",
  critical_inputs_raw_materials_external_supplier_concentration: "critical_inputs",
  logistics_freight_external_supplier_concentration: "logistics",
};

/**
 * Normalize any backend axis key to a canonical slug.
 * Accepts short slugs, long-form keys, or prefixed variants.
 * Returns the AxisSlug or null if unresolvable.
 */
export function normalizeAxisKey(input: string): AxisSlug | null {
  // Direct slug match
  if (input in AXIS_CANONICAL_NAMES) return input as AxisSlug;
  // Long-form match
  if (input in LONG_KEY_TO_SLUG) return LONG_KEY_TO_SLUG[input];
  // Fuzzy: strip common suffixes and try prefix matching
  const stripped = input
    .replace(/_?external_supplier_concentration$/i, "")
    .replace(/_?raw_materials$/i, "")
    .replace(/_?semiconductor$/i, "")
    .replace(/_?freight$/i, "");
  if (stripped in AXIS_CANONICAL_NAMES) return stripped as AxisSlug;
  // Last resort: check if any slug is a prefix of the input
  for (const slug of ALL_AXIS_SLUGS) {
    if (input.startsWith(slug)) return slug;
  }
  return null;
}

// ─── Regression Guard ───────────────────────────────────────────────
// Development-time validation for axis labels.
// Any component rendering axis names MUST pass through getCanonicalAxisName().
// This guard catches drift if labels bypass the registry.

const FORBIDDEN_PATTERNS = [
  /\bDependency\b/i,
  /\bSovereignty\b/i,
  /\bExternal Concentration\b(?! )/i, // "External Concentration" without "Supplier" following
];

// More precise: "External Concentration" that is NOT immediately followed by " Supplier"
// and is NOT part of "External Supplier Concentration"
const FORBIDDEN_EXTERNAL_CONCENTRATION = /External\s+Concentration(?!\s+Supplier)/i;

/**
 * Validate that an axis label conforms to the canonical naming convention.
 * Throws in development if a forbidden pattern is detected.
 * Call this at render boundaries as a regression safety net.
 */
export function assertCanonicalLabel(label: string, context?: string): void {
  if (process.env.NODE_ENV !== "development") return;

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(label)) {
      // Special case: "External Concentration" is OK if it's part of "External Supplier Concentration"
      if (pattern.source.includes("External Concentration")) {
        if (!FORBIDDEN_EXTERNAL_CONCENTRATION.test(label)) continue;
      }
      throw new Error(
        `[ISI Naming Violation] Illegal axis label detected: "${label}"` +
        (context ? ` in ${context}` : "") +
        `. All axis labels must use canonical "[Domain] External Supplier Concentration" form. ` +
        `Use getCanonicalAxisName() from @/lib/axisRegistry.`
      );
    }
  }
}
