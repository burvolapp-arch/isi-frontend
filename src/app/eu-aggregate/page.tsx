import Link from "next/link";
import type { Metadata } from "next";
import { fetchISI, fetchAxes, ApiError } from "@/lib/api";
import { ErrorPanel } from "@/components/ErrorPanel";
import { KPICard } from "@/components/KPICard";
import { DistributionHistogram } from "@/components/DistributionHistogram";
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
import type { ISICompositeCountry } from "@/lib/types";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "EU-27 Aggregate",
  description:
    "Bloc-level summary of external supplier concentration across all EU-27 member states.",
};

// ─── Client-side EU aggregate computation ───────────────────────────

function computeEUAggregate(countries: ISICompositeCountry[]) {
  const scored = countries.filter((c) => c.isi_composite !== null);
  if (scored.length === 0) return null;

  const composites = scored.map((c) => c.isi_composite as number);
  const mean = composites.reduce((a, b) => a + b, 0) / composites.length;
  const median = computeMedian(composites);
  const stdDev = computeStdDev(composites);
  const min = Math.min(...composites);
  const max = Math.max(...composites);

  // Per-axis aggregates
  const axisMeans: Record<string, { sum: number; count: number; scores: number[] }> = {};
  for (const [slug, field] of Object.entries(AXIS_FIELD_MAP)) {
    axisMeans[slug] = { sum: 0, count: 0, scores: [] };
    for (const c of scored) {
      const val = (c as unknown as Record<string, unknown>)[field];
      if (typeof val === "number" && val !== null) {
        axisMeans[slug].sum += val;
        axisMeans[slug].count += 1;
        axisMeans[slug].scores.push(val);
      }
    }
  }

  const axisAggregates = Object.entries(axisMeans).map(([slug, data]) => ({
    slug: slug as AxisSlug,
    mean: data.count > 0 ? data.sum / data.count : null,
    count: data.count,
    min: data.scores.length > 0 ? Math.min(...data.scores) : null,
    max: data.scores.length > 0 ? Math.max(...data.scores) : null,
    stdDev: data.scores.length > 0 ? computeStdDev(data.scores) : null,
  }));

  // Distribution buckets
  const distribution = {
    highly: scored.filter((c) => c.classification === "highly_concentrated").length,
    moderately: scored.filter((c) => c.classification === "moderately_concentrated").length,
    mildly: scored.filter((c) => c.classification === "mildly_concentrated").length,
    unconcentrated: scored.filter((c) => c.classification === "unconcentrated").length,
  };

  // Sorted by composite for table
  const ranked = [...scored].sort(
    (a, b) => (b.isi_composite as number) - (a.isi_composite as number)
  );

  return {
    memberStates: scored.length,
    mean,
    median,
    stdDev,
    min,
    max,
    classification: classifyScore(mean),
    axisAggregates,
    distribution,
    ranked,
  };
}

export default async function EU27Page() {
  let isiError: { message: string; endpoint: string; status?: number } | null = null;
  let axesError: { message: string; endpoint: string; status?: number } | null = null;

  const [isiResult, axesResult] = await Promise.allSettled([fetchISI(), fetchAxes()]);

  const isi = isiResult.status === "fulfilled" ? isiResult.value : null;
  const axes = axesResult.status === "fulfilled" ? axesResult.value : null;

  if (isiResult.status === "rejected") {
    const err = isiResult.reason;
    isiError = {
      message: err instanceof Error ? err.message : String(err),
      endpoint: "/isi",
      status: err instanceof ApiError ? err.status : undefined,
    };
  }
  if (axesResult.status === "rejected") {
    const err = axesResult.reason;
    axesError = {
      message: err instanceof Error ? err.message : String(err),
      endpoint: "/axes",
      status: err instanceof ApiError ? err.status : undefined,
    };
  }

  if (!isi || isiError) {
    return (
      <div className="min-h-screen bg-white">
        <main className="mx-auto max-w-[1400px] px-6 py-10 lg:px-16">
          <Link href="/" className="text-[13px] text-text-tertiary hover:text-text-primary">
            ← Back to Overview
          </Link>
          <div className="mt-6">
            <ErrorPanel
              title="Data temporarily unavailable"
              message={isiError?.message ?? "Unable to load ISI composite data."}
              endpoint="/isi"
              status={isiError?.status}
            />
          </div>
        </main>
      </div>
    );
  }

  const eu = computeEUAggregate(isi.countries);
  if (!eu) {
    return (
      <div className="min-h-screen bg-white">
        <main className="mx-auto max-w-[1400px] px-6 py-10 lg:px-16">
          <Link href="/" className="text-[13px] text-text-tertiary hover:text-text-primary">
            ← Back to Overview
          </Link>
          <div className="mt-6">
            <ErrorPanel
              title="Insufficient data"
              message="No countries with valid composite scores available."
              endpoint="/isi"
            />
          </div>
        </main>
      </div>
    );
  }

  const compositeScores = extractCompositeScores(isi.countries);

  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-[1400px] px-6 lg:px-16">
        {/* ── Header ── */}
        <div className="max-w-3xl pt-10">
          <Link href="/" className="text-[13px] text-text-tertiary hover:text-text-primary">
            ← Back to Overview
          </Link>
          <h1 className="mt-6 font-serif text-[40px] font-bold leading-[1.15] tracking-tight text-text-primary">
            EU-27 Aggregate Profile
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-text-tertiary">
            Bloc-level summary of external supplier concentration across all
            assessed EU-27 member states. Aggregates are computed as arithmetic
            means of individual country scores — no additional weighting is applied.
          </p>
        </div>

        {/* ── Bloc Composite KPIs ── */}
        <section className="mt-10">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-quaternary">
            Bloc-Level Statistics
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            <KPICard
              label="EU-27 Mean"
              value={formatScore(eu.mean)}
              subtitle={classificationLabel(eu.classification)}
              variant="highlight"
            />
            <KPICard
              label="EU-27 Median"
              value={formatScore(eu.median)}
              subtitle="Midpoint across member states"
            />
            <KPICard
              label="Std Deviation"
              value={formatScore(eu.stdDev)}
              subtitle="Cross-EU dispersion"
            />
            <KPICard
              label="Range"
              value={formatScore(eu.max - eu.min)}
              subtitle={`${formatScore(eu.min)} → ${formatScore(eu.max)}`}
            />
            <KPICard
              label="Member States"
              value={`${eu.memberStates}`}
              subtitle="With valid composite scores"
            />
            <KPICard
              label="Data Version"
              value={isi.version}
              subtitle={isi.window}
            />
          </div>
        </section>

        {/* ── Classification Distribution ── */}
        <section className="mt-12">
          <h2 className="font-serif text-[22px] font-semibold tracking-tight text-text-primary sm:text-[26px]">
            Classification Distribution
          </h2>
          <p className="mt-1.5 text-[14px] text-text-tertiary">
            Distribution of composite ISI scores across EU-27 member states by HHI concentration band.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {([
              { key: "highly_concentrated" as const, count: eu.distribution.highly, color: "border-l-band-highly" },
              { key: "moderately_concentrated" as const, count: eu.distribution.moderately, color: "border-l-band-moderately" },
              { key: "mildly_concentrated" as const, count: eu.distribution.mildly, color: "border-l-band-mildly" },
              { key: "unconcentrated" as const, count: eu.distribution.unconcentrated, color: "border-l-band-unconcentrated" },
            ]).map(({ key, count, color }) => (
              <div key={key} className={`border-l-2 ${color} pl-4`}>
                <p className="font-mono text-[20px] font-medium text-text-primary">{count}</p>
                <p className="mt-0.5 text-[12px] text-text-quaternary">
                  {classificationLabel(key)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Composite Distribution Histogram ── */}
        <section className="mt-12">
          <h2 className="font-serif text-[22px] font-semibold tracking-tight text-text-primary sm:text-[26px]">
            Composite Score Distribution
          </h2>
          <p className="mt-1.5 text-[14px] text-text-tertiary">
            Frequency distribution of composite ISI scores. Vertical markers indicate EU-27 mean and median.
          </p>
          <div className="mt-6 overflow-hidden rounded-lg border border-border-primary bg-white p-4 shadow-[inset_0_1px_3px_rgba(0,0,0,0.04)] sm:p-7">
            <DistributionHistogram
              scores={compositeScores}
              mean={eu.mean}
              median={eu.median}
              height={240}
              binCount={18}
            />
          </div>
        </section>

        {/* ── Axis-Level Bloc Aggregates ── */}
        <section className="mt-14 content-auto">
          <h2 className="font-serif text-[22px] font-semibold tracking-tight text-text-primary sm:text-[26px]">
            Axis-Level Aggregates
          </h2>
          <p className="mt-1.5 text-[14px] text-text-tertiary">
            Mean concentration scores across EU-27 member states for each strategic axis.
          </p>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-[14px]">
              <thead>
                <tr className="border-b-2 border-navy-900 text-[11px] uppercase tracking-[0.1em] text-text-quaternary">
                  <th className="px-4 py-3 text-left font-medium">Axis</th>
                  <th className="px-4 py-3 text-right font-medium">EU-27 Mean</th>
                  <th className="px-4 py-3 text-right font-medium">Min</th>
                  <th className="px-4 py-3 text-right font-medium">Max</th>
                  <th className="px-4 py-3 text-right font-medium">Std Dev</th>
                  <th className="px-4 py-3 text-center font-medium">Countries</th>
                  <th className="px-4 py-3 text-center font-medium">Classification</th>
                </tr>
              </thead>
              <tbody>
                {eu.axisAggregates
                  .filter((a) => a.mean !== null)
                  .sort((a, b) => (b.mean ?? 0) - (a.mean ?? 0))
                  .map((a) => (
                    <tr key={a.slug} className="border-b border-border-subtle transition-colors hover:bg-surface-tertiary">
                      <td className="px-4 py-2.5 text-text-secondary">
                        <Link href={`/axis/${a.slug}`} className="hover:text-navy-700">
                          {formatAxisShort(a.slug)}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold text-text-primary">
                        {formatScore(a.mean)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-text-tertiary">
                        {formatScore(a.min)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-text-tertiary">
                        {formatScore(a.max)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-text-tertiary">
                        {formatScore(a.stdDev)}
                      </td>
                      <td className="px-4 py-2.5 text-center text-text-tertiary">
                        {a.count}
                      </td>
                      <td className="px-4 py-2.5 text-center text-[12px]">
                        {a.mean !== null ? (
                          <span className={
                            a.mean >= 0.5 ? "text-band-highly" :
                            a.mean >= 0.25 ? "text-band-moderately" :
                            a.mean >= 0.15 ? "text-band-mildly" :
                            "text-band-unconcentrated"
                          }>
                            {classificationLabel(classifyScore(a.mean))}
                          </span>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Member State Rankings ── */}
        <section className="mt-14 content-auto">
          <h2 className="font-serif text-[22px] font-semibold tracking-tight text-text-primary sm:text-[26px]">
            Member State Rankings
          </h2>
          <p className="mt-1.5 text-[14px] text-text-tertiary">
            All EU-27 member states ranked by composite ISI score, with deviation from bloc mean.
          </p>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-[14px]">
              <thead>
                <tr className="border-b-2 border-navy-900 text-[11px] uppercase tracking-[0.1em] text-text-quaternary">
                  <th className="px-4 py-3 text-left font-medium">#</th>
                  <th className="px-4 py-3 text-left font-medium">Country</th>
                  <th className="px-4 py-3 text-right font-medium">Composite</th>
                  <th className="px-4 py-3 text-right font-medium">Δ EU Mean</th>
                  <th className="px-4 py-3 text-center font-medium">Classification</th>
                </tr>
              </thead>
              <tbody>
                {eu.ranked.map((c, i) => {
                  const composite = c.isi_composite as number;
                  const delta = composite - eu.mean;
                  return (
                    <tr
                      key={c.country}
                      className={`border-b border-border-subtle transition-colors hover:bg-surface-tertiary ${
                        i % 2 === 1 ? "bg-surface-tertiary/50" : ""
                      }`}
                    >
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[13px] text-text-quaternary">
                        {i + 1}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <Link
                          href={countryHref(c.country)}
                          className="font-medium text-text-secondary hover:text-navy-700"
                        >
                          {c.country_name}
                        </Link>
                        <span className="ml-1.5 text-[11px] text-text-quaternary">{c.country}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono font-semibold text-text-primary">
                        {formatScore(composite)}
                      </td>
                      <td className={`whitespace-nowrap px-4 py-2.5 text-right font-mono ${
                        delta > 0 ? "text-deviation-positive" : "text-deviation-negative"
                      }`}>
                        {delta >= 0 ? "+" : "−"}{formatScore(Math.abs(delta))?.replace("−", "")}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-center text-[12px]">
                        <span className={
                          composite >= 0.5 ? "text-band-highly" :
                          composite >= 0.25 ? "text-band-moderately" :
                          composite >= 0.15 ? "text-band-mildly" :
                          "text-band-unconcentrated"
                        }>
                          {classificationLabel(c.classification)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Methodological Note ── */}
        <section className="mt-14 mb-16 border-l-2 border-l-stone-300 py-4 pl-5 pr-6">
          <h3 className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-quaternary">
            Methodological Note
          </h3>
          <div className="mt-3 space-y-2 text-[14px] text-text-tertiary">
            <p>
              EU-27 aggregate values are computed client-side as unweighted arithmetic
              means of individual member state scores. They are <strong className="text-text-secondary">not</strong>{" "}
              independently scored composite entities.
            </p>
            <p>
              The bloc mean does not represent an EU-level concentration score —
              it represents the average concentration profile across member states.
              Individual countries may diverge substantially from this aggregate.
            </p>
            <p className="text-[12px] text-text-quaternary">
              See{" "}
              <Link href="/methodology" className="underline hover:text-text-primary">
                Methodology
              </Link>{" "}
              for details on composite computation.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
