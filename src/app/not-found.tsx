import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface-secondary">
      <main className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h2 className="text-3xl font-bold text-text-primary">
          404
        </h2>
        <p className="mt-2 text-sm text-text-tertiary">
          The page you requested could not be found.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block border border-border-primary bg-surface-primary px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary"
        >
          Back to Overview
        </Link>
      </main>
    </div>
  );
}
