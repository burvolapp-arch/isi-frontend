"use client";

import { useMemo, useState } from "react";
import type { CountryHistory, CountryHistoryYear } from "@/lib/types";
import { formatScore, formatDelta } from "@/lib/presentation";
import { classificationLabel } from "@/lib/format";
import { normalizeAxisKey } from "@/lib/axisRegistry";
import { formatAxisLabel } from "@/lib/presentation";

// ═══════════════════════════════════════════════════════════════════════
// TrendChart — SVG time-series chart for historical ISI scores
// No external charting library required.
// ═══════════════════════════════════════════════════════════════════════

interface TrendChartProps {
  history: CountryHistory;
}

const WIDTH = 600;
const HEIGHT = 240;
const PAD = { top: 20, right: 20, bottom: 36, left: 50 };
const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;

const AXIS_COLORS: Record<string, string> = {
  financial: "#2563eb",
  energy: "#f59e0b",
  technology: "#8b5cf6",
  defense: "#ef4444",
  critical_inputs: "#10b981",
  logistics: "#06b6d4",
};

function getColor(slug: string): string {
  return AXIS_COLORS[slug] ?? "#6b7280";
}

export function TrendChart({ history }: TrendChartProps) {
  const [showAxes, setShowAxes] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);

  const years = history.years;

  // Derive all axis slugs from first year
  const axisSlugs = useMemo(() => {
    if (years.length === 0) return [];
    return Object.keys(years[0].axes).map((k) => normalizeAxisKey(k) ?? k);
  }, [years]);

  // Scales
  const xScale = useMemo(() => {
    if (years.length <= 1) return (i: number) => PLOT_W / 2;
    return (i: number) => (i / (years.length - 1)) * PLOT_W;
  }, [years]);

  const allValues = useMemo(() => {
    const vals = years.map((y) => y.composite);
    if (showAxes) {
      for (const y of years) {
        for (const v of Object.values(y.axes)) {
          vals.push(v);
        }
      }
    }
    return vals;
  }, [years, showAxes]);

  const yMin = Math.min(...allValues) * 0.9;
  const yMax = Math.max(...allValues) * 1.1;
  const yRange = yMax - yMin || 0.1;
  const yScale = (v: number) => PLOT_H - ((v - yMin) / yRange) * PLOT_H;

  // Build line path
  function linePath(values: (number | null)[]): string {
    const pts = values
      .map((v, i) => (v !== null ? { x: xScale(i), y: yScale(v) } : null))
      .filter((p): p is { x: number; y: number } => p !== null);
    if (pts.length === 0) return "";
    return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  }

  const compositePath = linePath(years.map((y) => y.composite));

  // Current hovered year data
  const hoveredYear: CountryHistoryYear | null =
    hovered !== null ? years[hovered] ?? null : null;

  if (years.length === 0) {
    return (
      <div className="rounded border border-border-primary bg-surface-tertiary p-6 text-center">
        <p className="text-[13px] text-text-quaternary">No historical data available.</p>
      </div>
    );
  }

  return (
    <div className="rounded border border-border-primary bg-surface-primary p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-quaternary">
          Historical Trend
        </h3>
        <label className="flex items-center gap-1.5 text-[11px] text-text-quaternary">
          <input
            type="checkbox"
            checked={showAxes}
            onChange={(e) => setShowAxes(e.target.checked)}
            className="h-3 w-3 accent-navy-700"
          />
          Show axis overlays
        </label>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-3 w-full"
        role="img"
        aria-label={`Trend chart showing ISI composite score over ${years.length} releases`}
      >
        <g transform={`translate(${PAD.left}, ${PAD.top})`}>
          {/* Y axis grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
            const y = yScale(yMin + tick * yRange);
            const val = yMin + tick * yRange;
            if (y < 0 || y > PLOT_H) return null;
            return (
              <g key={tick}>
                <line
                  x1={0} y1={y} x2={PLOT_W} y2={y}
                  className="stroke-border-primary"
                  strokeDasharray="4 4"
                  strokeWidth={0.5}
                />
                <text
                  x={-8} y={y + 3}
                  textAnchor="end"
                  className="fill-text-quaternary text-[9px]"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {val.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Axis trend lines */}
          {showAxes && axisSlugs.map((slug) => {
            const rawKeys = Object.keys(years[0].axes);
            const rawKey = rawKeys.find((k) => (normalizeAxisKey(k) ?? k) === slug) ?? slug;
            const vals = years.map((y) => y.axes[rawKey] ?? null);
            const path = linePath(vals);
            return (
              <path
                key={slug}
                d={path}
                fill="none"
                stroke={getColor(slug)}
                strokeWidth={1}
                strokeOpacity={0.4}
                strokeDasharray="3 3"
              />
            );
          })}

          {/* Composite trend line */}
          <path
            d={compositePath}
            fill="none"
            className="stroke-navy-700 dark:stroke-navy-500"
            strokeWidth={2}
            strokeLinejoin="round"
          />

          {/* Data points */}
          {years.map((y, i) => (
            <g key={y.year}>
              <circle
                cx={xScale(i)}
                cy={yScale(y.composite)}
                r={hovered === i ? 5 : 3.5}
                className="fill-navy-700 dark:fill-navy-500"
                strokeWidth={2}
                stroke="var(--color-surface-primary)"
              />
              {/* Hover target */}
              <rect
                x={xScale(i) - 20}
                y={0}
                width={40}
                height={PLOT_H}
                fill="transparent"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                className="cursor-crosshair"
              />
            </g>
          ))}

          {/* X axis labels */}
          {years.map((y, i) => (
            <text
              key={y.year}
              x={xScale(i)}
              y={PLOT_H + 20}
              textAnchor="middle"
              className="fill-text-quaternary text-[10px]"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {y.data_window ?? y.year}
            </text>
          ))}

          {/* Hover tooltip line */}
          {hovered !== null && (
            <line
              x1={xScale(hovered)}
              y1={0}
              x2={xScale(hovered)}
              y2={PLOT_H}
              className="stroke-text-quaternary"
              strokeWidth={1}
              strokeDasharray="2 2"
            />
          )}
        </g>
      </svg>

      {/* Hover detail card */}
      {hoveredYear && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 rounded border border-border-primary bg-surface-tertiary px-3 py-2 text-[11px]">
          <span className="font-mono font-medium text-text-primary">
            {hoveredYear.data_window ?? hoveredYear.year}
          </span>
          <span className="text-text-secondary">
            Composite: <span className="font-mono font-medium">{formatScore(hoveredYear.composite)}</span>
          </span>
          <span className="text-text-secondary">
            Rank: <span className="font-mono">{hoveredYear.rank}</span>
          </span>
          <span className="text-text-secondary">
            {classificationLabel(hoveredYear.classification)}
          </span>
          {hoveredYear.delta_vs_previous !== null && (
            <span className={`font-mono ${hoveredYear.delta_vs_previous > 0 ? "text-deviation-positive" : "text-deviation-negative"}`}>
              {formatDelta(hoveredYear.delta_vs_previous)} vs prior
            </span>
          )}
        </div>
      )}

      {/* Axis legend (when visible) */}
      {showAxes && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-text-quaternary">
          {axisSlugs.map((slug) => (
            <span key={slug} className="flex items-center gap-1">
              <span
                className="inline-block h-2 w-3 rounded"
                style={{ backgroundColor: getColor(slug), opacity: 0.5 }}
              />
              {formatAxisLabel(slug)}
            </span>
          ))}
          <span className="flex items-center gap-1">
            <span className="inline-block h-0.5 w-3 rounded bg-navy-700 dark:bg-navy-500" />
            Composite
          </span>
        </div>
      )}
    </div>
  );
}
