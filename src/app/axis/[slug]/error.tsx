"use client";

import Link from "next/link";

export default function AxisError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-surface-secondary">
      <main className="mx-auto max-w-[1520px] px-6 py-12 lg:px-20">
        <Link
          href="/"
          className="text-[13px] text-text-tertiary hover:text-text-primary"
        >
          ← Back to Overview
        </Link>
        <div className="mt-8 max-w-xl border-l-2 border-l-severity-high bg-severity-high/5 p-8">
          <h2 className="font-serif text-[22px] font-semibold text-text-primary">
            Failed to load axis
          </h2>
          <p className="mt-3 text-[15px] text-text-tertiary">
            {error.message}
          </p>
          <button
            onClick={reset}
            className="mt-6 bg-surface-inverse px-5 py-2.5 text-[14px] font-medium text-text-inverse hover:opacity-90"
          >
            Try again
          </button>
        </div>
      </main>
    </div>
  );
}
