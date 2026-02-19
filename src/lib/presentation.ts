// ============================================================================
// ISI Frontend — Global Presentation Adapter Layer
// ============================================================================
// This module is the ONLY source of formatted display strings in the frontend.
// No component may render raw backend keys, enum literals, or snake_case strings.
//
// All axis labels, enum values, percentages, and scores pass through this layer.
// ============================================================================

import { normalizeAxisKey, type AxisSlug } from "./axisRegistry";

// ─── Canonical Short Labels ─────────────────────────────────────────
// Used in: charts, radar labels, breakdown bars, compact summaries.
// Exactly six labels. No slashes. No dual naming.

const AXIS_SHORT: Record<AxisSlug, string> = {
  financial: "Financial",
  energy: "Energy",
  technology: "Technology",
  defense: "Defense",
  critical_inputs: "Critical Inputs",
  logistics: "Logistics",
} as const;

// ─── Canonical Full Institutional Titles ────────────────────────────
// Used in: section headings, tooltips, axis detail pages.
// Clean institutional form. No "/ Semiconductor", no "/ Freight".

const AXIS_FULL: Record<AxisSlug, string> = {
  financial: "Financial External Supplier Concentration",
  energy: "Energy External Supplier Concentration",
  technology: "Technology External Supplier Concentration",
  defense: "Defense External Supplier Concentration",
  critical_inputs: "Critical Inputs External Supplier Concentration",
  logistics: "Logistics External Supplier Concentration",
} as const;

// ─── A) formatAxisShort ─────────────────────────────────────────────

/**
 * Canonical short axis label for charts and compact UI.
 * Accepts any backend key format (slug, long-form, prefixed).
 *
 * financial_external_supplier_concentration → "Financial"
 * energy → "Energy"
 * technology_semiconductor_external_supplier_concentration → "Technology"
 */
export function formatAxisShort(key: string): string {
  // Direct slug match
  if (key in AXIS_SHORT) return AXIS_SHORT[key as AxisSlug];
  // Normalize long-form backend keys
  const slug = normalizeAxisKey(key);
  if (slug) return AXIS_SHORT[slug];
  // Fallback: humanize the key
  return formatEnum(key);
}

// ─── B) formatAxisFull ──────────────────────────────────────────────

/**
 * Canonical full institutional axis title.
 * Used in section headings, tooltips, axis detail pages.
 *
 * financial → "Financial External Supplier Concentration"
 * critical_inputs_raw_materials_external_supplier_concentration
 *   → "Critical Inputs External Supplier Concentration"
 */
export function formatAxisFull(key: string): string {
  // Direct slug match
  if (key in AXIS_FULL) return AXIS_FULL[key as AxisSlug];
  // Normalize long-form backend keys
  const slug = normalizeAxisKey(key);
  if (slug) return AXIS_FULL[slug];
  // Fallback: humanize the key
  return formatEnum(key);
}

// ─── C) formatEnum ──────────────────────────────────────────────────

/**
 * Convert any snake_case or ALL_CAPS enum value to clean Title Case.
 *
 * BOTH_CHANNELS → "Both Channels"
 * highly_concentrated → "Highly Concentrated"
 * CHANNEL_A → "Channel A"
 * simple → "Simple"
 */
export function formatEnum(value: string): string {
  if (typeof value !== "string") return String(value);
  const trimmed = value.trim();
  if (trimmed.length === 0) return trimmed;
  // If the string is purely numeric, return as-is
  if (/^\d+(\.\d+)?$/.test(trimmed)) return trimmed;
  return trimmed
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bHhi\b/g, "HHI")
    .replace(/\bIsi\b/g, "ISI")
    .replace(/\bEu\b/g, "EU")
    .replace(/\bUsd\b/g, "USD");
}

// ─── D) formatPercentage ────────────────────────────────────────────

/**
 * Format a decimal ratio as a percentage with sign.
 * Uses typographic minus (−) not hyphen (-).
 * 0 decimals for control pills.
 *
 * -0.15 → "−15%"
 *  0.10 → "+10%"
 *  0    → "Base"
 */
export function formatPercentage(value: number): string {
  if (value === 0) return "Base";
  const pct = Math.round(value * 100);
  if (pct < 0) return `−${Math.abs(pct)}%`;
  return `+${pct}%`;
}

// ─── E) formatScore ─────────────────────────────────────────────────

/**
 * Format a numeric score to exactly 4 decimal places.
 * Returns em-dash for null/undefined.
 */
export function formatScore(score: number | null | undefined): string {
  if (score === null || score === undefined) return "—";
  return score.toFixed(4);
}

// ─── F) formatDelta ─────────────────────────────────────────────────

/**
 * Format a delta value with sign prefix.
 * Uses typographic minus (−).
 * Always 4 decimal places.
 */
export function formatDelta(delta: number): string {
  if (delta >= 0) return `+${delta.toFixed(4)}`;
  return `−${Math.abs(delta).toFixed(4)}`;
}

// ─── G) formatSeverity ──────────────────────────────────────────────

/**
 * Convert severity enum to display string.
 * HIGH → "High"
 * MEDIUM → "Medium"
 * LOW → "Low"
 */
export function formatSeverity(severity: string): string {
  return formatEnum(severity);
}

// ─── H) formatDataset ──────────────────────────────────────────────

/**
 * Clean dataset source strings for institutional display.
 * Strips raw dataset codes, normalizes institutional names.
 *
 * "Eurostat nrg_ti_sff" → "Eurostat Energy Trade"
 * "Eurostat Comext ds-045409" → "Eurostat Comext Trade Statistics"
 * "SIPRI Arms Transfers Database v2.1" → "SIPRI Arms Transfers Database"
 * "UN Comtrade HS6 rev4" → "UN Comtrade Trade Statistics"
 */
const DATASET_RULES: [RegExp, string][] = [
  // Eurostat dataset codes: nrg_*, ds-*, nama_*, etc.
  [/Eurostat\s+nrg_\w+/i, "Eurostat Energy Trade"],
  [/Eurostat\s+Comext\s+ds-\d+/i, "Eurostat Comext Trade Statistics"],
  [/Eurostat\s+ds-\d+/i, "Eurostat Trade Statistics"],
  [/Eurostat\s+nama_\w+/i, "Eurostat National Accounts"],
  [/Eurostat\s+bop_\w+/i, "Eurostat Balance of Payments"],
  [/Eurostat\s+\w{2,4}_\w+/i, "Eurostat Trade Statistics"],
  // UN Comtrade with code suffixes
  [/UN\s+Comtrade\s+HS\d+\s*\w*/i, "UN Comtrade Trade Statistics"],
  [/UN\s+Comtrade\s+\w+/i, "UN Comtrade Trade Statistics"],
  // SIPRI with version suffixes
  [/(SIPRI\s+Arms\s+Transfers\s+Database)\s+v[\d.]+/i, "$1"],
  // Generic: strip trailing version/code patterns like "v2.1", "rev4", dataset IDs
  [/\s+v\d+[\d.]*/g, ""],
  [/\s+rev\d+/gi, ""],
];

export function formatDataset(source: string): string {
  if (typeof source !== "string") return String(source);
  let result = source.trim();
  for (const [pattern, replacement] of DATASET_RULES) {
    if (pattern.test(result)) {
      result = result.replace(pattern, replacement);
      break; // Apply first matching rule only
    }
  }
  return result;
}

// ─── I) formatCategory ─────────────────────────────────────────────

/**
 * Format a backend category or subcategory value.
 * Delegates to formatEnum for snake_case/UPPER conversion,
 * then applies domain-specific substitutions.
 *
 * "rare_earths" → "Rare Earths"
 * "integrated_circuits" → "Integrated Circuits"
 * "legacy_discrete" → "Legacy Discrete"
 */
export function formatCategory(value: string): string {
  return formatEnum(value);
}

// ─── J) formatAxisLabel ─────────────────────────────────────────────

/**
 * Universal axis label formatter — alias for formatAxisShort.
 * Re-exported from the presentation layer for consistent import paths.
 */
export function formatAxisLabel(key: string): string {
  return formatAxisShort(key);
}

// ─── Development Guard ──────────────────────────────────────────────

/**
 * Development-only guard: check if a rendered string contains underscores.
 * Call at render boundaries to catch raw backend key leaks.
 */
export function guardUnderscore(value: string, context?: string): void {
  if (process.env.NODE_ENV !== "development") return;
  if (typeof value === "string" && value.includes("_")) {
    console.error(
      `[ISI Presentation] Underscore leak in rendered text: "${value}"` +
        (context ? ` (context: ${context})` : "") +
        `. All backend keys must pass through the presentation layer.`
    );
  }
}
