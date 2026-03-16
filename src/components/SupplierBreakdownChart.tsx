"use client";

// ============================================================================
// SupplierBreakdownChart — Horizontal bar visualization of supplier shares
// ============================================================================
// Renders a stacked horizontal bar chart showing the top bilateral partners
// for a given channel or axis. Pure client component.
//
// Designed for deterministic rendering — same data, same output.
// ============================================================================

import { formatPercentage } from "@/lib/presentation";

interface SupplierShare {
  partner: string;
  share: number;
}

interface SupplierBreakdownChartProps {
  /** Ordered list of suppliers with shares (0–1) */
  suppliers: SupplierShare[];
  /** Maximum suppliers to display (remainder grouped as "Other") */
  maxDisplay?: number;
  /** Chart title */
  title?: string;
  /** Show numeric labels */
  showLabels?: boolean;
}

const COLORS = [
  "bg-navy-700",
  "bg-navy-600",
  "bg-navy-500",
  "bg-stone-500",
  "bg-stone-400",
  "bg-stone-300",
] as const;

export function SupplierBreakdownChart({
  suppliers,
  maxDisplay = 6,
  title,
  showLabels = true,
}: SupplierBreakdownChartProps) {
  if (suppliers.length === 0) {
    return (
      <div className="rounded-md border border-border-primary bg-surface-tertiary p-4">
        <p className="text-[12px] text-text-quaternary">
          No supplier data available for this channel.
        </p>
      </div>
    );
  }

  // Sort descending and group remainder as "Other"
  const sorted = [...suppliers].sort((a, b) => b.share - a.share);
  const displayed = sorted.slice(0, maxDisplay);
  const otherShare = sorted
    .slice(maxDisplay)
    .reduce((sum, s) => sum + s.share, 0);
  if (otherShare > 0.001) {
    displayed.push({ partner: "Other", share: otherShare });
  }

  const totalShare = displayed.reduce((s, d) => s + d.share, 0);

  return (
    <div>
      {title && (
        <h5 className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
          {title}
        </h5>
      )}

      {/* Stacked bar */}
      <div className="mt-2 flex h-6 w-full overflow-hidden rounded-sm bg-stone-100 dark:bg-stone-800">
        {displayed.map((s, i) => {
          const widthPct = totalShare > 0 ? (s.share / totalShare) * 100 : 0;
          if (widthPct < 0.5) return null;
          const colorClass =
            s.partner === "Other"
              ? "bg-stone-200 dark:bg-stone-700"
              : COLORS[i % COLORS.length];
          return (
            <div
              key={s.partner}
              className={`${colorClass} flex items-center justify-center transition-all`}
              style={{ width: `${widthPct}%` }}
              title={`${s.partner}: ${formatPercentage(s.share, "share")}`}
            >
              {widthPct > 10 && (
                <span className="truncate px-1 text-[9px] font-medium text-white sm:text-[10px]">
                  {s.partner}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend rows */}
      {showLabels && (
        <div className="mt-3 space-y-1">
          {displayed.map((s, i) => {
            const colorClass =
              s.partner === "Other"
                ? "bg-stone-200 dark:bg-stone-700"
                : COLORS[i % COLORS.length];
            return (
              <div
                key={s.partner}
                className="flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`inline-block h-2.5 w-2.5 shrink-0 rounded-sm ${colorClass}`}
                  />
                  <span className="truncate text-[12px] text-text-secondary">
                    {s.partner}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
                    <div
                      className={`h-full ${colorClass}`}
                      style={{ width: `${s.share * 100}%` }}
                    />
                  </div>
                  <span className="w-12 text-right font-mono text-[11px] text-text-quaternary">
                    {formatPercentage(s.share, "share")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
