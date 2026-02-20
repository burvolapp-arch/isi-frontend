// ============================================================================
// ISI Frontend — Institutional Source Citation Registry
// ============================================================================
// This module provides structured, institutional-grade source citations for
// all ISI data channels. It maps raw backend source strings to formal
// citation objects including dataset identifiers, URLs, and retrieval dates.
//
// Design principle: OECD / ECB / World Bank documentation style.
// No raw machine codes in visible UI. Identifiers in footnotes only.
// ============================================================================

export interface SourceCitation {
  /** Clean institutional display name */
  displayName: string;
  /** Formal publisher / authority */
  publisher: string;
  /** Dataset identifier (e.g., Eurostat table code) — shown in footnotes only */
  datasetId: string | null;
  /** URL to dataset or documentation, if publicly available */
  url: string | null;
  /** Data retrieval / extraction date */
  retrievalNote: string;
  /** Additional methodological note */
  note: string | null;
}

// ─── Citation Registry ──────────────────────────────────────────────
// Keyed by regex-matchable patterns from backend source strings.
// Ordered by specificity — first match wins.

interface CitationRule {
  pattern: RegExp;
  citation: Omit<SourceCitation, "retrievalNote">;
}

const CITATION_RULES: CitationRule[] = [
  // Eurostat Energy Trade
  {
    pattern: /Eurostat\s+nrg_ti_sff/i,
    citation: {
      displayName: "Eurostat — Solid Fossil Fuels Trade",
      publisher: "European Commission, Eurostat",
      datasetId: "nrg_ti_sff",
      url: "https://ec.europa.eu/eurostat/databrowser/view/nrg_ti_sff/default/table",
      note: "Bilateral imports of solid fossil fuels by reporting country and partner.",
    },
  },
  {
    pattern: /Eurostat\s+nrg_ti_oil/i,
    citation: {
      displayName: "Eurostat — Oil Trade",
      publisher: "European Commission, Eurostat",
      datasetId: "nrg_ti_oil",
      url: "https://ec.europa.eu/eurostat/databrowser/view/nrg_ti_oil/default/table",
      note: "Bilateral imports of crude oil and petroleum products.",
    },
  },
  {
    pattern: /Eurostat\s+nrg_ti_gas/i,
    citation: {
      displayName: "Eurostat — Natural Gas Trade",
      publisher: "European Commission, Eurostat",
      datasetId: "nrg_ti_gas",
      url: "https://ec.europa.eu/eurostat/databrowser/view/nrg_ti_gas/default/table",
      note: "Bilateral imports of natural gas by reporting country and partner.",
    },
  },
  {
    pattern: /Eurostat\s+nrg_ti_eh/i,
    citation: {
      displayName: "Eurostat — Electricity Trade",
      publisher: "European Commission, Eurostat",
      datasetId: "nrg_ti_eh",
      url: "https://ec.europa.eu/eurostat/databrowser/view/nrg_ti_eh/default/table",
      note: "Bilateral electricity imports by reporting country and partner.",
    },
  },
  {
    pattern: /Eurostat\s+nrg_\w+/i,
    citation: {
      displayName: "Eurostat — Energy Statistics",
      publisher: "European Commission, Eurostat",
      datasetId: null, // Will be extracted dynamically
      url: "https://ec.europa.eu/eurostat/web/energy/data",
      note: "Eurostat energy statistics bilateral trade dataset.",
    },
  },
  // Eurostat Comext
  {
    pattern: /Eurostat\s+Comext\s+ds-(\d+)/i,
    citation: {
      displayName: "Eurostat Comext — Detailed Trade Statistics",
      publisher: "European Commission, Eurostat",
      datasetId: null,
      url: "https://ec.europa.eu/eurostat/web/international-trade/data",
      note: "EU external trade in goods — detailed CN8/HS6 bilateral data.",
    },
  },
  {
    pattern: /Eurostat\s+ds-(\d+)/i,
    citation: {
      displayName: "Eurostat — Trade Statistics",
      publisher: "European Commission, Eurostat",
      datasetId: null,
      url: "https://ec.europa.eu/eurostat/web/international-trade/data",
      note: "Eurostat bilateral trade dataset.",
    },
  },
  // Eurostat National Accounts
  {
    pattern: /Eurostat\s+nama_\w+/i,
    citation: {
      displayName: "Eurostat — National Accounts",
      publisher: "European Commission, Eurostat",
      datasetId: null,
      url: "https://ec.europa.eu/eurostat/web/national-accounts/data",
      note: "National accounts aggregate and bilateral positions.",
    },
  },
  // Eurostat Balance of Payments
  {
    pattern: /Eurostat\s+bop_\w+/i,
    citation: {
      displayName: "Eurostat — Balance of Payments",
      publisher: "European Commission, Eurostat",
      datasetId: null,
      url: "https://ec.europa.eu/eurostat/web/balance-of-payments/data",
      note: "Balance of payments bilateral financial positions.",
    },
  },
  // Eurostat generic
  {
    pattern: /Eurostat\s+(\w{2,6}_\w+)/i,
    citation: {
      displayName: "Eurostat — Statistical Database",
      publisher: "European Commission, Eurostat",
      datasetId: null,
      url: "https://ec.europa.eu/eurostat/data/database",
      note: null,
    },
  },
  // UN Comtrade
  {
    pattern: /UN\s+Comtrade/i,
    citation: {
      displayName: "UN Comtrade — International Trade Statistics",
      publisher: "United Nations Statistics Division",
      datasetId: null,
      url: "https://comtrade.un.org/",
      note: "Bilateral merchandise trade data at HS commodity level.",
    },
  },
  // SIPRI Arms Transfers
  {
    pattern: /SIPRI\s+Arms\s+Transfers/i,
    citation: {
      displayName: "SIPRI Arms Transfers Database",
      publisher: "Stockholm International Peace Research Institute (SIPRI)",
      datasetId: null,
      url: "https://www.sipri.org/databases/armstransfers",
      note: "Trend-Indicator Values (TIV) of international arms transfers between countries.",
    },
  },
  // SIPRI generic
  {
    pattern: /SIPRI/i,
    citation: {
      displayName: "SIPRI Database",
      publisher: "Stockholm International Peace Research Institute (SIPRI)",
      datasetId: null,
      url: "https://www.sipri.org/databases",
      note: null,
    },
  },
  // BIS
  {
    pattern: /BIS/i,
    citation: {
      displayName: "BIS — International Banking Statistics",
      publisher: "Bank for International Settlements",
      datasetId: null,
      url: "https://www.bis.org/statistics/index.htm",
      note: "Consolidated and locational banking statistics — bilateral positions.",
    },
  },
  // IEA
  {
    pattern: /IEA/i,
    citation: {
      displayName: "IEA — World Energy Statistics",
      publisher: "International Energy Agency",
      datasetId: null,
      url: "https://www.iea.org/data-and-statistics",
      note: "International energy flow and trade statistics.",
    },
  },
  // IMF
  {
    pattern: /IMF/i,
    citation: {
      displayName: "IMF — Financial Statistics",
      publisher: "International Monetary Fund",
      datasetId: null,
      url: "https://data.imf.org/",
      note: null,
    },
  },
  // World Bank
  {
    pattern: /World\s*Bank/i,
    citation: {
      displayName: "World Bank — Development Indicators",
      publisher: "The World Bank Group",
      datasetId: null,
      url: "https://data.worldbank.org/",
      note: null,
    },
  },
];

// ─── Extract Dataset ID ─────────────────────────────────────────────

function extractDatasetId(source: string): string | null {
  // Eurostat table codes: nrg_ti_sff, ds-045409, nama_10_gdp, bop_gdp6_q
  const eurostatMatch = source.match(/\b(nrg_\w+|ds-\d+|nama_\w+|bop_\w+|[a-z]{2,4}_\w{2,}_\w+)\b/i);
  if (eurostatMatch) return eurostatMatch[1];
  // UN Comtrade HS codes
  const hsMatch = source.match(/\b(HS\d+\s*\w*)\b/i);
  if (hsMatch) return hsMatch[1];
  // Version identifiers
  const verMatch = source.match(/\b(v[\d.]+)\b/i);
  if (verMatch) return verMatch[1];
  return null;
}

// ─── Public API ─────────────────────────────────────────────────────

const RETRIEVAL_DATE = "February 2026";

/**
 * Resolve a backend source string to a full institutional citation.
 * Returns a structured citation with display name, publisher, dataset ID,
 * URL, and retrieval date.
 */
export function resolveSourceCitation(source: string): SourceCitation {
  if (typeof source !== "string" || source.trim().length === 0) {
    return {
      displayName: "Source not specified",
      publisher: "Unknown",
      datasetId: null,
      url: null,
      retrievalNote: `Retrieved ${RETRIEVAL_DATE}`,
      note: null,
    };
  }

  const trimmed = source.trim();

  for (const rule of CITATION_RULES) {
    if (rule.pattern.test(trimmed)) {
      const datasetId = rule.citation.datasetId ?? extractDatasetId(trimmed);
      return {
        ...rule.citation,
        datasetId,
        retrievalNote: `Retrieved ${RETRIEVAL_DATE}`,
      };
    }
  }

  // Fallback: return cleaned source as display name
  return {
    displayName: trimmed.replace(/\s+v[\d.]+/g, "").replace(/\s+rev\d+/gi, "").trim(),
    publisher: "See source documentation",
    datasetId: extractDatasetId(trimmed),
    url: null,
    retrievalNote: `Retrieved ${RETRIEVAL_DATE}`,
    note: null,
  };
}

/**
 * Format a citation for inline display (no dataset codes visible).
 * Returns the clean institutional name only.
 */
export function formatSourceInline(source: string): string {
  return resolveSourceCitation(source).displayName;
}
