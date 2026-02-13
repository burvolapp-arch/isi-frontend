import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Transparency",
  description:
    "What the ISI measures, what it does not, and known limitations.",
};

export default function TransparencyPage() {
  return (
    <div className="min-h-screen bg-surface-secondary">
      <main className="mx-auto max-w-3xl px-6 py-10 space-y-10">
        <div>
          <Link
            href="/"
            className="text-sm text-text-tertiary hover:text-text-primary"
          >
            ← Back to Overview
          </Link>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-text-primary">
            Transparency &amp; Scope Disclosure
          </h1>
          <p className="mt-2 text-sm text-text-tertiary">
            Understanding what the ISI measures — and what it does not.
          </p>
        </div>

        {/* What the ISI measures */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-text-secondary">
            What the ISI Measures
          </h2>
          <ul className="list-inside list-disc space-y-1 text-sm text-text-tertiary">
            <li>
              <strong className="text-text-secondary">Concentration of external dependencies</strong> — how much
              a country relies on a small number of external sources for
              strategic inputs.
            </li>
            <li>
              <strong className="text-text-secondary">Structural patterns</strong> — whether dependency is
              broad or narrow across trade partners.
            </li>
            <li>
              <strong className="text-text-secondary">Cross-axis comparison</strong> — how concentration varies
              across financial, energy, technology, defense, critical inputs,
              and logistics domains.
            </li>
          </ul>
        </section>

        {/* What the ISI does NOT measure */}
        <section className="border-l-4 border-l-severity-medium border border-border-primary bg-surface-primary p-6">
          <h2 className="mb-4 text-lg font-semibold text-text-primary">
            What the ISI Does NOT Measure
          </h2>
          <ul className="space-y-3 text-sm text-text-tertiary">
            <li>
              <strong className="text-text-secondary">Risk or threat level.</strong> High concentration on a
              stable, allied partner is structurally different from
              concentration on an adversarial source. The ISI cannot
              distinguish between the two.
            </li>
            <li>
              <strong className="text-text-secondary">Policy prescriptions.</strong> A high HHI score does not
              inherently mean action is needed. Concentration may be
              economically rational, geographically determined, or
              historically entrenched.
            </li>
            <li>
              <strong className="text-text-secondary">Quality or resilience of supply chains.</strong> The index
              quantifies partner distribution, not the robustness, redundancy,
              or substitutability of those flows.
            </li>
            <li>
              <strong className="text-text-secondary">Non-EU dependencies.</strong> Only EU-27 member states are
              assessed. Non-EU countries, candidate states, and micro-states
              are outside scope.
            </li>
            <li>
              <strong className="text-text-secondary">Intra-EU dependencies.</strong> Trade flows between EU
              member states may or may not be captured depending on the axis
              definition. Refer to each axis&apos;s inclusion/exclusion
              documentation.
            </li>
            <li>
              <strong className="text-text-secondary">Geopolitical context.</strong> Scores are purely
              mathematical (HHI). They do not incorporate diplomatic
              relationships, alliance structures, or sanctions regimes.
            </li>
          </ul>
        </section>

        {/* Known Limitations */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-text-secondary">
            Known Limitations
          </h2>
          <ul className="list-inside list-disc space-y-2 text-sm text-text-tertiary">
            <li>
              <strong className="text-text-secondary">Unweighted aggregation.</strong> The composite treats all
              axes equally. This is a simplification — energy dependency may be
              more strategically critical than logistics dependency for some
              states.
            </li>
            <li>
              <strong className="text-text-secondary">Data vintage.</strong> Scores reflect the reference window
              stated on each page. They do not auto-update and may lag real-world
              shifts.
            </li>
            <li>
              <strong className="text-text-secondary">Channel coverage.</strong> Not all axes have the same
              number of data channels. Axes with fewer channels may be less
              robust.
            </li>
            <li>
              <strong className="text-text-secondary">Missing data.</strong> Some country-axis combinations may
              be missing due to data unavailability. The composite is then
              computed over available axes only, which may bias comparisons.
            </li>
          </ul>
        </section>

        {/* Frontend Disclaimer */}
        <section className="border border-border-primary bg-surface-tertiary p-6">
          <h2 className="mb-3 text-lg font-semibold text-text-secondary">
            Frontend Architecture Note
          </h2>
          <p className="text-sm text-text-tertiary">
            This frontend is a <strong className="text-text-secondary">pure rendering layer</strong>. It
            performs zero computation, zero data transformation, and zero
            business logic. Every number, classification, warning, and
            description displayed on this site is served verbatim from the
            backend API. If a number appears incorrect, the issue is in the
            backend materialization pipeline, not in the frontend.
          </p>
        </section>
      </main>
    </div>
  );
}
