"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ISI] Unhandled error:", error.digest ?? error.message);
  }, [error]);
  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto flex max-w-[1400px] flex-col items-center justify-center px-6 py-24 lg:px-16">
        <div className="mx-auto w-full max-w-lg rounded-md border border-border-primary bg-surface-tertiary p-6 sm:p-8">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-quaternary">
            Application Error
          </p>
          <h2 className="mt-2 font-serif text-[22px] font-semibold text-text-primary">
            Something went wrong
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-text-tertiary">
            {error.message || "An unexpected error occurred while processing your request."}
          </p>
          {error.digest && (
            <p className="mt-2 rounded bg-stone-100 px-2.5 py-1 font-mono text-[11px] text-text-quaternary inline-block">
              Ref: {error.digest}
            </p>
          )}
          <div className="mt-6 flex gap-3">
            <button
              onClick={reset}
              className="rounded-md bg-navy-900 px-5 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-navy-800"
            >
              Try again
            </button>
            <Link
              href="/"
              className="rounded-md border border-border-primary px-5 py-2.5 text-[13px] font-medium text-text-secondary transition-colors hover:bg-stone-50"
            >
              Back to Overview
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
