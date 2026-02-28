"use client";

import { useState, useCallback } from "react";
import type { PaperMeta } from "@/lib/papers";
import { RESEARCH_PATH, formatPaperDate } from "@/lib/papers";
import { CitationBlock } from "@/components/CitationBlock";
import { PdfPreview } from "@/components/PdfPreview";

interface PaperFileInfo {
  filename: string;
  lang: string;
  label: string;
  exists: boolean;
  sizeFormatted?: string;
}

interface PaperCardProps {
  paper: PaperMeta;
  /** Per-file existence/size info, keyed by filename */
  fileInfos: PaperFileInfo[];
}

export function PaperCard({
  paper,
  fileInfos,
}: PaperCardProps) {
  const [abstractOpen, setAbstractOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const primaryPdfUrl = `${RESEARCH_PATH}/${paper.filename}`;
  const formattedDate = formatPaperDate(paper.publicationDate);
  const primaryFileInfo = fileInfos.find((f) => f.filename === paper.filename);
  const hasPdf = fileInfos.some((f) => f.exists);

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
          {/* File size badges — one per language */}
          {fileInfos.filter((f) => f.exists && f.sizeFormatted).map((f) => (
            <span key={f.filename} className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              PDF · {f.sizeFormatted}{fileInfos.filter((x) => x.exists).length > 1 ? ` (${f.lang.toUpperCase()})` : ""}
            </span>
          ))}
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
          {hasPdf ? (
            <>
              {/* Download buttons — one per language file */}
              {fileInfos.filter((f) => f.exists).map((f) => (
                <a
                  key={f.filename}
                  href={`${RESEARCH_PATH}/${f.filename}`}
                  download
                  className="inline-flex items-center gap-2 rounded-md border border-navy-700 bg-navy-700 px-4 py-2 text-[12px] font-medium text-white transition-colors hover:bg-navy-800"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Download PDF{fileInfos.filter((x) => x.exists).length > 1 ? ` (${f.label})` : ""}
                  {f.sizeFormatted && (
                    <span className="text-[10px] opacity-70">({f.sizeFormatted})</span>
                  )}
                </a>
              ))}

              {/* Open in new tab (primary file only) */}
              <a
                href={primaryPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-border-primary bg-white px-4 py-2 text-[12px] font-medium text-text-secondary transition-colors hover:bg-stone-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
                Open in New Tab
              </a>

              {/* Preview toggle */}
              <button
                type="button"
                onClick={() => setPreviewOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-md border border-border-primary bg-white px-4 py-2 text-[12px] font-medium text-text-secondary transition-colors hover:bg-stone-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
                {previewOpen ? "Hide Preview" : "Preview Document"}
              </button>
            </>
          ) : (
            <div className="rounded-md border border-stone-200 bg-stone-50 px-4 py-2.5 text-[12px] text-text-quaternary">
              PDF not yet available for this paper.
            </div>
          )}
        </div>

        {/* ── Inline PDF preview ── */}
        {previewOpen && hasPdf && (
          <div className="mt-6">
            <PdfPreview src={primaryPdfUrl} title={paper.title} />
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
