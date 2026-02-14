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
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-[1400px] px-6 py-20 text-center lg:px-16">
        <div className="mx-auto max-w-xl rounded-md border border-border-primary bg-surface-tertiary p-6 text-left">
          <h2 className="font-serif text-[20px] font-semibold text-text-primary">
            Something went wrong
          </h2>
          <p className="mt-2 text-[14px] text-text-tertiary">
            {error.message || "An unexpected error occurred."}
          </p>
          {error.digest && (
            <p className="mt-1 font-mono text-[11px] text-text-quaternary">
              Digest: {error.digest}
            </p>
          )}
          <div className="mt-5 flex gap-3">
            <button
              onClick={reset}
              className="bg-surface-inverse px-4 py-2 text-[13px] font-medium text-text-inverse hover:opacity-90"
            >
              Try again
            </button>
            <Link
              href="/"
              className="rounded-md border border-border-primary px-4 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:bg-stone-100"
            >
              Back to Overview
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
