import Link from "next/link";
import { fetchCountry, fetchISI, ApiError } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { KPICard } from "@/components/KPICard";
import { ErrorPanel } from "@/components/ErrorPanel";
import { RadarChart } from "@/components/RadarChart";
import { DeviationBarChart } from "@/components/DeviationBar";
import { DistributionHistogram } from "@/components/DistributionHistogram";
import {
  formatScore,
  computePercentile,
  extractCompositeScores,
  deviationFromMean,
  axisHref,
  normalizeAxisName,
  isAggregatePartner,
  formatCompactVolume,
  computeRank,
} from "@/lib/format";
import { generateStructuralSummary } from "@/lib/summary";
import type {
  CountryDetail,
  CountryAxisDetail,
  ChannelDetail,
  Warning,
} from "@/lib/types";

export const revalidate = 300; // ISR: rebuild at most every 5 minutes

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function CountryPage({ params }: PageProps) {
  const { code } = await params;
  const upperCode = code.toUpperCase();

  let country: CountryDetail | null = null;
  let error: { message: string; endpoint: string; status?: number } | null =
    null;

  const [countryResult, isiResult] = await Promise.allSettled([
    fetchCountry(upperCode),
    fetchISI(),
  ]);

  if (countryResult.status === "fulfilled") {
    country = countryResult.value;
  } else {
    const err = countryResult.reason;
    error = {
      message: err instanceof Error ? err.message : String(err),
      endpoint: `/country/${upperCode}`,
      status: err instanceof ApiError ? err.status : undefined,
    };
  }

  const isi = isiResult.status === "fulfilled" ? isiResult.value : null;

  if (error || !country) {
    return (
      <div className="min-h-screen bg-white">
        <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-10 lg:px-16">
          <Link
            href="/"
            className="text-[13px] text-text-tertiary hover:text-text-primary"
          >
            ← Back to Overview
          </Link>
          <div className="mt-6">
            <ErrorPanel
              title={`Failed to load country ${upperCode}`}
              message={error?.message ?? "Unknown error"}
              endpoint={error?.endpoint}
              status={error?.status}
            />
          </div>
        </main>
      </div>
    );
  }

  // Compute percentile and rank from ISI composite data
  const allScores = isi ? extractCompositeScores(isi.countries) : [];
  const percentile =
    country.isi_composite !== null && allScores.length > 0
      ? computePercentile(country.isi_composite, allScores)
      : null;
  const rank =
    country.isi_composite !== null && allScores.length > 0
      ? computeRank(country.isi_composite, allScores)
      : null;
  const totalRanked = allScores.length;

  // Identify strengths (lowest HHI) and vulnerabilities (highest HHI)
  const scoredAxes = country.axes
    .filter((a) => a.score !== null)
    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0));
  const strengths = scoredAxes.slice(0, 2);
  const vulnerabilities = scoredAxes.slice(-2).reverse();

  const compositeMean = isi?.statistics.mean ?? null;

  // Build radar data from country axes (dynamic, no hardcoded count)
  const radarAxes = country.axes.map((a) => ({
    label: normalizeAxisName(a.axis_name),
    value: a.score,
  }));

  // Build EU mean per axis (matching order) if ISI data available
  const euMeanPerAxis = isi
    ? country.axes.map(() => compositeMean) // Approximate — use composite mean per axis
    : undefined;

  // Build deviation bar items
  const deviationItems = country.axes.map((a) => ({
    label: normalizeAxisName(a.axis_name),
    score: a.score,
    href: axisHref(a.axis_slug),
  }));

  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-16">
        {/* ── Breadcrumb ────────────────────────────────────── */}
        <div className="pt-6 sm:pt-10">
          <Link
            href="/"
            className="text-[13px] text-text-tertiary hover:text-text-primary"
          >
            ← Back to Overview
          </Link>
        </div>

        {/* ── Country Header ────────────────────────────────── */}
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
          <p className="mt-2 text-[14px] text-text-tertiary">
            {country.version} · {country.window} ·{" "}
            {country.axes_available}/{country.axes_required} axes available
          </p>
        </section>

        {/* ── Composite KPI Row ─────────────────────────────── */}
        <section className="mt-12">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-quaternary">
            Composite Score
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
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
          {/* EU Mean Reference */}
          {compositeMean !== null && country.isi_composite !== null && (
            <p className="mt-3 text-[13px] tabular-nums text-text-tertiary">
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

        {/* ── Distribution Context (where does this country sit?) ── */}
        {allScores.length > 0 && country.isi_composite !== null && (
          <section className="mt-12">
            <h2 className="font-serif text-[26px] font-semibold tracking-tight text-text-primary">
              Position in EU-27 Distribution
            </h2>
            <p className="mt-1.5 text-[14px] text-text-tertiary">
              {country.country_name}&apos;s composite score relative to all EU-27 member states.
            </p>
            <div className="mt-6 rounded-md border border-border-primary p-3 sm:p-6">
            <DistributionHistogram
              scores={allScores}
              mean={compositeMean}
              highlight={country.isi_composite}
              highlightLabel={country.country}
              height={160}
              binCount={16}
            />
            </div>
          </section>
        )}

        {/* ── Radar + Deviation Side-by-Side ───────────────── */}
        <section className="mt-10 grid gap-4 sm:mt-14 sm:gap-6 lg:grid-cols-2">
          {/* Radar Chart */}
          <div className="rounded-md border border-border-primary p-3 sm:p-6">
            <h2 className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-quaternary">
              Multi-Axis Profile
            </h2>
            <RadarChart
              axes={radarAxes}
              euMean={euMeanPerAxis}
              label={country.country_name}
            />
          </div>

          {/* Deviation Bars */}
          <div className="rounded-md border border-border-primary p-3 sm:p-6">
            <h2 className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-quaternary">
              Deviation from EU-27 Mean
            </h2>
            <p className="mt-2 mb-3 text-[12px] text-text-quaternary">
              Bars show deviation from the EU-27 composite mean ({formatScore(compositeMean)}).
              Red = above mean (more concentrated). Green = below mean (more diversified).
            </p>
            <DeviationBarChart
              items={deviationItems}
              mean={compositeMean}
            />
          </div>
        </section>

        {/* ── Structural Exposure Summary ───────────────────── */}
        {(() => {
          const summary = generateStructuralSummary(
            country,
            compositeMean,
            allScores
          );
          if (!summary) return null;
          return (
            <section className="mt-10 rounded-md border border-border-primary bg-surface-tertiary p-5">
              <h3 className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-quaternary">
                Structural Exposure Summary
              </h3>
              <p className="mt-3 text-[14px] leading-relaxed text-text-secondary">
                {summary}
              </p>
              <p className="mt-3 text-[12px] leading-relaxed text-text-quaternary">
                HHI captures concentration structure only. It does not measure substitutability, domestic production capacity, or geopolitical resilience.
              </p>
            </section>
          );
        })()}

        {/* ── Strengths & Vulnerabilities ───────────────────── */}
        {scoredAxes.length >= 2 && (
          <section className="mt-12 grid gap-4 md:grid-cols-2">
            <div className="border-l-2 border-l-deviation-negative rounded-md border border-border-primary p-4 sm:p-5">
              <h3 className="text-[10px] font-medium uppercase tracking-[0.14em] text-deviation-negative">
                Most Diversified Axes (Lowest HHI)
              </h3>
              <div className="mt-4 space-y-2">
                {strengths.map((a) => (
                  <div key={a.axis_id} className="flex items-center justify-between">
                    <Link
                      href={axisHref(a.axis_slug)}
                      className="text-[14px] font-medium text-text-secondary hover:text-navy-700"
                    >
                      {normalizeAxisName(a.axis_name)}
                    </Link>
                    <span className="font-mono text-[14px] text-deviation-negative">
                      {formatScore(a.score)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-l-2 border-l-deviation-positive rounded-md border border-border-primary p-4 sm:p-5">
              <h3 className="text-[10px] font-medium uppercase tracking-[0.14em] text-deviation-positive">
                Most Concentrated Axes (Highest HHI)
              </h3>
              <div className="mt-4 space-y-2">
                {vulnerabilities.map((a) => (
                  <div key={a.axis_id} className="flex items-center justify-between">
                    <Link
                      href={axisHref(a.axis_slug)}
                      className="text-[14px] font-medium text-text-secondary hover:text-navy-700"
                    >
                      {normalizeAxisName(a.axis_name)}
                    </Link>
                    <span className="font-mono text-[14px] text-deviation-positive">
                      {formatScore(a.score)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Per-Axis Details ──────────────────────────────── */}
        <div className="mt-14 mb-16 space-y-4">
        {country.axes.map((axis) => (
          <AxisSection key={axis.axis_id} axis={axis} />
        ))}
        </div>
      </main>
    </div>
  );
}

// ─── Axis Section Sub-Component ────────────────────────────────────

function AxisSection({ axis }: { axis: CountryAxisDetail }) {
  return (
    <section className="mt-8 rounded-md border border-border-primary">
      <div className="border-b border-border-subtle px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
              Axis {axis.axis_id} — {axis.axis_slug}
            </p>
            <h3 className="mt-1 font-serif text-[16px] font-semibold text-text-primary sm:text-[17px]">
              <Link
                href={axisHref(axis.axis_slug)}
                className="hover:text-navy-700"
              >
                {normalizeAxisName(axis.axis_name)}
              </Link>
            </h3>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="font-mono text-lg font-bold text-text-primary">
              {formatScore(axis.score)}
            </span>
            <StatusBadge classification={axis.classification} />
          </div>
        </div>
        <p className="mt-2 text-sm text-text-tertiary">
          {axis.driver_statement}
        </p>
      </div>

      <div className="px-4 py-4 space-y-4 sm:px-5">
        {/* Audit breakdown */}
        {axis.audit && (() => {
          const entries = Object.entries(axis.audit).filter(
            ([, val]) => val !== null && val !== undefined && val !== ""
          );
          if (entries.length === 0) return null;
          return (
            <div>
              <h4 className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
                Audit Breakdown
              </h4>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {entries.map(([key, val]) => (
                  <div
                    key={key}
                    className="rounded-md border border-border-primary bg-surface-tertiary p-3"
                  >
                    <p className="text-[11px] text-text-quaternary">
                      {key.replace(/_/g, " ")}
                    </p>
                    <p className="font-mono text-sm font-medium text-text-secondary">
                      {typeof val === "number" ? val.toFixed(4) : String(val)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Channels with partners */}
        {axis.channels && axis.channels.length > 0 && (
          <div>
            <h4 className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
              Channels
            </h4>
            <div className="mt-2 space-y-3">
              {axis.channels.map((ch: ChannelDetail) => (
                <ChannelBlock key={ch.channel_id} channel={ch} />
              ))}
            </div>
          </div>
        )}

        {/* Fuel concentrations (axis-specific) */}
        {axis.fuel_concentrations && (
          <div>
            <h4 className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
              Fuel Concentrations
            </h4>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
              {Object.entries(axis.fuel_concentrations).map(([fuel, hhi]) => (
                <div
                  key={fuel}
                  className="rounded-md border border-border-primary bg-surface-tertiary p-3"
                >
                  <p className="text-[11px] capitalize text-text-quaternary">
                    {fuel.replace(/_/g, " ")}
                  </p>
                  <p className="font-mono text-sm font-medium text-text-secondary">
                    {hhi.toFixed(4)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warnings */}
        {axis.warnings.length > 0 && (
          <div>
            <h4 className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
              Warnings
            </h4>
            <ul className="mt-2 space-y-1">
              {axis.warnings.map((w: Warning) => (
                <li
                  key={w.id}
                  className="text-xs text-text-tertiary"
                >
                  <span
                    className={`mr-1 font-semibold ${
                      w.severity === "HIGH"
                        ? "text-severity-high"
                        : w.severity === "MEDIUM"
                          ? "text-severity-medium"
                          : "text-text-quaternary"
                    }`}
                  >
                    [{w.id}]
                  </span>
                  {w.text}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Channel Block Sub-Component ───────────────────────────────────

function ChannelBlock({ channel }: { channel: ChannelDetail }) {
  return (
    <div className="rounded-md border border-border-primary bg-surface-tertiary p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-text-secondary">
          Ch. {channel.channel_id}: {channel.channel_name}
        </p>
        {channel.total_partners != null && (
          <span className="text-[11px] text-text-quaternary">
            {channel.total_partners} partners
          </span>
        )}
      </div>
      <p className="text-[11px] text-text-quaternary">{channel.source}</p>

      {/* Top partners */}
      {(() => {
        const validPartners = (channel.top_partners ?? []).filter(
          (p) => !isAggregatePartner(p.partner)
        );
        if (validPartners.length === 0) return null;
        return (
          <div className="mt-2">
            <p className="text-[11px] font-medium text-text-quaternary">Top Partners</p>
            <div className="mt-1 space-y-1">
              {validPartners.map((p, i) => (
                <div
                  key={`${p.partner}-${i}`}
                  className="flex items-center justify-between"
                >
                  <span className="text-xs text-text-tertiary">
                    {p.partner}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 overflow-hidden bg-stone-200">
                      <div
                        className="h-full bg-navy-700"
                        style={{ width: `${(p.share * 100).toFixed(1)}%` }}
                      />
                    </div>
                    <span className="w-14 text-right font-mono text-[11px] text-text-quaternary">
                      {(p.share * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Subcategories */}
      {channel.subcategories && channel.subcategories.length > 0 && (
        <div className="mt-2">
          <p className="text-[11px] font-medium text-text-quaternary">Subcategories</p>
          <div className="mt-1 overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-text-quaternary">
                  <th className="pr-3 text-left font-medium">Category</th>
                  <th className="pr-3 text-right font-medium">HHI</th>
                  <th className="text-right font-medium">Volume</th>
                </tr>
              </thead>
              <tbody>
                {channel.subcategories.map((s, i) => (
                  <tr
                    key={`${s.category}-${i}`}
                    className="text-text-tertiary"
                  >
                    <td className="pr-3 py-0.5">{s.category}</td>
                    <td className="pr-3 py-0.5 text-right font-mono">
                      {s.concentration.toFixed(4)}
                    </td>
                    <td className="py-0.5 text-right font-mono">
                      {s.volume !== undefined
                        ? formatCompactVolume(s.volume)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
