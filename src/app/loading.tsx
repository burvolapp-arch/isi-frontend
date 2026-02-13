export default function RootLoading() {
  return (
    <div className="min-h-screen bg-surface-secondary">
      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        {/* KPI skeleton */}
        <div className="space-y-4">
          <div className="h-4 w-40 animate-pulse bg-border-primary" />
          <div className="grid grid-cols-2 gap-px bg-border-primary sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse bg-surface-tertiary"
              />
            ))}
          </div>
        </div>

        {/* Table skeleton */}
        <div className="space-y-4">
          <div className="h-4 w-48 animate-pulse bg-border-primary" />
          <div className="h-96 animate-pulse border border-border-primary bg-surface-tertiary" />
        </div>
      </main>
    </div>
  );
}
