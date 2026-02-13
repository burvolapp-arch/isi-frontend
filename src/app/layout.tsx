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
    default: "International Sovereignty Index",
    template: "%s — ISI",
  },
  description:
    "EU-27 Dependency Analysis Framework by the International Sovereignty Institute.",
};

const NAV_ITEMS = [
  { href: "/", label: "Overview" },
  { href: "/methodology", label: "Methodology" },
  { href: "/transparency", label: "Transparency" },
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
        {/* ── Global Header ─────────────────────────────────── */}
        <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black">
          <div className="mx-auto max-w-7xl px-6 py-4">
            <div className="flex items-start justify-between">
              <Link href="/" className="group">
                <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-zinc-400 group-hover:text-zinc-600 dark:text-zinc-500 dark:group-hover:text-zinc-300">
                  International Sovereignty Institute
                </p>
                <h1 className="mt-0.5 text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  International Sovereignty Index
                  <span className="ml-1.5 text-sm font-normal text-zinc-400">
                    (ISI)
                  </span>
                </h1>
              </Link>
              <p className="hidden text-right text-[11px] leading-tight text-zinc-400 sm:block dark:text-zinc-500">
                EU-27 Dependency
                <br />
                Analysis Framework
              </p>
            </div>
            <nav className="mt-3 flex gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        {/* ── Page Content ──────────────────────────────────── */}
        {children}

        {/* ── Global Footer ─────────────────────────────────── */}
        <footer className="border-t border-zinc-200 dark:border-zinc-800">
          <div className="mx-auto max-w-7xl px-6 py-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  International Sovereignty Institute
                </p>
                <p className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">
                  Pure rendering layer. All data served by backend API v0.1.
                  <br />
                  The frontend performs zero computation and contains zero
                  business logic.
                </p>
              </div>
              <div className="flex gap-4 text-[11px] text-zinc-400 dark:text-zinc-500">
                <Link
                  href="/methodology"
                  className="hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                  Methodology
                </Link>
                <Link
                  href="/transparency"
                  className="hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                  Transparency
                </Link>
                <Link
                  href="/faq"
                  className="hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                  FAQ
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
