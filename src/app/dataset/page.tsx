import type { Metadata } from "next";
import Link from "next/link";
import { generateBreadcrumbJsonLd } from "@/lib/breadcrumbs";
import { CitationFooter } from "@/components/CitationFooter";
import { AXIS_SOURCES } from "@/lib/axisSources";
import { formatAxisShort } from "@/lib/presentation";
import { ALL_AXIS_SLUGS } from "@/lib/axisRegistry";

export const metadata: Metadata = {
  title: "Dataset",
  description:
    "Download the International Sovereignty Index (ISI) dataset — EU-27 founding cohort. Available in CSV and JSON formats with full provenance documentation.",
  alternates: { canonical: "/dataset" },
  openGraph: {
    title: "ISI Dataset — EU-27 Founding Cohort",
    description:
      "Downloadable ISI dataset with per-country scores across six strategic concentration axes.",
    url: "https://isi.internationalsovereignty.org/dataset",
    type: "article",
  },
};

export default function DatasetPage() {
  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            generateBreadcrumbJsonLd([{ name: "Dataset", href: "/dataset" }]),
          ),
        }}
      />
      <main className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-16">
        {/* ── Header ── */}
        <div className="max-w-3xl pt-10">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center text-[13px] text-text-tertiary hover:text-text-primary sm:min-h-0"
          >
            ← Back to Overview
          </Link>
          <h1 className="mt-6 font-serif text-[28px] font-bold leading-[1.15] tracking-tight text-text-primary sm:text-[40px]">
            Dataset
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-text-tertiary">
            The International Sovereignty Index dataset is available for download in
            machine-readable formats. All scores are computed server-side using the
            HHI-based methodology documented in{" "}
            <Link href="/methodology" className="underline hover:text-text-primary">
              ISI Paper Series No. 1
            </Link>
            .
          </p>
        </div>

        {/* ── Dataset Description ── */}
        <section className="mt-10">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-quaternary">
            Current Release
          </h2>
          <div className="mt-4 rounded-md border border-border-primary bg-surface-tertiary p-5">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="font-serif text-lg font-semibold text-text-primary">
                ISI v1.0 — EU-27 Founding Cohort
              </span>
              <span className="rounded bg-navy-700 px-2 py-0.5 text-[11px] font-medium text-white">
                2024 vintage
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-2 text-[13px] sm:grid-cols-4">
              <div>
                <span className="text-text-quaternary">Scope</span>
                <p className="font-medium text-text-secondary">EU-27 member states</p>
              </div>
              <div>
                <span className="text-text-quaternary">Axes</span>
                <p className="font-medium text-text-secondary">6 strategic dimensions</p>
              </div>
              <div>
                <span className="text-text-quaternary">Score Range</span>
                <p className="font-mono font-medium text-text-secondary">[0, 1]</p>
              </div>
              <div>
                <span className="text-text-quaternary">License</span>
                <p className="font-medium text-text-secondary">CC-BY-4.0</p>
              </div>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-text-tertiary">
              Composite ISI score = unweighted arithmetic mean of six axis-level HHI
              concentration scores. Each axis measures the Herfindahl-Hirschman
              concentration of external (bilateral) suppliers for a specific strategic domain.
            </p>
          </div>
        </section>

        {/* ── Download Links ── */}
        <section className="mt-10">
          <h2 className="font-serif text-[22px] font-semibold tracking-tight text-text-primary sm:text-[26px]">
            Download
          </h2>
          <p className="mt-1.5 text-[14px] text-text-tertiary">
            Full dataset with all 27 country scores across 6 axes.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* CSV */}
            <a
              href="/api/data/isi?format=csv"
              download
              className="flex items-center gap-3 rounded-md border border-border-primary bg-surface-tertiary p-4 transition-colors hover:border-stone-300 hover:bg-surface-primary"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-navy-700 text-white">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-text-primary">CSV Format</p>
                <p className="text-[12px] text-text-quaternary">
                  Tabular data — compatible with Excel, R, Python
                </p>
              </div>
            </a>
            {/* JSON */}
            <a
              href="/api/data/isi?format=json"
              download
              className="flex items-center gap-3 rounded-md border border-border-primary bg-surface-tertiary p-4 transition-colors hover:border-stone-300 hover:bg-surface-primary"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-navy-700 text-white">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-text-primary">JSON Format</p>
                <p className="text-[12px] text-text-quaternary">
                  Structured data — includes metadata and statistics
                </p>
              </div>
            </a>
            {/* API */}
            <div className="flex items-center gap-3 rounded-md border border-dashed border-border-primary bg-surface-tertiary p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-stone-200 text-text-tertiary dark:bg-stone-700">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-text-primary">REST API</p>
                <p className="text-[12px] text-text-quaternary">
                  <code className="font-mono">/api/data/isi</code> ·{" "}
                  <code className="font-mono">/api/data/country/&#123;code&#125;</code>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Schema ── */}
        <section className="mt-14">
          <h2 className="font-serif text-[22px] font-semibold tracking-tight text-text-primary sm:text-[26px]">
            Dataset Schema
          </h2>
          <p className="mt-1.5 text-[14px] text-text-tertiary">
            Each row represents one EU-27 member state.
          </p>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-[14px]">
              <thead>
                <tr className="border-b-2 border-navy-900 text-[11px] uppercase tracking-[0.1em] text-text-quaternary">
                  <th className="px-4 py-3 text-left font-medium">Field</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-left font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { field: "country", type: "string", desc: "ISO 3166-1 alpha-2 country code (e.g., DE, FR, EL)" },
                  { field: "country_name", type: "string", desc: "Full country name in English" },
                  { field: "financial", type: "float | null", desc: "Financial axis HHI concentration score [0, 1]" },
                  { field: "energy", type: "float | null", desc: "Energy axis HHI concentration score [0, 1]" },
                  { field: "technology", type: "float | null", desc: "Technology axis HHI concentration score [0, 1]" },
                  { field: "defense", type: "float | null", desc: "Defense axis HHI concentration score [0, 1]" },
                  { field: "critical_inputs", type: "float | null", desc: "Critical Inputs axis HHI concentration score [0, 1]" },
                  { field: "logistics", type: "float | null", desc: "Logistics axis HHI concentration score [0, 1]" },
                  { field: "composite_score", type: "float | null", desc: "Unweighted arithmetic mean of six axis scores" },
                  { field: "classification", type: "enum", desc: "HHI classification band: highly_concentrated, moderately_concentrated, mildly_concentrated, unconcentrated" },
                ].map((row) => (
                  <tr key={row.field} className="border-b border-border-subtle">
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[13px] font-medium text-text-primary">
                      {row.field}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[12px] text-text-quaternary">
                      {row.type}
                    </td>
                    <td className="px-4 py-2.5 text-text-tertiary">
                      {row.desc}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Data Sources ── */}
        <section className="mt-14">
          <h2 className="font-serif text-[22px] font-semibold tracking-tight text-text-primary sm:text-[26px]">
            Data Sources
          </h2>
          <p className="mt-1.5 text-[14px] text-text-tertiary">
            Institutional datasets used to compute concentration scores for each axis.
          </p>
          <div className="mt-6 space-y-4">
            {ALL_AXIS_SLUGS.map((slug) => {
              const sources = AXIS_SOURCES[slug] ?? [];
              if (sources.length === 0) return null;
              return (
                <div
                  key={slug}
                  className="rounded-md border border-border-primary bg-surface-tertiary p-4 sm:p-5"
                >
                  <h3 className="font-medium text-text-primary">
                    <Link href={`/axis/${slug}`} className="hover:text-navy-700">
                      {formatAxisShort(slug)}
                    </Link>
                  </h3>
                  <div className="mt-3 space-y-2">
                    {sources.map((src) => (
                      <div key={src.dataset} className="text-[13px]">
                        <div className="flex items-baseline gap-2">
                          <span className="font-medium text-text-secondary">
                            {src.dataset}
                          </span>
                          {src.datasetId && (
                            <span className="font-mono text-[11px] text-text-quaternary">
                              [{src.datasetId}]
                            </span>
                          )}
                        </div>
                        <p className="text-text-tertiary">{src.description}</p>
                        <p className="text-[11px] text-text-quaternary">
                          Publisher: {src.publisher}
                          {src.url && (
                            <>
                              {" · "}
                              <a
                                href={src.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline hover:text-text-secondary"
                              >
                                Dataset →
                              </a>
                            </>
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Methodology Reference ── */}
        <section className="mt-14">
          <h2 className="font-serif text-[22px] font-semibold tracking-tight text-text-primary sm:text-[26px]">
            Methodology
          </h2>
          <div className="mt-4 space-y-2 text-[14px] text-text-tertiary">
            <p>
              All scores are computed using the Herfindahl-Hirschman Index (HHI) framework.
              The methodology is fully documented in ISI Paper Series No. 1.
            </p>
            <p>
              The four-layer computational architecture: (1) supplier share computation,
              (2) channel-level concentration, (3) volume-weighted axis aggregation,
              (4) unweighted composite scoring.
            </p>
            <p className="text-[12px] text-text-quaternary">
              See{" "}
              <Link href="/methodology" className="underline hover:text-text-primary">
                Methodology
              </Link>{" "}
              ·{" "}
              <Link href="/transparency" className="underline hover:text-text-primary">
                Transparency
              </Link>{" "}
              ·{" "}
              <Link href="/research" className="underline hover:text-text-primary">
                Research & Publications
              </Link>
            </p>
          </div>
        </section>

        {/* ── Citation ── */}
        <section className="mt-14 mb-16">
          <CitationFooter />
        </section>
      </main>
    </div>
  );
}
