import Link from "next/link";
import type { Metadata } from "next";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { PAPERS } from "@/lib/papers";
import { formatFileSize, paperPdfPath } from "@/lib/papers";
import { PaperCard } from "@/components/PaperCard";

export const metadata: Metadata = {
  title: "Research & Publications",
  description:
    "ISI Paper Series — peer-reviewed research papers on the construction, methodology, and empirical application of the International Sovereignty Index.",
  alternates: {
    canonical: "/research",
  },
  openGraph: {
    title: "Research & Publications — ISI",
    description:
      "ISI Paper Series — methodological foundations and empirical results of the International Sovereignty Index.",
    url: "https://isi.internationalsovereignty.org/research",
    type: "website",
  },
};

interface PdfInfo {
  exists: boolean;
  sizeFormatted?: string;
  sizeBytes?: number;
}

function getPdfInfo(filename: string): PdfInfo {
  const filePath = join(process.cwd(), "public", "research", filename);
  if (!existsSync(filePath)) return { exists: false };
  try {
    const stats = statSync(filePath);
    return {
      exists: true,
      sizeFormatted: formatFileSize(stats.size),
      sizeBytes: stats.size,
    };
  } catch {
    return { exists: true };
  }
}

export default function ResearchPage() {
  const sortedPapers = [...PAPERS].sort((a, b) => {
    const dateDiff = new Date(b.publicationDate).getTime() - new Date(a.publicationDate).getTime();
    if (dateDiff !== 0) return dateDiff;
    return b.seriesNumber - a.seriesNumber;
  });

  const papersWithInfo = sortedPapers.map((paper) => {
    const pdfInfo = getPdfInfo(paper.filename);
    return { paper, pdfInfo };
  });

  const baseUrl = "https://isi.internationalsovereignty.org";

  const jsonLd = PAPERS.map((paper) => {
    const pdfInfo = getPdfInfo(paper.filename);
    const pdfUrl = `${baseUrl}${paperPdfPath(paper)}`;

    return {
      "@context": "https://schema.org",
      "@type": "ScholarlyArticle",
      name: paper.title,
      headline: paper.title,
      description: paper.abstract,
      author: paper.authors.map((a) => ({
        "@type": "Organization",
        name: a,
      })),
      publisher: {
        "@type": "Organization",
        name: paper.institution,
        url: baseUrl,
      },
      datePublished: paper.publicationDate,
      version: paper.version,
      url: `${baseUrl}/research#${paper.id}`,
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": `${baseUrl}/research#${paper.id}`,
      },
      ...(pdfInfo.exists
        ? {
            encoding: {
              "@type": "MediaObject",
              contentUrl: pdfUrl,
              encodingFormat: "application/pdf",
              ...(pdfInfo.sizeBytes
                ? { contentSize: `${pdfInfo.sizeBytes}` }
                : {}),
            },
          }
        : {}),
      ...(paper.doi
        ? {
            identifier: {
              "@type": "PropertyValue",
              propertyID: "DOI",
              value: paper.doi,
            },
          }
        : {}),
      isPartOf: {
        "@type": "CreativeWorkSeries",
        name: "ISI Paper Series",
        issn: undefined,
      },
      keywords: paper.keywords.join(", "),
      inLanguage: "en",
      ...(paper.pageCount > 0
        ? { numberOfPages: paper.pageCount }
        : {}),
    };
  });

  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* PDF alternate links for crawlers */}
      {papersWithInfo.map(
        ({ paper, pdfInfo }) =>
          pdfInfo.exists && (
            <link
              key={paper.id}
              rel="alternate"
              type="application/pdf"
              href={`${baseUrl}${paperPdfPath(paper)}`}
              title={paper.title}
            />
          ),
      )}

      <main className="mx-auto max-w-[1400px] px-6 lg:px-16">
        {/* ── Header ── */}
        <div className="max-w-3xl pt-10">
          <Link
            href="/"
            className="text-[13px] text-text-tertiary transition-colors hover:text-text-primary"
          >
            ← Back to Overview
          </Link>
          <h1 className="mt-6 font-serif text-[40px] font-bold leading-[1.1] tracking-tight text-text-primary sm:text-[48px]">
            Research &amp; Publications
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-text-tertiary">
            ISI Paper Series — methodological foundations, computational architecture,
            and empirical application of the International Sovereignty Index. All papers
            are published under principles of institutional neutrality and methodological
            transparency.
          </p>
        </div>

        {/* ── Series overview ── */}
        <section className="mt-10 rounded-md border border-border-primary bg-surface-tertiary p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-quaternary">
                Series
              </p>
              <p className="mt-1 font-mono text-[15px] font-medium text-text-primary">
                ISI Paper Series
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-quaternary">
                Publisher
              </p>
              <p className="mt-1 text-[14px] text-text-secondary">
                International Sovereignty Institute
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-quaternary">
                Papers Published
              </p>
              <p className="mt-1 font-mono text-[15px] font-medium text-text-primary">
                {PAPERS.length}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-quaternary">
                Format
              </p>
              <p className="mt-1 text-[14px] text-text-secondary">
                Open Access PDF
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-quaternary">
                License
              </p>
              <p className="mt-1 text-[14px] text-text-secondary">
                All Rights Reserved
              </p>
            </div>
          </div>
        </section>

        {/* ── Paper list ── */}
        <section className="mt-12 space-y-8 pb-20">
          {papersWithInfo.map(({ paper, pdfInfo }) => (
            <PaperCard
              key={paper.id}
              paper={paper}
              pdfExists={pdfInfo.exists}
              fileSize={pdfInfo.sizeFormatted}
            />
          ))}
        </section>
      </main>
    </div>
  );
}
