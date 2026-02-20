export default function RootLoading() {
  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-[1400px] px-6 py-10 lg:px-16 space-y-10">
        {/* Header skeleton */}
        <div className="space-y-3">
          <div className="h-8 w-64 animate-pulse rounded bg-stone-100" />
          <div className="h-4 w-96 max-w-full animate-pulse rounded bg-stone-50" />
        </div>

        {/* KPI skeleton */}
        <div className="space-y-4">
          <div className="h-3 w-28 animate-pulse rounded bg-stone-100" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-md border border-border-primary bg-surface-tertiary p-4"
              >
                <div className="h-2.5 w-16 animate-pulse rounded bg-stone-200" />
                <div className="mt-3 h-6 w-20 animate-pulse rounded bg-stone-100" />
                <div className="mt-2 h-2 w-24 animate-pulse rounded bg-stone-50" />
              </div>
            ))}
          </div>
        </div>

        {/* Table skeleton */}
        <div className="space-y-4">
          <div className="h-5 w-48 animate-pulse rounded bg-stone-100" />
          <div className="h-3 w-72 animate-pulse rounded bg-stone-50" />
          <div className="rounded-md border border-border-primary overflow-hidden">
            <div className="h-10 bg-stone-100 animate-pulse" />
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-4 border-t border-border-subtle px-4 py-3">
                <div className="h-3 w-8 animate-pulse rounded bg-stone-100" />
                <div className="h-3 w-24 animate-pulse rounded bg-stone-100" />
                <div className="h-3 w-16 animate-pulse rounded bg-stone-50 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
