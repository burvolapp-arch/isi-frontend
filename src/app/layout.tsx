import type { Metadata } from "next";
import { Inter, Source_Serif_4, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { ClarityAnalytics } from "@/lib/clarity";
import { HeaderNav } from "@/components/HeaderNav";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://isi.internationalsovereignty.org"),
  title: {
    default: "International Sovereignty Index (ISI)",
    template: "%s — ISI",
  },
  description:
    "Measuring external supplier concentration across EU-27 member states using a Herfindahl-Hirschman (HHI) framework.",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      { rel: "android-chrome", url: "/android-chrome-192x192.png" },
      { rel: "android-chrome", url: "/android-chrome-512x512.png" },
    ],
  },
  openGraph: {
    title: "International Sovereignty Index (ISI)",
    description:
      "Measuring external supplier concentration across EU-27 member states using a Herfindahl-Hirschman (HHI) framework.",
    url: "https://isi.internationalsovereignty.org",
    siteName: "International Sovereignty Index",
    images: [
      {
        url: "/android-chrome-512x512.png",
        width: 512,
        height: 512,
        alt: "International Sovereignty Institute Emblem",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "International Sovereignty Index (ISI)",
    description:
      "Measuring external supplier concentration across EU-27 member states using a Herfindahl-Hirschman (HHI) framework.",
    images: ["/android-chrome-512x512.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

const HEADER_NAV = [
  { href: "/", label: "Overview" },
  { href: "/eu-aggregate", label: "EU-27" },
  { href: "/compare", label: "Comparative" },
  { href: "/simulation", label: "Simulation" },
  { href: "/methodology", label: "Methodology" },
  { href: "/transparency", label: "Transparency" },
  { href: "/faq", label: "FAQ" },
] as const;

const FOOTER_NAV = [
  { href: "/methodology", label: "Methodology" },
  { href: "/transparency", label: "Transparency" },
  { href: "/eu-aggregate", label: "EU-27 Aggregate" },
  { href: "/simulation", label: "Simulation" },
  { href: "/compare", label: "Comparative" },
  { href: "/faq", label: "FAQ" },
  { href: "/accessibility", label: "Accessibility" },
] as const;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${sourceSerif.variable} ${jetbrainsMono.variable} min-h-screen antialiased`}
      >
        <ClarityAnalytics />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "International Sovereignty Institute",
              url: "https://isi.internationalsovereignty.org",
              logo: "https://isi.internationalsovereignty.org/android-chrome-512x512.png",
              description:
                "Independent research initiative measuring external supplier concentration across EU-27 member states using a Herfindahl-Hirschman (HHI) framework.",
            }),
          }}
        />

        <div className="flex min-h-screen flex-col">
          {/* ── Header ─────────────────────────────────────── */}
          <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-navy-900/95 backdrop-blur-md">
            <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3 sm:px-6 sm:py-4 lg:px-16">
              <Link href="/" className="flex shrink-0 items-baseline gap-2 sm:gap-3">
                <span className="font-serif text-lg font-bold tracking-tight text-white sm:text-xl">
                  ISI
                </span>
                <span className="hidden text-[11px] font-medium uppercase tracking-[0.18em] text-stone-400 sm:inline">
                  International Sovereignty Index
                </span>
              </Link>
              <HeaderNav items={HEADER_NAV} />
            </div>
          </header>

          {/* ── Main Content ───────────────────────────────── */}
          <main className="flex-1">{children}</main>

          {/* ── Footer ─────────────────────────────────────── */}
          <footer className="border-t border-border-primary bg-stone-50">
            <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-12 lg:px-16">

              {/* Block A (top): Citation + Downloads */}
              <div>
                <h3 className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
                  Cite the ISI
                </h3>
                <p className="mt-3 rounded border border-border-primary bg-white px-4 py-3.5 font-mono text-[11px] leading-relaxed text-text-tertiary sm:text-[12px]">
                  International Sovereignty Index (2026).{" "}
                  <em>
                    External Supplier Concentration in EU-27 Member States.
                  </em>{" "}
                  internationalsovereignty.org. Retrieved{" "}
                  {new Date().toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                  .
                </p>
                <div className="mt-3 flex gap-4 text-[12px]">
                  <a
                    href="/api/export/csv"
                    download
                    className="min-h-[44px] flex items-center gap-1.5 text-text-tertiary transition-colors hover:text-text-primary sm:min-h-0"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                    CSV
                  </a>
                  <a
                    href="/api/export/json"
                    download
                    className="min-h-[44px] flex items-center gap-1.5 text-text-tertiary transition-colors hover:text-text-primary sm:min-h-0"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                    JSON
                  </a>
                </div>
              </div>

              {/* Divider */}
              <div className="mt-6 border-t border-border-primary sm:mt-8" />

              {/* Block B (bottom): Identity + Nav + Disclaimer */}
              <div className="mt-6 sm:mt-8">
                <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-serif text-[15px] font-semibold text-text-primary">
                      International Sovereignty Index
                    </p>
                    <p className="mt-1 text-[13px] text-text-quaternary">
                      Measuring external supplier concentration across EU-27
                      member states · HHI framework
                    </p>
                  </div>
                  <nav className="flex flex-col gap-3 text-[13px] text-text-tertiary sm:flex-row sm:gap-5">
                    {FOOTER_NAV.map(({ href, label }) => (
                      <Link
                        key={href}
                        href={href}
                        className="min-h-[44px] flex items-center transition-colors hover:text-text-primary sm:min-h-0"
                      >
                        {label}
                      </Link>
                    ))}
                  </nav>
                </div>
                <p className="mt-6 text-[11px] leading-relaxed text-text-quaternary">
                  All scores and classifications are computed server-side from documented data sources. The interface displays published outputs without transformation.
                </p>
              </div>

            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}