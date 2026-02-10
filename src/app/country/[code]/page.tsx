import Link from "next/link";
import { fetchCountry, ApiError } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { KPICard } from "@/components/KPICard";
import { ErrorPanel } from "@/components/ErrorPanel";
import type { CountryDetail, ChannelDetail, Warning } from "@/lib/types";

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

  try {
    country = await fetchCountry(upperCode);
  } catch (err) {
    error = {
      message: err instanceof Error ? err.message : String(err),
      endpoint: `/country/${upperCode}`,
      status: err instanceof ApiError ? err.status : undefined,
    };
  }

  if (error || !country) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black">
          <div className="mx-auto max-w-7xl px-6 py-5">
            <Link
              href="/"
              className="text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              ← Back to Dashboard
            </Link>
            <h1 className="mt-2 text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Country: {upperCode}
            </h1>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-8">
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

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black">
        <div className="mx-auto max-w-7xl px-6 py-5">
          <Link
            href="/"
            className="text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            ← Back to Dashboard
          </Link>
          <div className="mt-2 flex items-baseline gap-3">
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
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
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        {/* Composite KPI */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Composite Score
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <KPICard
              label="ISI Composite"
              value={
                country.isi_composite !== null
                  ? country.isi_composite.toFixed(4)
                  : "—"
              }
              variant="highlight"
            />
            <div className="flex items-center rounded-lg border border-zinc-200 bg-white px-5 dark:border-zinc-800 dark:bg-zinc-950">
              <StatusBadge classification={country.isi_classification} />
            </div>
            <KPICard
              label="Axes Coverage"
              value={`${country.axes_available} / ${country.axes_required}`}
            />
          </div>
        </section>

        {/* Per-Axis Details */}
        {country.axes.map((axis) => (
          <section
            key={axis.axis_id}
            className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                    Axis {axis.axis_id} — {axis.axis_slug}
                  </p>
                  <h3 className="mt-1 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    {axis.axis_name}
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    {axis.score !== null ? axis.score.toFixed(4) : "—"}
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
                    {Object.entries(axis.fuel_concentrations).map(
                      ([fuel, hhi]) => (
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
                      )
                    )}
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
        ))}
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <p className="text-xs text-zinc-400">
            Panargus / ISI Frontend — Country detail for {country.country_name}.
            All data from backend API.
          </p>
        </div>
      </footer>
    </div>
  );
}

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
