"use client";

import Link from "next/link";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-surface-secondary">
      <main className="mx-auto max-w-3xl px-6 py-16 text-center">
        <div className="border-l-4 border-l-severity-high border border-border-primary bg-surface-primary p-8">
          <h2 className="text-xl font-bold text-text-primary">
            Something went wrong
          </h2>
          <p className="mt-2 text-sm text-text-tertiary">
            {error.message || "An unexpected error occurred."}
          </p>
          {error.digest && (
            <p className="mt-1 font-mono text-xs text-text-quaternary">
              Digest: {error.digest}
            </p>
          )}
          <div className="mt-6 flex justify-center gap-4">
            <button
              onClick={reset}
              className="border border-border-primary bg-surface-inverse px-4 py-2 text-sm font-medium text-text-inverse hover:opacity-90"
            >
              Try again
            </button>
            <Link
              href="/"
              className="border border-border-primary bg-surface-primary px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary"
            >
              Back to Overview
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
