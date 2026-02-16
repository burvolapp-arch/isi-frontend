// ============================================================================
// Structural Outliers Panel — Server Component
// ============================================================================
// Surfaces the four most structurally notable EU-27 countries from the
// composite dataset. Each card links to the country's detail page.
// ============================================================================

import Link from "next/link";
import type { ISICompositeCountry } from "@/lib/types";
import {
  formatScore,
  getAxisScores,
  computeAxisVariance,
  countryHref,
  deviationFromMean,
} from "@/lib/format";

interface OutliersPanelProps {
  countries: ISICompositeCountry[];
  mean: number | null;
}

interface OutlierCard {
  title: string;
  description: string;
  country: string;
  countryName: string;
  value: string;
  detail: string;
}

function computeOutliers(
  countries: ISICompositeCountry[],
  mean: number | null
): OutlierCard[] {
  const cards: OutlierCard[] = [];

  // 1. Highest logistics concentration
  const withLogistics = countries
    .map((c) => {
      const logisticsAxis = getAxisScores(c).find((a) =>
        a.key.includes("logistics")
      );
      return { c, score: logisticsAxis?.value ?? null };
    })
    .filter((x) => x.score !== null)
    .sort((a, b) => (b.score as number) - (a.score as number));

  if (withLogistics.length > 0) {
    const top = withLogistics[0];
    cards.push({
      title: "Highest Logistics Concentration",
      description: "Most concentrated logistics supplier structure in the EU-27",
      country: top.c.country,
      countryName: top.c.country_name,
      value: formatScore(top.score),
      detail: "Logistics axis HHI",
    });
  }

  // 2. Most diversified (lowest composite)
  const withComposite = countries
    .filter((c) => c.isi_composite !== null)
    .sort((a, b) => (a.isi_composite as number) - (b.isi_composite as number));

  if (withComposite.length > 0) {
    const lowest = withComposite[0];
    cards.push({
      title: "Most Diversified",
      description: "Lowest composite ISI — broadest structural spread",
      country: lowest.country,
      countryName: lowest.country_name,
      value: formatScore(lowest.isi_composite),
      detail: "Composite ISI",
    });
  }

  // 3. Largest deviation from EU mean
  if (mean !== null) {
    const withDeviation = countries
      .filter((c) => c.isi_composite !== null)
      .map((c) => ({
        c,
        deviation: Math.abs(deviationFromMean(c.isi_composite, mean) ?? 0),
      }))
      .sort((a, b) => b.deviation - a.deviation);

    if (withDeviation.length > 0) {
      const top = withDeviation[0];
      const dev = deviationFromMean(top.c.isi_composite, mean);
      const sign = dev !== null && dev > 0 ? "+" : "";
      cards.push({
        title: "Largest Deviation from Mean",
        description: "Greatest distance from the EU-27 composite average",
        country: top.c.country,
        countryName: top.c.country_name,
        value: `${sign}${formatScore(dev)}`,
        detail: `Δ from EU mean (${formatScore(mean)})`,
      });
    }
  }

  // 4. Highest axis variance (most uneven profile)
  const withVariance = countries
    .map((c) => ({ c, variance: computeAxisVariance(c) }))
    .filter((x) => x.variance !== null)
    .sort((a, b) => (b.variance as number) - (a.variance as number));

  if (withVariance.length > 0) {
    const top = withVariance[0];
    cards.push({
      title: "Most Uneven Profile",
      description: "Highest axis-level variance — structural imbalance",
      country: top.c.country,
      countryName: top.c.country_name,
      value: formatScore(top.variance),
      detail: "Axis score variance",
    });
  }

  return cards;
}

export default function OutliersPanel({ countries, mean }: OutliersPanelProps) {
  const outliers = computeOutliers(countries, mean);

  if (outliers.length === 0) return null;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 tracking-tight">
          Structural Outliers
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Countries exhibiting the most notable structural concentration
          patterns across the EU-27.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {outliers.map((card) => (
          <Link
            key={card.country}
            href={countryHref(card.country)}
            className="group block rounded-lg border border-gray-200 bg-white p-4 sm:p-5 transition-colors hover:border-gray-300 hover:bg-gray-50/50"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
              {card.title}
            </p>
            <p className="mt-3 text-2xl font-semibold tabular-nums text-gray-900">
              {card.value}
            </p>
            <p className="mt-0.5 text-xs text-gray-400">{card.detail}</p>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                {card.countryName}
              </p>
              <p className="mt-0.5 text-xs text-gray-400 line-clamp-2">
                {card.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
