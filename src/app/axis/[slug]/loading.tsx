export default function AxisLoading() {
  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-[1400px] px-6 py-10 lg:px-16 space-y-8">
        <div className="h-4 w-32 animate-pulse bg-surface-tertiary" />
        <div className="space-y-3">
          <div className="h-4 w-24 animate-pulse bg-surface-tertiary" />
          <div className="h-10 w-56 animate-pulse bg-surface-tertiary" />
          <div className="h-4 w-full max-w-md animate-pulse bg-surface-tertiary" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-md border border-border-primary bg-surface-tertiary"
            />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-md border border-border-primary bg-surface-tertiary" />
      </main>
    </div>
  );
}
