"use client";

/**
 * Global Error Boundary — catches errors in the root layout itself.
 * This is the last resort before Next.js shows its generic error page.
 * Renders a minimal, self-contained page (no layout, no providers).
 * Supports dark mode via prefers-color-scheme media query.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #ffffff; color: #111827; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
              .ge-wrap { max-width: 480px; padding: 2rem; text-align: center; }
              .ge-label { font-size: 10px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.14em; color: #9ca3af; }
              .ge-title { margin-top: 8px; font-size: 22px; font-weight: 600; color: #111827; }
              .ge-msg { margin-top: 12px; font-size: 14px; line-height: 1.6; color: #6b7280; }
              .ge-digest { display: block; margin-top: 8px; font-family: monospace; font-size: 11px; color: #9ca3af; }
              .ge-actions { margin-top: 24px; display: flex; justify-content: center; gap: 12px; }
              .ge-btn { padding: 8px 20px; font-size: 13px; font-weight: 500; border-radius: 4px; cursor: pointer; border: none; }
              .ge-btn-primary { color: #fff; background: #0b2545; }
              .ge-btn-secondary { color: #4b5563; background: transparent; border: 1px solid #d1d5db; text-decoration: none; display: inline-flex; align-items: center; }
              @media (prefers-color-scheme: dark) {
                body { background: #0f1724; color: #e5e7eb; }
                .ge-title { color: #e5e7eb; }
                .ge-msg { color: #8892a2; }
                .ge-label { color: #5f697a; }
                .ge-digest { color: #5f697a; }
                .ge-btn-primary { background: #3b82f6; color: #fff; }
                .ge-btn-secondary { color: #b0b8c4; border-color: #374357; }
              }
            `,
          }}
        />
      </head>
      <body>
        <div className="ge-wrap">
          <p className="ge-label">Application Error</p>
          <h1 className="ge-title">Something went wrong</h1>
          <p className="ge-msg">
            A critical error occurred while loading the application.
            {error.digest && (
              <span className="ge-digest">Digest: {error.digest}</span>
            )}
          </p>
          <div className="ge-actions">
            <button onClick={reset} className="ge-btn ge-btn-primary">
              Try again
            </button>
            <a href="/" className="ge-btn ge-btn-secondary">
              Return home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
