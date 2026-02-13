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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <Link
          href="/"
          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          ← Back to Overview
        </Link>
        <div className="mt-6 rounded-lg border-2 border-red-300 bg-red-50 p-8 text-center dark:border-red-800 dark:bg-red-950">
          <h2 className="text-xl font-bold text-red-800 dark:text-red-200">
            Failed to load axis
          </h2>
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            {error.message}
          </p>
          <button
            onClick={reset}
            className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      </main>
    </div>
  );
}
