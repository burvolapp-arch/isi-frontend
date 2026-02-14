import type { Metadata } from "next";
import { Inter, Source_Serif_4, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
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
    "Measuring external dependency concentration across EU-27 member states using a Herfindahl-Hirschman (HHI) framework.",
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
      "Measuring external dependency concentration across EU-27 member states using a Herfindahl-Hirschman (HHI) framework.",
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
      "Measuring external dependency concentration across EU-27 member states using a Herfindahl-Hirschman (HHI) framework.",
    images: ["/android-chrome-512x512.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

const NAV_ITEMS = [
  { href: "/", label: "Overview" },
  { href: "/methodology", label: "Methodology" },
  { href: "/transparency", label: "Transparency" },
  { href: "/compare", label: "Compare" },
  { href: "/faq", label: "FAQ" },
] as const;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${sourceSerif.variable} ${jetbrainsMono.variable} antialiased`}
      >
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
                "Independent research initiative measuring external dependency concentration across EU-27 member states using a Herfindahl-Hirschman (HHI) framework.",
            }),
          }}
        />
        {/* ── Institutional Header ───────────────────────── */}
        <header className="sticky top-0 z-50 bg-navy-900">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4 lg:px-16">
            <Link href="/" className="flex items-baseline gap-3">
              <span className="font-serif text-xl font-bold tracking-tight text-white">
                ISI
              </span>
              <span className="hidden text-[11px] font-medium uppercase tracking-[0.18em] text-stone-400 sm:inline">
                International Sovereignty Index
              </span>
            </Link>
            <nav className="flex items-center gap-1">
              {NAV_ITEMS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="px-3 py-1.5 text-[13px] text-stone-400 transition-colors hover:text-white"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        {/* ── Page Content ───────────────────────────────── */}
        {children}

        {/* ── Institutional Footer ───────────────────────── */}
        <footer className="border-t border-border-primary bg-surface-primary">
          <div className="mx-auto max-w-[1400px] px-6 py-8 lg:px-16">
            <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
              <div>
                <p className="font-serif text-[15px] font-semibold text-text-primary">
                  International Sovereignty Index
                </p>
                <p className="mt-1 text-[13px] text-text-quaternary">
                  Measuring external dependency concentration across EU-27
                  member states · HHI framework
                </p>
              </div>
              <div className="flex gap-6 text-[13px] text-text-tertiary">
                <Link href="/methodology" className="hover:text-text-primary">
                  Methodology
                </Link>
                <Link href="/transparency" className="hover:text-text-primary">
                  Transparency
                </Link>
                <Link href="/compare" className="hover:text-text-primary">
                  Comparative
                </Link>
                <Link href="/faq" className="hover:text-text-primary">
                  FAQ
                </Link>
              </div>
            </div>
            <div className="mt-8 border-t border-border-subtle pt-8">
              <p className="max-w-3xl text-[12px] leading-relaxed text-text-quaternary">
                This frontend is a pure rendering layer. It performs zero
                computation and contains zero business logic. All scores,
                classifications, and descriptions are served verbatim from the
                backend API. If a number appears incorrect, the issue is in the
                backend materialization pipeline.
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}