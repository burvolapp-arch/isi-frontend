import Link from "next/link";
import { fetchISI, fetchAxes, ApiError } from "@/lib/api";
import { KPICard } from "@/components/KPICard";
import { CountryRankingsTable } from "@/components/CountryRankingsTable";
import { AxisCard } from "@/components/AxisCard";
import { ErrorPanel } from "@/components/ErrorPanel";
import {
  formatScore,
  classificationLabel,
  extractCompositeScores,
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
  const spread =
    isi !== null &&
    isi.statistics.max !== null &&
    isi.statistics.min !== null
      ? (isi.statistics.max - isi.statistics.min).toFixed(4)
      : null;

  // Distribution buckets (for the inline distribution bar)
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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <main className="mx-auto max-w-7xl px-6 py-8 space-y-10">
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
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                Executive Summary
              </h2>
              <span className="font-mono text-xs text-zinc-400">
                {isi.version} · {isi.window}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <KPICard
                label="Countries Scored"
                value={`${isi.countries_complete} / ${isi.countries_total}`}
                subtitle="EU-27 scope"
                variant="highlight"
              />
              <KPICard
                label="Composite Min"
                value={formatScore(isi.statistics.min)}
                subtitle="Least concentrated"
              />
              <KPICard
                label="Composite Max"
                value={formatScore(isi.statistics.max)}
                subtitle="Most concentrated"
              />
              <KPICard
                label="Composite Mean"
                value={formatScore(isi.statistics.mean)}
                subtitle="EU-27 average"
              />
              <KPICard
                label="Spread (Max − Min)"
                value={spread ?? "—"}
                subtitle="Range of composite"
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

        {/* ── Section 2: Distribution Overview ─────────────── */}
        {distribution && isi && (
          <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Classification Distribution
            </h2>
            <div className="grid gap-4 sm:grid-cols-4">
              {(
                [
                  {
                    key: "highly_concentrated" as const,
                    count: distribution.highly,
                    color: "bg-red-500",
                  },
                  {
                    key: "moderately_concentrated" as const,
                    count: distribution.moderately,
                    color: "bg-orange-500",
                  },
                  {
                    key: "mildly_concentrated" as const,
                    count: distribution.mildly,
                    color: "bg-yellow-500",
                  },
                  {
                    key: "unconcentrated" as const,
                    count: distribution.unconcentrated,
                    color: "bg-green-500",
                  },
                ] as const
              ).map(({ key, count, color }) => (
                <div key={key} className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${color}`} />
                  <div>
                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                      {count}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {classificationLabel(key)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {/* Stacked bar */}
            <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              {compositeScores.length > 0 && (
                <>
                  <div
                    className="bg-red-500"
                    style={{
                      width: `${(distribution.highly / isi.countries_total) * 100}%`,
                    }}
                  />
                  <div
                    className="bg-orange-500"
                    style={{
                      width: `${(distribution.moderately / isi.countries_total) * 100}%`,
                    }}
                  />
                  <div
                    className="bg-yellow-500"
                    style={{
                      width: `${(distribution.mildly / isi.countries_total) * 100}%`,
                    }}
                  />
                  <div
                    className="bg-green-500"
                    style={{
                      width: `${(distribution.unconcentrated / isi.countries_total) * 100}%`,
                    }}
                  />
                </>
              )}
            </div>
          </section>
        )}

        {/* ── Section 3: Interpretation Guide ──────────────── */}
        <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Reading the Index
          </h2>
          <div className="prose prose-sm max-w-none text-zinc-600 dark:prose-invert dark:text-zinc-400">
            <p>
              The ISI measures <strong>external dependency concentration</strong>{" "}
              across {axes?.length ?? 6} strategic axes using a{" "}
              <strong>
                Herfindahl-Hirschman Index (HHI)
              </strong>{" "}
              framework. Scores range from 0 (perfectly diversified) to 1
              (total concentration on a single source).
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900 dark:bg-red-950">
                <p className="text-xs font-semibold text-red-700 dark:text-red-300">
                  ≥ 0.50 — Highly Concentrated
                </p>
                <p className="text-xs text-red-600 dark:text-red-400">
                  Critical dependency on one or very few external sources.
                </p>
              </div>
              <div className="rounded border border-orange-200 bg-orange-50 px-3 py-2 dark:border-orange-900 dark:bg-orange-950">
                <p className="text-xs font-semibold text-orange-700 dark:text-orange-300">
                  0.25–0.49 — Moderately Concentrated
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-400">
                  Significant concentration across a small number of sources.
                </p>
              </div>
              <div className="rounded border border-yellow-200 bg-yellow-50 px-3 py-2 dark:border-yellow-900 dark:bg-yellow-950">
                <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-300">
                  0.15–0.24 — Mildly Concentrated
                </p>
                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                  Moderate spread, but notable concentration remains.
                </p>
              </div>
              <div className="rounded border border-green-200 bg-green-50 px-3 py-2 dark:border-green-900 dark:bg-green-950">
                <p className="text-xs font-semibold text-green-700 dark:text-green-300">
                  &lt; 0.15 — Unconcentrated
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  Broadly distributed across many external sources.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 4: Country Rankings (interactive) ─────── */}
        {isi && axes && (
          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
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
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Axis Registry — {axes.length} Axes
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {axes.map((axis) => (
                <Link key={axis.id} href={axisHref(axis.slug)} className="block">
                  <AxisCard axis={axis} />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Section 6: What This Index Does NOT Measure ──── */}
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Scope &amp; Limitations
          </h2>
          <ul className="space-y-2 text-sm text-amber-700 dark:text-amber-300">
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
          <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
            See{" "}
            <Link
              href="/methodology"
              className="underline hover:text-amber-800 dark:hover:text-amber-200"
            >
              Methodology
            </Link>{" "}
            and{" "}
            <Link
              href="/transparency"
              className="underline hover:text-amber-800 dark:hover:text-amber-200"
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
