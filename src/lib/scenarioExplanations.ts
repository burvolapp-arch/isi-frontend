// ============================================================================
// ISI Frontend — Scenario Preset Explanations
// ============================================================================
// Structured analytical explanations for each scenario preset.
// Used by ScenarioLaboratory and the scenario documentation page.
//
// Each explanation provides the geopolitical context, parameter shifts,
// expected axis impacts, and potential ranking implications.
// ============================================================================

import type { AxisSlug } from "./axisRegistry";

export interface ScenarioExplanation {
  /** Preset identifier (matches STRUCTURAL_PRESETS in ScenarioLaboratory) */
  id: string;
  /** Display title */
  title: string;
  /** Geopolitical context — why this scenario matters */
  context: string;
  /** What parameter shifts this preset applies */
  parameterDescription: string;
  /** Expected structural impacts */
  impacts: string[];
  /** Which axes are affected and in which direction */
  axisEffects: { axis: AxisSlug; direction: "increase" | "decrease"; magnitude: string }[];
  /** Potential ranking implications */
  rankingNote: string;
  /** Real-world reference events */
  referenceEvents: string[];
}

export const SCENARIO_EXPLANATIONS: ScenarioExplanation[] = [
  {
    id: "energy-diversification",
    title: "Energy Diversification",
    context:
      "Models a structural shift toward diversified energy procurement — for example, " +
      "the EU's post-2022 pivot away from Russian pipeline gas toward LNG terminals, " +
      "renewable energy agreements, and alternative corridor development.",
    parameterDescription:
      "Reduces the energy axis HHI concentration by 15 percentage points (−0.15), " +
      "simulating a broadening of bilateral energy supplier relationships.",
    impacts: [
      "Countries with high initial energy concentration (e.g., Baltic states, Bulgaria) experience the largest composite score improvement.",
      "Countries already diversified in energy (e.g., France, Spain) see marginal composite change.",
      "The EU-27 cohort mean shifts downward, compressing the distribution.",
    ],
    axisEffects: [
      { axis: "energy", direction: "decrease", magnitude: "−15%" },
    ],
    rankingNote:
      "Most impactful for countries where energy is the dominant axis contributor. " +
      "Can shift rankings by 2–5 positions for energy-dependent states.",
    referenceEvents: [
      "EU REPowerEU plan (2022)",
      "German LNG terminal acceleration",
      "Baltic interconnector pipeline completion",
    ],
  },
  {
    id: "defense-reindustrialization",
    title: "Defense Reindustrialization",
    context:
      "Models a structural reduction in defense procurement concentration — for example, " +
      "European defense industrial base expansion, joint procurement programs, " +
      "or diversification of arms import partnerships beyond the US.",
    parameterDescription:
      "Reduces the defense axis HHI concentration by 20 percentage points (−0.20), " +
      "the maximum shift, simulating a fundamental restructuring of defense supply chains.",
    impacts: [
      "Defense accounts for ≈35.1% of cross-country variance — this is the single most impactful axis for ranking shifts.",
      "Countries with near-total US defense dependency (e.g., Greece, Poland) see dramatic composite improvement.",
      "Countries with diversified procurement (e.g., France, Sweden) see minimal change.",
    ],
    axisEffects: [
      { axis: "defense", direction: "decrease", magnitude: "−20%" },
    ],
    rankingNote:
      "The most structurally significant preset. Defense concentration is the #1 variance driver " +
      "across the EU-27 cohort. Maximum ranking shift potential: 3–8 positions.",
    referenceEvents: [
      "EU EDIRPA joint procurement initiative",
      "NATO ammunition production scaling",
      "European Defence Industrial Strategy (EDIS) 2024",
    ],
  },
  {
    id: "logistics-disruption",
    title: "Logistics Disruption",
    context:
      "Models a structural increase in logistics corridor concentration — for example, " +
      "Red Sea shipping disruptions forcing rerouting through concentrated alternatives, " +
      "or chokepoint dependencies becoming more acute.",
    parameterDescription:
      "Increases the logistics axis HHI concentration by 20 percentage points (+0.20), " +
      "simulating a structural shock that narrows available freight corridors.",
    impacts: [
      "Logistics accounts for ≈34.3% of cross-country variance — second only to defense as a structural driver.",
      "Island and peripheral states (e.g., Cyprus, Malta, Ireland) are disproportionately affected.",
      "Central European countries with overland alternatives show relative resilience.",
    ],
    axisEffects: [
      { axis: "logistics", direction: "increase", magnitude: "+20%" },
    ],
    rankingNote:
      "Highly impactful for peripheral states. Combined with defense, logistics accounts for " +
      "≈69% of cross-country variance. Ranking shifts of 2–6 positions are typical.",
    referenceEvents: [
      "Red Sea / Houthi shipping disruption (2024)",
      "Suez Canal blockage (2021)",
      "Panama Canal drought restrictions (2023–2024)",
    ],
  },
  {
    id: "technology-decoupling",
    title: "Technology Decoupling",
    context:
      "Models a structural increase in technology supplier concentration — for example, " +
      "semiconductor export controls concentrating supply chains toward fewer partners, " +
      "or US-China decoupling forcing technology alliance reconfiguration.",
    parameterDescription:
      "Increases the technology axis HHI concentration by 15 percentage points (+0.15), " +
      "simulating reduced access to diversified semiconductor and advanced technology suppliers.",
    impacts: [
      "Countries with existing high technology concentration see compounded vulnerability.",
      "The EU's structural dependency on East Asian semiconductor fabrication becomes more acute.",
      "Countries with domestic semiconductor capacity (e.g., Germany, France) show relative resilience.",
    ],
    axisEffects: [
      { axis: "technology", direction: "increase", magnitude: "+15%" },
    ],
    rankingNote:
      "Moderate ranking impact. Technology contributes less to cross-country variance than " +
      "defense or logistics, but the structural shift is analytically significant.",
    referenceEvents: [
      "US CHIPS Act (2022)",
      "EU Chips Act (2023)",
      "US semiconductor export controls on China (2022–2024)",
    ],
  },
  {
    id: "financial-fragmentation",
    title: "Financial Fragmentation",
    context:
      "Models a structural increase in financial exposure concentration — for example, " +
      "geopolitical fragmentation reducing the diversity of cross-border banking counterparties, " +
      "or capital flow restrictions narrowing bilateral financial relationships.",
    parameterDescription:
      "Increases the financial axis HHI concentration by 10 percentage points (+0.10), " +
      "simulating a moderate tightening of bilateral financial diversification.",
    impacts: [
      "Smaller EU member states with concentrated banking sectors (e.g., Luxembourg, Malta) are most affected.",
      "The financial axis has lower baseline variance, so absolute ranking shifts are modest.",
      "Countries with deep integration into diverse financial networks show resilience.",
    ],
    axisEffects: [
      { axis: "financial", direction: "increase", magnitude: "+10%" },
    ],
    rankingNote:
      "Modest ranking impact for most countries. Financial concentration is generally lower " +
      "across the EU-27 than defense or logistics. Typical ranking shift: 0–2 positions.",
    referenceEvents: [
      "SWIFT disconnection of Russian banks (2022)",
      "Basel III cross-border capital requirements",
      "EU Anti-Money Laundering Authority (AMLA) establishment",
    ],
  },
];

/**
 * Get the explanation for a given preset ID.
 * Returns null if the preset is not found.
 */
export function getScenarioExplanation(
  presetId: string,
): ScenarioExplanation | null {
  return SCENARIO_EXPLANATIONS.find((e) => e.id === presetId) ?? null;
}
