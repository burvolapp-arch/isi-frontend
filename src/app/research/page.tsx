import Link from "next/link";
import type { Metadata } from "next";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { PAPERS, RESEARCH_PATH } from "@/lib/papers";
import { formatFileSize, paperPdfPath } from "@/lib/papers";
import { PaperCard } from "@/components/PaperCard";
import type { PaperMeta } from "@/lib/papers";
import { generateBreadcrumbJsonLd } from "@/lib/breadcrumbs";
import {
  paperSeriesJsonLd,
  scholarlyArticleJsonLd,
  allHighwireMetaTags,
} from "@/lib/structuredData";

export const metadata: Metadata = {
  title: "Research & Publications",
  description:
    "ISI Paper Series — peer-reviewed research papers on the construction, methodology, and empirical application of the International Sovereignty Index.",
  alternates: {
    canonical: "/research",
  },
  openGraph: {
    title: "Research & Publications — ISI Paper Series",
    description:
      "ISI Paper Series — methodological foundations and empirical results of the International Sovereignty Index.",
    url: "https://isi.internationalsovereignty.org/research",
    type: "article",
    images: [
      {
        url: "https://isi.internationalsovereignty.org/android-chrome-512x512.png",
        width: 512,
        height: 512,
        alt: "International Sovereignty Institute — Research & Publications",
      },
    ],
  },
  // Highwire Press / Google Scholar citation meta tags (one per paper)
  other: allHighwireMetaTags(),
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

  // Centralised structured data — Entity C + Entity D per paper
  const seriesJsonLd = paperSeriesJsonLd();
  const articlesJsonLd = PAPERS.map((paper) => scholarlyArticleJsonLd(paper));

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Research & Publications", href: "/research" },
  ]);

  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(seriesJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articlesJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
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

        {/* ── AI-Summary Microdata (machine-readable per-paper) ── */}
        <section className="sr-only" aria-hidden="true">
          {PAPERS.map((paper) => (
            <article
              key={paper.id}
              itemScope
              itemType="https://schema.org/ScholarlyArticle"
            >
              <meta itemProp="name" content={paper.title} />
              <meta itemProp="headline" content={paper.title} />
              <meta itemProp="description" content={paper.abstract} />
              <meta itemProp="datePublished" content={paper.publicationDate} />
              <meta itemProp="version" content={paper.version} />
              <meta itemProp="inLanguage" content="en" />
              {paper.doiVersion && (
                <meta itemProp="identifier" content={`https://doi.org/${paper.doiVersion}`} />
              )}
              <span itemProp="author" itemScope itemType="https://schema.org/Person">
                <meta itemProp="name" content="Sebastian Drazsky" />
                <meta itemProp="familyName" content="Drazsky" />
                <meta itemProp="givenName" content="Sebastian" />
              </span>
              <span itemProp="author" itemScope itemType="https://schema.org/Organization">
                <meta itemProp="name" content="International Sovereignty Institute" />
              </span>
              <span itemProp="publisher" itemScope itemType="https://schema.org/Organization">
                <meta itemProp="name" content="Zenodo" />
              </span>
              <span itemProp="about" itemScope itemType="https://schema.org/Thing">
                <meta itemProp="name" content="External Dependency Measurement" />
                <meta
                  itemProp="description"
                  content="Structural quantification of external supplier concentration across strategic dependency axes using Herfindahl-Hirschman Index (HHI) methodology."
                />
              </span>
              <meta
                itemProp="license"
                content="https://creativecommons.org/licenses/by/4.0/"
              />
              {paper.keywords.map((kw) => (
                <meta key={kw} itemProp="keywords" content={kw} />
              ))}
            </article>
          ))}
        </section>

        {/* ── Archival Record ── */}
        <section className="mt-10 rounded-md border border-border-primary bg-surface-tertiary p-5 sm:p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-quaternary">
            Archival Record
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-text-tertiary">
            All ISI publications are permanently archived and versioned through Zenodo.
          </p>
          <p className="mt-2 text-[12px] text-text-quaternary">
            <a
              href="https://zenodo.org/communities/international-sovereignty-index/"
              target="_blank"
              rel="noopener noreferrer"
              className="break-all underline hover:text-text-tertiary"
            >
              https://zenodo.org/communities/international-sovereignty-index/
            </a>
          </p>
        </section>

        {/* ── Institutional footer ── */}
        <footer className="mt-8 border-t border-border-primary pb-20 pt-6">
          <p className="text-center text-[12px] leading-relaxed text-text-quaternary">
            For general background on sovereignty, see:{" "}
            <a
              href="https://internationalsovereignty.org/international-sovereignty/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-text-tertiary"
            >
              internationalsovereignty.org
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}
