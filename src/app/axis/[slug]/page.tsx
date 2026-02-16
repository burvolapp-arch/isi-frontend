import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchAxes, fetchAxis, ApiError } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { KPICard } from "@/components/KPICard";
import { ErrorPanel } from "@/components/ErrorPanel";
import { DistributionHistogram } from "@/components/DistributionHistogram";
import { formatScore, countryHref, computeStdDev } from "@/lib/format";
import { getCanonicalAxisName } from "@/lib/axisRegistry";
import type { AxisDetail, AxisCountryEntry } from "@/lib/types";

export const revalidate = 300; // ISR: rebuild at most every 5 minutes

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function AxisPage({ params }: PageProps) {
  const { slug } = await params;

  // First resolve slug → axis_id via the axis registry
  let axisId: number | null = null;
  let registryError: string | null = null;

  try {
    const registry = await fetchAxes();
    const match = registry.find((a) => a.slug === slug);
    if (!match) {
      notFound();
    }
    axisId = match.id;
  } catch (err) {
    registryError =
      err instanceof Error ? err.message : "Failed to load axis registry";
  }

  if (registryError || axisId === null) {
    return (
      <div className="min-h-screen bg-white">
        <main className="mx-auto max-w-[1400px] px-6 py-10 lg:px-16">
          <Link
            href="/"
            className="text-[13px] text-text-tertiary hover:text-text-primary"
          >
            ← Back to Overview
          </Link>
          <div className="mt-4">
            <ErrorPanel
              title={`Failed to resolve axis "${slug}"`}
              message={registryError ?? "Axis not found in registry"}
              endpoint="/axes"
            />
          </div>
        </main>
      </div>
    );
  }

  // Fetch full axis detail
  let axis: AxisDetail | null = null;
  let error: { message: string; endpoint: string; status?: number } | null =
    null;

  try {
    axis = await fetchAxis(axisId);
  } catch (err) {
    error = {
      message: err instanceof Error ? err.message : String(err),
      endpoint: `/axis/${axisId}`,
      status: err instanceof ApiError ? err.status : undefined,
    };
  }

  if (error || !axis) {
    return (
      <div className="min-h-screen bg-white">
        <main className="mx-auto max-w-[1400px] px-6 py-10 lg:px-16">
          <Link
            href="/"
            className="text-[13px] text-text-tertiary hover:text-text-primary"
          >
            ← Back to Overview
          </Link>
          <div className="mt-4">
            <ErrorPanel
              title={`Failed to load axis ${slug}`}
              message={error?.message ?? "Unknown error"}
              endpoint={error?.endpoint}
              status={error?.status}
            />
          </div>
        </main>
      </div>
    );
  }

  // Sort countries by score descending for the rankings
  const ranked = [...axis.countries]
    .filter((c): c is AxisCountryEntry & { score: number } => c.score !== null)
    .sort((a, b) => b.score - a.score);

  const axisScores = ranked.map((c) => c.score);
  const stdDev = computeStdDev(axisScores);
  const range =
    axis.statistics.max !== null && axis.statistics.min !== null
      ? axis.statistics.max - axis.statistics.min
      : null;

  const outlierHigh = ranked.length > 0 ? ranked[0] : null;
  const outlierLow = ranked.length > 0 ? ranked[ranked.length - 1] : null;

  // Identify outliers (> 1.5 std dev from mean)
  const meanVal = axis.statistics.mean;
  const outlierThreshold = stdDev !== null && meanVal !== null ? 1.5 * stdDev : null;

  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-[1400px] px-6 lg:px-16">
        {/* Breadcrumb */}
        <div className="pt-10">
          <Link
            href="/"
            className="text-[13px] text-text-tertiary hover:text-text-primary"
          >
            ← Back to Overview
          </Link>
        </div>

        {/* ── Axis Header ──────────────────────────────────── */}
        <section className="mt-8">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-quaternary">
            Axis {axis.axis_id} — {axis.axis_slug}
          </p>
          <h1 className="mt-2 font-serif text-[40px] font-bold leading-[1.15] tracking-tight text-text-primary">
            {getCanonicalAxisName(axis.axis_slug)}
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-text-tertiary">
            {axis.description}
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-[12px] text-text-quaternary">
            <span>Version: {axis.version}</span>
            <span>Status: {axis.status}</span>
            <span>Unit: {axis.unit}</span>
            <span>
              Materialized:{" "}
              {axis.materialized ? (
                <span className="text-deviation-negative">Yes</span>
              ) : (
                <span className="text-text-quaternary">No</span>
              )}
            </span>
          </div>
        </section>

        {/* ── KPI Row ──────────────────────────────────────── */}
        <section className="mt-12">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-quaternary">
            Cross-EU Statistics
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <KPICard
              label="Countries Scored"
              value={`${axis.countries_scored}`}
              subtitle="out of EU-27"
              variant="highlight"
            />
            <KPICard
              label="Min (Most Diversified)"
              value={formatScore(axis.statistics.min)}
              subtitle={outlierLow ? outlierLow.country_name : undefined}
            />
            <KPICard
              label="Max (Most Concentrated)"
              value={formatScore(axis.statistics.max)}
              subtitle={outlierHigh ? outlierHigh.country_name : undefined}
            />
            <KPICard
              label="Mean"
              value={formatScore(axis.statistics.mean)}
              subtitle="EU-27 average"
            />
            <KPICard
              label="Std Deviation"
              value={stdDev !== null ? stdDev.toFixed(4) : "—"}
              subtitle="Cross-country dispersion"
            />
            <KPICard
              label="Range"
              value={range !== null ? range.toFixed(4) : "—"}
              subtitle="Max − Min spread"
            />
          </div>
        </section>

        {/* ── Distribution Histogram ───────────────────────── */}
        {axisScores.length > 0 && (
          <section className="mt-14">
            <h2 className="font-serif text-[26px] font-semibold tracking-tight text-text-primary">
              Score Distribution — {getCanonicalAxisName(axis.axis_slug)}
            </h2>
            <p className="mt-1.5 text-[14px] text-text-tertiary">
              Distribution of HHI scores across all scored EU member states for this axis.
            </p>
            <div className="mt-6 rounded-md border border-border-primary p-6">
            <DistributionHistogram
              scores={axisScores}
              mean={meanVal}
              height={180}
              binCount={14}
            />
            </div>
          </section>
        )}

        {/* ── Data Sources (Channels) ──────────────────────── */}
        <section className="mt-12">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-quaternary">
            Data Sources &amp; Channels
          </h2>
          <p className="mt-2 text-[13px] text-text-quaternary">
            This axis is computed from {axis.channels.length} data
            channel(s). Each channel represents a distinct trade-flow or
            supplier concentration dataset.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {axis.channels.map((ch) => (
              <div
                key={ch.id}
                className="rounded-md border border-border-primary bg-surface-tertiary p-4"
              >
                <p className="text-[14px] font-medium text-text-secondary">
                  Ch. {ch.id}: {ch.name}
                </p>
                <p className="mt-0.5 text-[11px] text-text-quaternary">{ch.source}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Warnings / Known Limitations ─────────────────── */}
        {axis.warnings.length > 0 && (
          <section className="mt-10 rounded-md border border-border-primary py-4 pl-5 pr-6">
            <h2 className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-quaternary">
              Known Limitations &amp; Warnings
            </h2>
            <ul className="space-y-2">
              {axis.warnings.map((w) => (
                <li key={w.id} className="text-sm text-text-tertiary">
                  <span
                    className={`mr-1.5 font-semibold ${
                      w.severity === "HIGH"
                        ? "text-severity-high"
                        : w.severity === "MEDIUM"
                          ? "text-severity-medium"
                          : "text-text-quaternary"
                    }`}
                  >
                    [{w.severity}]
                  </span>
                  {w.text}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Country Rankings Table ────────────────────────── */}
        <section className="mt-14">
          <h2 className="font-serif text-[26px] font-semibold tracking-tight text-text-primary">
              Country Rankings — {getCanonicalAxisName(axis.axis_slug)}
          </h2>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b-2 border-navy-900">
                  <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.1em] text-text-quaternary">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.1em] text-text-quaternary">
                    Country
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-[0.1em] text-text-quaternary">
                    Score
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-[0.1em] text-text-quaternary">
                    Δ Mean
                  </th>
                  <th className="px-4 py-3 text-center text-[11px] font-medium uppercase tracking-[0.1em] text-text-quaternary">
                    Classification
                  </th>
                  <th className="px-4 py-3 text-center text-[11px] font-medium uppercase tracking-[0.1em] text-text-quaternary">
                    Outlier
                  </th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((c, i) => {
                  const dev =
                    meanVal !== null ? c.score - meanVal : null;
                  const isOutlier =
                    outlierThreshold !== null &&
                    meanVal !== null &&
                    Math.abs(c.score - meanVal) > outlierThreshold;

                  return (
                    <tr
                      key={c.country}
                      className={`border-b border-border-subtle transition-colors hover:bg-surface-tertiary ${
                        i % 2 === 1 ? "bg-surface-tertiary/50" : ""
                      } ${
                        isOutlier ? "border-l-2 border-l-severity-high" : "border-l-2 border-l-transparent"
                      }`}
                    >
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[13px] text-text-quaternary">
                        {i + 1}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-sm">
                        <Link
                          href={countryHref(c.country)}
                          className="font-medium text-text-secondary hover:text-navy-700"
                        >
                          {c.country_name}
                        </Link>
                        <span className="ml-1.5 text-[11px] text-text-quaternary">
                          {c.country}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono text-sm font-semibold text-text-primary">
                        {formatScore(c.score)}
                      </td>
                      <td
                        className={`whitespace-nowrap px-4 py-2.5 text-right font-mono text-sm ${
                          dev !== null && dev > 0
                            ? "text-deviation-positive"
                            : dev !== null && dev < 0
                              ? "text-deviation-negative"
                              : "text-text-quaternary"
                        }`}
                      >
                        {dev !== null
                          ? `${dev >= 0 ? "+" : ""}${dev.toFixed(4)}`
                          : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-center">
                        <StatusBadge classification={c.classification} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-center text-[11px]">
                        {isOutlier ? (
                          <span className="font-semibold text-severity-high">●</span>
                        ) : (
                          <span className="text-text-quaternary">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {outlierThreshold !== null && (
            <p className="mt-2 text-[11px] text-text-quaternary">
              ● Outlier: country score deviates &gt; 1.5σ from mean ({outlierThreshold.toFixed(4)}).
            </p>
          )}
        </section>

        {/* ── What This Axis Does NOT Measure ──────────────── */}
        <section className="mt-14 mb-16 border-l-2 border-l-stone-300 py-4 pl-5 pr-6">
          <h3 className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-quaternary">
            Interpretive Boundaries
          </h3>
          <div className="mt-3 space-y-2 text-[14px] text-text-tertiary">
            <p>
              This axis measures <strong className="text-text-secondary">structural concentration</strong> (HHI-based)
              in the {getCanonicalAxisName(axis.axis_slug).toLowerCase()} domain. It does{" "}
              <strong className="text-text-secondary">not</strong> capture:
            </p>
            <ul className="list-inside list-disc space-y-1 pl-2 text-text-quaternary">
              <li>Qualitative resilience or substitutability of suppliers</li>
              <li>Political risk or geopolitical alignment of trade partners</li>
              <li>Temporal trends or year-over-year trajectory</li>
              <li>Intra-EU vs. extra-EU supplier concentration decomposition</li>
            </ul>
            <p className="text-[11px] text-text-quaternary">
              High concentration ≠ high vulnerability. Contextual interpretation required.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
