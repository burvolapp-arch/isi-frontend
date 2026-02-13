export default function AxisLoading() {
  return (
    <div className="min-h-screen bg-surface-secondary">
      <main className="mx-auto max-w-7xl px-6 py-10 space-y-8">
        <div className="h-4 w-32 animate-pulse bg-border-primary" />
        <div className="space-y-2">
          <div className="h-4 w-24 animate-pulse bg-border-primary" />
          <div className="h-8 w-56 animate-pulse bg-border-primary" />
          <div className="h-4 w-full max-w-md animate-pulse bg-border-primary" />
        </div>
        <div className="grid grid-cols-2 gap-px bg-border-primary sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse bg-surface-tertiary"
            />
          ))}
        </div>
        <div className="h-64 animate-pulse border border-border-primary bg-surface-tertiary" />
      </main>
    </div>
  );
}
