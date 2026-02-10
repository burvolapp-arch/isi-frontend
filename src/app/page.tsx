import { fetchISI, fetchAxes, ApiError } from "@/lib/api";
import { KPICard } from "@/components/KPICard";
import { CountryTable } from "@/components/CountryTable";
import { AxisCard } from "@/components/AxisCard";
import { ErrorPanel } from "@/components/ErrorPanel";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let isiError: { message: string; endpoint: string; status?: number } | null =
    null;
  let axesError: { message: string; endpoint: string; status?: number } | null =
    null;

  const [isiResult, axesResult] = await Promise.allSettled([
    fetchISI(),
    fetchAxes(),
  ]);

  // Extract data or errors
  const isi =
    isiResult.status === "fulfilled" ? isiResult.value : null;
  const axes =
    axesResult.status === "fulfilled" ? axesResult.value : null;

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

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black">
        <div className="mx-auto max-w-7xl px-6 py-5">
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            ISI — International Sovereignty Index
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            EU-27 Dependency Analysis Dashboard
            {isi && (
              <span className="ml-2 font-mono text-xs">
                {isi.version} · {isi.window}
              </span>
            )}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        {/* Errors */}
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

        {/* KPI Cards */}
        {isi && (
          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Composite Statistics
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <KPICard
                label="Countries Scored"
                value={`${isi.countries_complete} / ${isi.countries_total}`}
                subtitle="EU-27 scope"
                variant="highlight"
              />
              <KPICard
                label="Composite Min"
                value={
                  isi.statistics.min !== null
                    ? isi.statistics.min.toFixed(4)
                    : "—"
                }
                subtitle="Least concentrated"
              />
              <KPICard
                label="Composite Max"
                value={
                  isi.statistics.max !== null
                    ? isi.statistics.max.toFixed(4)
                    : "—"
                }
                subtitle="Most concentrated"
              />
              <KPICard
                label="Composite Mean"
                value={
                  isi.statistics.mean !== null
                    ? isi.statistics.mean.toFixed(4)
                    : "—"
                }
                subtitle="EU-27 average"
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

        {/* Country Rankings Table */}
        {isi && (
          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Country Rankings
            </h2>
            <CountryTable countries={isi.countries} />
          </section>
        )}

        {/* Axis Registry */}
        {axes && (
          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Axis Registry — {axes.length} Axes
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {axes.map((axis) => (
                <AxisCard key={axis.id} axis={axis} />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <p className="text-xs text-zinc-400">
            Panargus / ISI Frontend — Pure rendering layer. All data from
            backend API.
          </p>
        </div>
      </footer>
    </div>
  );
}
