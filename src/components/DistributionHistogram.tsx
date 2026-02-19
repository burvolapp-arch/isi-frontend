"use client";

import { memo } from "react";
import { formatScore } from "@/lib/presentation";

/**
 * SVG-based histogram for composite score distribution.
 * Visual reference: ECB Statistical Bulletin × IMF Working Paper charts.
 *
 * Features:
 * - Soft classification band background shading
 * - Gradient-fill bars with subtle rounded top caps
 * - Refined statistical markers (mean ◆, median, highlight ▼)
 * - Three-row bottom axis with collision avoidance
 * - Professional horizontal gridlines with count labels
 * - N-count badge
 */

/* ── Band colours (fill tints for background zones) ────────────────── */
const BAND_TINTS = {
  unconcentrated: "#e8f5e9",  // muted green tint
  mild:          "#fff8e1",   // muted amber tint
  moderate:      "#fff3e0",   // muted orange tint
  high:          "#ffebee",   // muted red tint
};

const BAND_ACCENTS = {
  unconcentrated: "#065f46",
  mild:          "#a16207",
  moderate:      "#b45309",
  high:          "#b91c1c",
};

interface DistributionHistogramProps {
  scores: number[];
  mean?: number | null;
  median?: number | null;
  binCount?: number;
  height?: number;
  /** Highlight a specific score (e.g., a selected country) */
  highlight?: number | null;
  highlightLabel?: string;
}

export const DistributionHistogram = memo(function DistributionHistogram({
  scores,
  mean,
  median,
  binCount = 20,
  height = 200,
  highlight,
  highlightLabel,
}: DistributionHistogramProps) {
  if (scores.length === 0) return null;

  const min = 0;
  const max = 1;
  const binWidth = (max - min) / binCount;

  // Build bins
  const bins: { start: number; end: number; count: number }[] = [];
  for (let i = 0; i < binCount; i++) {
    bins.push({
      start: min + i * binWidth,
      end: min + (i + 1) * binWidth,
      count: 0,
    });
  }

  for (const s of scores) {
    const idx = Math.min(Math.floor((s - min) / binWidth), binCount - 1);
    bins[idx].count++;
  }

  const maxCount = Math.max(...bins.map((b) => b.count), 1);

  // SVG dimensions
  const padding = { top: 28, right: 18, bottom: 56, left: 42 };
  const svgWidth = 640;
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const barW = chartWidth / binCount;
  const barGap = Math.max(1, barW * 0.08);

  const xScale = (val: number) =>
    padding.left + ((val - min) / (max - min)) * chartWidth;
  const yScale = (count: number) =>
    padding.top + chartHeight - (count / maxCount) * chartHeight;

  // Determine if a bin contains the highlighted score
  const highlightBinIdx =
    highlight != null
      ? Math.min(Math.floor((highlight - min) / binWidth), binCount - 1)
      : -1;

  // Nice count ticks for left axis
  const yTicks: number[] = [];
  if (maxCount <= 4) {
    for (let i = 1; i <= maxCount; i++) yTicks.push(i);
  } else {
    const step = maxCount <= 10 ? 2 : maxCount <= 20 ? 5 : 10;
    for (let i = step; i <= maxCount; i += step) yTicks.push(i);
  }

  // Unique gradient IDs
  const uid = `dh-${binCount}-${height}`;

  return (
    <svg
      viewBox={`0 0 ${svgWidth} ${height}`}
      className="w-full select-none"
      role="img"
      aria-label="Composite score distribution histogram"
    >
      <defs>
        {/* Bar gradient — default (stone/slate) */}
        <linearGradient id={`${uid}-bar`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6b7280" stopOpacity={0.62} />
          <stop offset="100%" stopColor="#9ca3af" stopOpacity={0.35} />
        </linearGradient>
        {/* Bar gradient — highlighted bin (navy) */}
        <linearGradient id={`${uid}-bar-hl`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0b2545" stopOpacity={0.92} />
          <stop offset="100%" stopColor="#245694" stopOpacity={0.72} />
        </linearGradient>
        {/* Mean marker gradient */}
        <linearGradient id={`${uid}-mean`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0b2545" />
          <stop offset="100%" stopColor="#245694" />
        </linearGradient>
      </defs>

      {/* ── Classification band background zones ───────────────── */}
      {[
        { from: 0, to: 0.15, band: "unconcentrated" as const },
        { from: 0.15, to: 0.25, band: "mild" as const },
        { from: 0.25, to: 0.50, band: "moderate" as const },
        { from: 0.50, to: 1.0, band: "high" as const },
      ].map(({ from, to, band }) => (
        <rect
          key={band}
          x={xScale(from)}
          y={padding.top}
          width={xScale(to) - xScale(from)}
          height={chartHeight}
          fill={BAND_TINTS[band]}
          opacity={0.35}
        />
      ))}

      {/* ── Threshold lines (vertical, at band boundaries) ─────── */}
      {[0.15, 0.25, 0.5].map((v) => (
        <line
          key={v}
          x1={xScale(v)}
          y1={padding.top}
          x2={xScale(v)}
          y2={padding.top + chartHeight}
          stroke="#d1d5db"
          strokeWidth={0.75}
          strokeDasharray="4,3"
        />
      ))}

      {/* ── Horizontal gridlines + left-axis count labels ──────── */}
      {yTicks.map((count) => {
        const y = yScale(count);
        return (
          <g key={`g-${count}`}>
            <line
              x1={padding.left}
              y1={y}
              x2={svgWidth - padding.right}
              y2={y}
              stroke="#e5e7eb"
              strokeWidth={0.5}
            />
            <text
              x={padding.left - 7}
              y={y + 3}
              textAnchor="end"
              fill="#9ca3af"
              fontSize="9"
              fontFamily="var(--font-mono)"
            >
              {count}
            </text>
          </g>
        );
      })}

      {/* Zero baseline label */}
      <text
        x={padding.left - 7}
        y={padding.top + chartHeight + 3}
        textAnchor="end"
        fill="#d1d5db"
        fontSize="9"
        fontFamily="var(--font-mono)"
      >
        0
      </text>

      {/* ── Histogram bars ─────────────────────────────────────── */}
      {bins.map((bin, i) => {
        if (bin.count === 0) return null;
        const isHighlighted = i === highlightBinIdx;
        const barHeight = chartHeight - (yScale(bin.count) - padding.top);
        const bx = padding.left + i * barW + barGap;
        const bw = Math.max(barW - barGap * 2, 1);
        const by = yScale(bin.count);
        const r = Math.min(2.5, bw / 3); // subtle rounded top

        return (
          <g key={i}>
            {/* Rounded-top bar via path */}
            <path
              d={`
                M ${bx},${by + r}
                Q ${bx},${by} ${bx + r},${by}
                L ${bx + bw - r},${by}
                Q ${bx + bw},${by} ${bx + bw},${by + r}
                L ${bx + bw},${padding.top + chartHeight}
                L ${bx},${padding.top + chartHeight}
                Z
              `}
              fill={isHighlighted ? `url(#${uid}-bar-hl)` : `url(#${uid}-bar)`}
            />
            {/* Count label above bar if there's room */}
            {bin.count > 0 && barHeight > 8 && (
              <text
                x={bx + bw / 2}
                y={by - 4}
                textAnchor="middle"
                fill={isHighlighted ? "#0b2545" : "#9ca3af"}
                fontSize="8"
                fontWeight={isHighlighted ? "600" : "400"}
                fontFamily="var(--font-mono)"
              >
                {bin.count}
              </text>
            )}
          </g>
        );
      })}

      {/* ── Mean marker ────────────────────────────────────────── */}
      {mean != null && (
        <g>
          <line
            x1={xScale(mean)}
            y1={padding.top + 2}
            x2={xScale(mean)}
            y2={padding.top + chartHeight}
            stroke="#0b2545"
            strokeWidth={1.25}
            strokeDasharray="5,3"
            opacity={0.7}
          />
          {/* Diamond marker at top */}
          <polygon
            points={`
              ${xScale(mean)},${padding.top - 2}
              ${xScale(mean) + 4},${padding.top + 3}
              ${xScale(mean)},${padding.top + 8}
              ${xScale(mean) - 4},${padding.top + 3}
            `}
            fill={`url(#${uid}-mean)`}
            opacity={0.85}
          />
          {/* Mean label with collision avoidance */}
          {(() => {
            const mx = xScale(mean);
            const hx = highlight != null ? xScale(highlight) : null;
            const tooClose = hx != null && Math.abs(mx - hx) < 44;
            const anchor = tooClose ? (mx < hx! ? "end" : "start") : "middle";
            const dx = tooClose ? (mx < hx! ? -7 : 7) : 0;
            return (
              <text
                x={mx + dx}
                y={padding.top - 7}
                textAnchor={anchor}
                fill="#0b2545"
                fontSize="8.5"
                fontFamily="var(--font-mono)"
                fontWeight="600"
                letterSpacing="0.02em"
              >
                μ {formatScore(mean)}
              </text>
            );
          })()}
        </g>
      )}

      {/* ── Median marker ──────────────────────────────────────── */}
      {median != null && (
        <g>
          <line
            x1={xScale(median)}
            y1={padding.top + 6}
            x2={xScale(median)}
            y2={padding.top + chartHeight}
            stroke="#6b7280"
            strokeWidth={0.75}
            strokeDasharray="2,3"
            opacity={0.6}
          />
          {/* Nudge median label to avoid both mean and highlight */}
          {(() => {
            const mdx = xScale(median);
            const mx = mean != null ? xScale(mean) : null;
            const hx = highlight != null ? xScale(highlight) : null;
            let nudgeX = 5;
            let anchor: "start" | "end" = "start";
            if (mx != null && mx > mdx && Math.abs(mx - mdx) < 45) {
              nudgeX = -5;
              anchor = "end";
            }
            if (hx != null && hx > mdx && Math.abs(hx - mdx) < 30) {
              nudgeX = -5;
              anchor = "end";
            }
            return (
              <text
                x={mdx + nudgeX}
                y={padding.top + 16}
                textAnchor={anchor}
                fill="#6b7280"
                fontSize="8"
                fontFamily="var(--font-mono)"
                opacity={0.75}
              >
                Mdn {formatScore(median)}
              </text>
            );
          })()}
        </g>
      )}

      {/* ── Highlight marker (country) ─────────────────────────── */}
      {highlight != null && (
        <g>
          <line
            x1={xScale(highlight)}
            y1={padding.top}
            x2={xScale(highlight)}
            y2={padding.top + chartHeight}
            stroke="#0b2545"
            strokeWidth={1.75}
            opacity={0.9}
          />
          {/* Downward-pointing triangle at top */}
          <polygon
            points={`
              ${xScale(highlight)},${padding.top + 6}
              ${xScale(highlight) - 4},${padding.top - 1}
              ${xScale(highlight) + 4},${padding.top - 1}
            `}
            fill="#0b2545"
          />
        </g>
      )}

      {/* ── X-axis baseline ────────────────────────────────────── */}
      <line
        x1={padding.left}
        y1={padding.top + chartHeight}
        x2={svgWidth - padding.right}
        y2={padding.top + chartHeight}
        stroke="#d1d5db"
        strokeWidth={1}
      />

      {/* ── Left axis line ─────────────────────────────────────── */}
      <line
        x1={padding.left}
        y1={padding.top}
        x2={padding.left}
        y2={padding.top + chartHeight}
        stroke="#e5e7eb"
        strokeWidth={0.5}
      />

      {/* ── N-count badge (top-right corner) ───────────────────── */}
      <text
        x={svgWidth - padding.right}
        y={padding.top - 10}
        textAnchor="end"
        fill="#9ca3af"
        fontSize="8"
        fontFamily="var(--font-mono)"
        letterSpacing="0.04em"
      >
        N = {scores.length}
      </text>

      {/* ── Bottom labels with collision avoidance ─────────────── */}
      {(() => {
        const tickY = padding.top + chartHeight + 14;
        const bandY = padding.top + chartHeight + 28;
        const highlightY = padding.top + chartHeight + 44;

        const hlX = highlight != null ? xScale(highlight) : null;
        const hlHalfW = highlightLabel ? highlightLabel.length * 3.2 + 10 : 0;

        // Classification band definitions — positioned at band midpoints
        const bands: { cx: number; label: string; color: string }[] = [
          { cx: 0.075, label: "Unconcentrated", color: BAND_ACCENTS.unconcentrated },
          { cx: 0.2, label: "Mild", color: BAND_ACCENTS.mild },
          { cx: 0.375, label: "Moderate", color: BAND_ACCENTS.moderate },
          { cx: 0.75, label: "High", color: BAND_ACCENTS.high },
        ];

        const ticks = [0, 0.15, 0.25, 0.5, 0.75, 1.0];

        const overlaps = (ax: number, ahw: number, bx: number, bhw: number) =>
          Math.abs(ax - bx) < ahw + bhw;

        const tickHW = (v: number) => v.toFixed(2).length * 2.8 + 2;
        const bandHW = (label: string) => label.length * 2.1 + 3;

        return (
          <>
            {/* Tick marks + values */}
            {ticks.map((v) => {
              const tx = xScale(v);
              const hide =
                hlX != null && overlaps(tx, tickHW(v), hlX, hlHalfW);
              return (
                <g key={`t-${v}`}>
                  <line
                    x1={tx}
                    y1={padding.top + chartHeight}
                    x2={tx}
                    y2={padding.top + chartHeight + 4}
                    stroke="#d1d5db"
                    strokeWidth={1}
                  />
                  {!hide && (
                    <text
                      x={tx}
                      y={tickY}
                      textAnchor="middle"
                      fill="#9ca3af"
                      fontSize="8.5"
                      fontFamily="var(--font-mono)"
                    >
                      {v.toFixed(2)}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Classification band labels — color-coded */}
            {bands.map(({ cx, label, color }) => {
              const bx = xScale(cx);
              const hide =
                hlX != null && overlaps(bx, bandHW(label), hlX, hlHalfW);
              return (
                <text
                  key={`b-${label}`}
                  x={bx}
                  y={bandY}
                  textAnchor="middle"
                  fill={color}
                  fontSize="7"
                  fontWeight="500"
                  letterSpacing="0.05em"
                  style={{ textTransform: "uppercase" }}
                  opacity={hide ? 0 : 0.7}
                >
                  {label}
                </text>
              );
            })}

            {/* Highlight country label — always visible, on its own row */}
            {highlight != null && highlightLabel && (
              <g>
                {/* Subtle pill background behind label */}
                <rect
                  x={xScale(highlight) - hlHalfW}
                  y={highlightY - 9}
                  width={hlHalfW * 2}
                  height={13}
                  rx={3}
                  fill="#0b2545"
                  opacity={0.07}
                />
                <text
                  x={xScale(highlight)}
                  y={highlightY}
                  textAnchor="middle"
                  fill="#0b2545"
                  fontSize="9"
                  fontWeight="700"
                  fontFamily="var(--font-sans)"
                  letterSpacing="0.04em"
                >
                  {highlightLabel}
                </text>
              </g>
            )}
          </>
        );
      })()}
    </svg>
  );
});

DistributionHistogram.displayName = "DistributionHistogram";
