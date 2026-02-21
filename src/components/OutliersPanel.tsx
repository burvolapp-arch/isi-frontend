// ============================================================================
// Structural Outliers Panel — Server Component
// ============================================================================
// Surfaces the four most structurally notable countries from the
// composite dataset. Each card links to the country's detail page.
// ============================================================================

import Link from "next/link";
import type { ISICompositeCountry } from "@/lib/types";
import {
  getAxisScores,
  computeAxisVariance,
  countryHref,
  deviationFromMean,
} from "@/lib/format";
import { formatScore } from "@/lib/presentation";

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
      description: "Most concentrated logistics supplier structure in the cohort",
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
        description: "Greatest distance from the cohort composite average",
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
        <h2 className="font-serif text-[22px] font-semibold tracking-tight text-text-primary sm:text-[26px]">
          Structural Outliers
        </h2>
        <p className="mt-1.5 text-[14px] text-text-tertiary">
          Countries exhibiting the most notable structural concentration
          patterns across the EU-27 cohort.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {outliers.map((card) => (
          <Link
            key={card.country}
            href={countryHref(card.country)}
            className="group block rounded-md border border-border-primary bg-white p-4 sm:p-5 transition-[border-color,box-shadow] duration-150 hover:border-stone-300 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
          >
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
              {card.title}
            </p>
            <p className="mt-3 font-mono text-[22px] font-medium leading-none tabular-nums text-text-primary">
              {card.value}
            </p>
            <p className="mt-1 text-[11px] text-text-quaternary">{card.detail}</p>
            <div className="mt-3 pt-3 border-t border-border-subtle">
              <p className="text-[13px] font-medium text-text-secondary transition-colors group-hover:text-navy-700">
                {card.countryName}
              </p>
              <p className="mt-0.5 text-[12px] text-text-quaternary line-clamp-2">
                {card.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
