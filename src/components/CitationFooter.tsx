// ============================================================================
// CitationFooter — Reusable ISI citation component
// ============================================================================
// Renders a standardized institutional citation block for inclusion
// on dataset, country, research, and press pages.
//
// Server component — no client-side interactivity.
// ============================================================================

const CITATION_TEXT =
  'Drazsky, S., & International Sovereignty Institute. (2026). ' +
  'International Sovereignty Index (ISI) — EU-27 Founding Cohort (v1.0). ' +
  'Zenodo. https://doi.org/10.5281/zenodo.18764170';

const DOI_URL = "https://doi.org/10.5281/zenodo.18764170";

interface CitationFooterProps {
  /** Optional: override the default citation text */
  citation?: string;
  /** Optional: show/hide the DOI link */
  showDoi?: boolean;
  /** Optional: compact mode for inline use */
  compact?: boolean;
}

export function CitationFooter({
  citation = CITATION_TEXT,
  showDoi = true,
  compact = false,
}: CitationFooterProps) {
  if (compact) {
    return (
      <p className="text-[11px] leading-relaxed text-text-quaternary">
        <span className="font-medium">Cite:</span>{" "}
        <span className="font-mono">{citation}</span>
      </p>
    );
  }

  return (
    <div className="rounded-md border border-border-primary bg-surface-tertiary p-4 sm:p-5">
      <h4 className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
        Citation
      </h4>
      <p className="mt-2 font-mono text-[11px] leading-relaxed text-text-tertiary sm:text-[12px]">
        {citation}
      </p>
      {showDoi && (
        <p className="mt-2 text-[11px] text-text-quaternary">
          DOI:{" "}
          <a
            href={DOI_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono underline hover:text-text-secondary"
          >
            10.5281/zenodo.18764170
          </a>
        </p>
      )}
    </div>
  );
}
