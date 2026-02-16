"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { RadarChart } from "@/components/RadarChart";
import { StatusBadge } from "@/components/StatusBadge";
import { ErrorPanel } from "@/components/ErrorPanel";
import {
  formatScore,
  deviationFromMean,
  countryHref,
} from "@/lib/format";
import { getCanonicalAxisName, FIELD_TO_SLUG } from "@/lib/axisRegistry";
import type { ISIComposite, ISICompositeCountry } from "@/lib/types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Client-side fetch dedup ────────────────────────────────────────
// Prevents duplicate /isi fetches on StrictMode double-mount or
// rapid re-renders. Cache lives for the page session only.
let _isiCache: { data: ISIComposite; ts: number } | null = null;
const ISI_CACHE_TTL = 60_000; // 60 seconds

async function fetchISIOnce(): Promise<ISIComposite> {
  if (_isiCache && Date.now() - _isiCache.ts < ISI_CACHE_TTL) {
    return _isiCache.data;
  }
  const r = await fetch(`${API}/isi`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const d: ISIComposite = await r.json();
  _isiCache = { data: d, ts: Date.now() };
  return d;
}

export default function ComparePage() {
  const [data, setData] = useState<ISIComposite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [codeA, setCodeA] = useState("");
  const [codeB, setCodeB] = useState("");

  useEffect(() => {
    fetchISIOnce()
      .then((d) => setData(d))
      .catch((e) => setError(e.message));
  }, []);

  const countries = useMemo(
    () =>
      data?.countries
        .filter((c) => c.isi_composite !== null)
        .sort((a, b) => a.country_name.localeCompare(b.country_name)) ?? [],
    [data],
  );

  const countryA = countries.find((c) => c.country === codeA) ?? null;
  const countryB = countries.find((c) => c.country === codeB) ?? null;
  const meanComposite = data?.statistics.mean ?? null;

  // Discover axis fields dynamically from first country
  const axisKeys = useMemo(() => {
    if (!countries.length) return [];
    const sample = countries[0];
    const keys: string[] = [];
    const seen = new Set<string>();
    for (const key of Object.keys(sample)) {
      const m = key.match(/^(axis_\d+)_/);
      if (m && !seen.has(m[1])) {
        seen.add(m[1]);
        keys.push(m[1]); // e.g. "axis_1"
      }
    }
    return keys.sort();
  }, [countries]);

  function getAxisScore(
    c: ISICompositeCountry,
    prefix: string,
  ): number | null {
    // ISICompositeCountry has fields like axis_1_financial, axis_2_energy — the field IS the score
    // Find the field that starts with the prefix
    const record = c as unknown as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      if (key.startsWith(prefix + "_") && key !== prefix + "_name" && key !== prefix + "_slug") {
        const val = record[key];
        if (typeof val === "number" || val === null) return val as number | null;
      }
    }
    return null;
  }

  function getAxisSlug(
    c: ISICompositeCountry,
    prefix: string,
  ): string {
    // Resolve slug from field key, e.g. axis_1 → find axis_1_financial → slug "financial"
    const record = c as unknown as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      if (key.startsWith(prefix + "_") && key !== prefix + "_name" && key !== prefix + "_slug") {
        const slug = FIELD_TO_SLUG[key];
        if (slug) return slug;
        // Fallback: extract suffix
        return key.slice(prefix.length + 1);
      }
    }
    return prefix;
  }

  function getAxisName(
    c: ISICompositeCountry,
    prefix: string,
  ): string {
    return getCanonicalAxisName(getAxisSlug(c, prefix));
  }

  // Build radar axes from discovered keys — slug-based, labels resolved by RadarChart
  const radarAxesA = countryA
    ? axisKeys.map((k) => ({
        slug: getAxisSlug(countryA, k),
        value: getAxisScore(countryA, k),
      }))
    : [];
  const radarAxesB = countryB
    ? axisKeys.map((k) => ({
        slug: getAxisSlug(countryB, k),
        value: getAxisScore(countryB, k),
      }))
    : [];

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <main className="mx-auto max-w-[1400px] px-6 py-10 lg:px-16">
          <ErrorPanel
            title="Data temporarily unavailable"
            message="Backend unreachable. Please try again later."
            endpoint="/isi"
          />
        </main>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-white">
        <main className="mx-auto max-w-[1400px] px-6 py-10 lg:px-16">
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-48 bg-surface-tertiary" />
            <div className="h-64 bg-surface-tertiary" />
          </div>
        </main>
      </div>
    );
  }

  const ready = countryA && countryB && codeA !== codeB;

  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-[1400px] px-6 lg:px-16">
        {/* ── Header ─────────────────────────────────────────── */}
        <section className="pt-10">
          <h1 className="font-serif text-[40px] font-bold leading-[1.15] tracking-tight text-text-primary">
            Comparative Analysis
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-text-tertiary">
            Select two EU member states to compare their ISI profiles
            side-by-side.
          </p>
        </section>

        {/* ── Country Selectors ─────────────────────────────── */}
        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.14em] text-text-quaternary">
              Country A
            </label>
            <select
              value={codeA}
              onChange={(e) => setCodeA(e.target.value)}
              className="w-full border-b border-border-primary bg-surface-primary px-3 py-2.5 text-[14px] text-text-primary focus:border-navy-700 focus:outline-none"
            >
              <option value="">— Select —</option>
              {countries.map((c) => (
                <option key={c.country} value={c.country}>
                  {c.country_name} ({c.country})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.14em] text-text-quaternary">
              Country B
            </label>
            <select
              value={codeB}
              onChange={(e) => setCodeB(e.target.value)}
              className="w-full border-b border-border-primary bg-surface-primary px-3 py-2.5 text-[14px] text-text-primary focus:border-navy-700 focus:outline-none"
            >
              <option value="">— Select —</option>
              {countries.map((c) => (
                <option key={c.country} value={c.country}>
                  {c.country_name} ({c.country})
                </option>
              ))}
            </select>
          </div>
        </section>

        {codeA === codeB && codeA !== "" && (
          <p className="mt-4 text-[14px] text-severity-medium">
            Select two different countries for comparison.
          </p>
        )}

        {ready && countryA && countryB && (
          <>
            {/* ── Composite Comparison KPIs ──────────────────── */}
            <section className="mt-12 rounded-md border border-border-primary">
              <div className="px-5 py-4">
                <h2 className="font-serif text-[26px] font-semibold tracking-tight text-text-primary">
                  Composite Comparison
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-[14px]">
                  <thead>
                    <tr className="border-b-2 border-navy-900 text-[11px] uppercase tracking-[0.1em] text-text-quaternary">
                      <th className="px-4 py-3 text-left font-medium">
                        Metric
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        {countryA.country_name}
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        {countryB.country_name}
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        Delta (A − B)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border-subtle">
                      <td className="px-4 py-2.5 text-text-secondary">
                        ISI Composite
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold text-text-primary">
                        {formatScore(countryA.isi_composite)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold text-text-primary">
                        {formatScore(countryB.isi_composite)}
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right font-mono ${
                          countryA.isi_composite !== null &&
                          countryB.isi_composite !== null
                            ? countryA.isi_composite - countryB.isi_composite >
                              0
                              ? "text-deviation-positive"
                              : "text-deviation-negative"
                            : "text-text-quaternary"
                        }`}
                      >
                        {countryA.isi_composite !== null &&
                        countryB.isi_composite !== null
                          ? `${countryA.isi_composite - countryB.isi_composite >= 0 ? "+" : ""}${(countryA.isi_composite - countryB.isi_composite).toFixed(4)}`
                          : "—"}
                      </td>
                    </tr>
                    <tr className="border-b border-border-subtle">
                      <td className="px-4 py-2.5 text-text-secondary">
                        Classification
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <StatusBadge
                          classification={countryA.classification}
                        />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <StatusBadge
                          classification={countryB.classification}
                        />
                      </td>
                      <td className="px-4 py-2.5" />
                    </tr>
                    <tr className="border-b border-border-subtle">
                      <td className="px-4 py-2.5 text-text-secondary">
                        Δ EU Mean
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right font-mono ${
                          (deviationFromMean(
                            countryA.isi_composite,
                            meanComposite,
                          ) ?? 0) > 0
                            ? "text-deviation-positive"
                            : "text-deviation-negative"
                        }`}
                      >
                        {(() => {
                          const d = deviationFromMean(
                            countryA.isi_composite,
                            meanComposite,
                          );
                          return d !== null
                            ? `${d >= 0 ? "+" : ""}${d.toFixed(4)}`
                            : "—";
                        })()}
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right font-mono ${
                          (deviationFromMean(
                            countryB.isi_composite,
                            meanComposite,
                          ) ?? 0) > 0
                            ? "text-deviation-positive"
                            : "text-deviation-negative"
                        }`}
                      >
                        {(() => {
                          const d = deviationFromMean(
                            countryB.isi_composite,
                            meanComposite,
                          );
                          return d !== null
                            ? `${d >= 0 ? "+" : ""}${d.toFixed(4)}`
                            : "—";
                        })()}
                      </td>
                      <td className="px-4 py-2.5" />
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* ── Radar Overlay ──────────────────────────────── */}
            <section className="mt-12 rounded-md border border-border-primary p-4 sm:p-6">
              <h2 className="font-serif text-[26px] font-semibold tracking-tight text-text-primary">
                Multi-Axis Profile Overlay
              </h2>
              <div className="mt-6 flex w-full items-center justify-center">
                <RadarChart
                  axes={radarAxesA}
                  compareAxes={radarAxesB}
                  compareLabel={countryB.country_name}
                  label={countryA.country_name}
                />
              </div>
            </section>

            {/* ── Per-Axis Delta Table ───────────────────────── */}
            <section className="mt-12 rounded-md border border-border-primary">
              <div className="px-5 py-4">
                <h2 className="font-serif text-[26px] font-semibold tracking-tight text-text-primary">
                  Axis-by-Axis Comparison
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-[14px]">
                  <thead>
                    <tr className="border-b-2 border-navy-900 text-[11px] uppercase tracking-[0.1em] text-text-quaternary">
                      <th className="px-4 py-3 text-left font-medium">
                        Axis
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        {countryA.country_name}
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        {countryB.country_name}
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        Delta
                      </th>
                      <th className="px-4 py-3 text-center font-medium">
                        More Concentrated
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {axisKeys.map((k) => {
                      const sA = getAxisScore(countryA, k);
                      const sB = getAxisScore(countryB, k);
                      const name = getAxisName(countryA, k);
                      const delta =
                        sA !== null && sB !== null ? sA - sB : null;
                      const moreConcentrated =
                        delta !== null
                          ? delta > 0
                            ? "A"
                            : delta < 0
                              ? "B"
                              : "="
                          : null;

                      return (
                        <tr
                          key={k}
                          className="border-b border-border-subtle transition-colors hover:bg-surface-tertiary"
                        >
                          <td className="px-4 py-2.5 text-text-secondary">
                            {name}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-text-primary">
                            {formatScore(sA)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-text-primary">
                            {formatScore(sB)}
                          </td>
                          <td
                            className={`px-4 py-2.5 text-right font-mono ${
                              delta !== null && delta > 0
                                ? "text-deviation-positive"
                                : delta !== null && delta < 0
                                  ? "text-deviation-negative"
                                  : "text-text-quaternary"
                            }`}
                          >
                            {delta !== null
                              ? `${delta >= 0 ? "+" : ""}${delta.toFixed(4)}`
                              : "—"}
                          </td>
                          <td className="px-4 py-2.5 text-center text-[11px] font-semibold">
                            {moreConcentrated === "A" ? (
                              <span className="text-deviation-positive">
                                {countryA.country}
                              </span>
                            ) : moreConcentrated === "B" ? (
                              <span className="text-deviation-positive">
                                {countryB.country}
                              </span>
                            ) : moreConcentrated === "=" ? (
                              <span className="text-text-quaternary">
                                Equal
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ── Deep Dive Links ────────────────────────────── */}
            <section className="mt-12 mb-16 flex gap-3">
              <Link
                href={countryHref(countryA.country)}
                className="rounded-md border border-border-primary bg-surface-tertiary px-4 py-2.5 text-[13px] text-text-secondary transition-colors hover:bg-stone-100">
                View {countryA.country_name} Profile →
              </Link>
              <Link
                href={countryHref(countryB.country)}
                className="rounded-md border border-border-primary bg-surface-tertiary px-4 py-2.5 text-[13px] text-text-secondary transition-colors hover:bg-stone-100">
                View {countryB.country_name} Profile →
              </Link>
            </section>
          </>
        )}

        {!ready && codeA === "" && codeB === "" && (
          <section className="mt-12 mb-16 rounded-md border border-border-primary bg-surface-tertiary p-10 text-center">
            <p className="text-[14px] text-text-tertiary">
              Select two countries above to begin the comparison.
            </p>
            <p className="mt-2 text-[12px] text-text-quaternary">
              The comparative view overlays radar profiles, computes per-axis
              deltas, and highlights structural divergence between member
              states.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
