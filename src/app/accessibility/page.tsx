import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Accessibility",
  description:
    "Accessibility commitment and conformance statement for the International Sovereignty Index.",
};

export default function AccessibilityPage() {
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
            Accessibility Statement
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-text-tertiary">
            Commitment to accessible publication of public interest research data.
          </p>
        </div>

        <div className="mt-12 max-w-3xl space-y-10 pb-20">

          {/* Commitment */}
          <section className="space-y-4">
            <h2 className="font-serif text-[20px] font-semibold text-text-secondary">
              Commitment
            </h2>
            <p className="text-[14px] leading-[1.75] text-text-tertiary">
              The International Sovereignty Institute is committed to ensuring that the
              International Sovereignty Index is accessible to the widest possible audience,
              including persons with disabilities. We aim to conform to the{" "}
              <strong className="text-text-secondary">
                Web Content Accessibility Guidelines (WCAG) 2.1, Level AA
              </strong>{" "}
              as published by the World Wide Web Consortium (W3C).
            </p>
          </section>

          {/* Measures */}
          <section className="space-y-4">
            <h2 className="font-serif text-[20px] font-semibold text-text-secondary">
              Measures Taken
            </h2>
            <ul className="list-inside list-disc space-y-2 text-[14px] text-text-tertiary">
              <li>
                <strong className="text-text-secondary">Semantic HTML.</strong>{" "}
                All pages use semantic HTML5 elements including proper heading
                hierarchy, landmark regions, and table markup.
              </li>
              <li>
                <strong className="text-text-secondary">Keyboard navigation.</strong>{" "}
                All interactive elements are accessible via keyboard. Focus
                indicators are visible on all focusable elements.
              </li>
              <li>
                <strong className="text-text-secondary">Colour contrast.</strong>{" "}
                Text and interactive elements meet WCAG AA contrast ratio
                requirements against their backgrounds. The map visualisation
                uses a sequential blue palette designed for perceptual ordering
                and colourblind safety.
              </li>
              <li>
                <strong className="text-text-secondary">Data export.</strong>{" "}
                All published data is available in machine-readable formats
                (CSV and JSON) for assistive technology users or those who
                cannot interact with visual components.
              </li>
              <li>
                <strong className="text-text-secondary">Tabular data.</strong>{" "}
                All data tables use proper <code className="font-mono text-[13px] text-text-secondary">thead</code>,{" "}
                <code className="font-mono text-[13px] text-text-secondary">tbody</code>, and{" "}
                <code className="font-mono text-[13px] text-text-secondary">th</code> markup
                for screen reader compatibility.
              </li>
              <li>
                <strong className="text-text-secondary">Responsive design.</strong>{" "}
                The interface adapts to all viewport sizes and supports text
                scaling up to 200% without loss of content or functionality.
              </li>
            </ul>
          </section>

          {/* Known Limitations */}
          <section className="space-y-4">
            <h2 className="font-serif text-[20px] font-semibold text-text-secondary">
              Known Limitations
            </h2>
            <ul className="list-inside list-disc space-y-2 text-[14px] text-text-tertiary">
              <li>
                <strong className="text-text-secondary">SVG charts.</strong>{" "}
                Radar charts, distribution histograms, and the choropleth map
                use SVG rendering which may not be fully interpretable by all
                screen readers. Equivalent data is available in tabular form
                and via data export.
              </li>
              <li>
                <strong className="text-text-secondary">Dynamic content.</strong>{" "}
                The Scenario Laboratory and Compare pages use client-side
                rendering which may not announce state changes to all assistive
                technologies. We are working to improve ARIA live region coverage.
              </li>
            </ul>
          </section>

          {/* Standards Reference */}
          <section className="rounded-md border border-border-primary bg-surface-tertiary p-6">
            <h2 className="font-serif text-[20px] font-semibold text-text-secondary">
              Standards Reference
            </h2>
            <div className="mt-3 space-y-2 text-[14px] text-text-tertiary">
              <p>
                This statement references the following standards:
              </p>
              <ul className="list-inside list-disc space-y-1 pl-2">
                <li>
                  <strong className="text-text-secondary">WCAG 2.1</strong> —{" "}
                  Web Content Accessibility Guidelines, W3C Recommendation (June 2018)
                </li>
                <li>
                  <strong className="text-text-secondary">EN 301 549</strong> —{" "}
                  Accessibility requirements for ICT products and services (European Standard)
                </li>
              </ul>
            </div>
          </section>

          {/* Contact */}
          <section className="space-y-4">
            <h2 className="font-serif text-[20px] font-semibold text-text-secondary">
              Feedback &amp; Contact
            </h2>
            <p className="text-[14px] leading-[1.75] text-text-tertiary">
              If you encounter accessibility barriers while using the International
              Sovereignty Index, or if you require content in an alternative format,
              please contact us via the project&apos;s{" "}
              <a
                href="https://github.com/burvolapp-arch/isi-frontend/issues"
                className="text-navy-700 underline hover:text-navy-900"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub issue tracker
              </a>.
              We will make reasonable efforts to respond within 10 working days
              and to address identified barriers in subsequent releases.
            </p>
          </section>

          {/* Revision */}
          <section className="border-t border-border-primary pt-6">
            <p className="text-[12px] text-text-quaternary">
              This accessibility statement was last reviewed on 20 February 2026.
              It will be updated as the interface evolves.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
