"use client";

import { useMemo } from "react";
import type { ISICompositeCountry } from "@/lib/types";
import { computeVarianceDecomposition } from "@/lib/varianceDecomposition";
import { formatAxisShort, formatScore } from "@/lib/presentation";

// ─── Axis Colors ────────────────────────────────────────────────────

const AXIS_COLORS: Record<string, string> = {
  financial: "#2563eb",
  energy: "#f59e0b",
  technology: "#8b5cf6",
  defense: "#ef4444",
  critical_inputs: "#10b981",
  logistics: "#06b6d4",
};

// ─── Props ──────────────────────────────────────────────────────────

interface VarianceDecompositionProps {
  countries: ISICompositeCountry[];
}

// ─── Component ──────────────────────────────────────────────────────

export function VarianceDecomposition({ countries }: VarianceDecompositionProps) {
  const entries = useMemo(
    () => computeVarianceDecomposition(countries),
    [countries],
  );

  // Top two axes combined share
  const topTwoShare = entries.length >= 2
    ? entries[0].share + entries[1].share
    : 0;

  return (
    <div className="space-y-6">
      {/* ── Headline finding ── */}
      <div className="rounded-md border border-border-primary bg-surface-tertiary px-5 py-4">
        <p className="text-[13px] leading-relaxed text-text-tertiary">
          <span className="font-semibold text-text-secondary">
            {formatAxisShort(entries[0]?.slug ?? "")} + {formatAxisShort(entries[1]?.slug ?? "")}
          </span>{" "}
          explain{" "}
          <span className="font-mono font-semibold text-text-primary">
            {(topTwoShare * 100).toFixed(1)}%
          </span>{" "}
          of cross-country variance in ISI scores. Other axes contribute smaller
          cross-sectional differentiation.
        </p>
      </div>

      {/* ── Horizontal bar chart ── */}
      <div className="space-y-3" role="img" aria-label="Variance contribution by axis">
        {entries.map((entry) => {
          const pct = entry.share * 100;
          const color = AXIS_COLORS[entry.slug] ?? "#6b7280";
          return (
            <div key={entry.slug} className="space-y-1">
              <div className="flex items-baseline justify-between text-[13px]">
                <span className="font-medium text-text-secondary">
                  {formatAxisShort(entry.slug)}
                </span>
                <span className="font-mono text-text-quaternary">
                  {pct.toFixed(1)}%
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-surface-tertiary">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Statistics table ── */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-[13px]">
          <thead>
            <tr className="border-b-2 border-accent">
              <th scope="col" className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-[0.1em] text-text-quaternary">
                Axis
              </th>
              <th scope="col" className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-[0.1em] text-text-quaternary">
                Variance Share
              </th>
              <th scope="col" className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-[0.1em] text-text-quaternary">
                Mean
              </th>
              <th scope="col" className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-[0.1em] text-text-quaternary">
                Min
              </th>
              <th scope="col" className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-[0.1em] text-text-quaternary">
                Max
              </th>
              <th scope="col" className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-[0.1em] text-text-quaternary">
                CV
              </th>
              <th scope="col" className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-[0.1em] text-text-quaternary">
                N
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.slug} className="border-b border-border-subtle">
                <td className="px-3 py-2 font-medium text-text-secondary">
                  <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: AXIS_COLORS[entry.slug] ?? "#6b7280" }} />
                  {formatAxisShort(entry.slug)}
                </td>
                <td className="px-3 py-2 text-right font-mono text-text-primary">
                  {(entry.share * 100).toFixed(1)}%
                </td>
                <td className="px-3 py-2 text-right font-mono text-text-tertiary">
                  {formatScore(entry.mean)}
                </td>
                <td className="px-3 py-2 text-right font-mono text-text-tertiary">
                  {formatScore(entry.min)}
                </td>
                <td className="px-3 py-2 text-right font-mono text-text-tertiary">
                  {formatScore(entry.max)}
                </td>
                <td className="px-3 py-2 text-right font-mono text-text-tertiary">
                  {entry.cv.toFixed(2)}
                </td>
                <td className="px-3 py-2 text-right font-mono text-text-quaternary">
                  {entry.n}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
