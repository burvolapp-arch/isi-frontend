import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchAxes, fetchAxis, ApiError } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { KPICard } from "@/components/KPICard";
import { ErrorPanel } from "@/components/ErrorPanel";
import { formatScore, countryHref } from "@/lib/format";
import type { AxisDetail, AxisCountryEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

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
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <main className="mx-auto max-w-7xl px-6 py-8">
          <Link
            href="/"
            className="text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            ← Back to Overview
          </Link>
          <ErrorPanel
            title={`Failed to resolve axis "${slug}"`}
            message={registryError ?? "Axis not found in registry"}
            endpoint="/axes"
          />
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
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <main className="mx-auto max-w-7xl px-6 py-8">
          <Link
            href="/"
            className="text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            ← Back to Overview
          </Link>
          <ErrorPanel
            title={`Failed to load axis ${slug}`}
            message={error?.message ?? "Unknown error"}
            endpoint={error?.endpoint}
            status={error?.status}
          />
        </main>
      </div>
    );
  }

  // Sort countries by score descending for the rankings
  const ranked = [...axis.countries]
    .filter((c): c is AxisCountryEntry & { score: number } => c.score !== null)
    .sort((a, b) => b.score - a.score);

  const outlierHigh = ranked.length > 0 ? ranked[0] : null;
  const outlierLow = ranked.length > 0 ? ranked[ranked.length - 1] : null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        {/* Breadcrumb */}
        <div>
          <Link
            href="/"
            className="text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            ← Back to Overview
          </Link>
        </div>

        {/* ── Axis Header ──────────────────────────────────── */}
        <section>
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
            Axis {axis.axis_id} — {axis.axis_slug}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {axis.axis_name}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {axis.description}
          </p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-400">
            <span>Version: {axis.version}</span>
            <span>Status: {axis.status}</span>
            <span>Unit: {axis.unit}</span>
            <span>
              Materialized:{" "}
              {axis.materialized ? (
                <span className="text-green-600 dark:text-green-400">Yes</span>
              ) : (
                <span className="text-zinc-500">No</span>
              )}
            </span>
          </div>
        </section>

        {/* ── KPI Row ──────────────────────────────────────── */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Cross-EU Statistics
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
          </div>
        </section>

        {/* ── Data Sources (Channels) ──────────────────────── */}
        <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Data Sources &amp; Channels
          </h2>
          <p className="mb-4 text-xs text-zinc-400">
            This axis is computed from {axis.channels.length} data
            channel(s). Each channel represents a distinct trade-flow or
            dependency dataset.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {axis.channels.map((ch) => (
              <div
                key={ch.id}
                className="rounded border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Ch. {ch.id}: {ch.name}
                </p>
                <p className="mt-0.5 text-xs text-zinc-400">{ch.source}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Warnings / Known Limitations ─────────────────── */}
        {axis.warnings.length > 0 && (
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Known Limitations &amp; Warnings
            </h2>
            <ul className="space-y-2">
              {axis.warnings.map((w) => (
                <li key={w.id} className="text-sm text-amber-700 dark:text-amber-300">
                  <span
                    className={`mr-1.5 font-semibold ${
                      w.severity === "HIGH"
                        ? "text-red-600 dark:text-red-400"
                        : w.severity === "MEDIUM"
                          ? "text-orange-600 dark:text-orange-400"
                          : "text-amber-500"
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

        {/* ── Distribution Bar ─────────────────────────────── */}
        <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Score Distribution Across EU-27
          </h2>
          <div className="space-y-2">
            {ranked.map((c) => (
              <div key={c.country} className="flex items-center gap-3">
                <Link
                  href={countryHref(c.country)}
                  className="w-28 shrink-0 text-xs font-medium text-zinc-700 hover:text-blue-600 hover:underline dark:text-zinc-300 dark:hover:text-blue-400"
                >
                  {c.country_name}
                </Link>
                <div className="flex-1">
                  <div className="h-4 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className={`h-full rounded-full ${
                        c.score >= 0.5
                          ? "bg-red-500"
                          : c.score >= 0.25
                            ? "bg-orange-500"
                            : c.score >= 0.15
                              ? "bg-yellow-500"
                              : "bg-green-500"
                      }`}
                      style={{ width: `${Math.min(c.score * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <span className="w-16 shrink-0 text-right font-mono text-xs text-zinc-600 dark:text-zinc-400">
                  {formatScore(c.score)}
                </span>
                <span className="w-24 shrink-0">
                  <StatusBadge classification={c.classification} />
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Country Rankings Table ────────────────────────── */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Country Rankings — {axis.axis_name}
          </h2>
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
              <thead className="bg-zinc-50 dark:bg-zinc-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Rank
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Country
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Score
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Classification
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
                {ranked.map((c, i) => (
                  <tr
                    key={c.country}
                    className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  >
                    <td className="whitespace-nowrap px-4 py-2.5 text-sm text-zinc-400">
                      {i + 1}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-sm">
                      <Link
                        href={countryHref(c.country)}
                        className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {c.country_name}
                      </Link>
                      <span className="ml-1.5 text-xs text-zinc-400">
                        {c.country}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                      {formatScore(c.score)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-center">
                      <StatusBadge classification={c.classification} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
