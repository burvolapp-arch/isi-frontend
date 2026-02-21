import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Transparency & Data Governance",
  description:
    "Data sources, versioning policy, revision procedures, and known limitations of the International Sovereignty Index.",
};

export default function TransparencyPage() {
  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-[1400px] px-6 lg:px-16">
        <div className="max-w-3xl pt-10">
          <Link
            href="/"
            className="text-[13px] text-text-tertiary hover:text-text-primary"
          >
            ← Back to Overview
          </Link>
          <h1 className="mt-6 font-serif text-[40px] font-bold leading-[1.15] tracking-tight text-text-primary">
            Transparency &amp; Data Governance
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-text-tertiary">
            Data provenance, versioning policy, and governance standards for the International Sovereignty Index.
            For mathematical construction and computational architecture, see{" "}
            <Link href="/methodology" className="text-navy-700 underline hover:text-navy-900">
              Methodology
            </Link>.
          </p>
        </div>

        <div className="mt-12 max-w-3xl space-y-12 pb-20">

          {/* 1. Data Sources & Provenance */}
          <section className="space-y-4">
            <h2 className="font-serif text-[20px] font-semibold text-text-secondary">
              1. Data Sources &amp; Provenance
            </h2>
            <p className="text-[14px] leading-[1.75] text-text-tertiary">
              All ISI scores are derived from publicly accessible datasets maintained by
              international statistical authorities. No proprietary, paywalled, or classified
              data is used in any axis computation.
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-[14px]">
                <thead>
                  <tr className="border-b-2 border-navy-900">
                    <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-[0.1em] text-text-quaternary">
                      Authority
                    </th>
                    <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-[0.1em] text-text-quaternary">
                      Coverage
                    </th>
                    <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-[0.1em] text-text-quaternary">
                      Axes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border-subtle">
                    <td className="px-4 py-2 font-medium text-text-secondary">Eurostat</td>
                    <td className="px-4 py-2 text-text-tertiary">EU bilateral trade flows, energy statistics, national accounts, balance of payments</td>
                    <td className="px-4 py-2 text-text-tertiary">Energy, Financial, Technology, Critical Inputs, Logistics</td>
                  </tr>
                  <tr className="border-b border-border-subtle">
                    <td className="px-4 py-2 font-medium text-text-secondary">UN Comtrade</td>
                    <td className="px-4 py-2 text-text-tertiary">International merchandise trade at HS commodity level</td>
                    <td className="px-4 py-2 text-text-tertiary">Technology, Critical Inputs, Logistics</td>
                  </tr>
                  <tr className="border-b border-border-subtle">
                    <td className="px-4 py-2 font-medium text-text-secondary">SIPRI</td>
                    <td className="px-4 py-2 text-text-tertiary">Arms transfers database — Trend Indicator Values (TIV)</td>
                    <td className="px-4 py-2 text-text-tertiary">Defense</td>
                  </tr>
                  <tr className="border-b border-border-subtle">
                    <td className="px-4 py-2 font-medium text-text-secondary">BIS</td>
                    <td className="px-4 py-2 text-text-tertiary">International banking statistics — bilateral financial positions</td>
                    <td className="px-4 py-2 text-text-tertiary">Financial</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-medium text-text-secondary">IEA</td>
                    <td className="px-4 py-2 text-text-tertiary">World energy statistics and balances</td>
                    <td className="px-4 py-2 text-text-tertiary">Energy</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[13px] text-text-quaternary">
              Specific dataset identifiers and retrieval parameters are documented on each axis
              detail page under &ldquo;Data Sources &amp; Channels.&rdquo;
            </p>
          </section>

          {/* 2. Versioning Policy */}
          <section className="space-y-4">
            <h2 className="font-serif text-[20px] font-semibold text-text-secondary">
              2. Versioning Policy
            </h2>
            <p className="text-[14px] leading-[1.75] text-text-tertiary">
              The ISI framework is versioned to ensure methodological traceability. All published
              outputs carry a framework version identifier and a reference window.
            </p>
            <div className="rounded-md border border-border-primary bg-surface-tertiary p-5 space-y-3">
              <div className="flex items-baseline gap-3">
                <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-quaternary">Current Version</span>
                <span className="font-mono text-[14px] font-semibold text-text-primary">v0.1</span>
              </div>
              <ul className="list-inside list-disc space-y-1.5 text-[14px] text-text-tertiary">
                <li>
                  <strong className="text-text-secondary">Version immutability.</strong>{" "}
                  Published versions are frozen. Corrections are issued as errata.
                </li>
                <li>
                  <strong className="text-text-secondary">Breaking changes.</strong>{" "}
                  Changes to concentration formula, share computation, or classification
                  thresholds require a major version increment.
                </li>
                <li>
                  <strong className="text-text-secondary">Additive extensions.</strong>{" "}
                  New axes or channels are added via minor version increments without
                  retroactively altering existing scores.
                </li>
              </ul>
            </div>
          </section>

          {/* 3. Revision & Correction Procedures */}
          <section className="space-y-4">
            <h2 className="font-serif text-[20px] font-semibold text-text-secondary">
              3. Revision &amp; Correction Procedures
            </h2>
            <p className="text-[14px] leading-[1.75] text-text-tertiary">
              The ISI maintains a strict separation between methodological corrections and
              data refreshes:
            </p>
            <ul className="list-inside list-disc space-y-2 text-[14px] text-text-tertiary">
              <li>
                <strong className="text-text-secondary">Data refresh.</strong>{" "}
                Source data is extracted at defined reference windows. New extraction windows
                produce new output artifacts but do not alter the methodology.
              </li>
              <li>
                <strong className="text-text-secondary">Errata.</strong>{" "}
                If a computational error is discovered in a published version, an erratum is
                issued describing the nature, scope, and impact of the correction.
              </li>
              <li>
                <strong className="text-text-secondary">Restatements.</strong>{" "}
                Restated scores replace prior outputs only when the original computation
                contained a demonstrable error. Restatements are documented with full
                change attribution.
              </li>
            </ul>
          </section>

          {/* 4. Known Limitations */}
          <section className="space-y-4">
            <h2 className="font-serif text-[20px] font-semibold text-text-secondary">
              4. Known Limitations
            </h2>
            <p className="text-[14px] leading-[1.75] text-text-tertiary">
              The following limitations apply to the current published version. For structural
              limitations of the computational model, see the{" "}
              <Link href="/methodology" className="text-navy-700 underline hover:text-navy-900">
                Methodology
              </Link>{" "}
              page (Section 9).
            </p>
            <div className="space-y-3">
              <div className="rounded-md border border-border-primary p-4">
                <p className="text-[13px] font-medium text-text-secondary">Data vintage</p>
                <p className="mt-1 text-[13px] leading-relaxed text-text-tertiary">
                  Scores reflect the reference window stated on each page. They do not
                  auto-update and may lag real-world shifts in supplier structures.
                </p>
              </div>
              <div className="rounded-md border border-border-primary p-4">
                <p className="text-[13px] font-medium text-text-secondary">Channel coverage heterogeneity</p>
                <p className="mt-1 text-[13px] leading-relaxed text-text-tertiary">
                  Not all axes have the same number of data channels. Axes with fewer
                  channels may be less robust against individual data quality issues.
                </p>
              </div>
              <div className="rounded-md border border-border-primary p-4">
                <p className="text-[13px] font-medium text-text-secondary">Missing country-axis combinations</p>
                <p className="mt-1 text-[13px] leading-relaxed text-text-tertiary">
                  Some country-axis pairs are missing due to data unavailability.
                  The composite is then computed over available axes only, which may
                  affect cross-country comparability.
                </p>
              </div>
              <div className="rounded-md border border-border-primary p-4">
                <p className="text-[13px] font-medium text-text-secondary">Source data discrepancies</p>
                <p className="mt-1 text-[13px] leading-relaxed text-text-tertiary">
                  Bilateral trade statistics may differ between reporter-side and partner-side
                  records. The ISI uses reporter-side data exclusively. Mirror statistics are
                  not cross-validated in v0.1.
                </p>
              </div>
            </div>
          </section>

          {/* 5. Frontend Architecture */}
          <section className="rounded-md border border-border-primary bg-surface-tertiary p-6">
            <h2 className="font-serif text-[20px] font-semibold text-text-secondary">
              5. Frontend Architecture Disclosure
            </h2>
            <p className="mt-2 text-[14px] leading-[1.75] text-text-tertiary">
              All scores and classifications are computed server-side from documented data
              sources. The frontend interface displays published outputs without transformation.
              Rank orderings, deviation indicators, and cohort aggregate statistics displayed
              in the interface are derived computations from the backend-provided score set
              and are not independently scored.
            </p>
          </section>

          {/* 6. Data Access */}
          <section className="space-y-4">
            <h2 className="font-serif text-[20px] font-semibold text-text-secondary">
              6. Data Access &amp; Export
            </h2>
            <p className="text-[14px] leading-[1.75] text-text-tertiary">
              Published ISI data is available for download in machine-readable formats.
              No registration or authentication is required.
            </p>
            <div className="flex gap-4">
              <a
                href="/api/export/csv"
                download
                className="rounded-md border border-border-primary bg-surface-tertiary px-4 py-2.5 text-[13px] text-text-secondary transition-colors hover:bg-stone-100"
              >
                Download CSV
              </a>
              <a
                href="/api/export/json"
                download
                className="rounded-md border border-border-primary bg-surface-tertiary px-4 py-2.5 text-[13px] text-text-secondary transition-colors hover:bg-stone-100"
              >
                Download JSON
              </a>
            </div>
            <p className="text-[12px] text-text-quaternary">
              Exported data includes all country composite scores, per-axis scores,
              and classification labels for the current published version.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
