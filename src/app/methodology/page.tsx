import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How the International Sovereignty Index is computed — aggregation, scoring, data sources.",
};

export default function MethodologyPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <main className="mx-auto max-w-3xl px-6 py-10 space-y-10">
        <div>
          <Link
            href="/"
            className="text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            ← Back to Overview
          </Link>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Methodology
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            How the International Sovereignty Index is computed.
          </p>
        </div>

        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
            1. Objective
          </h2>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            The ISI measures the <strong>concentration of external dependencies</strong>{" "}
            for each EU-27 member state across a set of strategic axes. It does{" "}
            <em>not</em> assess quality, risk, or desirability of those
            dependencies — only their structural concentration.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
            2. Scoring Framework
          </h2>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Each axis produces a score on the [0, 1] interval using a{" "}
            <strong>Herfindahl-Hirschman Index (HHI)</strong> framework:
          </p>
          <ul className="list-inside list-disc space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
            <li>
              <strong>0.00</strong> — Perfectly diversified (equal shares among
              infinite partners)
            </li>
            <li>
              <strong>1.00</strong> — Total concentration (100% from a single
              source)
            </li>
          </ul>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Classification thresholds follow standard HHI bands:
          </p>
          <div className="overflow-x-auto rounded border border-zinc-200 dark:border-zinc-800">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-100 dark:bg-zinc-900">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-zinc-500">
                    Range
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-zinc-500">
                    Classification
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                <tr>
                  <td className="px-4 py-2 font-mono text-zinc-700 dark:text-zinc-300">
                    ≥ 0.50
                  </td>
                  <td className="px-4 py-2 text-red-700 dark:text-red-400">
                    Highly Concentrated
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono text-zinc-700 dark:text-zinc-300">
                    0.25 – 0.49
                  </td>
                  <td className="px-4 py-2 text-orange-700 dark:text-orange-400">
                    Moderately Concentrated
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono text-zinc-700 dark:text-zinc-300">
                    0.15 – 0.24
                  </td>
                  <td className="px-4 py-2 text-yellow-700 dark:text-yellow-400">
                    Mildly Concentrated
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono text-zinc-700 dark:text-zinc-300">
                    &lt; 0.15
                  </td>
                  <td className="px-4 py-2 text-green-700 dark:text-green-400">
                    Unconcentrated
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
            3. Composite Aggregation
          </h2>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            The ISI composite is computed as an{" "}
            <strong>unweighted arithmetic mean</strong> of all available axis
            scores for each country:
          </p>
          <div className="rounded border border-zinc-200 bg-zinc-50 px-4 py-3 font-mono text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            ISI_composite = (1/N) × Σ axis_score_i, for i = 1 to N
          </div>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            No domain-weighting is applied. This is a deliberate design
            choice — the index does not presume which axes matter more. Users
            should consider axis-level scores when domain-specific analysis is
            needed.
          </p>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
            4. Data Pipeline
          </h2>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            All data is pre-materialized by the backend export pipeline (
            <code className="rounded bg-zinc-200 px-1 text-xs dark:bg-zinc-800">
              export_isi_backend_v01.py
            </code>
            ) and served as static JSON artifacts by the API layer (
            <code className="rounded bg-zinc-200 px-1 text-xs dark:bg-zinc-800">
              isi_api_v01.py
            </code>
            ). The frontend performs <strong>zero computation</strong> — it is a
            pure rendering layer.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
            5. Axis-Level Documentation
          </h2>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Each axis has its own measurement definition, data sources,
            inclusion/exclusion scope, and known limitations. These are
            documented on the individual{" "}
            <Link
              href="/"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              axis detail pages
            </Link>
            , which are driven entirely by the backend axis registry.
          </p>
        </section>
      </main>
    </div>
  );
}
