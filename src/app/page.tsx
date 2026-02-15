import Link from "next/link";
import { fetchISI, fetchAxes, ApiError } from "@/lib/api";
import { KPICard } from "@/components/KPICard";
import { CountryRankingsTable } from "@/components/CountryRankingsTable";
import { AxisCard } from "@/components/AxisCard";
import { ErrorPanel } from "@/components/ErrorPanel";
import { DistributionHistogram } from "@/components/DistributionHistogram";
import OutliersPanel from "@/components/OutliersPanel";
import EUMap from "@/components/EUMap";
import {
  formatScore,
  classificationLabel,
  extractCompositeScores,
  computeMedian,
  computeStdDev,
  axisHref,
} from "@/lib/format";

export const revalidate = 300; // ISR: rebuild at most every 5 minutes

export default async function ExecutiveOverviewPage() {
  let isiError: { message: string; endpoint: string; status?: number } | null =
    null;
  let axesError: { message: string; endpoint: string; status?: number } | null =
    null;

  const [isiResult, axesResult] = await Promise.allSettled([
    fetchISI(),
    fetchAxes(),
  ]);

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

  // Derived statistics
  const compositeScores = isi ? extractCompositeScores(isi.countries) : [];
  const median = compositeScores.length > 0 ? computeMedian(compositeScores) : null;
  const stdDev = compositeScores.length > 0 ? computeStdDev(compositeScores) : null;
  const spread =
    isi !== null &&
    isi.statistics.max !== null &&
    isi.statistics.min !== null
      ? (isi.statistics.max - isi.statistics.min).toFixed(4)
      : null;

  // Distribution buckets
  const distribution = isi
    ? {
        highly: isi.countries.filter(
          (c) => c.classification === "highly_concentrated"
        ).length,
        moderately: isi.countries.filter(
          (c) => c.classification === "moderately_concentrated"
        ).length,
        mildly: isi.countries.filter(
          (c) => c.classification === "mildly_concentrated"
        ).length,
        unconcentrated: isi.countries.filter(
          (c) => c.classification === "unconcentrated"
        ).length,
      }
    : null;

  return (
    <div className="bg-white">
      {/* ══════════════════════════════════════════════════════
          HERO — Full-bleed, institutional authority
         ══════════════════════════════════════════════════════ */}
      <section className="bg-navy-900">
        <div className="mx-auto max-w-[1400px] px-6 py-16 lg:px-16 lg:py-20">
          <h1 className="font-serif text-[40px] font-bold leading-[1.15] tracking-tight text-white">
            Sovereignty is structure.
            <br />
            We measure it.
          </h1>
          <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-stone-300" style={{ textWrap: "balance" }}>
            The International Sovereignty Index quantifies external dependency
            concentration across EU-27 member states using a{" "}
            Herfindahl-Hirschman framework applied to{" "}
            {axes?.length ?? "all"} strategic axes of sovereign exposure.
          </p>
          <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-stone-400" style={{ textWrap: "balance" }}>
            This is not a risk score. It is a structural measurement —
            a precise rendering of how concentrated each nation&rsquo;s
            external dependencies are, across energy, finance, defense,
            technology, critical inputs, and logistics.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <a
              href="#map"
              className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-2.5 text-[14px] font-medium text-navy-900 transition-colors hover:bg-stone-100"
            >
              Explore the Map
              <span aria-hidden="true">↓</span>
            </a>
            {isi && (
              <span className="text-[13px] font-mono text-stone-500">
                {isi.version} · {isi.window} ·{" "}
                {isi.countries_complete}/{isi.countries_total} countries
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          ANALYTICAL CORE — Constrained width
         ══════════════════════════════════════════════════════ */}
      <div className="mx-auto max-w-[1400px] px-6 lg:px-16">

        {/* ── Errors ───────────────────────────────────────── */}
        {(isiError || axesError) && (
          <div className="mt-16 space-y-4">
            {isiError && (
              <ErrorPanel
                title="Backend Unavailable — ISI Composite"
                message={isiError.message}
                endpoint={isiError.endpoint}
                status={isiError.status}
              />
            )}
            {axesError && (
              <ErrorPanel
                title="Backend Unavailable — Axis Registry"
                message={axesError.message}
                endpoint={axesError.endpoint}
                status={axesError.status}
              />
            )}
          </div>
        )}

        {/* ── Section 1: EU Choropleth Map ─────────────── */}
        {isi && (
          <section id="map" className="mt-14 scroll-mt-8">
            <h2 className="font-serif text-[26px] font-semibold tracking-tight text-text-primary">
              EU-27 Structural Exposure
            </h2>
            <p className="mt-1.5 text-[14px] text-text-tertiary">
              Composite ISI scores mapped across {isi.countries_complete} member
              states. Click any country for full axis-level detail.
            </p>
            <div className="mt-6">
              <EUMap
                countries={isi.countries}
                mean={isi.statistics.mean}
              />
            </div>
          </section>
        )}

        {/* ── Section 2: Structural Outliers ───────────────── */}
        {isi && (
          <section className="mt-14">
            <OutliersPanel
              countries={isi.countries}
              mean={isi.statistics.mean}
            />
          </section>
        )}

        {/* ── Section 3: Composite Statistics KPIs ─────────── */}
        {isi && (
          <section className="mt-14">
            <h2 className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-quaternary">
              Executive Summary
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <KPICard
                label="Countries Scored"
                value={`${isi.countries_complete} / ${isi.countries_total}`}
                subtitle="EU-27 scope"
                variant="highlight"
              />
              <KPICard
                label="Composite Mean"
                value={formatScore(isi.statistics.mean)}
                subtitle="EU-27 average"
              />
              <KPICard
                label="Composite Median"
                value={median !== null ? median.toFixed(4) : "—"}
                subtitle="EU-27 midpoint"
              />
              <KPICard
                label="Std Deviation"
                value={stdDev !== null ? stdDev.toFixed(4) : "—"}
                subtitle="Cross-EU dispersion"
              />
              <KPICard
                label="Range"
                value={spread ?? "—"}
                subtitle={`${formatScore(isi.statistics.min)} → ${formatScore(isi.statistics.max)}`}
              />
              <KPICard
                label="Aggregation"
                value={isi.aggregation_rule
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase())}
                subtitle={isi.formula}
              />
            </div>
          </section>
        )}

        {/* ── Section 4: Distribution Histogram ────────────── */}
        {isi && distribution && (
          <section className="mt-14">
            <h2 className="font-serif text-[26px] font-semibold tracking-tight text-text-primary">
              Composite Score Distribution
            </h2>
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-text-tertiary">
              Distribution of ISI composite scores across EU-27 member states.
              Vertical bands indicate HHI classification thresholds.
            </p>
            <div className="mt-6 rounded-md border border-border-primary p-6">
              <DistributionHistogram
                scores={compositeScores}
                mean={isi.statistics.mean}
                median={median}
                binCount={20}
                height={240}
              />
              {/* Classification counts */}
              <div className="mt-6 grid gap-4 sm:grid-cols-4">
                {(
                  [
                    {
                      key: "highly_concentrated" as const,
                      count: distribution.highly,
                      color: "border-l-band-highly",
                    },
                    {
                      key: "moderately_concentrated" as const,
                      count: distribution.moderately,
                      color: "border-l-band-moderately",
                    },
                    {
                      key: "mildly_concentrated" as const,
                      count: distribution.mildly,
                      color: "border-l-band-mildly",
                    },
                    {
                      key: "unconcentrated" as const,
                      count: distribution.unconcentrated,
                      color: "border-l-band-unconcentrated",
                    },
                  ] as const
                ).map(({ key, count, color }) => (
                  <div
                    key={key}
                    className={`border-l-2 ${color} pl-4`}
                  >
                    <p className="font-mono text-[20px] font-medium text-text-primary">
                      {count}
                    </p>
                    <p className="mt-0.5 text-[12px] text-text-quaternary">
                      {classificationLabel(key)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Section 5: Interpretation Guide ──────────────── */}
        <section className="mt-12">
          <h3 className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-quaternary">
            Reading the Index
          </h3>
          <div className="mt-4 text-[14px] leading-relaxed text-text-secondary">
            <p>
              The ISI measures <strong>external dependency concentration</strong>{" "}
              across {axes?.length ?? "all"} strategic axes using a{" "}
              <strong>Herfindahl-Hirschman Index (HHI)</strong>{" "}
              framework. Scores range from 0 (perfectly diversified) to 1
              (total concentration on a single source).
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {[
                { threshold: "≥ 0.50", label: "Highly Concentrated", desc: "Critical dependency on one or very few external sources.", border: "border-l-band-highly" },
                { threshold: "0.25–0.49", label: "Moderately Concentrated", desc: "Significant concentration across a small number of sources.", border: "border-l-band-moderately" },
                { threshold: "0.15–0.24", label: "Mildly Concentrated", desc: "Moderate spread, but notable concentration remains.", border: "border-l-band-mildly" },
                { threshold: "< 0.15", label: "Unconcentrated", desc: "Broadly distributed across many external sources.", border: "border-l-band-unconcentrated" },
              ].map(({ threshold, label, desc, border }) => (
                <div key={label} className={`border-l-2 ${border} py-2 pl-3 pr-4`}>
                  <p className="text-[13px] font-medium text-text-secondary">
                    {threshold} — {label}
                  </p>
                  <p className="mt-0.5 text-[12px] text-text-tertiary">
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 6: Country Rankings (interactive) ─────── */}
        {isi && axes && (
          <section className="mt-14">
            <h2 className="font-serif text-[26px] font-semibold tracking-tight text-text-primary">
              Country Rankings
            </h2>
            <p className="mt-1.5 text-[14px] text-text-tertiary">
              Sortable rankings across all assessed EU-27 member states.
            </p>
            <div className="mt-6">
              <CountryRankingsTable
                countries={isi.countries}
                axes={axes}
                mean={isi.statistics.mean}
              />
            </div>
          </section>
        )}

        {/* ── Section 7: Axis Registry ─────────────────────── */}
        {axes && (
          <section className="mt-14">
            <h2 className="font-serif text-[26px] font-semibold tracking-tight text-text-primary">
              Axis Registry
            </h2>
            <p className="mt-1.5 text-[14px] text-text-tertiary">
              {axes.length} strategic axes of external dependency, each composed
              of discrete data channels.
            </p>
            <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {axes.map((axis) => (
                <Link key={axis.id} href={axisHref(axis.slug)} className="block">
                  <AxisCard axis={axis} />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Section 8: Scope & Limitations ──────────────── */}
        <section className="mt-14 mb-16 border-l-2 border-l-stone-300 py-4 pl-5 pr-6">
          <h3 className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-quaternary">
            Scope &amp; Limitations
          </h3>
          <ul className="mt-3 space-y-2 text-[14px] text-text-secondary">
            <li>
              <strong>Not a risk score.</strong> The ISI quantifies concentration
              of external dependencies, not the risk or quality of those
              dependencies.
            </li>
            <li>
              <strong>Not a policy recommendation.</strong> High concentration
              may be economically rational in some contexts.
            </li>
            <li>
              <strong>EU-27 scope only.</strong> Non-EU countries are not
              assessed.
            </li>
            <li>
              <strong>Unweighted composite.</strong> The aggregation treats all
              axes equally. Domain weighting is outside scope.
            </li>
          </ul>
          <p className="mt-4 text-[13px] text-text-tertiary">
            See{" "}
            <Link
              href="/methodology"
              className="underline hover:text-text-primary"
            >
              Methodology
            </Link>{" "}
            and{" "}
            <Link
              href="/transparency"
              className="underline hover:text-text-primary"
            >
              Transparency
            </Link>{" "}
            for full details.
          </p>
        </section>
      </div>
    </div>
  );
}
