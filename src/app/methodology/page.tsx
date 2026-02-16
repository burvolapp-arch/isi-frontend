import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How the International Sovereignty Index is computed — aggregation, scoring, data sources.",
};

export default function MethodologyPage() {
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
            Methodology
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-text-tertiary">
            How the International Sovereignty Index is computed.
          </p>
        </div>

        <div className="mt-12 max-w-3xl space-y-10">

        {/* Section 1 */}
        <section className="space-y-4">
          <h2 className="font-serif text-[20px] font-semibold text-text-secondary">
            1. Objective
          </h2>
          <p className="text-[14px] leading-relaxed text-text-tertiary">
            The ISI measures the <strong className="text-text-secondary">concentration of external suppliers</strong>{" "}
            for each EU-27 member state across a set of strategic axes. It does{" "}
            <em>not</em> assess quality, risk, or desirability of those
            relationships — only their structural concentration.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-4">
          <h2 className="font-serif text-[20px] font-semibold text-text-secondary">
            2. Scoring Framework
          </h2>
          <p className="text-[14px] leading-relaxed text-text-tertiary">
            Each axis produces a score on the [0, 1] interval using a{" "}
            <strong className="text-text-secondary">Herfindahl-Hirschman Index (HHI)</strong> framework:
          </p>
          <ul className="list-inside list-disc space-y-1 text-[14px] text-text-tertiary">
            <li>
              <strong className="text-text-secondary">0.00</strong> — Perfectly diversified (equal shares among
              infinite partners)
            </li>
            <li>
              <strong className="text-text-secondary">1.00</strong> — Total concentration (100% from a single
              source)
            </li>
          </ul>
          <p className="text-[14px] leading-relaxed text-text-tertiary">
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-[14px]">
              <thead>
                <tr className="border-b-2 border-navy-900">
                  <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-[0.1em] text-text-quaternary">
                    Range
                  </th>
                  <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-[0.1em] text-text-quaternary">
                    Classification
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border-subtle">
                  <td className="px-4 py-2 font-mono text-text-primary">
                    ≥ 0.50
                  </td>
                  <td className="px-4 py-2 text-band-highly">
                    Highly Concentrated
                  </td>
                </tr>
                <tr className="border-b border-border-subtle">
                  <td className="px-4 py-2 font-mono text-text-primary">
                    0.25 – 0.49
                  </td>
                  <td className="px-4 py-2 text-band-moderately">
                    Moderately Concentrated
                  </td>
                </tr>
                <tr className="border-b border-border-subtle">
                  <td className="px-4 py-2 font-mono text-text-primary">
                    0.15 – 0.24
                  </td>
                  <td className="px-4 py-2 text-band-mildly">
                    Mildly Concentrated
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono text-text-primary">
                    &lt; 0.15
                  </td>
                  <td className="px-4 py-2 text-band-unconcentrated">
                    Unconcentrated
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 3 */}
        <section className="space-y-4">
          <h2 className="font-serif text-[20px] font-semibold text-text-secondary">
            3. Composite Aggregation
          </h2>
          <p className="text-[14px] leading-relaxed text-text-tertiary">
            The ISI composite is computed as an{" "}
            <strong className="text-text-secondary">unweighted arithmetic mean</strong> of all available axis
            scores for each country:
          </p>
          <div className="rounded-md border border-border-primary bg-surface-tertiary px-5 py-3 font-mono text-[13px] text-text-primary">
            ISI_composite = (1/N) × Σ axis_score_i, for i = 1 to N
          </div>
          <p className="text-[14px] leading-relaxed text-text-tertiary">
            No domain-weighting is applied. This is a deliberate design
            choice — the index does not presume which axes matter more. Users
            should consider axis-level scores when domain-specific analysis is
            needed.
          </p>
        </section>

        {/* Section 4 */}
        <section className="space-y-4">
          <h2 className="font-serif text-[20px] font-semibold text-text-secondary">
            4. Data Pipeline
          </h2>
          <p className="text-[14px] leading-relaxed text-text-tertiary">
            All data is pre-materialized by the backend export pipeline (
            <code className="bg-surface-tertiary px-1 text-xs text-text-secondary">
              export_isi_backend_v01.py
            </code>
            ) and served as static JSON artifacts by the API layer (
            <code className="bg-surface-tertiary px-1 text-xs text-text-secondary">
              isi_api_v01.py
            </code>
            ). All scores and classifications are computed server-side from documented data sources. The interface displays published outputs without transformation.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-4">
          <h2 className="font-serif text-[20px] font-semibold text-text-secondary">
            5. Axis-Level Documentation
          </h2>
          <p className="text-[14px] leading-relaxed text-text-tertiary">
            Each axis has its own measurement definition, data sources,
            inclusion/exclusion scope, and known limitations. These are
            documented on the individual{" "}
            <Link
              href="/"
              className="text-navy-700 hover:text-navy-900"
            >
              axis detail pages
            </Link>
            , which are driven entirely by the backend axis registry.
          </p>
        </section>
        </div>
      </main>
    </div>
  );
}
