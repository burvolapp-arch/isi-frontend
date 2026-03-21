"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import type { PaperMeta } from "@/lib/papers";
import { generateAPA, generateChicago, generateBibTeX } from "@/lib/papers";

type CitationFormat = "apa" | "chicago" | "bibtex";

const FORMAT_LABELS: Record<CitationFormat, string> = {
  apa: "APA 7th",
  chicago: "Chicago 17th",
  bibtex: "BibTeX",
};

interface CitationBlockProps {
  paper: PaperMeta;
}

export function CitationBlock({ paper }: CitationBlockProps) {
  const [format, setFormat] = useState<CitationFormat>("apa");
  const [copied, setCopied] = useState<"single" | "all" | false>(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Cleanup timeout on unmount
  useEffect(() => () => clearTimeout(copyTimerRef.current), []);

  const anchorId = `cite-${paper.id}`;

  const citations = useMemo(
    () => ({
      apa: generateAPA(paper),
      chicago: generateChicago(paper),
      bibtex: generateBibTeX(paper),
    }),
    [paper],
  );

  const activeCitation = citations[format];

  const copyToClipboard = useCallback(async (text: string, kind: "single" | "all") => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(kind);
    clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleCopySingle = useCallback(() => {
    copyToClipboard(activeCitation, "single");
  }, [activeCitation, copyToClipboard]);

  const handleCopyAll = useCallback(() => {
    const allText = [
      `APA 7th:\n${citations.apa}`,
      `Chicago 17th:\n${citations.chicago}`,
      `BibTeX:\n${citations.bibtex}`,
    ].join("\n\n");
    copyToClipboard(allText, "all");
  }, [citations, copyToClipboard]);

  return (
    <div id={anchorId} className="scroll-mt-24 rounded-md border border-border-primary bg-surface-tertiary">
      {/* ── Header bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-primary px-4 py-2.5">
        {/* Format tabs */}
        <div className="flex gap-1" role="tablist" aria-label="Citation format">
          {(Object.keys(FORMAT_LABELS) as CitationFormat[]).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={format === key}
              onClick={() => setFormat(key)}
              className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                format === key
                  ? "bg-surface-primary text-text-primary shadow-[var(--shadow-card-sm)]"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              {FORMAT_LABELS[key]}
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5">
          {/* Permalink */}
          <a
            href={`#${anchorId}`}
            className="rounded p-1.5 text-text-quaternary transition-colors hover:bg-surface-primary hover:text-text-secondary hover:shadow-[var(--shadow-card-sm)]"
            title="Permalink to this citation"
            aria-label="Permalink to citation"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
            </svg>
          </a>

          {/* Copy all formats */}
          <button
            type="button"
            onClick={handleCopyAll}
            className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-text-quaternary transition-colors hover:bg-surface-primary hover:text-text-secondary hover:shadow-[var(--shadow-card-sm)]"
            aria-label="Copy all citation formats"
            title="Copy all formats"
          >
            {copied === "all" ? (
              <>
                <svg className="h-3.5 w-3.5 text-confirm" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                <span className="hidden text-confirm sm:inline">All Copied</span>
              </>
            ) : (
              <>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5A3.375 3.375 0 0 0 6.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0 0 15 2.25h-1.5a2.251 2.251 0 0 0-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 0 0-9-9Z" />
                </svg>
                <span className="hidden sm:inline">Copy All</span>
              </>
            )}
          </button>

          {/* Copy active format */}
          <button
            type="button"
            onClick={handleCopySingle}
            className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-text-tertiary transition-colors hover:bg-surface-primary hover:text-text-primary hover:shadow-[var(--shadow-card-sm)]"
            aria-label={`Copy ${FORMAT_LABELS[format]} citation`}
          >
            {copied === "single" ? (
              <>
                <svg className="h-3.5 w-3.5 text-confirm" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                <span className="text-confirm">Copied</span>
              </>
            ) : (
              <>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                </svg>
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Citation text ── */}
      <div className="px-4 py-3">
        <pre className="whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-text-tertiary sm:break-normal sm:text-[12px]">
          {activeCitation}
        </pre>
      </div>
    </div>
  );
}
