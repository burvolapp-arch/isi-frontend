import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ISI — International Sovereignty Index",
    template: "%s — ISI",
  },
  description:
    "International Sovereignty Index — Measuring external dependency concentration across EU-27 member states.",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* ── Institutional Header ───────────────────────── */}
        <header className="sticky top-0 z-50 border-b border-border-primary bg-surface-primary/95 backdrop-blur-sm dark:bg-surface-primary/95">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
            <Link href="/" className="flex items-baseline gap-2.5">
              <span className="text-lg font-bold tracking-tight text-text-primary">
                ISI
              </span>
              <span className="hidden text-[11px] font-medium uppercase tracking-widest text-text-quaternary sm:inline">
                International Sovereignty Index
              </span>
            </Link>
            <nav className="flex items-center gap-0.5">
              {NAV_ITEMS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="px-3 py-1.5 text-[13px] font-medium text-text-tertiary hover:text-text-primary"
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
        <footer className="border-t border-border-primary bg-surface-primary dark:bg-surface-primary">
          <div className="mx-auto max-w-7xl px-6 py-8">
            <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
              <div>
                <p className="text-[13px] font-semibold text-text-secondary">
                  International Sovereignty Index
                </p>
                <p className="mt-1 text-xs text-text-quaternary">
                  Measuring external dependency concentration across EU-27
                  member states · HHI framework
                </p>
              </div>
              <div className="flex gap-6 text-xs text-text-tertiary">
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
            <div className="mt-6 border-t border-border-subtle pt-6">
              <p className="text-[11px] leading-relaxed text-text-quaternary">
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
