// ============================================================================
// ISI Frontend — Policy Scenario Preset Registry
// ============================================================================
// Predefined geopolitical shock scenarios for the scenario simulation engine.
// Each preset maps to axis adjustments within the [-0.20, +0.20] bounds
// enforced by scenarioValidation.ts.
//
// These presets are referenced by academic and policy publications.
// URLs encode preset ID: /scenario?preset=russian-gas-disruption&country=DE
// ============================================================================

import type { AxisSlug } from "./axisRegistry";

// ─── Types ──────────────────────────────────────────────────────────

export interface ScenarioPreset {
  /** URL-safe identifier (kebab-case) */
  id: string;
  /** Full display label */
  label: string;
  /** Compact label for pills/chips (max ~20 chars) */
  shortLabel: string;
  /** 1–2 sentence description of the geopolitical scenario */
  description: string;
  /** Academic or policy citation supporting the scenario */
  citation: string;
  /** Thematic category for grouping */
  category: "energy" | "trade" | "security" | "technology" | "financial";
  /** Axis adjustments (UI slugs → signed floats in [-0.20, +0.20]) */
  adjustments: Partial<Record<AxisSlug, number>>;
}

// ─── Registry ───────────────────────────────────────────────────────

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: "russian-gas-disruption",
    label: "Russian Gas Supply Disruption",
    shortLabel: "Gas Disruption",
    description:
      "Simulates a full disruption of Russian natural gas supply to the EU, " +
      "increasing energy concentration for countries dependent on Russian pipeline gas.",
    citation: "Cf. Bruegel (2022), 'Can Europe survive painlessly without Russian gas?'",
    category: "energy",
    adjustments: { energy: 0.15, logistics: 0.05 },
  },
  {
    id: "suez-red-sea-shock",
    label: "Suez / Red Sea Logistics Shock",
    shortLabel: "Red Sea Shock",
    description:
      "Models disruption to Red Sea shipping lanes, increasing logistics " +
      "concentration for countries reliant on Suez transit routes.",
    citation: "Cf. IMF (2024), 'Red Sea Shipping Disruptions: Economic Impact Assessment'",
    category: "trade",
    adjustments: { logistics: 0.20, energy: 0.05 },
  },
  {
    id: "semiconductor-export-controls",
    label: "Semiconductor Export Controls",
    shortLabel: "Chip Controls",
    description:
      "Models tightened semiconductor export controls affecting EU access " +
      "to advanced chip fabrication from concentrated suppliers.",
    citation: "Cf. OECD (2023), 'Semiconductor Supply Chain Concentration Risks'",
    category: "technology",
    adjustments: { technology: 0.15 },
  },
  {
    id: "chinese-logistics-bottleneck",
    label: "Chinese Logistics Bottleneck",
    shortLabel: "China Bottleneck",
    description:
      "Simulates supply chain disruption from Chinese port congestion or " +
      "trade restrictions, affecting logistics and critical material flows.",
    citation: "Cf. SIPRI (2023), 'Critical Supply Chain Dependencies in the EU'",
    category: "trade",
    adjustments: { logistics: 0.15, critical_inputs: 0.10 },
  },
  {
    id: "nato-defense-realignment",
    label: "NATO Defense Procurement Shift",
    shortLabel: "NATO Shift",
    description:
      "Models a diversification of defense procurement away from single-source " +
      "suppliers toward intra-EU and allied production.",
    citation: "Cf. EDA (2024), 'European Defence Industrial Strategy'",
    category: "security",
    adjustments: { defense: -0.10 },
  },
  {
    id: "critical-minerals-diversification",
    label: "Critical Minerals Diversification",
    shortLabel: "Minerals Diversification",
    description:
      "Models successful implementation of EU Critical Raw Materials Act, " +
      "reducing concentration in rare earth and strategic mineral imports.",
    citation: "Cf. European Commission (2023), 'Critical Raw Materials Act'",
    category: "trade",
    adjustments: { critical_inputs: -0.15 },
  },
  {
    id: "financial-decoupling",
    label: "Financial Decoupling Scenario",
    shortLabel: "Financial Decoupling",
    description:
      "Simulates increased concentration in financial services exposure due to " +
      "geopolitical decoupling and sanctions regimes.",
    citation: "Cf. ECB (2024), 'Geopolitical Risks and Financial Stability'",
    category: "financial",
    adjustments: { financial: 0.10 },
  },
];

// ─── Lookup Functions ───────────────────────────────────────────────

/** Find a preset by its URL-safe ID. */
export function getPresetById(id: string): ScenarioPreset | undefined {
  return SCENARIO_PRESETS.find((p) => p.id === id);
}

/** Filter presets by thematic category. */
export function getPresetsByCategory(
  category: ScenarioPreset["category"],
): ScenarioPreset[] {
  return SCENARIO_PRESETS.filter((p) => p.category === category);
}
