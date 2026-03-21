import type { Metadata } from "next";
import Link from "next/link";
import { fetchMethodologyVersions } from "@/lib/api";
import { ErrorPanel } from "@/components/ErrorPanel";
import { generateBreadcrumbJsonLd } from "@/lib/breadcrumbs";
import { CitationFooter } from "@/components/CitationFooter";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Version History & Releases",
  description:
    "ISI dataset and methodology version history — changelog, schema evolution, and release notes for the International Sovereignty Index.",
  alternates: { canonical: "/releases" },
  openGraph: {
    title: "Version History — International Sovereignty Index",
    description:
      "Dataset and methodology release history for the ISI.",
    url: "https://isi.internationalsovereignty.org/releases",
  },
};

/** Static dataset release entries (independent of backend methodology versions) */
const DATASET_RELEASES = [
  {
    version: "1.0.0",
    date: "2026-02-01",
    cohort: "EU-27",
    description: "Founding release — 27 EU member states assessed across 6 strategic dependency axes.",
    changes: [
      "Initial publication of composite ISI scores for all EU-27 member states",
      "Six-axis HHI framework: Financial, Energy, Technology, Defense, Critical Inputs, Logistics",
      "Bilateral channel-level supplier concentration data from 12+ primary sources",
      "Scenario simulation engine with ±20% axis perturbation",
    ],
    dataWindow: "2024",
    methodologyVersion: "1.0",
  },
];

export default async function ReleasesPage() {
  let methodologyVersions: Awaited<ReturnType<typeof fetchMethodologyVersions>> | null = null;
  let fetchError: string | null = null;

  try {
    methodologyVersions = await fetchMethodologyVersions();
  } catch (err: unknown) {
    fetchError = err instanceof Error ? err.message : String(err);
  }

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Version History", href: "/releases" },
  ]);

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <main className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-16">
        {/* ── Header ── */}
        <div className="max-w-3xl pt-10">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center text-[13px] text-text-tertiary transition-colors hover:text-text-primary sm:min-h-0"
          >
            ← Back to Overview
          </Link>
          <h1 className="mt-6 font-serif text-[28px] font-bold leading-[1.15] tracking-tight text-text-primary sm:text-[40px]">
            Version History &amp; Releases
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-text-tertiary">
            Chronological record of dataset releases, methodology revisions, and schema
            changes for the International Sovereignty Index. All versions are permanently
            archived through Zenodo.
          </p>
        </div>

        {/* ── Dataset Releases ── */}
        <section className="mt-12">
          <h2 className="font-serif text-[22px] font-semibold tracking-tight text-text-primary sm:text-[26px]">
            Dataset Releases
          </h2>
          <div className="mt-6 space-y-6">
            {DATASET_RELEASES.map((release) => (
              <div
                key={release.version}
                className="rounded-md border border-border-primary bg-surface-tertiary p-5 sm:p-6"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-mono text-[16px] font-semibold text-text-primary">
                        v{release.version}
                      </h3>
                      <span className="rounded bg-navy-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                        Latest
                      </span>
                    </div>
                    <p className="mt-1 text-[13px] text-text-tertiary">
                      {release.description}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-[13px] text-text-secondary">{release.date}</p>
                    <p className="text-[11px] text-text-quaternary">
                      Cohort: {release.cohort} · Data window: {release.dataWindow}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
                    Changelog
                  </p>
                  <ul className="mt-2 space-y-1">
                    {release.changes.map((change, i) => (
                      <li key={i} className="flex items-start gap-2 text-[13px] text-text-tertiary">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-navy-700" />
                        {change}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-[12px]">
                  <a
                    href="/api/data/isi?format=csv"
                    download
                    className="inline-flex items-center gap-1.5 rounded border border-border-primary px-3 py-1.5 text-text-secondary transition-colors hover:border-navy-700 hover:text-navy-700"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                    CSV
                  </a>
                  <a
                    href="/api/data/isi?format=json"
                    download
                    className="inline-flex items-center gap-1.5 rounded border border-border-primary px-3 py-1.5 text-text-secondary transition-colors hover:border-navy-700 hover:text-navy-700"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                    JSON
                  </a>
                  <a
                    href="/api/data/isi"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded border border-border-primary px-3 py-1.5 text-text-secondary transition-colors hover:border-navy-700 hover:text-navy-700"
                  >
                    API Endpoint
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Methodology Versions (from backend) ── */}
        <section className="mt-12">
          <h2 className="font-serif text-[22px] font-semibold tracking-tight text-text-primary sm:text-[26px]">
            Methodology Versions
          </h2>
          <p className="mt-2 text-[14px] text-text-tertiary">
            Retrieved from the ISI backend. Each methodology version defines axis weights,
            scoring rules, and classification thresholds.
          </p>

          {fetchError ? (
            <div className="mt-4">
              <ErrorPanel
                title="Unable to load methodology versions"
                message={fetchError}
                endpoint="/methodology/versions"
              />
            </div>
          ) : methodologyVersions && methodologyVersions.versions.length > 0 ? (
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-[14px]">
                <thead>
                  <tr className="border-b-2 border-navy-900 text-[11px] uppercase tracking-[0.1em] text-text-quaternary">
                    <th className="px-4 py-3 text-left font-medium">Version</th>
                    <th className="px-4 py-3 text-left font-medium">Label</th>
                    <th className="px-4 py-3 text-left font-medium">Frozen At</th>
                    <th className="px-4 py-3 text-right font-medium">Axes</th>
                    <th className="px-4 py-3 text-left font-medium">Aggregation</th>
                    <th className="px-4 py-3 text-left font-medium">Years</th>
                  </tr>
                </thead>
                <tbody>
                  {methodologyVersions.versions.map((v) => (
                    <tr
                      key={v.methodology_version}
                      className="border-b border-border-subtle transition-colors hover:bg-surface-tertiary"
                    >
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono font-medium text-text-primary">
                        {v.methodology_version}
                      </td>
                      <td className="px-4 py-2.5 text-text-tertiary">
                        {v.label}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-text-quaternary">
                        {v.frozen_at}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono text-text-quaternary">
                        {v.axis_count}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-[12px] text-text-tertiary">
                        {v.aggregation_rule}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[12px] text-text-quaternary">
                        {v.years_available.join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 text-[13px] text-text-quaternary">
              No methodology versions available from the backend.
            </p>
          )}
        </section>

        {/* ── Schema Documentation ── */}
        <section className="mt-12">
          <h2 className="font-serif text-[22px] font-semibold tracking-tight text-text-primary sm:text-[26px]">
            Schema &amp; API Stability
          </h2>
          <div className="mt-4 rounded-md border border-border-primary bg-surface-tertiary p-5">
            <ul className="space-y-2 text-[13px] leading-relaxed text-text-tertiary">
              <li>
                <strong className="text-text-secondary">Versioning:</strong> Dataset versions follow
                semantic versioning (MAJOR.MINOR.PATCH). Breaking schema changes increment the major version.
              </li>
              <li>
                <strong className="text-text-secondary">API endpoints:</strong> The <code className="font-mono text-[12px]">/api/data/isi</code> and{" "}
                <code className="font-mono text-[12px]">/api/data/country/[code]</code> endpoints include versioned
                metadata (dataset version, methodology version) for forward compatibility.
              </li>
              <li>
                <strong className="text-text-secondary">Backward compatibility:</strong> Additive fields
                (new axes, additional metadata) do not constitute breaking changes and are handled via minor
                version increments.
              </li>
              <li>
                <strong className="text-text-secondary">Archival:</strong> Each dataset release is archived
                on Zenodo with a persistent DOI. Historical versions remain available for reproducibility.
              </li>
            </ul>
          </div>
        </section>

        {/* ── Citation ── */}
        <div className="mt-12 pb-20">
          <CitationFooter compact />
        </div>
      </main>
    </div>
  );
}
