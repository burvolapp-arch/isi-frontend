// ============================================================================
// ISI Structured Data — JSON-LD Generation
// ============================================================================
// Centralised structured data generation for the International Sovereignty
// Institute platform. All four entity types are defined here with @id
// cross-references to avoid duplication.
//
// Entity A: Organization  — International Sovereignty Institute
// Entity B: Dataset       — International Sovereignty Index (ISI)
// Entity C: CreativeWorkSeries — ISI Paper Series
// Entity D: ScholarlyArticle   — Individual papers (generated per-paper)
// ============================================================================

import { PAPERS, RESEARCH_PATH, type PaperMeta } from "./papers";

export const BASE_URL = "https://isi.internationalsovereignty.org";
export const ORG_URL = "https://internationalsovereignty.org";

// ── Stable @id URIs ──────────────────────────────────────────────────

export const ID = {
  organization: `${BASE_URL}/#organization`,
  website: `${BASE_URL}/#website`,
  dataset: `${BASE_URL}/#dataset`,
  paperSeries: `${BASE_URL}/research#paper-series`,
} as const;

// ── Entity A: Organization ───────────────────────────────────────────

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ID.organization,
    name: "International Sovereignty Institute",
    url: ORG_URL,
    logo: {
      "@type": "ImageObject",
      url: `${BASE_URL}/android-chrome-512x512.png`,
      width: 512,
      height: 512,
    },
    description:
      "Independent research institute measuring external supplier concentration using a Herfindahl-Hirschman (HHI) framework. Publisher of the International Sovereignty Index.",
    sameAs: [
      "https://zenodo.org/communities/international-sovereignty-index/",
      ORG_URL,
    ],
    contactPoint: {
      "@type": "ContactPoint",
      email: "press@internationalsovereignty.org",
      contactType: "press",
      availableLanguage: ["en", "de"],
    },
  };
}

// ── Entity: WebSite ──────────────────────────────────────────────────

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": ID.website,
    name: "International Sovereignty Index (ISI)",
    url: BASE_URL,
    publisher: { "@id": ID.organization },
    description:
      "Measuring external supplier concentration — inaugural release: EU-27 — using a Herfindahl-Hirschman (HHI) framework.",
    inLanguage: "en",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/country/{search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

// ── Entity B: Dataset ────────────────────────────────────────────────

export function datasetJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "@id": ID.dataset,
    name: "International Sovereignty Index (ISI) — EU-27 Founding Cohort",
    description:
      "Cardinal measurement of external supplier concentration across six strategic dependency axes for the 27 EU member states, computed via Herfindahl-Hirschman Index (HHI) methodology.",
    creator: { "@id": ID.organization },
    publisher: { "@id": ID.organization },
    license: "https://creativecommons.org/licenses/by/4.0/",
    version: "1.0",
    datePublished: "2026-02-01",
    temporalCoverage: "2024",
    spatialCoverage: {
      "@type": "Place",
      name: "European Union (EU-27)",
    },
    keywords: [
      "sovereignty index",
      "external dependency",
      "supplier concentration",
      "Herfindahl-Hirschman Index",
      "HHI",
      "EU-27",
      "trade dependency",
      "energy dependency",
      "defense dependency",
      "critical inputs",
      "financial concentration",
      "logistics dependency",
    ],
    variableMeasured: [
      "Energy supplier concentration",
      "Critical inputs supplier concentration",
      "Technology supplier concentration",
      "Defense supplier concentration",
      "Financial supplier concentration",
      "Logistics supplier concentration",
      "Composite concentration score",
    ],
    measurementTechnique: "Herfindahl-Hirschman Index (HHI)",
    distribution: [
      {
        "@type": "DataDownload",
        encodingFormat: "text/csv",
        contentUrl: `${BASE_URL}/api/export/csv`,
      },
      {
        "@type": "DataDownload",
        encodingFormat: "application/json",
        contentUrl: `${BASE_URL}/api/export/json`,
      },
    ],
    isBasedOn: "https://doi.org/10.5281/zenodo.18764170",
    isPartOf: { "@id": ID.website },
  };
}

// ── Entity C: CreativeWorkSeries ─────────────────────────────────────

export function paperSeriesJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWorkSeries",
    "@id": ID.paperSeries,
    name: "ISI Paper Series",
    description:
      "Peer-reviewed research papers on the construction, methodology, and empirical application of the International Sovereignty Index (ISI).",
    creator: { "@id": ID.organization },
    publisher: {
      "@type": "Organization",
      name: "Zenodo",
      url: "https://zenodo.org",
    },
    inLanguage: "en",
    license: "https://creativecommons.org/licenses/by/4.0/",
    url: `${BASE_URL}/research`,
    hasPart: PAPERS.map((paper) => ({
      "@type": "ScholarlyArticle",
      "@id": `${BASE_URL}/research#${paper.id}`,
      name: paper.title,
      url: paper.doiVersion
        ? `https://doi.org/${paper.doiVersion}`
        : `${BASE_URL}/research#${paper.id}`,
    })),
  };
}

// ── Entity D: ScholarlyArticle (per-paper) ───────────────────────────

export function scholarlyArticleJsonLd(paper: PaperMeta) {
  const year = new Date(paper.publicationDate).getFullYear();

  // Build citation references to other papers in the series
  const citations = PAPERS.filter(
    (p) => p.id !== paper.id && p.seriesNumber < paper.seriesNumber
  ).map((p) => ({
    "@type": "ScholarlyArticle" as const,
    "@id": `${BASE_URL}/research#${p.id}`,
    name: p.title,
    ...(p.doiVersion ? { identifier: `https://doi.org/${p.doiVersion}` } : {}),
  }));

  return {
    "@context": "https://schema.org",
    "@type": "ScholarlyArticle",
    "@id": `${BASE_URL}/research#${paper.id}`,
    name: paper.title,
    headline: paper.title,
    description: paper.abstract,
    author: [
      {
        "@type": "Person",
        name: "Sebastian Drazsky",
        familyName: "Drazsky",
        givenName: "Sebastian",
      },
      {
        "@id": ID.organization,
      },
    ],
    publisher: {
      "@type": "Organization",
      name: "Zenodo",
      url: "https://zenodo.org",
    },
    datePublished: paper.publicationDate,
    copyrightYear: year,
    version: paper.version,
    url: paper.doiVersion
      ? `https://doi.org/${paper.doiVersion}`
      : `${BASE_URL}/research#${paper.id}`,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${BASE_URL}/research#${paper.id}`,
    },
    isPartOf: {
      "@id": ID.paperSeries,
    },
    about: {
      "@type": "Thing",
      name: "External Dependency Measurement",
      description:
        "Structural quantification of external supplier concentration across strategic dependency axes using Herfindahl-Hirschman Index (HHI) methodology.",
    },
    ...(paper.doiVersion
      ? {
          identifier: {
            "@type": "PropertyValue",
            propertyID: "DOI",
            value: paper.doiVersion,
          },
        }
      : {}),
    ...(paper.zenodoRecordUrl ? { sameAs: paper.zenodoRecordUrl } : {}),
    license: "https://creativecommons.org/licenses/by/4.0/",
    keywords: paper.keywords.join(", "),
    inLanguage:
      paper.files && paper.files.length > 1
        ? paper.files.map((f) => f.lang)
        : "en",
    ...(paper.pageCount > 0 ? { numberOfPages: paper.pageCount } : {}),
    encoding: paper.files.map((f) => ({
      "@type": "MediaObject",
      contentUrl: `${BASE_URL}${RESEARCH_PATH}/${f.filename}`,
      encodingFormat: "application/pdf",
      inLanguage: f.lang,
    })),
    ...(citations.length > 0 ? { citation: citations } : {}),
  };
}

// ── FAQPage JSON-LD ──────────────────────────────────────────────────

interface FAQEntry {
  q: string;
  a: string;
}

export function faqPageJsonLd(items: FAQEntry[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}

// ── Highwire Press Meta Tags (Google Scholar) ───────────────────────

/**
 * Generate Highwire Press / Google Scholar citation meta tags for a paper.
 * Returns a flat Record<string, string | string[]> suitable for Next.js
 * Metadata.other. When a key appears multiple times (e.g. citation_author),
 * the value is an array and Next.js emits one <meta> per entry.
 */
export function highwireMetaTags(paper: PaperMeta) {
  const d = new Date(paper.publicationDate);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  const tags: Record<string, string | string[]> = {
    // Core citation tags
    citation_title: paper.title,
    citation_author: "Sebastian Drazsky",
    citation_author_institution: "International Sovereignty Institute",
    citation_publication_date: `${year}/${month}/${day}`,
    citation_online_date: `${year}/${month}/${day}`,
    citation_language: "en",
    citation_publisher: "Zenodo",

    // PDF URL — absolute, direct link
    citation_pdf_url: `${BASE_URL}${RESEARCH_PATH}/${paper.filename}`,

    // Abstract
    citation_abstract: paper.abstract,

    // Keywords
    citation_keywords: paper.keywords.join("; "),

    // Series context
    citation_series_title: "ISI Paper Series",
    citation_technical_report_number: String(paper.seriesNumber),
  };

  // DOI
  if (paper.doiVersion) {
    tags.citation_doi = paper.doiVersion;
  }

  // Fulltext HTML URL
  tags.citation_fulltext_html_url = `${BASE_URL}/research#${paper.id}`;

  return tags;
}

/**
 * Merge Highwire Press tags from ALL papers into a single Record.
 * Keys with multiple values become arrays (Next.js emits one <meta> per entry).
 */
export function allHighwireMetaTags() {
  const merged: Record<string, string[]> = {};
  for (const paper of PAPERS) {
    const tags = highwireMetaTags(paper);
    for (const [key, value] of Object.entries(tags)) {
      if (!merged[key]) merged[key] = [];
      if (Array.isArray(value)) {
        merged[key].push(...value);
      } else {
        merged[key].push(value);
      }
    }
  }
  // Deduplicate values — e.g. citation_author, citation_language, citation_publisher
  // appear identically for every paper and should not be repeated.
  const result: Record<string, string | string[]> = {};
  for (const [key, values] of Object.entries(merged)) {
    const unique = [...new Set(values)];
    result[key] = unique.length === 1 ? unique[0] : unique;
  }
  return result;
}

// ── Sitewide JSON-LD array (injected in layout.tsx) ──────────────────

export function sitewideJsonLd() {
  return [organizationJsonLd(), websiteJsonLd(), datasetJsonLd()];
}
