"use client";

import { useState, useCallback } from "react";
import type { PaperMeta } from "@/lib/papers";
import { paperPdfPath, formatPaperDate } from "@/lib/papers";
import { CitationBlock } from "@/components/CitationBlock";
import { PdfPreview } from "@/components/PdfPreview";
import { PdfUploadZone } from "@/components/PdfUploadZone";

interface PaperCardProps {
  paper: PaperMeta;
  pdfExists: boolean;
  /** Human-readable file size, e.g. "2.4 MB" — computed server-side */
  fileSize?: string;
}

export function PaperCard({
  paper,
  pdfExists: initialPdfExists,
  fileSize,
}: PaperCardProps) {
  const [abstractOpen, setAbstractOpen] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [pdfExists, setPdfExists] = useState(initialPdfExists);

  const pdfUrl = paperPdfPath(paper);
  const formattedDate = formatPaperDate(paper.publicationDate);

  const handleUploadComplete = useCallback(() => {
    setPdfExists(true);
    setShowAdmin(false);
  }, []);

  return (
    <article
      id={paper.id}
      className="scroll-mt-20 rounded-lg border border-border-primary bg-white transition-[border-color] hover:border-stone-300"
      aria-labelledby={`title-${paper.id}`}
    >
      <div className="p-6 sm:p-8">
        {/* ── Series label + badges ── */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-navy-700/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-navy-700">
            ISI Paper Series No. {paper.seriesNumber}
          </span>
          <span className="rounded bg-navy-700/5 px-2 py-0.5 text-[10px] font-medium text-navy-600">
            {paper.badge}
          </span>
          <span className="rounded bg-surface-tertiary px-2 py-0.5 text-[10px] font-medium text-text-quaternary">
            {paper.version}
          </span>
        </div>

        {/* ── Title ── */}
        <h2
          id={`title-${paper.id}`}
          className="mt-4 font-serif text-[24px] font-semibold leading-snug tracking-tight text-text-primary sm:text-[28px]"
        >
          {paper.title}
        </h2>

        {/* ── Subtitle ── */}
        <p className="mt-1.5 text-[15px] text-text-tertiary">
          {paper.subtitle}
        </p>

        {/* ── Meta row ── */}
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border-primary pt-5 text-[12px] text-text-quaternary">
          <span className="flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
            {paper.authors.join(", ")}
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
            {formattedDate}
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 0h.008v.008h-.008V7.5Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
            </svg>
            {paper.institution}
          </span>
          {paper.pageCount > 0 && (
            <span className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              {paper.pageCount} pages
            </span>
          )}
          {fileSize && (
            <span className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              PDF · {fileSize}
            </span>
          )}
        </div>

        {/* ── DOI ── */}
        {paper.doiVersion ? (
          <div className="mt-4 flex flex-col gap-1">
            <span className="flex items-center gap-1.5 text-[12px]">
              <span className="font-medium text-text-quaternary">DOI:</span>
              <a
                href={`https://doi.org/${paper.doiVersion}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-navy-700 underline hover:text-navy-900"
                aria-label={`DOI for ${paper.title}`}
              >
                https://doi.org/{paper.doiVersion}
                <svg className="mb-0.5 ml-1 inline-block h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </a>
            </span>
            {paper.doiConcept && (
              <span className="flex items-center gap-1.5 text-[11px] text-text-quaternary">
                <span className="font-medium">Concept DOI (all versions):</span>
                <a
                  href={`https://doi.org/${paper.doiConcept}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-text-tertiary"
                  aria-label={`Concept DOI for all versions of ${paper.title}`}
                >
                  https://doi.org/{paper.doiConcept}
                </a>
              </span>
            )}
          </div>
        ) : (
          <p className="mt-4 text-[12px] italic text-text-quaternary">DOI pending</p>
        )}

        {/* ── Abstract ── */}
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setAbstractOpen((v) => !v)}
            className="flex items-center gap-1.5 text-[13px] font-medium text-text-secondary transition-colors hover:text-text-primary"
            aria-expanded={abstractOpen}
            aria-controls={`abstract-${paper.id}`}
          >
            <svg
              className={`h-3.5 w-3.5 text-text-quaternary transition-transform duration-200 ${abstractOpen ? "rotate-90" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
            Abstract
          </button>
          {abstractOpen && (
            <div
              id={`abstract-${paper.id}`}
              className="mt-3 rounded-md border border-border-primary bg-surface-tertiary px-5 py-4"
            >
              <p className="text-[14px] leading-[1.8] text-text-tertiary">
                {paper.abstract}
              </p>
            </div>
          )}
        </div>

        {/* ── Actions ── */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {pdfExists ? (
            <>
              <a
                href={pdfUrl}
                download
                className="inline-flex items-center gap-2 rounded-md border border-navy-700 bg-navy-700 px-4 py-2 text-[12px] font-medium text-white transition-colors hover:bg-navy-800"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download PDF
                {fileSize && (
                  <span className="text-[10px] opacity-70">({fileSize})</span>
                )}
              </a>
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-border-primary bg-white px-4 py-2 text-[12px] font-medium text-text-secondary transition-colors hover:bg-stone-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
                Open in New Tab
              </a>
            </>
          ) : (
            <div className="rounded-md border border-stone-200 bg-stone-50 px-4 py-2.5 text-[12px] text-text-quaternary">
              PDF not yet available for this paper.
            </div>
          )}

          {/* ── Admin toggle (demoted) ── */}
          <div className="ml-auto">
            <button
              type="button"
              onClick={() => setShowAdmin((v) => !v)}
              className="inline-flex items-center gap-1 rounded px-2.5 py-1.5 text-[11px] text-text-quaternary transition-colors hover:bg-stone-50 hover:text-text-tertiary"
              title="Admin: Upload or replace PDF"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
              {showAdmin ? "Hide" : "Admin"}
            </button>
          </div>
        </div>

        {/* ── Upload zone (admin-only) ── */}
        {showAdmin && (
          <div className="mt-4 rounded-md border border-dashed border-stone-300 bg-stone-50/50 p-4">
            <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.14em] text-text-quaternary">
              Administrative — Upload / Replace PDF
            </p>
            <PdfUploadZone
              paperId={paper.id}
              paperTitle={paper.title}
              existingPath={`/public/research/${paper.filename}`}
              onUploadComplete={handleUploadComplete}
            />
          </div>
        )}

        {/* ── Inline PDF preview ── */}
        {pdfExists && (
          <div className="mt-6">
            <PdfPreview src={pdfUrl} title={paper.title} />
          </div>
        )}

        {/* ── Citation ── */}
        <div className="mt-6 border-t border-border-primary pt-6">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-quaternary">
            Cite This Paper
          </p>
          <CitationBlock paper={paper} />
        </div>
      </div>
    </article>
  );
}
