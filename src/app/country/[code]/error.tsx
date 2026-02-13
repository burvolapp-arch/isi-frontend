"use client";

import Link from "next/link";

export default function CountryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-surface-secondary">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <Link
          href="/"
          className="text-sm text-text-tertiary hover:text-text-primary"
        >
          ← Back to Overview
        </Link>
        <div className="mt-6 border-l-4 border-l-severity-high border border-border-primary bg-surface-primary p-8 text-center">
          <h2 className="text-xl font-bold text-text-primary">
            Failed to load country
          </h2>
          <p className="mt-2 text-sm text-text-tertiary">
            {error.message}
          </p>
          <button
            onClick={reset}
            className="mt-4 border border-border-primary bg-surface-inverse px-4 py-2 text-sm font-medium text-text-inverse hover:opacity-90"
          >
            Try again
          </button>
        </div>
      </main>
    </div>
  );
}
