// ============================================================================
// ISI Geo Resolver — Multi-strategy geometry-to-dataset matching
// ============================================================================
// Resolves GeoJSON features to ISI dataset records using multiple strategies:
//   1. ISO-2 code match (primary)
//   2. ISO-3 code prefix match (fallback)
//   3. Country name match (ASCII-folded, case-insensitive)
//   4. Feature ID match
//
// All normalization is deterministic and idempotent.
// ============================================================================

import type { ISICompositeCountry } from "./types";

// ─── ISO-2 Alias Map ────────────────────────────────────────────────
// Maps non-standard ISO-2 codes used in some TopoJSON datasets
// to their standard ISO 3166-1 alpha-2 equivalents.

const ISO2_ALIASES: Readonly<Record<string, string>> = {
  EL: "GR", // Greece (Eurostat convention)
  UK: "GB", // United Kingdom (pre-2024 convention)
  XK: "XK", // Kosovo (user-assigned, passthrough)
};

// ─── ISO-3 → ISO-2 Mapping ─────────────────────────────────────────
// Covers EU-27 + common neighbors. Used as fallback when only ADM0_A3
// or ISO_A3 properties are available on geometry features.

const ISO3_TO_ISO2: Readonly<Record<string, string>> = {
  AUT: "AT",
  BEL: "BE",
  BGR: "BG",
  HRV: "HR",
  CYP: "CY",
  CZE: "CZ",
  DNK: "DK",
  EST: "EE",
  FIN: "FI",
  FRA: "FR",
  DEU: "DE",
  GRC: "GR",
  HUN: "HU",
  IRL: "IE",
  ITA: "IT",
  LVA: "LV",
  LTU: "LT",
  LUX: "LU",
  MLT: "MT",
  NLD: "NL",
  POL: "PL",
  PRT: "PT",
  ROU: "RO",
  SVK: "SK",
  SVN: "SI",
  ESP: "ES",
  SWE: "SE",
};

// ─── Normalization ──────────────────────────────────────────────────

/**
 * Normalize an arbitrary identifier string for comparison.
 * - Trims whitespace
 * - Unicode NFC normalization
 * - Strips diacritics (NFD + strip combining marks)
 * - Uppercases
 *
 * Deterministic and idempotent.
 */
export function normalizeIdentifier(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

/**
 * Normalize an ISO-2 code, applying alias resolution.
 */
function normalizeISO2(code: string): string {
  const upper = code.toUpperCase().trim();
  return ISO2_ALIASES[upper] ?? upper;
}

/**
 * Resolve an ISO-3 code to ISO-2.
 * Returns the ISO-2 code if found, or null.
 */
function resolveISO3toISO2(iso3: string): string | null {
  const upper = iso3.toUpperCase().trim();
  return ISO3_TO_ISO2[upper] ?? null;
}

// ─── Feature Property Extraction ────────────────────────────────────

/**
 * Extract a candidate ISO-2 code from a GeoJSON feature.
 *
 * Inspects properties in priority order:
 *   1. ISO_A2 / ISO2 / iso2 / iso_a2 / ISO_A2_EH (2-char ISO codes)
 *   2. ADM0_A3 / ISO3 / ISO_A3 / iso3 (3-char → resolved to ISO-2)
 *   3. feature.id (string ≥ 2 chars)
 *
 * Returns empty string if no valid code can be extracted.
 */
export function extractFeatureCode(f: GeoJSON.Feature): string {
  const props = (f.properties ?? {}) as Record<string, unknown>;

  // Strategy 1: Direct ISO-2 properties
  const iso2Keys = ["ISO_A2", "ISO2", "iso2", "iso_a2", "ISO_A2_EH"];
  for (const key of iso2Keys) {
    const val = props[key];
    if (
      typeof val === "string" &&
      val.length === 2 &&
      val !== "-1" &&
      val !== "-99" &&
      val !== "XX" &&
      val !== "--"
    ) {
      return normalizeISO2(val);
    }
  }

  // Strategy 2: ISO-3 properties → resolve to ISO-2
  const iso3Keys = ["ADM0_A3", "ISO3", "ISO_A3", "iso3"];
  for (const key of iso3Keys) {
    const val = props[key];
    if (typeof val === "string" && val.length === 3) {
      const resolved = resolveISO3toISO2(val);
      if (resolved) return resolved;
    }
  }

  // Strategy 3: Feature ID
  if (typeof f.id === "string" && f.id.length >= 2 && f.id.length <= 3) {
    const upper = f.id.toUpperCase();
    if (upper.length === 2) return normalizeISO2(upper);
    const resolved = resolveISO3toISO2(upper);
    if (resolved) return resolved;
  }
  if (typeof f.id === "number") {
    // Numeric IDs cannot be mapped to ISO codes
    return "";
  }

  return "";
}

/**
 * Extract a display name from a GeoJSON feature.
 *
 * Inspects properties in priority order:
 *   NAME > name > NAME_EN > name_en > ADMIN > admin > NAME_LONG
 *
 * Falls back to the extracted code if no name property is found.
 */
export function extractFeatureName(f: GeoJSON.Feature): string {
  const props = (f.properties ?? {}) as Record<string, unknown>;
  const nameKeys = [
    "NAME",
    "name",
    "NAME_EN",
    "name_en",
    "ADMIN",
    "admin",
    "NAME_LONG",
    "name_long",
  ];

  for (const key of nameKeys) {
    const val = props[key];
    if (typeof val === "string" && val.length > 0) {
      return val;
    }
  }

  return extractFeatureCode(f) || "Unknown";
}

// ─── Lookup Index ───────────────────────────────────────────────────

/**
 * A pre-built multi-strategy lookup index over the ISI dataset.
 *
 * Supports O(1) resolution by:
 *   - ISO-2 code (normalized, alias-resolved)
 *   - Country name (ASCII-folded, uppercased)
 */
export interface ISILookupIndex {
  readonly byCode: ReadonlyMap<string, ISICompositeCountry>;
  readonly byName: ReadonlyMap<string, ISICompositeCountry>;
  readonly meanComposite: number | null;
  readonly totalCountries: number;
  readonly scoredCountries: number;
}

/**
 * Build a lookup index from an array of ISI country records.
 *
 * The index enables O(1) geometry-to-record resolution via
 * multiple strategies (code, name).
 *
 * Computes aggregate statistics for diagnostics.
 */
export function buildLookupIndex(
  countries: readonly ISICompositeCountry[],
): ISILookupIndex {
  const byCode = new Map<string, ISICompositeCountry>();
  const byName = new Map<string, ISICompositeCountry>();

  let scoreSum = 0;
  let scoreCount = 0;

  for (const country of countries) {
    // Index by normalized ISO-2 code
    const code = normalizeISO2(country.country);
    byCode.set(code, country);

    // Index by ASCII-folded, uppercased name
    const normalizedName = normalizeIdentifier(country.country_name);
    byName.set(normalizedName, country);

    // Accumulate statistics
    if (country.isi_composite !== null && Number.isFinite(country.isi_composite)) {
      scoreSum += country.isi_composite;
      scoreCount += 1;
    }
  }

  return {
    byCode,
    byName,
    meanComposite: scoreCount > 0 ? scoreSum / scoreCount : null,
    totalCountries: countries.length,
    scoredCountries: scoreCount,
  };
}

/**
 * Resolve a GeoJSON feature to an ISI country record.
 *
 * Resolution order:
 *   1. Direct ISO-2 code match
 *   2. ASCII-folded country name match
 *
 * Returns undefined if no match is found.
 */
export function resolveFeature(
  f: GeoJSON.Feature,
  index: ISILookupIndex,
): ISICompositeCountry | undefined {
  // Strategy 1: Code match
  const code = extractFeatureCode(f);
  if (code) {
    const byCode = index.byCode.get(code);
    if (byCode) return byCode;
  }

  // Strategy 2: Name match
  const name = extractFeatureName(f);
  const normalizedName = normalizeIdentifier(name);
  const byName = index.byName.get(normalizedName);
  if (byName) return byName;

  return undefined;
}

// ─── Diagnostics ────────────────────────────────────────────────────

/**
 * Diagnostics data structure for the dev overlay panel.
 */
export interface MapDiagnostics {
  readonly objectKey: string;
  readonly featureCount: number;
  readonly matchedCount: number;
  readonly unmatchedFeatures: readonly UnmatchedFeature[];
  readonly datasetSample: readonly string[];
  readonly meanComposite: number | null;
  readonly totalDatasetCountries: number;
}

export interface UnmatchedFeature {
  readonly code: string;
  readonly name: string;
  readonly properties: Record<string, unknown>;
}

/**
 * Build diagnostics by comparing GeoJSON features against the ISI index.
 */
export function buildDiagnostics(
  objectKey: string,
  features: readonly GeoJSON.Feature[],
  index: ISILookupIndex,
  countries: readonly ISICompositeCountry[],
): MapDiagnostics {
  let matchedCount = 0;
  const unmatchedFeatures: UnmatchedFeature[] = [];

  for (const f of features) {
    const record = resolveFeature(f, index);
    if (record) {
      matchedCount += 1;
    } else {
      const code = extractFeatureCode(f);
      const name = extractFeatureName(f);
      const properties = (f.properties ?? {}) as Record<string, unknown>;
      unmatchedFeatures.push({ code, name, properties });
    }
  }

  const datasetSample = countries
    .slice(0, 10)
    .map((c) => `${c.country} / ${c.country_name}`);

  return {
    objectKey,
    featureCount: features.length,
    matchedCount,
    unmatchedFeatures: unmatchedFeatures.slice(0, 10),
    datasetSample,
    meanComposite: index.meanComposite,
    totalDatasetCountries: index.totalCountries,
  };
}
