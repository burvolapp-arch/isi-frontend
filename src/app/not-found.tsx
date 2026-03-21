import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto flex max-w-[1400px] flex-col items-center justify-center px-4 py-24 text-center sm:px-6 lg:px-16">
        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-text-quaternary">
          Page Not Found
        </p>
        <h2 className="mt-3 font-serif text-[72px] font-bold leading-none tracking-tight text-text-primary">
          404
        </h2>
        <p className="mt-4 max-w-md text-[14px] leading-relaxed text-text-tertiary">
          The resource you requested does not exist or has been relocated.
          If you arrived here via a saved link, the URL may have changed.
        </p>
        <div className="mt-8 flex items-center gap-3">
          <Link
            href="/"
            className="rounded-md bg-btn-solid-bg px-5 py-2.5 text-[13px] font-medium text-btn-solid-fg transition-colors hover:bg-btn-solid-bg-hover"
          >
            Back to Overview
          </Link>
          <Link
            href="/methodology"
            className="rounded-md border border-border-primary px-5 py-2.5 text-[13px] font-medium text-text-secondary transition-colors hover:bg-surface-tertiary"
          >
            Methodology
          </Link>
        </div>
      </main>
    </div>
  );
}
