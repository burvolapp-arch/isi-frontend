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
import type { ISIComposite, ISICompositeCountry } from "@/lib/types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function ComparePage() {
  const [data, setData] = useState<ISIComposite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [codeA, setCodeA] = useState("");
  const [codeB, setCodeB] = useState("");

  useEffect(() => {
    fetch(`${API}/isi`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: ISIComposite) => setData(d))
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

  function getAxisName(
    c: ISICompositeCountry,
    prefix: string,
  ): string {
    // Derive name from the field key, e.g. axis_1_financial → Financial
    const record = c as unknown as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      if (key.startsWith(prefix + "_")) {
        const suffix = key.slice(prefix.length + 1);
        return suffix.charAt(0).toUpperCase() + suffix.slice(1).replace(/_/g, " ");
      }
    }
    return prefix.replace(/_/g, " ").toUpperCase();
  }

  // Build radar axes from discovered keys
  const radarAxesA = countryA
    ? axisKeys.map((k) => ({
        label: getAxisName(countryA, k),
        value: getAxisScore(countryA, k),
      }))
    : [];
  const radarAxesB = countryB
    ? axisKeys.map((k) => ({
        label: getAxisName(countryB, k),
        value: getAxisScore(countryB, k),
      }))
    : [];

  if (error) {
    return (
      <div className="min-h-screen bg-surface-secondary">
        <main className="mx-auto max-w-7xl px-6 py-10">
          <ErrorPanel
            title="Failed to load ISI data"
            message={error}
            endpoint="/isi"
          />
        </main>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-surface-secondary">
        <main className="mx-auto max-w-7xl px-6 py-10">
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-48 bg-border-primary" />
            <div className="h-64 bg-border-primary" />
          </div>
        </main>
      </div>
    );
  }

  const ready = countryA && countryB && codeA !== codeB;

  return (
    <div className="min-h-screen bg-surface-secondary">
      <main className="mx-auto max-w-7xl px-6 py-10 space-y-10">
        {/* ── Header ───────────────────────────────────────── */}
        <section>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Comparative Analysis
          </h1>
          <p className="mt-1 text-sm text-text-tertiary">
            Select two EU member states to compare their ISI profiles
            side-by-side.
          </p>
        </section>

        {/* ── Country Selectors ─────────────────────────────── */}
        <section className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-quaternary">
              Country A
            </label>
            <select
              value={codeA}
              onChange={(e) => setCodeA(e.target.value)}
              className="w-full border border-border-primary bg-surface-primary px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
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
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-quaternary">
              Country B
            </label>
            <select
              value={codeB}
              onChange={(e) => setCodeB(e.target.value)}
              className="w-full border border-border-primary bg-surface-primary px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
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
          <p className="text-sm text-severity-medium">
            Select two different countries for comparison.
          </p>
        )}

        {ready && countryA && countryB && (
          <>
            {/* ── Composite Comparison KPIs ──────────────────── */}
            <section className="border border-border-primary bg-surface-primary">
              <div className="border-b border-border-primary px-5 py-3">
                <h2 className="text-[13px] font-semibold uppercase tracking-wider text-text-quaternary">
                  Composite Comparison
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-primary bg-surface-tertiary text-[11px] uppercase tracking-wider text-text-quaternary">
                      <th className="px-4 py-3 text-left font-semibold">
                        Metric
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        {countryA.country_name}
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        {countryB.country_name}
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
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
            <section className="border border-border-primary bg-surface-primary p-6">
              <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-wider text-text-quaternary">
                Multi-Axis Profile Overlay
              </h2>
              <RadarChart
                axes={radarAxesA}
                compareAxes={radarAxesB}
                compareLabel={countryB.country_name}
                label={countryA.country_name}
              />
            </section>

            {/* ── Per-Axis Delta Table ───────────────────────── */}
            <section className="border border-border-primary bg-surface-primary">
              <div className="border-b border-border-primary px-5 py-3">
                <h2 className="text-[13px] font-semibold uppercase tracking-wider text-text-quaternary">
                  Axis-by-Axis Comparison
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-primary bg-surface-tertiary text-[11px] uppercase tracking-wider text-text-quaternary">
                      <th className="px-4 py-3 text-left font-semibold">
                        Axis
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        {countryA.country_name}
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        {countryB.country_name}
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Delta
                      </th>
                      <th className="px-4 py-3 text-center font-semibold">
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
                          className="border-b border-border-subtle hover:bg-surface-secondary"
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
            <section className="flex gap-4">
              <Link
                href={countryHref(countryA.country)}
                className="border border-border-primary bg-surface-primary px-4 py-2 text-sm text-text-secondary hover:bg-surface-secondary"
              >
                View {countryA.country_name} Profile →
              </Link>
              <Link
                href={countryHref(countryB.country)}
                className="border border-border-primary bg-surface-primary px-4 py-2 text-sm text-text-secondary hover:bg-surface-secondary"
              >
                View {countryB.country_name} Profile →
              </Link>
            </section>
          </>
        )}

        {!ready && codeA === "" && codeB === "" && (
          <section className="border border-border-primary bg-surface-primary p-8 text-center">
            <p className="text-sm text-text-tertiary">
              Select two countries above to begin the comparison.
            </p>
            <p className="mt-2 text-[11px] text-text-quaternary">
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
