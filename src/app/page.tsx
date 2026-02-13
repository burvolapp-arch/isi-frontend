import Link from "next/link";
import { fetchISI, fetchAxes, ApiError } from "@/lib/api";
import { KPICard } from "@/components/KPICard";
import { CountryRankingsTable } from "@/components/CountryRankingsTable";
import { AxisCard } from "@/components/AxisCard";
import { ErrorPanel } from "@/components/ErrorPanel";
import { DistributionHistogram } from "@/components/DistributionHistogram";
import {
  formatScore,
  classificationLabel,
  extractCompositeScores,
  computeMedian,
  computeStdDev,
  axisHref,
} from "@/lib/format";

export const dynamic = "force-dynamic";

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
    <div className="min-h-screen bg-surface-secondary">
      <main className="mx-auto max-w-7xl px-6 py-10 space-y-10">
        {/* ── Errors ───────────────────────────────────────── */}
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

        {/* ── Section 1: Composite Statistics KPIs ─────────── */}
        {isi && (
          <section>
            <div className="mb-5 flex items-baseline justify-between">
              <h2 className="text-[13px] font-semibold uppercase tracking-wider text-text-quaternary">
                Executive Summary
              </h2>
              <span className="font-mono text-[11px] text-text-quaternary">
                {isi.version} · {isi.window}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-px bg-border-primary sm:grid-cols-3 lg:grid-cols-6">
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

        {/* ── Section 2: Distribution Histogram ────────────── */}
        {isi && distribution && (
          <section className="border border-border-primary bg-surface-primary p-6">
            <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-text-quaternary">
              Composite Score Distribution
            </h2>
            <p className="mb-4 text-xs text-text-quaternary">
              Distribution of ISI composite scores across EU-27 member states.
              Vertical bands indicate HHI classification thresholds.
            </p>
            <DistributionHistogram
              scores={compositeScores}
              mean={isi.statistics.mean}
              median={median}
              binCount={20}
              height={220}
            />
            {/* Classification counts */}
            <div className="mt-4 grid gap-4 sm:grid-cols-4">
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
                  className={`border-l-4 ${color} pl-3`}
                >
                  <p className="text-lg font-semibold text-text-primary">
                    {count}
                  </p>
                  <p className="text-[11px] text-text-quaternary">
                    {classificationLabel(key)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Section 3: Interpretation Guide ──────────────── */}
        <section className="border border-border-primary bg-surface-primary p-6">
          <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-text-quaternary">
            Reading the Index
          </h2>
          <div className="text-sm leading-relaxed text-text-secondary">
            <p>
              The ISI measures <strong>external dependency concentration</strong>{" "}
              across {axes?.length ?? "all"} strategic axes using a{" "}
              <strong>Herfindahl-Hirschman Index (HHI)</strong>{" "}
              framework. Scores range from 0 (perfectly diversified) to 1
              (total concentration on a single source).
            </p>
            <div className="mt-4 grid gap-px bg-border-primary sm:grid-cols-2">
              {[
                { threshold: "≥ 0.50", label: "Highly Concentrated", desc: "Critical dependency on one or very few external sources.", border: "border-l-band-highly" },
                { threshold: "0.25–0.49", label: "Moderately Concentrated", desc: "Significant concentration across a small number of sources.", border: "border-l-band-moderately" },
                { threshold: "0.15–0.24", label: "Mildly Concentrated", desc: "Moderate spread, but notable concentration remains.", border: "border-l-band-mildly" },
                { threshold: "< 0.15", label: "Unconcentrated", desc: "Broadly distributed across many external sources.", border: "border-l-band-unconcentrated" },
              ].map(({ threshold, label, desc, border }) => (
                <div key={label} className={`border-l-4 ${border} bg-surface-primary p-3`}>
                  <p className="text-xs font-semibold text-text-secondary">
                    {threshold} — {label}
                  </p>
                  <p className="mt-0.5 text-[11px] text-text-tertiary">
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 4: Country Rankings (interactive) ─────── */}
        {isi && axes && (
          <section>
            <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-wider text-text-quaternary">
              Country Rankings
            </h2>
            <CountryRankingsTable
              countries={isi.countries}
              axes={axes}
              mean={isi.statistics.mean}
            />
          </section>
        )}

        {/* ── Section 5: Axis Registry ─────────────────────── */}
        {axes && (
          <section>
            <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-wider text-text-quaternary">
              Axis Registry — {axes.length} Axes
            </h2>
            <div className="grid gap-px bg-border-primary md:grid-cols-2 lg:grid-cols-3">
              {axes.map((axis) => (
                <Link key={axis.id} href={axisHref(axis.slug)} className="block">
                  <AxisCard axis={axis} />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Section 6: Scope & Limitations ──────────────── */}
        <section className="border-l-4 border-l-severity-low bg-severity-low/5 p-6">
          <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-severity-low">
            Scope &amp; Limitations
          </h2>
          <ul className="space-y-2 text-sm text-text-secondary">
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
          <p className="mt-3 text-xs text-text-tertiary">
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
      </main>
    </div>
  );
}
