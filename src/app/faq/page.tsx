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
    a: "The ISI measures the concentration of external suppliers across strategic axes (financial, energy, technology, defense, critical inputs, logistics). The inaugural release covers the EU-27 as the founding cohort. It uses a Herfindahl-Hirschman Index (HHI) framework where 0 = perfectly diversified and 1 = total concentration on a single source.",
  },
  {
    q: 'Is a high ISI score "bad"?',
    a: 'Not necessarily. A high score indicates high concentration — meaning the country sources heavily from a small number of external suppliers. Whether that is problematic depends on context: concentration on a stable allied supplier is structurally different from concentration on an adversarial source. The ISI does not make that distinction.',
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
    a: "All scores and classifications are computed server-side from documented data sources. The interface displays published outputs without transformation. Rank and deviation indicators shown in the UI are derived from the backend-provided score set.",
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

        <div className="mt-12 max-w-3xl space-y-2">
          {FAQ_ITEMS.map((item, i) => (
            <details
              key={i}
              className="group rounded-md border border-border-primary bg-white transition-[border-color] open:border-stone-300 open:bg-surface-tertiary"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-4 text-[14px] font-semibold text-text-secondary transition-colors hover:text-text-primary [&::-webkit-details-marker]:hidden">
                <span>{item.q}</span>
                <svg
                  className="h-4 w-4 shrink-0 text-text-quaternary transition-transform duration-200 group-open:rotate-45"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </summary>
              <div className="px-5 pb-4">
                <p className="text-[14px] leading-relaxed text-text-tertiary">
                  {item.a}
                </p>
              </div>
            </details>
          ))}
        </div>
        <div className="mb-16" />
      </main>
    </div>
  );
}
