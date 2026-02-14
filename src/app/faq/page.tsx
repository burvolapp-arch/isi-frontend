import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Frequently asked questions about the International Sovereignty Index.",
};

interface FAQItem {
  q: string;
  a: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    q: "What does the ISI measure?",
    a: "The ISI measures the concentration of external dependencies for EU-27 member states across strategic axes (financial, energy, technology, defense, critical inputs, logistics). It uses a Herfindahl-Hirschman Index (HHI) framework where 0 = perfectly diversified and 1 = total concentration on a single source.",
  },
  {
    q: 'Is a high ISI score "bad"?',
    a: 'Not necessarily. A high score indicates high concentration — meaning the country depends heavily on a small number of external sources. Whether that is problematic depends on context: concentration on a stable allied partner is structurally different from concentration on an adversarial source. The ISI does not make that distinction.',
  },
  {
    q: "How is the composite calculated?",
    a: "The ISI composite is an unweighted arithmetic mean of all available axis scores for each country. No domain-weighting is applied. This means each axis contributes equally to the composite, regardless of strategic importance.",
  },
  {
    q: "Why are some country-axis scores missing?",
    a: "Data availability varies by axis and country. If a score shows as '—', it means the backend could not materialize a score for that combination. The composite is then computed over available axes only.",
  },
  {
    q: "What do the classification thresholds mean?",
    a: "Classifications follow standard HHI bands: ≥ 0.50 (Highly Concentrated), 0.25–0.49 (Moderately Concentrated), 0.15–0.24 (Mildly Concentrated), < 0.15 (Unconcentrated). These are descriptive labels, not risk assessments.",
  },
  {
    q: "Does the frontend perform any calculation?",
    a: "No. The frontend is a pure rendering layer. Every score, classification, warning, and description is served by the backend API. The frontend performs zero computation and contains zero business logic. Percentile rankings and deviation-from-mean indicators shown in the UI are the only client-side derivations, computed from the backend-provided scores.",
  },
  {
    q: "What time period does the data cover?",
    a: "The reference window is stated on every page (e.g., in the version/window labels). The data is a snapshot from that period and does not auto-update.",
  },
  {
    q: "Can I compare countries across different axes?",
    a: "Yes, but with caution. Each axis measures concentration in a different domain using potentially different data sources and methodologies. A score of 0.30 in Financial does not mean the same thing as 0.30 in Defense. Always check the axis detail page for context.",
  },
  {
    q: "Where does the data come from?",
    a: "Each axis uses one or more data channels (e.g., Eurostat trade data, IEA energy data). The specific sources are documented on each axis detail page under 'Data Sources & Channels'.",
  },
  {
    q: "How do I report an error?",
    a: "If you believe a score is incorrect, the issue is in the backend data pipeline, not in the frontend. Please report it via the project's GitHub repository.",
  },
];

export default function FAQPage() {
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
            Frequently Asked Questions
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-text-tertiary">
            Common questions about the International Sovereignty Index.
          </p>
        </div>

        <div className="mt-12 max-w-3xl space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <section
              key={i}
              className="rounded-md border border-border-primary bg-surface-tertiary p-5"
            >
              <h2 className="text-[14px] font-semibold text-text-secondary">
                {item.q}
              </h2>
              <p className="mt-1.5 text-[14px] leading-relaxed text-text-tertiary">
                {item.a}
              </p>
            </section>
          ))}
        </div>
        <div className="mb-16" />
      </main>
    </div>
  );
}
