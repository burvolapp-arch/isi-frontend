"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ScenarioError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ISI] Scenario error:", error.digest ?? error.message);
  }, [error]);

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
            Scenario Laboratory Error
          </h2>
          <p className="mt-2 text-[14px] text-text-tertiary">
            {error.message}
          </p>
          {error.digest && (
            <p className="mt-1 font-mono text-[11px] text-text-quaternary">
              Digest: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            className="mt-4 rounded-md border border-border-primary bg-white px-4 py-2 text-[13px] font-medium text-text-secondary hover:bg-stone-50"
          >
            Retry
          </button>
        </div>
      </main>
    </div>
  );
}
