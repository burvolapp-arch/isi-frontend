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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <main className="mx-auto max-w-3xl px-6 py-16 text-center">
        <div className="rounded-lg border-2 border-red-300 bg-red-50 p-8 dark:border-red-800 dark:bg-red-950">
          <h2 className="text-xl font-bold text-red-800 dark:text-red-200">
            Something went wrong
          </h2>
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            {error.message || "An unexpected error occurred."}
          </p>
          {error.digest && (
            <p className="mt-1 font-mono text-xs text-red-400">
              Digest: {error.digest}
            </p>
          )}
          <div className="mt-6 flex justify-center gap-4">
            <button
              onClick={reset}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Try again
            </button>
            <Link
              href="/"
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Back to Overview
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
