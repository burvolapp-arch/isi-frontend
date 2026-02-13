import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <main className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          404
        </h2>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          The page you requested could not be found.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-md bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Back to Overview
        </Link>
      </main>
    </div>
  );
}
