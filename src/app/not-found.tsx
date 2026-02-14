import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface-secondary">
      <main className="mx-auto max-w-[1520px] px-6 py-24 text-center lg:px-20">
        <h2 className="font-serif text-[64px] font-bold text-text-primary">
          404
        </h2>
        <p className="mt-3 text-[15px] text-text-tertiary">
          The page you requested could not be found.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block bg-surface-tertiary/60 px-5 py-3 text-[14px] font-medium text-text-secondary transition-colors hover:bg-stone-100"
        >
          Back to Overview
        </Link>
      </main>
    </div>
  );
}
