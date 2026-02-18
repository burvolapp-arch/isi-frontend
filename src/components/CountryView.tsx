"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { RadarChart } from "@/components/RadarChart";
import { DeviationBarChart } from "@/components/DeviationBar";
import { DistributionHistogram } from "@/components/DistributionHistogram";
import { StatusBadge } from "@/components/StatusBadge";
import { KPICard } from "@/components/KPICard";
import { ScenarioLaboratory } from "@/components/ScenarioLaboratory";
import {
  formatScore,
  computePercentile,
  deviationFromMean,
  axisHref,
  computeRank,
} from "@/lib/format";
import { getCanonicalAxisName } from "@/lib/axisRegistry";
import { generateStructuralSummary } from "@/lib/summary";
import type { CountryDetail, ISIComposite } from "@/lib/types";

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

type ViewMode = "baseline" | "scenario";

interface CountryViewProps {
  country: CountryDetail;
  isi: ISIComposite | null;
  code: string;
  allScores: number[];
  rank: number | null;
  totalRanked: number;
  percentile: number | null;
  compositeMean: number | null;
}

// ═══════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════

export function CountryView({
  country,
  isi,
  code,
  allScores,
  rank,
  totalRanked,
  percentile,
  compositeMean,
}: CountryViewProps) {
  const [mode, setMode] = useState<ViewMode>("baseline");

  // ── Derived data ──
  const scoredAxes = country.axes
    .filter((a) => a.score !== null)
    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0));
  const strengths = scoredAxes.slice(0, 2);
  const vulnerabilities = scoredAxes.slice(-2).reverse();

  const radarAxes = country.axes.map((a) => ({
    slug: a.axis_slug,
    value: a.score,
  }));

  const euMeanPerAxis = isi
    ? country.axes.map(() => compositeMean)
    : undefined;

  const deviationItems = country.axes.map((a) => ({
    label: getCanonicalAxisName(a.axis_slug),
    score: a.score,
    href: axisHref(a.axis_slug),
  }));

  return (
    <>
      {/* ── Country Header ── */}
      <section className="mt-6">
        <div className="flex flex-wrap items-baseline gap-2 sm:gap-3">
          <h1
            className="font-serif font-bold leading-[1.15] tracking-tight text-text-primary"
            style={{ fontSize: "clamp(1.75rem, 5vw, 2.5rem)" }}
          >
            {country.country_name}
          </h1>
          <span className="font-mono text-[14px] text-text-quaternary sm:text-[15px]">
            {country.country}
          </span>
        </div>
        <p className="mt-1.5 text-[13px] text-text-tertiary">
          {country.version} · {country.window} ·{" "}
          {country.axes_available}/{country.axes_required} axes
        </p>
      </section>

      {/* ── Mode Toggle ── */}
      <nav className="mt-5 border-b border-border-primary" aria-label="View mode">
        <div className="flex gap-6">
          <button
            type="button"
            onClick={() => setMode("baseline")}
            className={`
              relative pb-2.5 text-[13px] font-medium
              ${mode === "baseline"
                ? "text-text-primary"
                : "text-text-quaternary hover:text-text-secondary"
              }
            `}
          >
            Published Baseline
            {mode === "baseline" && (
              <span className="absolute inset-x-0 bottom-0 h-[2px] bg-navy-700" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setMode("scenario")}
            className={`
              relative pb-2.5 text-[13px] font-medium
              ${mode === "scenario"
                ? "text-text-primary"
                : "text-text-quaternary hover:text-text-secondary"
              }
            `}
          >
            Scenario Laboratory
            {mode === "scenario" && (
              <span className="absolute inset-x-0 bottom-0 h-[2px] bg-navy-700" />
            )}
          </button>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* BASELINE VIEW                                                  */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {mode === "baseline" && (
        <>
          {/* Composite KPI Row */}
          <section className="mt-8">
            <h2 className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-quaternary">
              Composite Score
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
              <KPICard
                label="ISI Composite"
                value={formatScore(country.isi_composite)}
                variant="highlight"
              />
              <div className="flex items-center rounded-md border border-border-primary bg-surface-tertiary px-5">
                <StatusBadge classification={country.isi_classification} />
              </div>
              <KPICard
                label="EU-27 Rank"
                value={rank !== null ? `${rank} / ${totalRanked}` : "—"}
                subtitle={
                  percentile !== null
                    ? `Less concentrated than ${100 - percentile}% of EU-27`
                    : "ISI composite data unavailable"
                }
              />
              <KPICard
                label="Axes Coverage"
                value={`${country.axes_available} / ${country.axes_required}`}
                subtitle={
                  country.axes_available < country.axes_required
                    ? "Incomplete — composite may be partial"
                    : "All axes available"
                }
              />
            </div>
            {compositeMean !== null && country.isi_composite !== null && (
              <p className="mt-2.5 text-[13px] tabular-nums text-text-tertiary">
                EU-27 Mean: {formatScore(compositeMean)} · Δ{" "}
                {(deviationFromMean(country.isi_composite, compositeMean) ?? 0) > 0
                  ? "+"
                  : ""}
                {formatScore(
                  deviationFromMean(country.isi_composite, compositeMean)
                )}
              </p>
            )}
          </section>

          {/* Distribution */}
          {allScores.length > 0 && country.isi_composite !== null && (
            <section className="mt-8">
              <h2 className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-quaternary">
                Position in EU-27 Distribution
              </h2>
              <p className="mt-1.5 text-[12px] text-text-tertiary">
                {country.country_name}&apos;s composite score relative to all EU-27 member states.
              </p>
              <div className="mt-3 rounded-md border border-border-primary p-3 sm:p-5">
                <DistributionHistogram
                  scores={allScores}
                  mean={compositeMean}
                  highlight={country.isi_composite}
                  highlightLabel={country.country}
                  height={150}
                  binCount={16}
                />
              </div>
            </section>
          )}

          {/* Radar + Deviation */}
          <section className="mt-6 grid gap-4 sm:gap-5 lg:grid-cols-[3fr_2fr]">
            <div className="relative flex flex-col rounded-md border border-border-primary px-4 py-4 sm:px-5 sm:py-5">
              <h2 className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
                Multi-Axis Profile
              </h2>
              <div className="mt-2 w-full">
                <RadarChart
                  axes={radarAxes}
                  euMean={euMeanPerAxis}
                  label={country.country_name}
                  countryCode={country.country}
                />
              </div>
            </div>
            <div className="rounded-md border border-border-primary p-3 sm:p-5">
              <h2 className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
                Deviation from EU-27 Mean
              </h2>
              <p className="mt-1.5 mb-2.5 text-[11px] text-text-quaternary">
                Bars show deviation from EU-27 composite mean ({formatScore(compositeMean)}).
                Red = above mean. Green = below mean.
              </p>
              <DeviationBarChart items={deviationItems} mean={compositeMean} />
            </div>
          </section>

          {/* Structural Summary */}
          {(() => {
            const summary = generateStructuralSummary(country, compositeMean, allScores);
            if (!summary) return null;
            return (
              <section className="mt-6 rounded-md border border-border-primary bg-surface-tertiary p-4">
                <h3 className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
                  Structural Exposure Summary
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">
                  {summary}
                </p>
              </section>
            );
          })()}

          {/* Strengths & Vulnerabilities */}
          {scoredAxes.length >= 2 && (
            <section className="mt-6 grid gap-3 md:grid-cols-2">
              <div className="border-l-2 border-l-deviation-negative rounded-md border border-border-primary p-4">
                <h3 className="text-[10px] font-medium uppercase tracking-[0.12em] text-deviation-negative">
                  Most Diversified (Lowest HHI)
                </h3>
                <div className="mt-3 space-y-1.5">
                  {strengths.map((a) => (
                    <div key={a.axis_id} className="flex items-center justify-between">
                      <Link
                        href={axisHref(a.axis_slug)}
                        className="text-[13px] font-medium text-text-secondary hover:text-navy-700"
                      >
                        {getCanonicalAxisName(a.axis_slug)}
                      </Link>
                      <span className="font-mono text-[13px] text-deviation-negative">
                        {formatScore(a.score)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-l-2 border-l-deviation-positive rounded-md border border-border-primary p-4">
                <h3 className="text-[10px] font-medium uppercase tracking-[0.12em] text-deviation-positive">
                  Most Concentrated (Highest HHI)
                </h3>
                <div className="mt-3 space-y-1.5">
                  {vulnerabilities.map((a) => (
                    <div key={a.axis_id} className="flex items-center justify-between">
                      <Link
                        href={axisHref(a.axis_slug)}
                        className="text-[13px] font-medium text-text-secondary hover:text-navy-700"
                      >
                        {getCanonicalAxisName(a.axis_slug)}
                      </Link>
                      <span className="font-mono text-[13px] text-deviation-positive">
                        {formatScore(a.score)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SCENARIO VIEW                                                  */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {mode === "scenario" && (
        <Suspense fallback={
          <div className="mt-8 space-y-3">
            <div className="h-4 w-48 bg-surface-tertiary" />
            <div className="h-32 bg-surface-tertiary rounded" />
          </div>
        }>
          <ScenarioLaboratory
            country={country}
            baselineRank={rank}
            totalRanked={totalRanked}
          />
        </Suspense>
      )}
    </>
  );
}
