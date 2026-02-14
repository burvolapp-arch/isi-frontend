import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-[1400px] px-6 py-20 text-center lg:px-16">
        <h2 className="font-serif text-[56px] font-bold text-text-primary">
          404
        </h2>
        <p className="mt-2 text-[14px] text-text-tertiary">
          The page you requested could not be found.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-md border border-border-primary bg-surface-tertiary px-4 py-2.5 text-[13px] font-medium text-text-secondary transition-colors hover:bg-stone-100"
        >
          Back to Overview
        </Link>
      </main>
    </div>
  );
}
