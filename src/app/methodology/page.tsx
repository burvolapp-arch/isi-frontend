import Link from "next/link";
import type { Metadata } from "next";
import { fetchMethodologyVersions } from "@/lib/api";
import { formatEnum } from "@/lib/presentation";

export const metadata: Metadata = {
  title: "Methodological Foundations",
  description:
    "Methodological Foundations of the International Sovereignty Index — concentration measurement framework, computational architecture, reproducibility standards, and structural limitations.",
};

/* ════════════════════════════════════════════════════════════════════
   Reusable prose components — keep the page body clean
   ════════════════════════════════════════════════════════════════════ */

function SectionHeading({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <h2 className="font-serif text-[20px] font-semibold text-text-secondary">
      {n}. {children}
    </h2>
  );
}

function SubHeading({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <h3 className="text-[15px] font-semibold text-text-secondary">
      {n} {children}
    </h3>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[14px] leading-[1.75] text-text-tertiary">{children}</p>;
}

function Strong({ children }: { children: React.ReactNode }) {
  return <strong className="text-text-secondary">{children}</strong>;
}

function MathBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border-primary bg-surface-tertiary px-5 py-3 font-mono text-[13px] leading-relaxed text-text-primary">
      {children}
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-stone-200 bg-stone-50 px-5 py-3 text-[13px] leading-relaxed text-text-tertiary">
      {children}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   PAGE
   ════════════════════════════════════════════════════════════════════ */

export const revalidate = 300;

export default async function MethodologyPage() {
  const methodologyResult = await fetchMethodologyVersions().catch(() => null);
  const latest = methodologyResult?.versions?.[0] ?? null;

  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-[1400px] px-6 lg:px-16">
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="max-w-3xl pt-10">
          <Link
            href="/"
            className="text-[13px] text-text-tertiary hover:text-text-primary"
          >
            ← Back to Overview
          </Link>
          <h1 className="mt-6 font-serif text-[40px] font-bold leading-[1.15] tracking-tight text-text-primary">
            Methodological Foundations
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-text-tertiary">
            International Sovereignty Index — Measurement Framework &amp; Computational Architecture
          </p>
        </div>

        {/* ── Body ────────────────────────────────────────────── */}
        <div className="mt-12 max-w-3xl space-y-12 pb-20">

          {/* ══════════════════════════════════════════════════════
              1. INSTITUTIONAL PURPOSE
              ══════════════════════════════════════════════════════ */}
          <section className="space-y-4">
            <SectionHeading n="1">Institutional Purpose</SectionHeading>
            <P>
              The International Sovereignty Index (ISI) is a structural measurement framework
              designed to quantify the <Strong>concentration of external supplier relationships</Strong>{" "}
              across strategic dependency domains. The inaugural release covers the EU-27 as the founding cohort.
            </P>
            <P>
              The ISI functions as a descriptive statistical instrument. It does not advocate
              policy positions, prescribe diversification targets, or rank countries by
              desirability of outcome. Its purpose is to provide a reproducible, transparent,
              and methodologically stable measurement of structural concentration exposure — enabling
              downstream analysis by researchers, policymakers, and institutions operating under
              their own analytical mandates.
            </P>
            <P>
              The framework is maintained under principles of institutional neutrality. Published
              outputs reflect observed concentration patterns derived from public data. No editorial
              judgment is applied to the interpretation of scores.
            </P>
          </section>

          {/* ══════════════════════════════════════════════════════
              2. OPERATIONAL DEFINITION OF SOVEREIGNTY
              ══════════════════════════════════════════════════════ */}
          <section className="space-y-4">
            <SectionHeading n="2">Operational Definition</SectionHeading>
            <P>
              For the purposes of this framework, <Strong>sovereignty exposure</Strong> is
              defined operationally as the degree to which a state&apos;s access to a critical
              external input is concentrated among a small number of foreign suppliers or
              counterparties.
            </P>
            <P>
              This definition is intentionally narrow. It measures structural concentration —
              the distributional shape of supplier relationships — rather than qualitative
              attributes such as political alignment, reliability, or substitutability of partners.
              A high concentration score indicates structural dependence on few sources regardless
              of who those sources are.
            </P>
            <Note>
              <Strong>Definitional boundary.</Strong> The ISI does not measure sovereignty in the
              normative, legal, or political sense. It measures the statistical concentration
              of bilateral exposure in defined economic domains.
            </Note>
          </section>

          {/* ══════════════════════════════════════════════════════
              3. SCOPE OF MEASUREMENT
              ══════════════════════════════════════════════════════ */}
          <section className="space-y-4">
            <SectionHeading n="3">Scope of Measurement</SectionHeading>

            <SubHeading n="3.1">What the ISI Measures</SubHeading>
            <ul className="list-inside list-disc space-y-1.5 text-[14px] text-text-tertiary">
              <li>Concentration of external supplier shares within defined dependency channels</li>
              <li>Channel-level and axis-level aggregation of Herfindahl-type concentration indices</li>
              <li>Cross-country comparison of structural concentration profiles within the current release cohort (EU-27)</li>
              <li>Composite concentration across six strategic axes</li>
            </ul>

            <SubHeading n="3.2">What the ISI Does Not Measure</SubHeading>
            <div className="rounded-md border border-border-primary py-4 pl-5 pr-6">
              <ul className="space-y-2.5 text-[14px] text-text-tertiary">
                <li>
                  <Strong>Economic efficiency or competitiveness.</Strong> A concentrated
                  supplier structure may reflect efficient specialisation. The ISI makes no
                  judgment on optimality.
                </li>
                <li>
                  <Strong>Geopolitical risk or threat assessment.</Strong> Concentration is
                  measured irrespective of the identity, alignment, or stability of counterparties.
                </li>
                <li>
                  <Strong>Resilience, adaptability, or substitution capacity.</Strong> The framework
                  captures static concentration at the observation window. It does not model dynamic
                  adjustment paths.
                </li>
                <li>
                  <Strong>Domestic production capacity or self-sufficiency.</Strong> Import
                  concentration does not account for domestic alternatives. A country that produces
                  90% of an input domestically and imports the remaining 10% from one supplier will
                  register high concentration on that import channel.
                </li>
                <li>
                  <Strong>Intra-EU vs. extra-EU distinction.</Strong> In v0.1, all bilateral
                  partners — including EU member states — are treated as external suppliers.
                  The framework does not currently distinguish between intra-Union and
                  extra-Union dependency.
                </li>
                <li>
                  <Strong>Ordinal ranking or relative positioning.</Strong> The ISI produces
                  cardinal scores on a continuous [0,&thinsp;1] interval. No transformation to ordinal
                  ranks is performed. Published rank displays are derived convenience outputs
                  and do not form part of the core measurement.
                </li>
              </ul>
            </div>
          </section>

          {/* ══════════════════════════════════════════════════════
              4. CONCENTRATION DOCTRINE
              ══════════════════════════════════════════════════════ */}
          <section className="space-y-4">
            <SectionHeading n="4">Concentration Doctrine</SectionHeading>
            <P>
              The mathematical backbone of the ISI is the <Strong>Herfindahl-Hirschman Index</Strong>{" "}
              (HHI), a standard concentration measure used in competition economics, trade analysis,
              and regulatory assessment. The ISI applies Herfindahl-type logic uniformly across all
              axes.
            </P>

            <SubHeading n="4.1">Core Formula</SubHeading>
            <P>
              For a given reporting country, within a defined dependency channel, let{" "}
              <em>s<sub>i</sub></em> denote the share of total exposure attributed to supplier{" "}
              <em>i</em>, where shares are normalised such that Σ&nbsp;<em>s<sub>i</sub></em>&nbsp;=&nbsp;1.
              The channel-level concentration index is:
            </P>
            <MathBlock>
              C = Σ s<sub>i</sub><sup>2</sup> &nbsp;&nbsp; for all suppliers i = 1, …, N
            </MathBlock>

            <SubHeading n="4.2">Boundary Properties</SubHeading>
            <div className="overflow-x-auto">
              <table className="min-w-full text-[14px]">
                <thead>
                  <tr className="border-b-2 border-navy-900">
                    <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-[0.1em] text-text-quaternary">
                      Condition
                    </th>
                    <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-[0.1em] text-text-quaternary">
                      Score
                    </th>
                    <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-[0.1em] text-text-quaternary">
                      Interpretation
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border-subtle">
                    <td className="px-4 py-2 text-text-tertiary">Single supplier (s₁&nbsp;=&nbsp;1)</td>
                    <td className="px-4 py-2 font-mono text-text-primary">1.0000</td>
                    <td className="px-4 py-2 text-text-tertiary">Maximum concentration</td>
                  </tr>
                  <tr className="border-b border-border-subtle">
                    <td className="px-4 py-2 text-text-tertiary">N equal suppliers (s&nbsp;=&nbsp;1/N)</td>
                    <td className="px-4 py-2 font-mono text-text-primary">1/N</td>
                    <td className="px-4 py-2 text-text-tertiary">Symmetric diversification</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-text-tertiary">N&nbsp;→&nbsp;∞ with equal shares</td>
                    <td className="px-4 py-2 font-mono text-text-primary">→ 0.0000</td>
                    <td className="px-4 py-2 text-text-tertiary">Perfect diversification (theoretical limit)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <SubHeading n="4.3">Classification Thresholds</SubHeading>
            <P>
              For interpretive convenience, concentration scores are assigned to four
              named bands. These thresholds are aligned with established HHI conventions
              and are applied uniformly across all axes and channels.
            </P>
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
                    <td className="px-4 py-2 font-mono text-text-primary">≥ 0.50</td>
                    <td className="px-4 py-2 text-band-highly">Highly Concentrated</td>
                  </tr>
                  <tr className="border-b border-border-subtle">
                    <td className="px-4 py-2 font-mono text-text-primary">0.25 – 0.49</td>
                    <td className="px-4 py-2 text-band-moderately">Moderately Concentrated</td>
                  </tr>
                  <tr className="border-b border-border-subtle">
                    <td className="px-4 py-2 font-mono text-text-primary">0.15 – 0.24</td>
                    <td className="px-4 py-2 text-band-mildly">Mildly Concentrated</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-mono text-text-primary">&lt; 0.15</td>
                    <td className="px-4 py-2 text-band-unconcentrated">Unconcentrated</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <P>
              These classifications are convenience labels. They do not carry normative
              weight and should not be interpreted as risk thresholds. The underlying
              continuous score is the primary measurement output.
            </P>
          </section>

          {/* ══════════════════════════════════════════════════════
              5. LAYERED COMPUTATIONAL ARCHITECTURE
              ══════════════════════════════════════════════════════ */}
          <section className="space-y-5">
            <SectionHeading n="5">Layered Computational Architecture</SectionHeading>
            <P>
              The ISI processes bilateral data through a four-layer pipeline. Each layer
              is deterministic: identical inputs produce identical outputs with no stochastic
              component.
            </P>

            {/* Layer 1 */}
            <div className="rounded-md border border-border-primary bg-surface-tertiary p-5 space-y-3">
              <SubHeading n="5.1">Layer 1 — Supplier Share Computation</SubHeading>
              <P>
                For each reporting country <em>r</em> and dependency channel <em>c</em>,
                bilateral flows are aggregated from the underlying data source. The share
                of each supplier <em>i</em> is computed as:
              </P>
              <MathBlock>
                s<sub>i</sub> = flow(r, i, c) / Σ<sub>j</sub> flow(r, j, c)
              </MathBlock>
              <P>
                Shares are computed from the reporter-side perspective. All bilateral
                observations for the selected channel and observation window are included.
                Aggregate, re-export, and unallocated entries are excluded at this stage
                (see Section 8).
              </P>
            </div>

            {/* Layer 2 */}
            <div className="rounded-md border border-border-primary bg-surface-tertiary p-5 space-y-3">
              <SubHeading n="5.2">Layer 2 — Channel-Level Concentration</SubHeading>
              <P>
                Supplier shares are squared and summed to produce the Herfindahl concentration
                index for each channel:
              </P>
              <MathBlock>
                C<sub>c</sub> = Σ<sub>i</sub> s<sub>i</sub><sup>2</sup>
              </MathBlock>
              <P>
                This produces a single scalar on [0,&thinsp;1] for each (country,&nbsp;channel) pair.
                No adjustments, caps, or smoothing functions are applied. The raw HHI is
                the channel output.
              </P>
            </div>

            {/* Layer 3 */}
            <div className="rounded-md border border-border-primary bg-surface-tertiary p-5 space-y-3">
              <SubHeading n="5.3">Layer 3 — Axis-Level Aggregation</SubHeading>
              <P>
                Each axis comprises one or more dependency channels. Channel-level
                concentrations are aggregated to the axis level using a{" "}
                <Strong>volume-weighted mean</Strong>:
              </P>
              <MathBlock>
                A = Σ<sub>c</sub> (V<sub>c</sub> × C<sub>c</sub>) / Σ<sub>c</sub> V<sub>c</sub>
              </MathBlock>
              <P>
                where <em>V<sub>c</sub></em> is the total bilateral volume for channel <em>c</em>{" "}
                (denominator of the share computation in Layer 1). This ensures that channels
                with larger exposure volumes exert proportionally greater influence on the
                axis score. The weighting reflects economic materiality, not editorial judgment.
              </P>
            </div>

            {/* Layer 4 */}
            <div className="rounded-md border border-border-primary bg-surface-tertiary p-5 space-y-3">
              <SubHeading n="5.4">Layer 4 — Composite Score</SubHeading>
              <P>
                The ISI composite is computed as an <Strong>unweighted arithmetic mean</Strong>{" "}
                of all axis-level scores for which a country has valid data:
              </P>
              <MathBlock>
                ISI<sub>composite</sub> = (1/N) × Σ<sub>a=1…N</sub> A<sub>a</sub>
              </MathBlock>
              <P>
                No cross-axis weighting is applied. This is a deliberate design constraint.
                The framework does not presume which dependency domains carry greater strategic
                significance — that judgment belongs to the analyst. The composite provides a
                first-order summary; axis-level scores provide the analytical substance.
              </P>
            </div>
          </section>

          {/* ══════════════════════════════════════════════════════
              6. AXIS COVERAGE
              ══════════════════════════════════════════════════════ */}
          <section className="space-y-4">
            <SectionHeading n="6">Axis Coverage</SectionHeading>
            <P>
              The v0.1 framework covers six strategic dependency domains. Each axis is
              independently constructed from domain-specific bilateral data sources and
              follows the shared computational architecture described in Section&nbsp;5.
            </P>
            <div className="overflow-x-auto">
              <table className="min-w-full text-[14px]">
                <thead>
                  <tr className="border-b-2 border-navy-900">
                    <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-[0.1em] text-text-quaternary">
                      Axis
                    </th>
                    <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-[0.1em] text-text-quaternary">
                      Domain
                    </th>
                    <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-[0.1em] text-text-quaternary">
                      Observation Basis
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border-subtle">
                    <td className="px-4 py-2 font-medium text-text-secondary">Energy</td>
                    <td className="px-4 py-2 text-text-tertiary">Fossil fuel and electricity import concentration</td>
                    <td className="px-4 py-2 text-text-tertiary">Bilateral trade flows</td>
                  </tr>
                  <tr className="border-b border-border-subtle">
                    <td className="px-4 py-2 font-medium text-text-secondary">Critical Inputs</td>
                    <td className="px-4 py-2 text-text-tertiary">Raw materials and critical mineral import concentration</td>
                    <td className="px-4 py-2 text-text-tertiary">Bilateral trade flows</td>
                  </tr>
                  <tr className="border-b border-border-subtle">
                    <td className="px-4 py-2 font-medium text-text-secondary">Technology</td>
                    <td className="px-4 py-2 text-text-tertiary">Semiconductor and advanced technology import concentration</td>
                    <td className="px-4 py-2 text-text-tertiary">Bilateral trade flows</td>
                  </tr>
                  <tr className="border-b border-border-subtle">
                    <td className="px-4 py-2 font-medium text-text-secondary">Defense</td>
                    <td className="px-4 py-2 text-text-tertiary">Military equipment and arms transfer concentration</td>
                    <td className="px-4 py-2 text-text-tertiary">Bilateral transfer records</td>
                  </tr>
                  <tr className="border-b border-border-subtle">
                    <td className="px-4 py-2 font-medium text-text-secondary">Financial</td>
                    <td className="px-4 py-2 text-text-tertiary">Banking, investment, and financial services exposure concentration</td>
                    <td className="px-4 py-2 text-text-tertiary">Bilateral financial positions</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-medium text-text-secondary">Logistics</td>
                    <td className="px-4 py-2 text-text-tertiary">Freight, shipping, and supply chain routing concentration</td>
                    <td className="px-4 py-2 text-text-tertiary">Bilateral trade flows</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <P>
              Detailed channel definitions, data source citations, inclusion/exclusion criteria,
              and known limitations for each axis are published on the corresponding{" "}
              <Link href="/" className="text-navy-700 hover:text-navy-900">axis detail pages</Link>,
              which are generated from the backend axis registry.
            </P>
          </section>

          {/* ══════════════════════════════════════════════════════
              7. NO NORMALISATION PRINCIPLE
              ══════════════════════════════════════════════════════ */}
          <section className="space-y-4">
            <SectionHeading n="7">No Normalisation Principle</SectionHeading>
            <P>
              ISI scores are not normalised, rescaled, z-scored, percentile-ranked, or
              subjected to any distributional transformation. This is a foundational design
              decision with the following rationale:
            </P>
            <ul className="list-inside list-disc space-y-2 text-[14px] text-text-tertiary">
              <li>
                <Strong>Cardinal interpretability.</Strong> A score of 0.3200 means the sum
                of squared supplier shares equals 0.3200. This interpretation is stable across
                time, across axes, and across framework versions.
              </li>
              <li>
                <Strong>Cross-temporal comparability.</Strong> If normalisation were applied
                relative to the current distribution, a country&apos;s score would change when
                other countries&apos; data changes — even if its own supplier structure remained
                constant. Unnormalised scores avoid this contamination.
              </li>
              <li>
                <Strong>Audit transparency.</Strong> Any analyst with access to the underlying
                bilateral data can reproduce the published score by computing shares and summing
                squares. No knowledge of distributional parameters is required.
              </li>
              <li>
                <Strong>No artificial discrimination.</Strong> Normalisation would inflate
                differences in regions of the distribution where true variance is low, creating
                false separation between structurally similar countries.
              </li>
            </ul>
          </section>

          {/* ══════════════════════════════════════════════════════
              8. REPRODUCIBILITY & AUDIT STANDARDS
              ══════════════════════════════════════════════════════ */}
          <section className="space-y-4">
            <SectionHeading n="8">Reproducibility &amp; Audit Standards</SectionHeading>
            <P>
              The ISI is designed for deterministic reproducibility. The following standards
              apply to all published outputs:
            </P>

            <SubHeading n="8.1">Deterministic Pipeline</SubHeading>
            <P>
              All computation is performed by a deterministic export pipeline. No random
              sampling, Monte Carlo estimation, or machine learning inference is used at
              any stage. Identical source data produces identical outputs on every execution.
            </P>

            <SubHeading n="8.2">Public Data Provenance</SubHeading>
            <P>
              All underlying bilateral data is sourced from publicly accessible datasets
              maintained by international statistical authorities. Source identifiers,
              observation windows, and extraction parameters are documented in the axis
              registry metadata for each published version.
            </P>

            <SubHeading n="8.3">Audit Artifacts</SubHeading>
            <P>
              The API layer publishes structured audit breakdowns at the country-axis level,
              exposing intermediate values including channel-level concentrations, supplier
              counts, volume weights, and top-partner shares. These artifacts enable
              third-party verification without requiring access to the computation pipeline.
            </P>

            <SubHeading n="8.4">Exclusion Documentation</SubHeading>
            <P>
              All systematic exclusions are documented. Common exclusions across axes include:
            </P>
            <ul className="list-inside list-disc space-y-1.5 text-[14px] text-text-tertiary">
              <li>Aggregate partner codes (e.g., &ldquo;World&rdquo;, &ldquo;Unspecified&rdquo;, regional totals)</li>
              <li>Re-export and transit-trade entries where identifiable</li>
              <li>Observation records with zero or negative reported values</li>
              <li>Countries with insufficient bilateral coverage for reliable share computation</li>
            </ul>
            <P>
              Axis-specific exclusions are documented on the relevant axis detail pages.
            </P>
          </section>

          {/* ══════════════════════════════════════════════════════
              9. STRUCTURAL LIMITATIONS
              ══════════════════════════════════════════════════════ */}
          <section className="space-y-4">
            <SectionHeading n="9">Structural Limitations</SectionHeading>
            <P>
              The following limitations apply to the v0.1 framework and should be considered
              when interpreting published outputs:
            </P>
            <div className="space-y-3">
              <div className="rounded-md border border-border-primary p-4">
                <p className="text-[13px] font-medium text-text-secondary">Static observation window</p>
                <p className="mt-1 text-[13px] leading-relaxed text-text-tertiary">
                  Scores reflect concentration at a single observation period. Temporal
                  dynamics, trend direction, and adjustment velocity are not captured.
                </p>
              </div>
              <div className="rounded-md border border-border-primary p-4">
                <p className="text-[13px] font-medium text-text-secondary">Reporter-side perspective only</p>
                <p className="mt-1 text-[13px] leading-relaxed text-text-tertiary">
                  All shares are computed from the importing country&apos;s reported data.
                  Mirror statistics (exporter-reported) are not cross-validated in v0.1.
                  Discrepancies between reporter and partner records are a known limitation
                  of bilateral trade statistics.
                </p>
              </div>
              <div className="rounded-md border border-border-primary p-4">
                <p className="text-[13px] font-medium text-text-secondary">No intra-/extra-EU distinction</p>
                <p className="mt-1 text-[13px] leading-relaxed text-text-tertiary">
                  All bilateral partners are treated equivalently. Imports from another EU
                  member state are treated identically to imports from a non-EU supplier.
                  This may overstate external dependency for countries with high intra-EU
                  trade concentration.
                </p>
              </div>
              <div className="rounded-md border border-border-primary p-4">
                <p className="text-[13px] font-medium text-text-secondary">Domestic production not modelled</p>
                <p className="mt-1 text-[13px] leading-relaxed text-text-tertiary">
                  The framework measures concentration of imports, not overall supply.
                  A country that produces 95% of an input domestically and imports 5% from
                  one supplier will register a concentration score of 1.0 on that channel.
                  The domestic share is outside the measurement boundary.
                </p>
              </div>
              <div className="rounded-md border border-border-primary p-4">
                <p className="text-[13px] font-medium text-text-secondary">Data coverage heterogeneity</p>
                <p className="mt-1 text-[13px] leading-relaxed text-text-tertiary">
                  Not all countries report bilateral flows with equal completeness across all
                  channels and axes. Coverage gaps may result in missing axis scores or
                  artificially elevated concentration where only partial partner data is
                  available. The number of scored axes per country is published alongside
                  all outputs.
                </p>
              </div>
              <div className="rounded-md border border-border-primary p-4">
                <p className="text-[13px] font-medium text-text-secondary">Equal composite weighting</p>
                <p className="mt-1 text-[13px] leading-relaxed text-text-tertiary">
                  The composite score weights all axes equally. This does not imply that
                  all dependency domains are of equal strategic significance. The equal-weight
                  design is a methodological neutrality constraint, not an analytical claim.
                </p>
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════════════════════
              10. VERSIONING & FORWARD COMPATIBILITY
              ══════════════════════════════════════════════════════ */}
          <section className="space-y-4">
            <SectionHeading n="10">Versioning &amp; Forward Compatibility</SectionHeading>
            <P>
              The ISI framework is versioned to ensure methodological traceability. All
              published outputs are tagged with a framework version identifier. The following
              versioning principles apply:
            </P>
            <ul className="list-inside list-disc space-y-2 text-[14px] text-text-tertiary">
              <li>
                <Strong>Version immutability.</Strong> Once a version is published, its
                methodological specification is frozen. Corrections to published versions
                are issued as errata, not as silent modifications.
              </li>
              <li>
                <Strong>Backward traceability.</Strong> Each version documents all
                methodological parameters, data source identifiers, observation windows,
                and exclusion rules in sufficient detail for full reproduction.
              </li>
              <li>
                <Strong>Forward extensibility.</Strong> The layered architecture is designed
                to accommodate additional axes, alternative aggregation rules, and expanded
                geographic scope without requiring changes to existing axis computations.
                New axes extend the framework; they do not retroactively alter existing scores.
              </li>
              <li>
                <Strong>Breaking change protocol.</Strong> Changes to the concentration
                formula, share computation methodology, or classification thresholds constitute
                breaking changes and require a major version increment.
              </li>
            </ul>
          </section>

          {/* ══════════════════════════════════════════════════════
              VERSION DECLARATION
              ══════════════════════════════════════════════════════ */}
          <section className="mt-16 border-t-2 border-navy-900 pt-6">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-quaternary">
                Framework Version
              </p>
              <p className="font-serif text-[18px] font-semibold text-text-primary">
                {latest ? latest.label : "ISI Methodological Framework"}
              </p>
              <div className="mt-3 space-y-1 text-[13px] text-text-tertiary">
                {latest && (
                  <>
                    <p><Strong>Version:</Strong> {latest.methodology_version}</p>
                    <p><Strong>Frozen at:</Strong> {new Date(latest.frozen_at).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })}</p>
                    <p><Strong>Years available:</Strong> {latest.years_available.join(", ")}</p>
                    <p><Strong>Axes:</Strong> {latest.axis_count}</p>
                    <p><Strong>Aggregation:</Strong> {formatEnum(latest.aggregation_rule)}</p>
                  </>
                )}
                <p><Strong>Scope:</Strong> EU-27 (founding release cohort)</p>
                <p><Strong>Concentration measure:</Strong> Herfindahl-Hirschman Index (C&nbsp;=&nbsp;Σ&nbsp;s<sub>i</sub><sup>2</sup>)</p>
                <p><Strong>Normalisation:</Strong> None</p>
                <p><Strong>Classification thresholds:</Strong> 0.15 / 0.25 / 0.50</p>
              </div>
              <p className="mt-4 text-[11px] text-text-quaternary">
                This document describes the methodological foundations of the ISI as published.
                It does not constitute a forecast of future framework development.
              </p>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
