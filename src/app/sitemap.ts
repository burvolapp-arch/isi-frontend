import type { MetadataRoute } from "next";
import { PAPERS, RESEARCH_PATH } from "@/lib/papers";
import { ALL_AXIS_SLUGS } from "@/lib/axisRegistry";

const BASE = "https://isi.internationalsovereignty.org";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE}/eu-aggregate`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE}/methodology`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE}/research`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE}/transparency`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE}/compare`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE}/simulation`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${BASE}/faq`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE}/accessibility`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // Direct PDF URLs — ensures search engines and academic crawlers index PDFs
  const pdfUrls: MetadataRoute.Sitemap = PAPERS.flatMap((paper) =>
    paper.files.map((f) => ({
      url: `${BASE}${RESEARCH_PATH}/${f.filename}`,
      lastModified: paper.publicationDate,
      changeFrequency: "yearly" as const,
      priority: 0.7,
    })),
  );

  // EU-27 country pages
  const EU27_CODES = [
    "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR",
    "DE","EL","HU","IE","IT","LV","LT","LU","MT","NL",
    "PL","PT","RO","SK","SI","ES","SE",
  ];
  const countryPages: MetadataRoute.Sitemap = EU27_CODES.map((code) => ({
    url: `${BASE}/country/${code.toLowerCase()}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Axis detail pages
  const axisPages: MetadataRoute.Sitemap = ALL_AXIS_SLUGS.map((slug) => ({
    url: `${BASE}/axis/${slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...countryPages, ...axisPages, ...pdfUrls];
}
