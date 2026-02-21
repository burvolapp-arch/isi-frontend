"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { RadarChart } from "@/components/RadarChart";
import { StatusBadge } from "@/components/StatusBadge";
import { ErrorPanel } from "@/components/ErrorPanel";
import { countryHref } from "@/lib/format";
import { AXIS_FIELD_MAP, type AxisSlug, ALL_AXIS_SLUGS } from "@/lib/axisRegistry";
import {
  formatAxisShort,
  formatScore,
  formatDelta,
} from "@/lib/presentation";
import {
  computeStructuralDiagnostic,
  computeCompositePercentile,
  divergenceLabel,
  symmetryLabel,
  profileLabel,
  buildExportSnapshot,
  type StructuralDiagnostic,
} from "@/lib/comparativeAnalysis";
import type { ISIComposite, ISICompositeCountry } from "@/lib/types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Client-side fetch dedup ────────────────────────────────────────
let _isiCache: { data: ISIComposite; ts: number } | null = null;
const ISI_CACHE_TTL = 60_000;

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

// ── Helpers ─────────────────────────────────────────────────────────

function getAxisScore(c: ISICompositeCountry, slug: AxisSlug): number | null {
  const field = AXIS_FIELD_MAP[slug];
  const val = (c as unknown as Record<string, unknown>)[field];
  return typeof val === "number" ? val : null;
}

/** Divergence heatmap cell intensity (0–1) based on absolute delta */
function heatIntensity(absDelta: number, maxAbsDelta: number): number {
  if (maxAbsDelta === 0) return 0;
  return Math.min(absDelta / maxAbsDelta, 1);
}

/** Divergence heatmap cell background style */
function heatBg(intensity: number): string {
  if (intensity < 0.15) return "bg-stone-50";
  if (intensity < 0.35) return "bg-stone-100";
  if (intensity < 0.55) return "bg-stone-200";
  if (intensity < 0.75) return "bg-stone-300";
  return "bg-stone-400";
}

/** Ordinal suffix */
function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ═════════════════════════════════════════════════════════════════════
// Page Component
// ═════════════════════════════════════════════════════════════════════

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
  const ready = countryA !== null && countryB !== null && codeA !== codeB;

  // ── Diagnostic Computation ──────────────────────────────────────
  const diagnostic: StructuralDiagnostic | null = useMemo(() => {
    if (!ready || !countryA || !countryB) return null;
    return computeStructuralDiagnostic(countryA, countryB, countries);
  }, [ready, countryA, countryB, countries]);

  const compositePercentileA = useMemo(
    () => (countryA ? computeCompositePercentile(countryA.isi_composite, countries) : null),
    [countryA, countries],
  );
  const compositePercentileB = useMemo(
    () => (countryB ? computeCompositePercentile(countryB.isi_composite, countries) : null),
    [countryB, countries],
  );

  // ── Composite rank (1-based, descending) ────────────────────────
  const compositeRanks = useMemo(() => {
    const sorted = [...countries]
      .filter((c) => c.isi_composite !== null)
      .sort((a, b) => (b.isi_composite ?? 0) - (a.isi_composite ?? 0));
    const map = new Map<string, number>();
    sorted.forEach((c, i) => map.set(c.country, i + 1));
    return map;
  }, [countries]);

  const rankA = countryA ? compositeRanks.get(countryA.country) ?? null : null;
  const rankB = countryB ? compositeRanks.get(countryB.country) ?? null : null;

  // ── Radar data ──────────────────────────────────────────────────
  const radarAxesA = useMemo(
    () =>
      countryA
        ? ALL_AXIS_SLUGS.map((slug) => ({
            slug,
            value: getAxisScore(countryA, slug),
          }))
        : [],
    [countryA],
  );
  const radarAxesB = useMemo(
    () =>
      countryB
        ? ALL_AXIS_SLUGS.map((slug) => ({
            slug,
            value: getAxisScore(countryB, slug),
          }))
        : [],
    [countryB],
  );

  // ── Heatmap max delta ───────────────────────────────────────────
  const maxAbsDelta = useMemo(() => {
    if (!diagnostic) return 0;
    return Math.max(...diagnostic.axes.map((a) => a.absDelta), 0.0001);
  }, [diagnostic]);

  // ── Export ──────────────────────────────────────────────────────
  const handleExportJSON = useCallback(() => {
    if (!countryA || !countryB || !diagnostic) return;
    const snapshot = buildExportSnapshot(
      countryA,
      countryB,
      diagnostic,
      compositePercentileA,
      compositePercentileB,
    );
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `isi-comparison-${countryA.country}-${countryB.country}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [countryA, countryB, diagnostic, compositePercentileA, compositePercentileB]);

  const handleExportCSV = useCallback(() => {
    if (!countryA || !countryB || !diagnostic) return;
    const snapshot = buildExportSnapshot(
      countryA,
      countryB,
      diagnostic,
      compositePercentileA,
      compositePercentileB,
    );
    const header = [
      "Axis",
      `${countryA.country_name} Score`,
      `${countryB.country_name} Score`,
      "Delta (A − B)",
      "More Concentrated",
      `${countryA.country_name} Percentile`,
      `${countryB.country_name} Percentile`,
      `${countryA.country_name} Contribution`,
      `${countryB.country_name} Contribution`,
    ];
    const rows = snapshot.axes.map((a) => [
      a.axis,
      a.scoreA,
      a.scoreB,
      a.delta,
      a.moreConcentrated,
      a.percentileA,
      a.percentileB,
      a.contributionShareA,
      a.contributionShareB,
    ]);
    const meta = [
      [""],
      ["Structural Diagnostic"],
      ["Distance", snapshot.diagnostic.structuralDistance],
      ["Normalized Distance", snapshot.diagnostic.normalizedDistance],
      ["Divergence Level", snapshot.diagnostic.divergenceLevel],
      ["Dominant Axis", snapshot.diagnostic.dominantDivergenceAxis],
      ["Symmetry", snapshot.diagnostic.symmetry],
      [`${countryA.country_name} Profile`, snapshot.countryA.profile],
      [`${countryB.country_name} Profile`, snapshot.countryB.profile],
    ];
    const escape = (v: string) =>
      v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
    const csvLines = [
      header.map(escape).join(","),
      ...rows.map((r) => r.map((v) => escape(String(v))).join(",")),
      ...meta.map((r) => r.map((v) => escape(String(v))).join(",")),
    ];
    const blob = new Blob([csvLines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `isi-comparison-${countryA.country}-${countryB.country}-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [countryA, countryB, diagnostic, compositePercentileA, compositePercentileB]);

  // ── Error / Loading ─────────────────────────────────────────────
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
          <div className="space-y-4">
            <div className="h-8 w-64 animate-pulse rounded bg-stone-100" />
            <div className="h-4 w-96 animate-pulse rounded bg-stone-50" />
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="h-12 animate-pulse rounded border border-border-primary bg-surface-tertiary" />
              <div className="h-12 animate-pulse rounded border border-border-primary bg-surface-tertiary" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-[1400px] px-6 lg:px-16">
        {/* ── Header ───────────────────────────────────────── */}
        <section className="pt-10">
          <Link href="/" className="text-[13px] text-text-tertiary transition-colors hover:text-text-primary">
            ← Back to Overview
          </Link>
          <h1 className="mt-6 font-serif text-[40px] font-bold leading-[1.15] tracking-tight text-text-primary">
            Comparative Structural Analysis
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-text-tertiary">
            Bilateral structural comparison of ISI concentration profiles.
            Select two countries from the current release cohort (EU-27) to analyse divergence, contribution
            structure, and cohort-relative positioning.
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

        {/* ── Empty State ──────────────────────────────────── */}
        {!ready && codeA === "" && codeB === "" && (
          <section className="mt-12 mb-16 rounded-md border border-border-primary bg-surface-tertiary p-10 text-center">
            <p className="text-[14px] text-text-tertiary">
              Select two countries above to begin the structural comparison.
            </p>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════ */}
        {/* DIAGNOSTIC OUTPUT                                    */}
        {/* ═══════════════════════════════════════════════════ */}
        {ready && countryA && countryB && diagnostic && (
          <>
            {/* ──────────────────────────────────────────────── */}
            {/* SECTION 1: Executive Structural Snapshot          */}
            {/* ──────────────────────────────────────────────── */}
            <section className="mt-12">
              <h2 className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-quaternary">
                Executive Structural Snapshot
              </h2>

              {/* Top-level KPI row */}
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {/* Structural Distance */}
                <div className="rounded border border-border-primary bg-surface-tertiary px-4 py-3">
                  <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
                    Structural Distance
                  </p>
                  <p className="mt-1 font-mono text-[22px] font-medium leading-none tracking-tight text-text-primary">
                    {diagnostic.structuralDistance.toFixed(4)}
                  </p>
                  <p className="mt-1.5 text-[11px] font-medium text-text-tertiary">
                    {divergenceLabel(diagnostic.divergenceLevel)}
                  </p>
                </div>

                {/* Relationship Type */}
                <div className="rounded border border-border-primary bg-surface-tertiary px-4 py-3">
                  <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
                    Relationship Type
                  </p>
                  <p className="mt-1 text-[15px] font-semibold leading-snug text-text-primary">
                    {symmetryLabel(diagnostic.symmetry)}
                  </p>
                  <p className="mt-1 text-[11px] text-text-quaternary">
                    {diagnostic.symmetry === "symmetric"
                      ? "Parallel vulnerability"
                      : diagnostic.symmetry === "complementary"
                        ? "Inverse concentration"
                        : "Divergent profiles"}
                  </p>
                </div>

                {/* Dominant Divergence */}
                <div className="rounded border border-border-primary bg-surface-tertiary px-4 py-3">
                  <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
                    Dominant Divergence Axis
                  </p>
                  <p className="mt-1 text-[15px] font-semibold leading-snug text-text-primary">
                    {diagnostic.dominantDivergenceAxis
                      ? formatAxisShort(diagnostic.dominantDivergenceAxis)
                      : "—"}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-text-quaternary">
                    Δ {diagnostic.dominantDivergenceMagnitude.toFixed(4)} · {(diagnostic.dominantAxisDivergenceShare * 100).toFixed(0)}% of total
                  </p>
                </div>

                {/* Divergence Pattern */}
                <div className="rounded border border-border-primary bg-surface-tertiary px-4 py-3">
                  <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
                    Divergence Pattern
                  </p>
                  <p className="mt-1 text-[15px] font-semibold leading-snug text-text-primary">
                    {diagnostic.divergenceConcentrated
                      ? "Concentrated"
                      : "Distributed"}
                  </p>
                  <p className="mt-1 text-[11px] text-text-quaternary">
                    {diagnostic.divergenceConcentrated
                      ? "Gap driven by single axis"
                      : "Gap spread across axes"}
                  </p>
                </div>
              </div>

              {/* Bilateral composite row */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                {/* Country A */}
                <div className="rounded border border-border-primary px-4 py-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
                        {countryA.country_name}
                      </p>
                      <p className="mt-1 font-mono text-[22px] font-medium leading-none tracking-tight text-text-primary">
                        {formatScore(countryA.isi_composite)}
                      </p>
                    </div>
                    <div className="text-right">
                      <StatusBadge classification={countryA.classification} />
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-quaternary">
                    <span>
                      Rank: <span className="font-mono text-text-tertiary">{rankA ?? "—"} / {countries.length}</span>
                    </span>
                    <span>
                      Percentile: <span className="font-mono text-text-tertiary">{compositePercentileA !== null ? ordinal(compositePercentileA) : "—"}</span>
                    </span>
                    <span className="text-text-quaternary">
                      {profileLabel(diagnostic.profileA)}
                    </span>
                  </div>
                </div>

                {/* Country B */}
                <div className="rounded border border-border-primary px-4 py-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
                        {countryB.country_name}
                      </p>
                      <p className="mt-1 font-mono text-[22px] font-medium leading-none tracking-tight text-text-primary">
                        {formatScore(countryB.isi_composite)}
                      </p>
                    </div>
                    <div className="text-right">
                      <StatusBadge classification={countryB.classification} />
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-quaternary">
                    <span>
                      Rank: <span className="font-mono text-text-tertiary">{rankB ?? "—"} / {countries.length}</span>
                    </span>
                    <span>
                      Percentile: <span className="font-mono text-text-tertiary">{compositePercentileB !== null ? ordinal(compositePercentileB) : "—"}</span>
                    </span>
                    <span className="text-text-quaternary">
                      {profileLabel(diagnostic.profileB)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Institutional insight */}
              <div className="mt-4 rounded border border-border-primary bg-surface-tertiary px-4 py-3">
                <p className="text-[12px] leading-relaxed text-text-secondary">
                  {countryA.country_name} and {countryB.country_name} exhibit{" "}
                  <span className="font-medium">{divergenceLabel(diagnostic.divergenceLevel).toLowerCase()}</span>
                  {" "}(distance: {diagnostic.structuralDistance.toFixed(4)}).
                  {diagnostic.dominantDivergenceAxis && (
                    <>
                      {" "}The largest gap is in{" "}
                      <span className="font-medium">{formatAxisShort(diagnostic.dominantDivergenceAxis)}</span>
                      {" "}({(diagnostic.dominantAxisDivergenceShare * 100).toFixed(0)}% of total divergence).
                    </>
                  )}
                  {" "}The bilateral relationship is classified as{" "}
                  <span className="font-medium">{symmetryLabel(diagnostic.symmetry).toLowerCase()}</span>.
                </p>
              </div>
            </section>

            {/* ──────────────────────────────────────────────── */}
            {/* SECTION 2: Contribution Structure                 */}
            {/* ──────────────────────────────────────────────── */}
            <section className="mt-12 content-auto">
              <h2 className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-quaternary">
                Axis Contribution Structure
              </h2>
              <p className="mt-1 text-[12px] text-text-quaternary">
                Share of each axis in the composite score. Reveals structural dependence hierarchy.
              </p>

              <div className="mt-4 space-y-2">
                {diagnostic.axes.map((axis) => {
                  const shareA = axis.contributionShareA ?? 0;
                  const shareB = axis.contributionShareB ?? 0;
                  return (
                    <div key={axis.slug} className="rounded border border-border-primary px-4 py-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-medium text-text-secondary">
                          {axis.label}
                        </span>
                        <div className="flex items-center gap-4 text-[11px]">
                          <span className="font-mono text-text-tertiary">
                            {countryA.country}: {(shareA * 100).toFixed(1)}%
                          </span>
                          <span className="font-mono text-text-tertiary">
                            {countryB.country}: {(shareB * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      {/* Dual bar */}
                      <div className="mt-1.5 flex gap-1">
                        <div className="flex h-2 flex-1 overflow-hidden rounded bg-stone-100">
                          <div
                            className="h-full rounded bg-navy-700 transition-all"
                            style={{ width: `${Math.max(shareA * 100, 0.5)}%` }}
                          />
                        </div>
                        <div className="flex h-2 flex-1 overflow-hidden rounded bg-stone-100">
                          <div
                            className="h-full rounded bg-stone-400 transition-all"
                            style={{ width: `${Math.max(shareB * 100, 0.5)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex items-center gap-4 text-[10px] text-text-quaternary">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-3 rounded bg-navy-700" />
                  {countryA.country_name}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-3 rounded bg-stone-400" />
                  {countryB.country_name}
                </span>
              </div>
            </section>

            {/* ──────────────────────────────────────────────── */}
            {/* SECTION 3: EU Positional Context                  */}
            {/* ──────────────────────────────────────────────── */}
            <section className="mt-12 content-auto">
              <h2 className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-quaternary">
                Cohort Positional Context
              </h2>
              <p className="mt-1 text-[12px] text-text-quaternary">
                Percentile rank per axis within the EU-27 cohort distribution. Higher percentile = more concentrated relative to cohort.
              </p>

              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-[13px]">
                  <thead>
                    <tr className="border-b-2 border-navy-900 text-[10px] uppercase tracking-[0.1em] text-text-quaternary">
                      <th className="px-3 py-2.5 text-left font-medium">Axis</th>
                      <th className="px-3 py-2.5 text-right font-medium">{countryA.country_name}</th>
                      <th className="px-3 py-2.5 text-right font-medium">{countryB.country_name}</th>
                      <th className="px-3 py-2.5 text-right font-medium">Gap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diagnostic.axes.map((axis) => {
                      const pA = axis.percentileA;
                      const pB = axis.percentileB;
                      const gap = pA !== null && pB !== null ? pA - pB : null;
                      return (
                        <tr key={axis.slug} className="border-b border-border-subtle">
                          <td className="px-3 py-2 text-text-secondary">{axis.label}</td>
                          <td className="px-3 py-2 text-right font-mono text-text-primary">
                            {pA !== null ? ordinal(pA) : "—"}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-text-primary">
                            {pB !== null ? ordinal(pB) : "—"}
                          </td>
                          <td className={`px-3 py-2 text-right font-mono text-[12px] ${
                            gap !== null && gap > 0
                              ? "text-deviation-positive"
                              : gap !== null && gap < 0
                                ? "text-deviation-negative"
                                : "text-text-quaternary"
                          }`}>
                            {gap !== null
                              ? `${gap > 0 ? "+" : ""}${gap} pp`
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                    {/* Composite row */}
                    <tr className="border-t-2 border-navy-900">
                      <td className="px-3 py-2 font-medium text-text-primary">Composite</td>
                      <td className="px-3 py-2 text-right font-mono font-medium text-text-primary">
                        {compositePercentileA !== null ? ordinal(compositePercentileA) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-medium text-text-primary">
                        {compositePercentileB !== null ? ordinal(compositePercentileB) : "—"}
                      </td>
                      <td className={`px-3 py-2 text-right font-mono text-[12px] font-medium ${
                        compositePercentileA !== null && compositePercentileB !== null
                          ? compositePercentileA - compositePercentileB > 0
                            ? "text-deviation-positive"
                            : compositePercentileA - compositePercentileB < 0
                              ? "text-deviation-negative"
                              : "text-text-quaternary"
                          : "text-text-quaternary"
                      }`}>
                        {compositePercentileA !== null && compositePercentileB !== null
                          ? `${compositePercentileA - compositePercentileB > 0 ? "+" : ""}${compositePercentileA - compositePercentileB} pp`
                          : "—"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* ──────────────────────────────────────────────── */}
            {/* SECTION 4: Axis Diagnostic Table + Heatmap        */}
            {/* ──────────────────────────────────────────────── */}
            <section className="mt-12">
              <h2 className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-quaternary">
                Axis-Level Diagnostic
              </h2>

              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-[13px]">
                  <thead>
                    <tr className="border-b-2 border-navy-900 text-[10px] uppercase tracking-[0.1em] text-text-quaternary">
                      <th className="px-3 py-2.5 text-left font-medium">Axis</th>
                      <th className="px-3 py-2.5 text-right font-medium">{countryA.country_name}</th>
                      <th className="px-3 py-2.5 text-right font-medium">{countryB.country_name}</th>
                      <th className="px-3 py-2.5 text-right font-medium">Delta (A − B)</th>
                      <th className="px-3 py-2.5 text-center font-medium">Divergence</th>
                      <th className="px-3 py-2.5 text-center font-medium">More Concentrated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diagnostic.axes.map((axis) => {
                      const intensity = heatIntensity(axis.absDelta, maxAbsDelta);
                      return (
                        <tr key={axis.slug} className="border-b border-border-subtle transition-colors hover:bg-surface-tertiary">
                          <td className="px-3 py-2.5 text-text-secondary">{axis.label}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-text-primary">
                            {formatScore(axis.scoreA)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-text-primary">
                            {formatScore(axis.scoreB)}
                          </td>
                          <td className={`px-3 py-2.5 text-right font-mono ${
                            axis.delta !== null && axis.delta > 0
                              ? "text-deviation-positive"
                              : axis.delta !== null && axis.delta < 0
                                ? "text-deviation-negative"
                                : "text-text-quaternary"
                          }`}>
                            {axis.delta !== null ? formatDelta(axis.delta) : "—"}
                          </td>
                          {/* Heat cell */}
                          <td className="px-3 py-2.5 text-center">
                            <span className={`inline-block rounded px-2 py-0.5 font-mono text-[11px] ${heatBg(intensity)} text-text-secondary`}>
                              {axis.absDelta.toFixed(4)}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center text-[11px] font-semibold">
                            {axis.moreConcentrated === "A" ? (
                              <span className="text-text-secondary">{countryA.country}</span>
                            ) : axis.moreConcentrated === "B" ? (
                              <span className="text-text-secondary">{countryB.country}</span>
                            ) : axis.moreConcentrated === "equal" ? (
                              <span className="text-text-quaternary">Equal</span>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {/* Composite summary row */}
                    <tr className="border-t-2 border-navy-900">
                      <td className="px-3 py-2.5 font-medium text-text-primary">Composite</td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold text-text-primary">
                        {formatScore(countryA.isi_composite)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold text-text-primary">
                        {formatScore(countryB.isi_composite)}
                      </td>
                      <td className={`px-3 py-2.5 text-right font-mono font-semibold ${
                        countryA.isi_composite !== null && countryB.isi_composite !== null
                          ? countryA.isi_composite - countryB.isi_composite > 0
                            ? "text-deviation-positive"
                            : countryA.isi_composite - countryB.isi_composite < 0
                              ? "text-deviation-negative"
                              : "text-text-quaternary"
                          : "text-text-quaternary"
                      }`}>
                        {countryA.isi_composite !== null && countryB.isi_composite !== null
                          ? formatDelta(countryA.isi_composite - countryB.isi_composite)
                          : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="inline-block rounded bg-stone-100 px-2 py-0.5 font-mono text-[11px] text-text-secondary">
                          Σ {diagnostic.structuralDistance.toFixed(4)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center text-[11px] font-semibold">
                        {countryA.isi_composite !== null && countryB.isi_composite !== null
                          ? countryA.isi_composite > countryB.isi_composite
                            ? <span className="text-text-secondary">{countryA.country}</span>
                            : countryA.isi_composite < countryB.isi_composite
                              ? <span className="text-text-secondary">{countryB.country}</span>
                              : <span className="text-text-quaternary">Equal</span>
                          : "—"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* ──────────────────────────────────────────────── */}
            {/* SECTION 5: Divergence Heatmap                     */}
            {/* ──────────────────────────────────────────────── */}
            <section className="mt-12">
              <h2 className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-quaternary">
                Divergence Heatmap
              </h2>
              <p className="mt-1 text-[12px] text-text-quaternary">
                Absolute axis-level differences. Darker cells indicate larger divergence.
              </p>

              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {diagnostic.axes.map((axis) => {
                  const intensity = heatIntensity(axis.absDelta, maxAbsDelta);
                  return (
                    <div
                      key={axis.slug}
                      className={`flex flex-col items-center justify-center rounded border border-border-primary px-2 py-3 ${heatBg(intensity)}`}
                    >
                      <span className="text-[10px] font-medium text-text-secondary">
                        {axis.label}
                      </span>
                      <span className="mt-1 font-mono text-[13px] font-medium text-text-primary">
                        {axis.absDelta.toFixed(4)}
                      </span>
                      <span className="mt-0.5 text-[10px] text-text-quaternary">
                        {axis.moreConcentrated === "A"
                          ? `${countryA.country} ↑`
                          : axis.moreConcentrated === "B"
                            ? `${countryB.country} ↑`
                            : "="}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ──────────────────────────────────────────────── */}
            {/* SECTION 6: Radar Overlay                          */}
            {/* ──────────────────────────────────────────────── */}
            <section className="mt-12 rounded border border-border-primary p-4 sm:p-6">
              <h2 className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-quaternary">
                Multi-Axis Profile Overlay
              </h2>
              <div className="mt-4 flex w-full items-center justify-center">
                <RadarChart
                  axes={radarAxesA}
                  compareAxes={radarAxesB}
                  compareLabel={countryB.country_name}
                  label={countryA.country_name}
                />
              </div>
            </section>

            {/* ──────────────────────────────────────────────── */}
            {/* SECTION 7: Export + Navigation                    */}
            {/* ──────────────────────────────────────────────── */}
            <section className="mt-12 mb-16">
              <h2 className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-quaternary">
                Export & Navigation
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportJSON}
                  className="rounded border border-border-primary bg-white px-3.5 py-2 text-[12px] font-medium text-text-secondary hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-navy-700"
                >
                  Export JSON
                </button>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="rounded border border-border-primary bg-white px-3.5 py-2 text-[12px] font-medium text-text-secondary hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-navy-700"
                >
                  Export CSV
                </button>
                <Link
                  href={countryHref(countryA.country)}
                  className="rounded border border-border-primary bg-white px-3.5 py-2 text-[12px] font-medium text-text-secondary hover:bg-stone-50"
                >
                  {countryA.country_name} Profile →
                </Link>
                <Link
                  href={countryHref(countryB.country)}
                  className="rounded border border-border-primary bg-white px-3.5 py-2 text-[12px] font-medium text-text-secondary hover:bg-stone-50"
                >
                  {countryB.country_name} Profile →
                </Link>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
