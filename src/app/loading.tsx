export default function RootLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        {/* KPI skeleton */}
        <div className="space-y-4">
          <div className="h-4 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
              />
            ))}
          </div>
        </div>

        {/* Table skeleton */}
        <div className="space-y-4">
          <div className="h-4 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-96 animate-pulse rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900" />
        </div>
      </main>
    </div>
  );
}
