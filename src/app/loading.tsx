export default function RootLoading() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6 lg:px-16 space-y-10">
        {/* Header skeleton */}
        <div className="space-y-3">
          <div className="h-8 w-64 rounded skeleton-shimmer" />
          <div className="h-4 w-96 max-w-full rounded skeleton-shimmer" />
        </div>

        {/* KPI skeleton */}
        <div className="space-y-4">
          <div className="h-3 w-28 rounded skeleton-shimmer" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-md border border-border-primary bg-surface-tertiary p-4"
              >
                <div className="h-2.5 w-16 rounded skeleton-shimmer" />
                <div className="mt-3 h-6 w-20 rounded skeleton-shimmer" />
                <div className="mt-2 h-2 w-24 rounded skeleton-shimmer" />
              </div>
            ))}
          </div>
        </div>

        {/* Map skeleton */}
        <div className="space-y-4">
          <div className="h-6 w-56 rounded skeleton-shimmer" />
          <div className="h-3 w-80 max-w-full rounded skeleton-shimmer" />
          <div className="aspect-[16/10] rounded-lg border border-border-primary skeleton-shimmer" />
        </div>

        {/* Table skeleton */}
        <div className="space-y-4">
          <div className="h-5 w-48 rounded skeleton-shimmer" />
          <div className="h-3 w-72 rounded skeleton-shimmer" />
          <div className="rounded-md border border-border-primary overflow-hidden">
            <div className="h-10 skeleton-shimmer" />
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-4 border-t border-border-subtle px-4 py-3">
                <div className="h-3 w-8 rounded skeleton-shimmer" />
                <div className="h-3 w-24 rounded skeleton-shimmer" />
                <div className="h-3 w-16 rounded skeleton-shimmer ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
