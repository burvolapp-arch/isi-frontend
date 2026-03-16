import type { Metadata } from "next";
import Link from "next/link";
import { generateBreadcrumbJsonLd } from "@/lib/breadcrumbs";
import { CitationFooter } from "@/components/CitationFooter";
import { PAPERS, RESEARCH_PATH } from "@/lib/papers";

export const metadata: Metadata = {
  title: "Press & Media",
  description:
    "Press resources, key findings, and media contact information for the International Sovereignty Index (ISI).",
  alternates: { canonical: "/press" },
  openGraph: {
    title: "Press & Media — International Sovereignty Index",
    description:
      "Press resources, key findings, and media contact information for the ISI.",
    url: "https://isi.internationalsovereignty.org/press",
  },
};

const KEY_FINDINGS = [
  {
    headline: "Defense concentration is the #1 variance driver",
    body: "Axis 4 (Defense Industrial Base) accounts for approximately 35% of cross-country variance in the EU-27 cohort. Countries with near-total US defense procurement dependency exhibit structurally higher composite concentration.",
  },
  {
    headline: "EU-27 cohort mean: moderately concentrated",
    body: "The cohort mean composite score falls in the 'Moderately Concentrated' band (0.25–0.50 HHI), indicating systemic external dependency across member states rather than isolated cases.",
  },
  {
    headline: "Energy diversification yields the largest composite improvement",
    body: "Scenario simulations show that a 15 percentage-point reduction in energy axis concentration produces the largest absolute improvement in composite scores for energy-dependent states (Baltic, Bulgaria, Hungary).",
  },
  {
    headline: "Financial axis is the most uniformly distributed",
    body: "Axis 1 (Financial & Payment Systems) shows the lowest inter-country variance, reflecting shared EU-wide exposure through SWIFT, TARGET2, and international clearing infrastructure.",
  },
  {
    headline: "Small states face structural concentration disadvantage",
    body: "Malta, Cyprus, and Luxembourg exhibit higher composite scores partly due to smaller import baskets, which mechanically reduce diversification possibilities across multiple axes.",
  },
];

const MEDIA_RESOURCES = [
  {
    label: "Dataset (CSV)",
    href: "/api/data/isi?format=csv",
    description: "Machine-readable composite and axis-level scores for all EU-27 countries",
  },
  {
    label: "Dataset (JSON)",
    href: "/api/data/isi?format=json",
    description: "Structured dataset with metadata, schema version, and nested axis scores",
  },
  {
    label: "Methodology Paper (PDF)",
    href: `${RESEARCH_PATH}/${PAPERS[0]?.files[0]?.filename ?? ""}`,
    description: "Full methodological documentation of the HHI framework and axis construction",
  },
  {
    label: "EU-27 Cohort Analysis",
    href: "/eu-aggregate",
    description: "Aggregate statistics, distribution, and rankings for the founding EU-27 cohort",
  },
  {
    label: "Interactive Country Profiles",
    href: "/",
    description: "Individual sovereign profiles with per-axis breakdown and supplier detail",
  },
];

export default function PressPage() {
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Press & Media", href: "/press" },
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
            Press &amp; Media
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-text-tertiary">
            Resources for journalists, analysts, and media organisations covering
            the International Sovereignty Index. All data and methodological
            documentation are published under CC-BY-4.0.
          </p>
        </div>

        {/* ── Key Findings ── */}
        <section className="mt-12">
          <h2 className="font-serif text-[22px] font-semibold tracking-tight text-text-primary sm:text-[26px]">
            Key Findings — Founding Cohort
          </h2>
          <p className="mt-2 text-[14px] text-text-tertiary">
            Principal empirical results from the EU-27 founding cohort assessment.
          </p>
          <div className="mt-6 space-y-4">
            {KEY_FINDINGS.map((finding, i) => (
              <div
                key={i}
                className="rounded-md border border-border-primary bg-surface-tertiary p-5"
              >
                <p className="text-[14px] font-semibold text-text-primary">
                  {finding.headline}
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-text-tertiary">
                  {finding.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Media Resources ── */}
        <section className="mt-12">
          <h2 className="font-serif text-[22px] font-semibold tracking-tight text-text-primary sm:text-[26px]">
            Resources for Download
          </h2>
          <p className="mt-2 text-[14px] text-text-tertiary">
            All resources are freely available under open-access licensing.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MEDIA_RESOURCES.map((resource, i) => (
              <a
                key={i}
                href={resource.href}
                className="group rounded-md border border-border-primary bg-surface-primary p-4 transition-colors hover:border-navy-700 hover:bg-surface-tertiary"
              >
                <p className="text-[13px] font-semibold text-text-primary group-hover:text-navy-700">
                  {resource.label}
                </p>
                <p className="mt-1.5 text-[12px] leading-relaxed text-text-quaternary">
                  {resource.description}
                </p>
              </a>
            ))}
          </div>
        </section>

        {/* ── Citation Guidance ── */}
        <section className="mt-12">
          <h2 className="font-serif text-[22px] font-semibold tracking-tight text-text-primary sm:text-[26px]">
            Citation Guidance
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-text-tertiary">
            When referencing ISI data or findings, please use the following citation format.
            The ISI dataset is versioned and archived through Zenodo with a persistent DOI.
          </p>
          <div className="mt-4">
            <CitationFooter />
          </div>
        </section>

        {/* ── Media Contact ── */}
        <section className="mt-12">
          <h2 className="font-serif text-[22px] font-semibold tracking-tight text-text-primary sm:text-[26px]">
            Media Contact
          </h2>
          <div className="mt-4 rounded-md border border-border-primary bg-surface-tertiary p-5">
            <p className="text-[14px] text-text-secondary">
              For press inquiries, interview requests, or data clarifications:
            </p>
            <p className="mt-3 font-mono text-[13px] text-text-primary">
              <a
                href="mailto:press@internationalsovereignty.org"
                className="underline hover:text-navy-700"
              >
                press@internationalsovereignty.org
              </a>
            </p>
            <p className="mt-2 text-[12px] text-text-quaternary">
              International Sovereignty Institute
            </p>
          </div>
        </section>

        {/* ── Embargo & Use Policy ── */}
        <section className="mt-12 pb-20">
          <h2 className="font-serif text-[22px] font-semibold tracking-tight text-text-primary sm:text-[26px]">
            Data Use Policy
          </h2>
          <div className="mt-4 rounded-md border border-border-primary bg-surface-tertiary p-5">
            <ul className="space-y-2 text-[13px] leading-relaxed text-text-tertiary">
              <li>
                <strong className="text-text-secondary">License:</strong> All ISI data and publications
                are released under Creative Commons Attribution 4.0 International (CC-BY-4.0).
              </li>
              <li>
                <strong className="text-text-secondary">Attribution:</strong> Please credit
                &ldquo;International Sovereignty Institute&rdquo; and include the DOI or URL when citing data.
              </li>
              <li>
                <strong className="text-text-secondary">Reproduction:</strong> Charts, tables, and
                score extracts may be reproduced with attribution. Modified visualisations should
                note any alterations to the original data.
              </li>
              <li>
                <strong className="text-text-secondary">Disclaimer:</strong> ISI scores measure
                structural supplier concentration. They do not constitute economic forecasts,
                risk assessments, or policy recommendations.
              </li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
