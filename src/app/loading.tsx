export default function RootLoading() {
  return (
    <div className="min-h-screen bg-surface-secondary">
      <main className="mx-auto max-w-[1520px] px-6 py-12 lg:px-20 space-y-10">
        {/* KPI skeleton */}
        <div className="space-y-4">
          <div className="h-4 w-40 animate-pulse bg-surface-tertiary" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse bg-surface-tertiary/60"
              />
            ))}
          </div>
        </div>

        {/* Table skeleton */}
        <div className="space-y-4">
          <div className="h-4 w-48 animate-pulse bg-surface-tertiary" />
          <div className="h-96 animate-pulse bg-surface-tertiary/60" />
        </div>
      </main>
    </div>
  );
}
