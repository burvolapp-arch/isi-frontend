// ============================================================================
// ISI Paper Series — Publication Registry
// ============================================================================
// Static metadata for all papers in the ISI Paper Series.
// PDFs are stored at /public/research/<filename>.
// ============================================================================

/** A downloadable PDF file associated with a paper */
export interface PaperFile {
  /** Filename in /public/research/ */
  filename: string;
  /** ISO 639-1 language code */
  lang: string;
  /** Human label, e.g. "English", "German" */
  label: string;
}

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
  /** Primary filename in /public/research/ (used as canonical) */
  filename: string;
  /** All available PDF files (different languages, etc.) */
  files: PaperFile[];
  /** Version-specific DOI (e.g. 10.5281/zenodo.18764170) */
  doiVersion: string | null;
  /** Concept DOI covering all versions (e.g. 10.5281/zenodo.18764169) */
  doiConcept: string | null;
  /** Zenodo record landing page URL */
  zenodoRecordUrl: string | null;
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
    authors: ["Drazsky, Sebastian", "International Sovereignty Institute"],
    institution: "International Sovereignty Institute",
    publicationDate: "2026-02-01",
    version: "v1.0",
    abstract:
      "This paper presents the methodological foundations of the International Sovereignty Index (ISI), a structural measurement framework designed to quantify the concentration of external supplier relationships across strategic dependency domains. The ISI applies Herfindahl-Hirschman Index (HHI) logic uniformly across six axes — energy, critical inputs, technology, defense, financial, and logistics — producing cardinal scores on a continuous [0, 1] interval. The paper details the four-layer computational architecture: supplier share computation, channel-level concentration, volume-weighted axis aggregation, and unweighted composite scoring. Classification thresholds, reproducibility standards, and the no-normalisation principle are formally specified. The framework is designed for deterministic reproducibility, institutional neutrality, and forward extensibility.",
    filename: "isi-methodology-v1-0.pdf",
    files: [
      { filename: "isi-methodology-v1-0.pdf", lang: "en", label: "English" },
    ],
    doiVersion: "10.5281/zenodo.18764227",
    doiConcept: "10.5281/zenodo.18764226",
    zenodoRecordUrl: "https://zenodo.org/records/18764227",
    keywords: [
      "sovereignty index",
      "HHI",
      "concentration measurement",
      "supplier dependency",
      "methodology",
    ],
    pageCount: 60,
    badge: "Methodology",
  },
  {
    id: "isi-eu27-application",
    seriesNumber: 2,
    title:
      "External Supplier Concentration in the EU-27: Empirical Results (2024)",
    subtitle: "EU-27 Founding Cohort Application",
    authors: ["Drazsky, Sebastian", "International Sovereignty Institute"],
    institution: "International Sovereignty Institute",
    publicationDate: "2026-02-01",
    version: "v1.0",
    abstract:
      "This paper presents the empirical application of the International Sovereignty Index (ISI) to the 27 member states of the European Union, constituting the founding release cohort. Using the methodological framework established in ISI Paper Series No. 1, we compute concentration scores across six strategic dependency axes for each EU-27 country. The paper reports composite rankings, axis-level aggregates, classification distributions, and structural outlier identification. Cross-country comparison reveals substantial heterogeneity in external supplier concentration profiles, with composite scores ranging from unconcentrated to highly concentrated across the cohort. The results establish a baseline measurement for longitudinal tracking and provide a reproducible reference dataset for downstream policy analysis.",
    filename: "isi-eu27-results-2024-v1-0.pdf",
    files: [
      { filename: "isi-eu27-results-2024-v1-0.pdf", lang: "en", label: "English" },
    ],
    doiVersion: "10.5281/zenodo.18764170",
    doiConcept: "10.5281/zenodo.18764169",
    zenodoRecordUrl: "https://zenodo.org/records/18764170",
    keywords: [
      "EU-27",
      "sovereignty index",
      "empirical results",
      "supplier concentration",
      "HHI",
      "trade dependency",
    ],
    pageCount: 111,
    badge: "Empirical Results",
  },
  {
    id: "isi-eu27-brief",
    seriesNumber: 3,
    title:
      "International Sovereignty Index (ISI) — External Supplier Concentration in the EU-27: Empirical Findings (2024)",
    subtitle: "EU-27 Structural Interpretation",
    authors: ["Drazsky, Sebastian", "International Sovereignty Institute"],
    institution: "International Sovereignty Institute",
    publicationDate: "2026-02-01",
    version: "v1.0",
    abstract:
      "This analytical brief presents a concise interpretive synthesis of the empirical findings from the International Sovereignty Index (ISI) applied to the EU-27 founding cohort. Drawing on the full dataset published in ISI Paper Series No. 2, the brief distils key structural patterns in external supplier concentration across six strategic dependency axes — energy, critical inputs, technology, defense, financial, and logistics. Country-level composite rankings, axis-level cohort distributions, and structural outlier profiles are summarised in an accessible format designed for institutional and policy audiences. The brief does not introduce new data; it provides an interpretive overlay on previously published measurements.",
    filename: "isi-eu27-brief-2024-v1-0.pdf",
    files: [
      { filename: "isi-eu27-brief-2024-v1-0.pdf", lang: "en", label: "English" },
      { filename: "isi-eu27-brief-de-2024-v1-0.pdf", lang: "de", label: "German" },
    ],
    doiVersion: "10.5281/zenodo.18818748",
    doiConcept: "10.5281/zenodo.18818747",
    zenodoRecordUrl: "https://zenodo.org/records/18818748",
    keywords: [
      "EU-27",
      "sovereignty index",
      "analytical brief",
      "supplier concentration",
      "HHI",
      "structural interpretation",
    ],
    pageCount: 9,
    badge: "Analytical Brief",
  },
  {
    id: "isi-eu27-country-briefs",
    seriesNumber: 4,
    title:
      "International Sovereignty Index (ISI) — EU-27 Country Brief Series (2024), Paper 4 (v1.0)",
    subtitle: "EU-27 Country-Level Profiles",
    authors: ["Drazsky, Sebastian", "International Sovereignty Institute"],
    institution: "International Sovereignty Institute",
    publicationDate: "2026-03-01",
    version: "v1.0",
    abstract:
      "This paper presents individual country briefs for each of the 27 EU member states, profiling external supplier concentration across the six ISI dependency axes — energy, critical inputs, technology, defense, financial, and logistics. Each brief summarises the country's composite ISI score, axis-level concentration breakdown, and key structural characteristics. The profiles are designed to support national-level interpretation of the empirical results published in ISI Paper Series No. 2 and complement the cohort-wide analytical synthesis provided in Paper Series No. 3. No new data or methodology is introduced; the briefs repackage previously published measurements into per-country reference documents suitable for institutional and policy audiences.",
    filename: "isi_eu27_country_briefs.pdf",
    files: [
      { filename: "isi_eu27_country_briefs.pdf", lang: "en", label: "English" },
    ],
    doiVersion: "10.5281/zenodo.18904016",
    doiConcept: "10.5281/zenodo.18904015",
    zenodoRecordUrl: "https://zenodo.org/records/18904016",
    keywords: [
      "EU-27",
      "sovereignty index",
      "country briefs",
      "supplier concentration",
      "HHI",
      "country profiles",
    ],
    pageCount: 54,
    badge: "Country Briefs",
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
    timeZone: "UTC",
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
  const d = new Date(paper.publicationDate);
  const year = d.getFullYear();
  const month = d.toLocaleDateString("en-US", { month: "long" });
  if (paper.doiVersion) {
    return `Drazsky, S., & International Sovereignty Institute. (${year}, ${month}). ${paper.title} (${paper.version}). Zenodo. https://doi.org/${paper.doiVersion}`;
  }
  return `Drazsky, S., & International Sovereignty Institute. (${year}, ${month}). ${paper.title}. https://isi.internationalsovereignty.org`;
}

/** Generate Chicago 17th edition (author-date) citation */
export function generateChicago(paper: PaperMeta): string {
  const d = new Date(paper.publicationDate);
  const year = d.getFullYear();
  const month = d.toLocaleDateString("en-US", { month: "long" });
  if (paper.doiVersion) {
    return `Drazsky, Sebastian, and International Sovereignty Institute. "${paper.title}." ${paper.version}. Zenodo, ${month} ${year}. https://doi.org/${paper.doiVersion}.`;
  }
  return `Drazsky, Sebastian, and International Sovereignty Institute. "${paper.title}." https://isi.internationalsovereignty.org.`;
}

/** Generate BibTeX citation */
export function generateBibTeX(paper: PaperMeta): string {
  const d = new Date(paper.publicationDate);
  const year = d.getFullYear();
  const month = d.toLocaleDateString("en-US", { month: "long" }).toLowerCase().slice(0, 3);
  const key = `Drazsky${year}ISIPaper${paper.seriesNumber}`;
  if (paper.doiVersion) {
    return [
      `@misc{${key},`,
      `  author    = {Drazsky, Sebastian and {International Sovereignty Institute}},`,
      `  title     = {${paper.title}},`,
      `  year      = {${year}},`,
      `  month     = {${month}},`,
      `  version   = {${paper.version}},`,
      `  publisher = {Zenodo},`,
      `  doi       = {${paper.doiVersion}},`,
      `  url       = {https://doi.org/${paper.doiVersion}}`,
      "}",
    ].join("\n");
  }
  return [
    `@misc{${key},`,
    `  author    = {Drazsky, Sebastian and {International Sovereignty Institute}},`,
    `  title     = {${paper.title}},`,
    `  year      = {${year}},`,
    `  month     = {${month}},`,
    `  url       = {https://isi.internationalsovereignty.org}`,
    "}",
  ].join("\n");
}
