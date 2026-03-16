"use client";

import { useState } from "react";

interface PdfPreviewProps {
  src: string;
  title: string;
}

export function PdfPreview({ src, title }: PdfPreviewProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-md border border-border-primary bg-surface-primary">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-[13px] font-medium text-text-secondary transition-colors hover:text-text-primary"
        aria-expanded={expanded}
        aria-controls={`pdf-preview-${title.replace(/\s+/g, "-").toLowerCase()}`}
      >
        <span className="flex items-center gap-2">
          <svg className="h-4 w-4 text-text-quaternary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
          {expanded ? "Hide Preview" : "Preview Document"}
        </span>
        <svg
          className={`h-4 w-4 text-text-quaternary transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {expanded && (
        <div
          id={`pdf-preview-${title.replace(/\s+/g, "-").toLowerCase()}`}
          className="border-t border-border-primary"
        >
          <iframe
            src={`${src}#toolbar=1&navpanes=0&scrollbar=1`}
            title={`Preview: ${title}`}
            className="h-[600px] w-full sm:h-[750px]"
            loading="lazy"
          />
        </div>
      )}
    </div>
  );
}
