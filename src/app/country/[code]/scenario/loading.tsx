export default function ScenarioLoading() {
  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-[1400px] space-y-8 px-6 py-10 lg:px-16">
        <div className="h-4 w-48 animate-pulse bg-surface-tertiary" />
        <div className="space-y-3">
          <div className="h-10 w-72 animate-pulse bg-surface-tertiary" />
          <div className="h-4 w-96 animate-pulse bg-surface-tertiary" />
        </div>
        {/* Baseline KPIs */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-md border border-border-primary bg-surface-tertiary"
            />
          ))}
        </div>
        {/* Axis controls */}
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-md border border-border-primary bg-surface-tertiary"
            />
          ))}
        </div>
        {/* Radar + results */}
        <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
          <div className="h-64 animate-pulse rounded-md border border-border-primary bg-surface-tertiary" />
          <div className="space-y-3">
            <div className="h-24 animate-pulse rounded-md border border-border-primary bg-surface-tertiary" />
            <div className="h-24 animate-pulse rounded-md border border-border-primary bg-surface-tertiary" />
          </div>
        </div>
      </main>
    </div>
  );
}
