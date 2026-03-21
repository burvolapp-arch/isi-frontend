import Link from "next/link";
import type { Metadata } from "next";
import { generateBreadcrumbJsonLd } from "@/lib/breadcrumbs";
import { fetchISI, ApiError } from "@/lib/api";
import { ErrorPanel } from "@/components/ErrorPanel";
import { KPICard } from "@/components/KPICard";
import { CitationFooter } from "@/components/CitationFooter";
import {
  classificationLabel,
  extractCompositeScores,
  computeMedian,
  computeStdDev,
  classifyScore,
  countryHref,
} from "@/lib/format";
import { formatScore, formatAxisShort } from "@/lib/presentation";
import { AXIS_FIELD_MAP, type AxisSlug } from "@/lib/axisRegistry";
import { decomposeVarianceByAxis } from "@/lib/countryBrief";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "EU-27 Analysis — Variance Decomposition",
  description:
    "Structural analysis of cross-country variance in external supplier concentration across the EU-27 founding cohort. Defence and logistics dominate ≈69% of variance.",
  alternates: { canonical: "/analysis/eu" },
  openGraph: {
    title: "EU-27 Variance Analysis — ISI",
    description:
      "Defence + logistics dominate ≈69% of cross-country variance in the EU-27 ISI cohort.",
    url: "https://isi.internationalsovereignty.org/analysis/eu",
    type: "article",
  },
};

export default async function EUAnalysisPage() {
  let isiResult;
  let fetchError: { message: string; endpoint: string; status?: number } | null = null;

  try {
    isiResult = await fetchISI();
  } catch (err: unknown) {
    fetchError = {
      message: err instanceof Error ? err.message : String(err),
      endpoint: "/isi",
      status: err instanceof ApiError ? err.status : undefined,
    };
  }

  if (!isiResult || fetchError) {
    return (
      <div className="min-h-screen bg-background">
        <main className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6 lg:px-16">
          <Link href="/" className="inline-flex min-h-[44px] items-center text-[13px] text-text-tertiary hover:text-text-primary sm:min-h-0">
            ← Back to Overview
          </Link>
          <div className="mt-6">
            <ErrorPanel
              title="Data temporarily unavailable"
              message={fetchError?.message ?? "Unable to load ISI composite data."}
              endpoint="/isi"
              status={fetchError?.status}
            />
          </div>
        </main>
      </div>
    );
  }

  const countries = isiResult.countries;
  const scored = countries.filter((c) => c.isi_composite !== null);
  const composites = extractCompositeScores(countries);
  const mean = isiResult.statistics.mean;
  const median = composites.length > 0 ? computeMedian(composites) : null;
  const stdDev = composites.length > 0 ? computeStdDev(composites) : null;

  // Variance decomposition
  const variance = decomposeVarianceByAxis(countries);

  // Top 2 variance drivers
  const topDriver = variance[0] ?? null;
  const secondDriver = variance[1] ?? null;
  const topTwoShare =
    topDriver && secondDriver
      ? ((topDriver.share + secondDriver.share) * 100).toFixed(0)
      : null;

  // Per-axis cohort means
  const axisMeans = Object.entries(AXIS_FIELD_MAP).map(([slug, field]) => {
    const values = scored
      .map((c) => (c as unknown as Record<string, unknown>)[field])
      .filter((v): v is number => typeof v === "number");
    const m = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
    const sd = values.length > 0 ? computeStdDev(values) : null;
    return { slug: slug as AxisSlug, mean: m, stdDev: sd, count: values.length };
  });

  // Highest and lowest axis means
  const sortedMeans = [...axisMeans].filter((a) => a.mean !== null).sort((a, b) => (b.mean ?? 0) - (a.mean ?? 0));
  const highestAxis = sortedMeans[0] ?? null;
  const lowestAxis = sortedMeans[sortedMeans.length - 1] ?? null;

  // Cross-country dispersion: countries sorted by composite (most concentrated first)
  const topConcentrated = [...scored].sort((a, b) => (b.isi_composite ?? 0) - (a.isi_composite ?? 0)).slice(0, 5);
  const leastConcentrated = [...scored].sort((a, b) => (a.isi_composite ?? 0) - (b.isi_composite ?? 0)).slice(0, 5);

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            generateBreadcrumbJsonLd([{ name: "EU Analysis", href: "/analysis/eu" }]),
          ),
        }}
      />
      <main className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-16">
        {/* ── Header ── */}
        <div className="max-w-3xl pt-10">
          <Link href="/" className="inline-flex min-h-[44px] items-center text-[13px] text-text-tertiary hover:text-text-primary sm:min-h-0">
            ← Back to Overview
          </Link>
          <h1 className="mt-6 font-serif text-[28px] font-bold leading-[1.15] tracking-tight text-text-primary sm:text-[40px]">
            EU-27 Structural Analysis
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-text-tertiary">
            Variance decomposition and cross-country dispersion analysis for the
            EU-27 founding cohort. This page identifies the structural axes
            that drive the most inter-country divergence in concentration profiles.
          </p>
        </div>

        {/* ── Key Finding ── */}
        <section className="mt-10 rounded-md border-l-2 border-l-navy-700 border border-border-primary bg-surface-tertiary p-5 sm:p-6">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-quaternary">
            Key Finding
          </h2>
          <p className="mt-2 text-[16px] font-medium leading-relaxed text-text-primary sm:text-[18px]">
            {topDriver && secondDriver ? (
              <>
                <span className="font-semibold">{topDriver.axis}</span> and{" "}
                <span className="font-semibold">{secondDriver.axis}</span>{" "}
                together account for{" "}
                <span className="font-mono font-bold text-navy-700">{topTwoShare}%</span>{" "}
                of cross-country variance in the EU-27 cohort.
              </>
            ) : (
              "Insufficient data for variance decomposition."
            )}
          </p>
          <p className="mt-2 text-[13px] text-text-tertiary">
            This means that the structural differences between EU member states
            are overwhelmingly determined by how concentrated their{" "}
            {topDriver?.axis.toLowerCase()} and {secondDriver?.axis.toLowerCase()}{" "}
            supply chains are, rather than by the other four axes.
          </p>
        </section>

        {/* ── Cohort KPIs ── */}
        <section className="mt-10">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-quaternary">
            Cohort Summary
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-6">
            <KPICard
              label="Cohort Mean"
              value={formatScore(mean)}
              subtitle={mean !== null ? classificationLabel(classifyScore(mean)) : "—"}
              variant="highlight"
            />
            <KPICard
              label="Median"
              value={formatScore(median)}
              subtitle="50th percentile"
            />
            <KPICard
              label="Std Deviation"
              value={formatScore(stdDev)}
              subtitle="Cross-country dispersion"
            />
            <KPICard
              label="Countries"
              value={`${scored.length}`}
              subtitle="With valid composites"
            />
            <KPICard
              label="Highest Axis"
              value={highestAxis ? formatAxisShort(highestAxis.slug) : "—"}
              subtitle={highestAxis?.mean !== null ? `Mean: ${formatScore(highestAxis.mean)}` : "—"}
            />
            <KPICard
              label="Lowest Axis"
              value={lowestAxis ? formatAxisShort(lowestAxis.slug) : "—"}
              subtitle={lowestAxis?.mean !== null ? `Mean: ${formatScore(lowestAxis.mean)}` : "—"}
            />
          </div>
        </section>

        {/* ── Variance Decomposition Table ── */}
        <section className="mt-14">
          <h2 className="font-serif text-[22px] font-semibold tracking-tight text-text-primary sm:text-[26px]">
            Variance Decomposition by Axis
          </h2>
          <p className="mt-1.5 text-[14px] text-text-tertiary">
            Each axis&apos;s contribution to total cross-country variance. Variance is computed
            as the population variance of per-country scores for each axis.
          </p>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-[14px]">
              <thead>
                <tr className="border-b-2 border-navy-900 text-[11px] uppercase tracking-[0.1em] text-text-quaternary">
                  <th className="px-4 py-3 text-left font-medium">Axis</th>
                  <th className="px-4 py-3 text-right font-medium">Variance</th>
                  <th className="px-4 py-3 text-right font-medium">Share of Total</th>
                  <th className="px-4 py-3 text-left font-medium">Visual</th>
                </tr>
              </thead>
              <tbody>
                {variance.map((v) => (
                  <tr key={v.slug} className="border-b border-border-subtle transition-colors hover:bg-surface-tertiary">
                    <td className="whitespace-nowrap px-4 py-2.5 font-medium text-text-secondary">
                      <Link href={`/axis/${v.slug}`} className="hover:text-navy-700">
                        {v.axis}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono text-text-primary">
                      {v.variance.toFixed(6)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono font-semibold text-text-primary">
                      {(v.share * 100).toFixed(1)}%
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="h-3 w-32 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
                        <div
                          className="h-full rounded-full bg-navy-700 transition-all"
                          style={{ width: `${Math.min(v.share * 100, 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Axis Means + Dispersion ── */}
        <section className="mt-14">
          <h2 className="font-serif text-[22px] font-semibold tracking-tight text-text-primary sm:text-[26px]">
            Axis-Level Cohort Averages
          </h2>
          <p className="mt-1.5 text-[14px] text-text-tertiary">
            Mean axis scores and standard deviations across {scored.length} EU-27 member states.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sortedMeans.map((a) => (
              <div
                key={a.slug}
                className="rounded-md border border-border-primary bg-surface-tertiary p-4"
              >
                <div className="flex items-baseline justify-between">
                  <Link href={`/axis/${a.slug}`} className="font-medium text-text-secondary hover:text-navy-700">
                    {formatAxisShort(a.slug)}
                  </Link>
                  <span className="font-mono text-lg font-bold text-text-primary">
                    {formatScore(a.mean)}
                  </span>
                </div>
                <div className="mt-2 flex gap-4 text-[12px] text-text-quaternary">
                  <span>σ = {formatScore(a.stdDev)}</span>
                  <span>n = {a.count}</span>
                  {a.mean !== null && (
                    <span className={
                      a.mean >= 0.5 ? "text-band-highly" :
                      a.mean >= 0.25 ? "text-band-moderately" :
                      a.mean >= 0.15 ? "text-band-mildly" :
                      "text-band-unconcentrated"
                    }>
                      {classificationLabel(classifyScore(a.mean))}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Most & Least Concentrated ── */}
        <section className="mt-14 grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="font-serif text-[18px] font-semibold text-text-primary">
              Most Concentrated
            </h3>
            <p className="mt-1 text-[13px] text-text-tertiary">
              Top 5 countries by composite ISI score.
            </p>
            <div className="mt-4 space-y-2">
              {topConcentrated.map((c, i) => (
                <Link
                  key={c.country}
                  href={countryHref(c.country)}
                  className="flex items-center justify-between rounded-md border border-border-primary p-3 transition-colors hover:bg-surface-tertiary"
                >
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-[12px] text-text-quaternary">{i + 1}.</span>
                    <span className="font-medium text-text-secondary">{c.country_name}</span>
                    <span className="text-[11px] text-text-quaternary">{c.country}</span>
                  </div>
                  <span className="font-mono font-semibold text-text-primary">
                    {formatScore(c.isi_composite)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-serif text-[18px] font-semibold text-text-primary">
              Least Concentrated
            </h3>
            <p className="mt-1 text-[13px] text-text-tertiary">
              Bottom 5 countries by composite ISI score.
            </p>
            <div className="mt-4 space-y-2">
              {leastConcentrated.map((c, i) => (
                <Link
                  key={c.country}
                  href={countryHref(c.country)}
                  className="flex items-center justify-between rounded-md border border-border-primary p-3 transition-colors hover:bg-surface-tertiary"
                >
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-[12px] text-text-quaternary">{scored.length - i}.</span>
                    <span className="font-medium text-text-secondary">{c.country_name}</span>
                    <span className="text-[11px] text-text-quaternary">{c.country}</span>
                  </div>
                  <span className="font-mono font-semibold text-text-primary">
                    {formatScore(c.isi_composite)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── Analytical Note ── */}
        <section className="mt-14 border-l-2 border-l-stone-300 py-4 pl-5 pr-6">
          <h3 className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-quaternary">
            Methodological Note
          </h3>
          <div className="mt-3 space-y-2 text-[14px] text-text-tertiary">
            <p>
              Variance decomposition is computed as the population variance of per-country
              axis scores for each of the six ISI dimensions. Each axis&apos;s share is its
              individual variance divided by the sum of all six axis variances.
            </p>
            <p>
              This is a descriptive decomposition — it identifies which axes account for the
              most cross-country dispersion, not a causal model. The high concentration of
              variance in defense and logistics reflects the structural heterogeneity of
              EU member states in these domains.
            </p>
            <p className="text-[12px] text-text-quaternary">
              See{" "}
              <Link href="/methodology" className="underline hover:text-text-primary">
                Methodology
              </Link>{" "}
              ·{" "}
              <Link href="/eu-aggregate" className="underline hover:text-text-primary">
                EU-27 Cohort Profile
              </Link>
            </p>
          </div>
        </section>

        {/* ── Citation ── */}
        <section className="mt-10 mb-16">
          <CitationFooter />
        </section>
      </main>
    </div>
  );
}
