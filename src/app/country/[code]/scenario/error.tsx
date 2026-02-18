"use client";

/** Minimal error boundary — this route redirects immediately. */
export default function ScenarioError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <p className="text-[14px] text-text-secondary">
        Redirect failed.{" "}
        <button
          onClick={reset}
          className="underline hover:text-text-primary"
        >
          Retry
        </button>
      </p>
    </div>
  );
}
