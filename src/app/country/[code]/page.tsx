import Link from "next/link";
import { fetchCountry, fetchISI, ApiError } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { KPICard } from "@/components/KPICard";
import { ErrorPanel } from "@/components/ErrorPanel";
import {
  formatScore,
  computePercentile,
  extractCompositeScores,
  deviationFromMean,
  axisHref,
} from "@/lib/format";
import type {
  CountryDetail,
  CountryAxisDetail,
  ChannelDetail,
  Warning,
} from "@/lib/types";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function CountryPage({ params }: PageProps) {
  const { code } = await params;
  const upperCode = code.toUpperCase();

  let country: CountryDetail | null = null;
  let error: { message: string; endpoint: string; status?: number } | null =
    null;

  // Fetch country detail + ISI composite (for percentile)
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
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <main className="mx-auto max-w-7xl px-6 py-8">
          <Link
            href="/"
            className="text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            ← Back to Overview
          </Link>
          <ErrorPanel
            title={`Failed to load country ${upperCode}`}
            message={error?.message ?? "Unknown error"}
            endpoint={error?.endpoint}
            status={error?.status}
          />
        </main>
      </div>
    );
  }

  // Compute percentile from ISI composite data
  const allScores = isi ? extractCompositeScores(isi.countries) : [];
  const percentile =
    country.isi_composite !== null && allScores.length > 0
      ? computePercentile(country.isi_composite, allScores)
      : null;

  // Identify strengths (lowest HHI) and vulnerabilities (highest HHI)
  const scoredAxes = country.axes
    .filter((a) => a.score !== null)
    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0));
  const strengths = scoredAxes.slice(0, 2);
  const vulnerabilities = scoredAxes.slice(-2).reverse();

  const compositeMean = isi?.statistics.mean ?? null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        {/* ── Breadcrumb ────────────────────────────────────── */}
        <div>
          <Link
            href="/"
            className="text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            ← Back to Overview
          </Link>
        </div>

        {/* ── Country Header ────────────────────────────────── */}
        <section>
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {country.country_name}
            </h1>
            <span className="font-mono text-sm text-zinc-400">
              {country.country}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {country.version} · {country.window} ·{" "}
            {country.axes_available}/{country.axes_required} axes available
          </p>
        </section>

        {/* ── Composite KPI Row ─────────────────────────────── */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Composite Score
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <KPICard
              label="ISI Composite"
              value={formatScore(country.isi_composite)}
              variant="highlight"
            />
            <div className="flex items-center rounded-lg border border-zinc-200 bg-white px-5 dark:border-zinc-800 dark:bg-zinc-950">
              <StatusBadge classification={country.isi_classification} />
            </div>
            <KPICard
              label="EU-27 Percentile"
              value={percentile !== null ? `P${percentile}` : "—"}
              subtitle={
                percentile !== null
                  ? `More concentrated than ${percentile}% of EU-27`
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
        </section>

        {/* ── Strengths & Vulnerabilities ───────────────────── */}
        {scoredAxes.length >= 2 && (
          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-green-200 bg-green-50 p-5 dark:border-green-900 dark:bg-green-950">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-green-600 dark:text-green-400">
                Most Diversified Axes (Lowest HHI)
              </h3>
              <div className="mt-3 space-y-2">
                {strengths.map((a) => (
                  <div key={a.axis_id} className="flex items-center justify-between">
                    <Link
                      href={axisHref(a.axis_slug)}
                      className="text-sm font-medium text-green-800 hover:underline dark:text-green-200"
                    >
                      {a.axis_name}
                    </Link>
                    <span className="font-mono text-sm text-green-700 dark:text-green-300">
                      {formatScore(a.score)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
                Most Concentrated Axes (Highest HHI)
              </h3>
              <div className="mt-3 space-y-2">
                {vulnerabilities.map((a) => (
                  <div key={a.axis_id} className="flex items-center justify-between">
                    <Link
                      href={axisHref(a.axis_slug)}
                      className="text-sm font-medium text-red-800 hover:underline dark:text-red-200"
                    >
                      {a.axis_name}
                    </Link>
                    <span className="font-mono text-sm text-red-700 dark:text-red-300">
                      {formatScore(a.score)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Axis Contribution Breakdown ───────────────────── */}
        <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Axis Contributions to Composite
          </h2>
          <p className="mb-4 text-xs text-zinc-400">
            Each bar shows the axis HHI score. The composite is an unweighted
            arithmetic mean of all {country.axes_required} axes.
          </p>
          <div className="space-y-3">
            {country.axes.map((axis) => {
              const dev = deviationFromMean(axis.score, compositeMean);
              return (
                <div key={axis.axis_id} className="flex items-center gap-3">
                  <Link
                    href={axisHref(axis.axis_slug)}
                    className="w-32 shrink-0 text-sm font-medium text-zinc-700 hover:text-blue-600 hover:underline dark:text-zinc-300 dark:hover:text-blue-400"
                  >
                    {axis.axis_name}
                  </Link>
                  <div className="flex-1">
                    <div className="h-5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                      {axis.score !== null && (
                        <div
                          className={`h-full rounded-full transition-all ${
                            (axis.score ?? 0) >= 0.5
                              ? "bg-red-500"
                              : (axis.score ?? 0) >= 0.25
                                ? "bg-orange-500"
                                : (axis.score ?? 0) >= 0.15
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                          }`}
                          style={{ width: `${Math.min(axis.score * 100, 100)}%` }}
                        />
                      )}
                    </div>
                  </div>
                  <span className="w-16 shrink-0 text-right font-mono text-sm text-zinc-600 dark:text-zinc-400">
                    {formatScore(axis.score)}
                  </span>
                  <span className="w-20 shrink-0 text-right text-xs text-zinc-400">
                    {dev !== null
                      ? `${dev >= 0 ? "+" : ""}${dev.toFixed(4)}`
                      : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Per-Axis Details ──────────────────────────────── */}
        {country.axes.map((axis) => (
          <AxisSection key={axis.axis_id} axis={axis} />
        ))}
      </main>
    </div>
  );
}

// ─── Axis Section Sub-Component ────────────────────────────────────

function AxisSection({ axis }: { axis: CountryAxisDetail }) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              Axis {axis.axis_id} — {axis.axis_slug}
            </p>
            <h3 className="mt-1 text-base font-semibold text-zinc-900 dark:text-zinc-100">
              <Link
                href={axisHref(axis.axis_slug)}
                className="hover:text-blue-600 hover:underline dark:hover:text-blue-400"
              >
                {axis.axis_name}
              </Link>
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {formatScore(axis.score)}
            </span>
            <StatusBadge classification={axis.classification} />
          </div>
        </div>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {axis.driver_statement}
        </p>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Audit breakdown */}
        {axis.audit && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Audit Breakdown
            </h4>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {Object.entries(axis.audit).map(([key, val]) => (
                <div
                  key={key}
                  className="rounded border border-zinc-100 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <p className="text-xs text-zinc-400">
                    {key.replace(/_/g, " ")}
                  </p>
                  <p className="font-mono text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {typeof val === "number" ? val.toFixed(4) : val}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Channels with partners */}
        {axis.channels && axis.channels.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Channels
            </h4>
            <div className="mt-2 space-y-3">
              {axis.channels.map((ch: ChannelDetail) => (
                <ChannelBlock key={ch.channel_id} channel={ch} />
              ))}
            </div>
          </div>
        )}

        {/* Fuel concentrations (Axis 2 only) */}
        {axis.fuel_concentrations && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Fuel Concentrations
            </h4>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {Object.entries(axis.fuel_concentrations).map(([fuel, hhi]) => (
                <div
                  key={fuel}
                  className="rounded border border-zinc-100 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <p className="text-xs capitalize text-zinc-400">
                    {fuel.replace(/_/g, " ")}
                  </p>
                  <p className="font-mono text-sm font-medium text-zinc-700 dark:text-zinc-300">
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
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Warnings
            </h4>
            <ul className="mt-2 space-y-1">
              {axis.warnings.map((w: Warning) => (
                <li
                  key={w.id}
                  className="text-xs text-zinc-500 dark:text-zinc-500"
                >
                  <span
                    className={`mr-1 font-semibold ${
                      w.severity === "HIGH"
                        ? "text-red-600 dark:text-red-400"
                        : w.severity === "MEDIUM"
                          ? "text-orange-600 dark:text-orange-400"
                          : "text-zinc-400"
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
    <div className="rounded border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Ch. {channel.channel_id}: {channel.channel_name}
        </p>
        {channel.total_partners != null && (
          <span className="text-xs text-zinc-400">
            {channel.total_partners} partners
          </span>
        )}
      </div>
      <p className="text-xs text-zinc-400">{channel.source}</p>

      {/* Top partners */}
      {channel.top_partners && channel.top_partners.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-medium text-zinc-400">Top Partners</p>
          <div className="mt-1 space-y-1">
            {channel.top_partners.map((p, i) => (
              <div
                key={`${p.partner}-${i}`}
                className="flex items-center justify-between"
              >
                <span className="text-xs text-zinc-600 dark:text-zinc-400">
                  {p.partner}
                </span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${(p.share * 100).toFixed(1)}%` }}
                    />
                  </div>
                  <span className="w-14 text-right font-mono text-xs text-zinc-500">
                    {(p.share * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subcategories */}
      {channel.subcategories && channel.subcategories.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-medium text-zinc-400">Subcategories</p>
          <div className="mt-1 overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-zinc-400">
                  <th className="pr-3 text-left font-medium">Category</th>
                  <th className="pr-3 text-right font-medium">HHI</th>
                  <th className="text-right font-medium">Volume</th>
                </tr>
              </thead>
              <tbody>
                {channel.subcategories.map((s, i) => (
                  <tr
                    key={`${s.category}-${i}`}
                    className="text-zinc-600 dark:text-zinc-400"
                  >
                    <td className="pr-3 py-0.5">{s.category}</td>
                    <td className="pr-3 py-0.5 text-right font-mono">
                      {s.concentration.toFixed(4)}
                    </td>
                    <td className="py-0.5 text-right font-mono">
                      {s.volume !== undefined
                        ? s.volume.toLocaleString()
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
