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
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-[1400px] px-6 py-10 lg:px-16">
        <Link
          href="/"
          className="text-[13px] text-text-tertiary hover:text-text-primary"
        >
          ← Back to Overview
        </Link>
        <div className="mt-6 max-w-xl rounded-md border border-border-primary bg-surface-tertiary p-6">
          <h2 className="font-serif text-[20px] font-semibold text-text-primary">
            Failed to load axis
          </h2>
          <p className="mt-2 text-[14px] text-text-tertiary">
            {error.message}
          </p>
          <button
            onClick={reset}
            className="mt-5 bg-surface-inverse px-4 py-2 text-[13px] font-medium text-text-inverse hover:opacity-90"
          >
            Try again
          </button>
        </div>
      </main>
    </div>
  );
}
