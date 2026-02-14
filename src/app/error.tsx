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
      <main className="mx-auto max-w-[1520px] px-6 py-24 text-center lg:px-20">
        <div className="mx-auto max-w-xl border-l-2 border-l-severity-high bg-severity-high/5 p-8 text-left">
          <h2 className="font-serif text-[22px] font-semibold text-text-primary">
            Something went wrong
          </h2>
          <p className="mt-3 text-[15px] text-text-tertiary">
            {error.message || "An unexpected error occurred."}
          </p>
          {error.digest && (
            <p className="mt-1 font-mono text-[12px] text-text-quaternary">
              Digest: {error.digest}
            </p>
          )}
          <div className="mt-6 flex gap-4">
            <button
              onClick={reset}
              className="bg-surface-inverse px-5 py-2.5 text-[14px] font-medium text-text-inverse hover:opacity-90"
            >
              Try again
            </button>
            <Link
              href="/"
              className="bg-surface-tertiary/60 px-5 py-2.5 text-[14px] font-medium text-text-secondary transition-colors hover:bg-stone-100"
            >
              Back to Overview
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
