// ============================================================================
// ISI Paper Series — Publication Registry
// ============================================================================
// Static metadata for all papers in the ISI Paper Series.
// PDFs are stored at /public/research/<filename>.
// ============================================================================

export interface PaperMeta {
  /** Unique identifier used in URLs and anchors */
  id: string;
  /** ISI Paper Series number */
  seriesNumber: number;
  /** Full title */
  title: string;
  /** Short subtitle */
  subtitle: string;
  /** Author list */
  authors: string[];
  /** Institutional affiliation */
  institution: string;
  /** ISO date string (YYYY-MM-DD) */
  publicationDate: string;
  /** Framework version tag */
  version: string;
  /** Abstract text (may contain line breaks) */
  abstract: string;
  /** Filename in /public/research/ */
  filename: string;
  /** DOI (null if not yet assigned) */
  doi: string | null;
  /** Keywords for structured data */
  keywords: string[];
  /** Approximate page count (for display) */
  pageCount: number;
  /** Category badge label */
  badge: string;
}

/** Path prefix for paper PDFs served from /public/research/ */
export const RESEARCH_PATH = "/research";

export const PAPERS: PaperMeta[] = [
  {
    id: "isi-construction",
    seriesNumber: 1,
    title:
      "The International Sovereignty Index: Construction, Methodology, and Computational Architecture",
    subtitle: "ISI v1.0 Construction Paper",
    authors: ["International Sovereignty Institute"],
    institution: "International Sovereignty Institute",
    publicationDate: "2026-02-01",
    version: "v1.0",
    abstract:
      "This paper presents the methodological foundations of the International Sovereignty Index (ISI), a structural measurement framework designed to quantify the concentration of external supplier relationships across strategic dependency domains. The ISI applies Herfindahl-Hirschman Index (HHI) logic uniformly across six axes — energy, critical inputs, technology, defense, financial, and logistics — producing cardinal scores on a continuous [0, 1] interval. The paper details the four-layer computational architecture: supplier share computation, channel-level concentration, volume-weighted axis aggregation, and unweighted composite scoring. Classification thresholds, reproducibility standards, and the no-normalisation principle are formally specified. The framework is designed for deterministic reproducibility, institutional neutrality, and forward extensibility.",
    filename: "isi-methodology-v1-0.pdf",
    doi: null,
    keywords: [
      "sovereignty index",
      "HHI",
      "concentration measurement",
      "supplier dependency",
      "methodology",
    ],
    pageCount: 34,
    badge: "Methodology",
  },
  {
    id: "isi-eu27-application",
    seriesNumber: 2,
    title:
      "External Supplier Concentration in the EU-27: Empirical Results from the International Sovereignty Index",
    subtitle: "EU-27 Founding Cohort Application",
    authors: ["International Sovereignty Institute"],
    institution: "International Sovereignty Institute",
    publicationDate: "2026-02-01",
    version: "v1.0",
    abstract:
      "This paper presents the empirical application of the International Sovereignty Index (ISI) to the 27 member states of the European Union, constituting the founding release cohort. Using the methodological framework established in ISI Paper Series No. 1, we compute concentration scores across six strategic dependency axes for each EU-27 country. The paper reports composite rankings, axis-level aggregates, classification distributions, and structural outlier identification. Cross-country comparison reveals substantial heterogeneity in external supplier concentration profiles, with composite scores ranging from unconcentrated to highly concentrated across the cohort. The results establish a baseline measurement for longitudinal tracking and provide a reproducible reference dataset for downstream policy analysis.",
    filename: "isi-eu27-results-2024-v1-0.pdf",
    doi: null,
    keywords: [
      "EU-27",
      "sovereignty index",
      "empirical results",
      "supplier concentration",
      "HHI",
      "trade dependency",
    ],
    pageCount: 42,
    badge: "Empirical Results",
  },
];

/** Get the public URL path for a paper's PDF */
export function paperPdfPath(paper: PaperMeta): string {
  return `${RESEARCH_PATH}/${paper.filename}`;
}

/** Format publication date for display */
export function formatPaperDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
  });
}

/** Format byte size for human display */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Generate APA 7th edition citation */
export function generateAPA(paper: PaperMeta): string {
  const year = new Date(paper.publicationDate).getFullYear();
  const authorStr = paper.authors.join(", ");
  const doi = paper.doi ? ` https://doi.org/${paper.doi}` : "";
  return `${authorStr} (${year}). ${paper.title}. ISI Paper Series, No. ${paper.seriesNumber}.${doi}`;
}

/** Generate Chicago 17th edition (author-date) citation */
export function generateChicago(paper: PaperMeta): string {
  const year = new Date(paper.publicationDate).getFullYear();
  const authorStr = paper.authors.join(", ");
  const doi = paper.doi
    ? ` https://doi.org/${paper.doi}.`
    : ` https://isi.internationalsovereignty.org/research#${paper.id}.`;
  return `${authorStr}. ${year}. "${paper.title}." ISI Paper Series, no. ${paper.seriesNumber}.${doi}`;
}

/** Generate BibTeX citation */
export function generateBibTeX(paper: PaperMeta): string {
  const year = new Date(paper.publicationDate).getFullYear();
  const key = `ISI${year}Paper${paper.seriesNumber}`;
  const authorStr = paper.authors.join(" and ");
  const lines = [
    `@techreport{${key},`,
    `  author      = {${authorStr}},`,
    `  title       = {${paper.title}},`,
    `  institution = {${paper.institution}},`,
    `  year        = {${year}},`,
    `  type        = {ISI Paper Series},`,
    `  number      = {${paper.seriesNumber}},`,
  ];
  if (paper.doi) {
    lines.push(`  doi         = {${paper.doi}},`);
  }
  lines.push(`  url         = {https://isi.internationalsovereignty.org/research#${paper.id}}`);
  lines.push("}");
  return lines.join("\n");
}
