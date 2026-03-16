// ============================================================================
// ISI Frontend — Axis-Level Source Registry
// ============================================================================
// Structured data provenance for each ISI axis. Each axis lists the
// institutional datasets used to compute concentration scores.
//
// This registry is the canonical source of truth for data provenance
// displayed on country pages, the dataset page, and the press page.
//
// Sources are ordered by analytical weight (primary sources first).
// ============================================================================

export interface AxisSourceEntry {
  /** Institutional name of the dataset */
  dataset: string;
  /** Publishing institution */
  publisher: string;
  /** Dataset identifier (e.g. Eurostat table code) */
  datasetId: string | null;
  /** URL to dataset documentation */
  url: string | null;
  /** Brief description of what data is extracted */
  description: string;
}

export const AXIS_SOURCES: Record<string, AxisSourceEntry[]> = {
  financial: [
    {
      dataset: "BIS Consolidated Banking Statistics",
      publisher: "Bank for International Settlements",
      datasetId: "CBS",
      url: "https://www.bis.org/statistics/consstats.htm",
      description:
        "Bilateral cross-border banking claims by reporting country and counterparty country. Used to compute HHI of external financial exposure.",
    },
    {
      dataset: "BIS Locational Banking Statistics",
      publisher: "Bank for International Settlements",
      datasetId: "LBS",
      url: "https://www.bis.org/statistics/bankstats.htm",
      description:
        "Locational banking positions — cross-border claims and liabilities by counterparty location.",
    },
    {
      dataset: "Eurostat Balance of Payments",
      publisher: "European Commission, Eurostat",
      datasetId: "bop_gdp6_q",
      url: "https://ec.europa.eu/eurostat/web/balance-of-payments/data",
      description:
        "Quarterly balance of payments — bilateral financial account positions for EU member states.",
    },
  ],
  energy: [
    {
      dataset: "Eurostat — Solid Fossil Fuels Trade",
      publisher: "European Commission, Eurostat",
      datasetId: "nrg_ti_sff",
      url: "https://ec.europa.eu/eurostat/databrowser/view/nrg_ti_sff/default/table",
      description:
        "Bilateral imports of solid fossil fuels (coal, lignite, peat) by reporting country and partner.",
    },
    {
      dataset: "Eurostat — Oil Trade",
      publisher: "European Commission, Eurostat",
      datasetId: "nrg_ti_oil",
      url: "https://ec.europa.eu/eurostat/databrowser/view/nrg_ti_oil/default/table",
      description:
        "Bilateral imports of crude oil and petroleum products by reporting country and partner.",
    },
    {
      dataset: "Eurostat — Natural Gas Trade",
      publisher: "European Commission, Eurostat",
      datasetId: "nrg_ti_gas",
      url: "https://ec.europa.eu/eurostat/databrowser/view/nrg_ti_gas/default/table",
      description:
        "Bilateral imports of natural gas (pipeline + LNG) by reporting country and partner.",
    },
    {
      dataset: "Eurostat — Electricity Trade",
      publisher: "European Commission, Eurostat",
      datasetId: "nrg_ti_eh",
      url: "https://ec.europa.eu/eurostat/databrowser/view/nrg_ti_eh/default/table",
      description:
        "Bilateral electricity imports by reporting country and partner country.",
    },
  ],
  technology: [
    {
      dataset: "Eurostat Comext — Detailed Trade Statistics",
      publisher: "European Commission, Eurostat",
      datasetId: "ds-045409",
      url: "https://ec.europa.eu/eurostat/web/international-trade/data",
      description:
        "EU external trade in goods — HS6 bilateral data for semiconductor and advanced technology products.",
    },
    {
      dataset: "UN Comtrade — International Trade Statistics",
      publisher: "United Nations Statistics Division",
      datasetId: "HS 8541/8542",
      url: "https://comtrade.un.org/",
      description:
        "Bilateral merchandise trade in semiconductor devices and integrated circuits at HS6 level.",
    },
  ],
  defense: [
    {
      dataset: "SIPRI Arms Transfers Database",
      publisher: "Stockholm International Peace Research Institute (SIPRI)",
      datasetId: "TIV",
      url: "https://www.sipri.org/databases/armstransfers",
      description:
        "Trend-Indicator Values (TIV) of international arms transfers. Primary source for defense supplier concentration.",
    },
  ],
  critical_inputs: [
    {
      dataset: "Eurostat Comext — Detailed Trade Statistics",
      publisher: "European Commission, Eurostat",
      datasetId: "ds-045409",
      url: "https://ec.europa.eu/eurostat/web/international-trade/data",
      description:
        "EU external trade in goods — CN8/HS6 bilateral data for critical raw materials (rare earths, lithium, cobalt, etc.).",
    },
    {
      dataset: "UN Comtrade — International Trade Statistics",
      publisher: "United Nations Statistics Division",
      datasetId: "HS 2602–2617",
      url: "https://comtrade.un.org/",
      description:
        "Bilateral merchandise trade in ores, metals, and critical mineral commodities.",
    },
  ],
  logistics: [
    {
      dataset: "Eurostat Comext — Detailed Trade Statistics",
      publisher: "European Commission, Eurostat",
      datasetId: "ds-045409",
      url: "https://ec.europa.eu/eurostat/web/international-trade/data",
      description:
        "EU external trade in goods — total bilateral import flows used to derive logistics corridor concentration.",
    },
    {
      dataset: "UN Comtrade — International Trade Statistics",
      publisher: "United Nations Statistics Division",
      datasetId: null,
      url: "https://comtrade.un.org/",
      description:
        "Total bilateral merchandise imports by partner country for freight corridor concentration analysis.",
    },
  ],
} as const;

/**
 * Get source entries for a given axis slug.
 * Returns empty array if the axis is unknown.
 */
export function getAxisSources(slug: string): AxisSourceEntry[] {
  return AXIS_SOURCES[slug] ?? [];
}
