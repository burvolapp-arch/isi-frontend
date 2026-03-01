import Link from "next/link";
import type { Metadata } from "next";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { PAPERS, RESEARCH_PATH } from "@/lib/papers";
import { formatFileSize, paperPdfPath } from "@/lib/papers";
import { PaperCard } from "@/components/PaperCard";
import type { PaperMeta } from "@/lib/papers";

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
  other: {
    "citation_doi": PAPERS
      .filter((p) => p.doiVersion)
      .map((p) => p.doiVersion as string),
  },
};

interface FileInfo {
  filename: string;
  lang: string;
  label: string;
  exists: boolean;
  sizeFormatted?: string;
  sizeBytes?: number;
}

function getFileInfos(paper: PaperMeta): FileInfo[] {
  return (paper.files ?? [{ filename: paper.filename, lang: "en", label: "English" }]).map(
    (f) => {
      const filePath = join(process.cwd(), "public", "research", f.filename);
      if (!existsSync(filePath)) {
        return { ...f, exists: false };
      }
      try {
        const stats = statSync(filePath);
        return {
          ...f,
          exists: true,
          sizeFormatted: formatFileSize(stats.size),
          sizeBytes: stats.size,
        };
      } catch {
        return { ...f, exists: true };
      }
    },
  );
}

export default function ResearchPage() {
  const sortedPapers = [...PAPERS].sort((a, b) => {
    const dateDiff = new Date(b.publicationDate).getTime() - new Date(a.publicationDate).getTime();
    if (dateDiff !== 0) return dateDiff;
    return b.seriesNumber - a.seriesNumber;
  });

  const papersWithInfo = sortedPapers.map((paper) => {
    const fileInfos = getFileInfos(paper);
    return { paper, fileInfos };
  });

  const baseUrl = "https://isi.internationalsovereignty.org";

  const jsonLd = PAPERS.map((paper) => {
    const fileInfos = getFileInfos(paper);
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
        name: paper.doiVersion ? "Zenodo" : paper.institution,
        ...(paper.doiVersion ? { url: "https://zenodo.org" } : { url: baseUrl }),
      },
      datePublished: paper.publicationDate,
      version: paper.version,
      url: paper.doiVersion
        ? `https://doi.org/${paper.doiVersion}`
        : `${baseUrl}/research#${paper.id}`,
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": `${baseUrl}/research#${paper.id}`,
      },
      ...(paper.zenodoRecordUrl
        ? { sameAs: paper.zenodoRecordUrl }
        : {}),
      ...(fileInfos.some((f) => f.exists)
        ? {
            encoding: fileInfos
              .filter((f) => f.exists)
              .map((f) => ({
                "@type": "MediaObject",
                contentUrl: `${baseUrl}${RESEARCH_PATH}/${f.filename}`,
                encodingFormat: "application/pdf",
                inLanguage: f.lang,
                ...(f.sizeBytes ? { contentSize: `${f.sizeBytes}` } : {}),
              })),
          }
        : {}),
      ...(paper.doiVersion
        ? {
            identifier: {
              "@type": "PropertyValue",
              propertyID: "DOI",
              value: paper.doiVersion,
            },
          }
        : {}),
      isPartOf: {
        "@type": "CreativeWorkSeries",
        name: "ISI Paper Series",
      },
      keywords: paper.keywords.join(", "),
      inLanguage: paper.files && paper.files.length > 1
        ? paper.files.map((f) => f.lang)
        : "en",
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
      {papersWithInfo.flatMap(({ paper, fileInfos }) =>
        fileInfos
          .filter((f) => f.exists)
          .map((f) => (
            <link
              key={`${paper.id}-${f.lang}`}
              rel="alternate"
              type="application/pdf"
              hrefLang={f.lang}
              href={`${baseUrl}${RESEARCH_PATH}/${f.filename}`}
              title={`${paper.title} (${f.label})`}
            />
          )),
      )}

      <main className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-16">
        {/* ── Header ── */}
        <div className="max-w-3xl pt-10">
          <Link
            href="/"
            className="inline-flex items-center min-h-[44px] text-[13px] text-text-tertiary transition-colors hover:text-text-primary sm:min-h-0"
          >
            ← Back to Overview
          </Link>
          <h1 className="mt-6 font-serif text-[28px] font-bold leading-[1.15] tracking-tight text-text-primary sm:text-[40px]">
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
                CC-BY-4.0 (Creative Commons Attribution 4.0 International)
              </p>
            </div>
          </div>
        </section>

        {/* ── Paper list ── */}
        <section className="mt-12 space-y-8">
          {papersWithInfo.map(({ paper, fileInfos }) => (
            <PaperCard
              key={paper.id}
              paper={paper}
              fileInfos={fileInfos}
            />
          ))}
        </section>

        {/* ── Institutional footer ── */}
        <footer className="mt-8 border-t border-border-primary pb-20 pt-6">
          <p className="text-center text-[12px] leading-relaxed text-text-quaternary">
            All ISI publications are archived, versioned, and permanently indexed
            via Zenodo (CERN Open Data Infrastructure) under the International
            Sovereignty Index (ISI) community.
          </p>
          <p className="mt-3 text-center text-[12px] text-text-quaternary">
            Zenodo Community:{" "}
            <a
              href="https://zenodo.org/communities/international-sovereignty-index/"
              target="_blank"
              rel="noopener noreferrer"
              className="break-all underline hover:text-text-tertiary"
            >
              https://zenodo.org/communities/international-sovereignty-index/
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}
