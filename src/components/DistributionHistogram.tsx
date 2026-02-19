"use client";

import { memo } from "react";
import { formatScore } from "@/lib/presentation";

/**
 * SVG-based histogram for composite score distribution.
 * Visual reference: ECB Statistical Bulletin × IMF Working Paper charts.
 *
 * Overlap-prevention strategy:
 * ─────────────────────────────
 * 1. Top region is a dedicated label strip (above chart area) for
 *    mean/N-count text. No bars or markers intrude into this strip.
 * 2. Markers (mean ◆, highlight ▼) sit at the chart-area top edge,
 *    never above or below each other's Y range.
 * 3. Count labels above bars are suppressed when they would collide
 *    with an adjacent count label, a vertical marker line, or when
 *    the bar is too short.
 * 4. Median label is placed inside the chart area, nudged to avoid
 *    both mean and highlight lines.
 * 5. Bottom axis uses three non-overlapping rows with full horizontal
 *    collision detection: ticks → band labels → highlight label.
 */

/* ── Band colours (fill tints for background zones) ────────────────── */
const BAND_TINTS = {
  unconcentrated: "#e8f5e9",
  mild: "#fff8e1",
  moderate: "#fff3e0",
  high: "#ffebee",
};

const BAND_ACCENTS = {
  unconcentrated: "#065f46",
  mild: "#a16207",
  moderate: "#b45309",
  high: "#b91c1c",
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

  /* ── Layout constants ──────────────────────────────────────────────
   *
   *  ┌───────────────────────────────────────────────────┐
   *  │  top label strip  (μ label, N badge)              │  topStrip
   *  ├───────────────────────────────────────────────────┤  ← chartTop
   *  │                                                   │
   *  │  chart area  (bars, gridlines, markers)           │  chartHeight
   *  │                                                   │
   *  ├───────────────────────────────────────────────────┤  ← baseline
   *  │  row 1: tick values         (+12)                 │
   *  │  row 2: band labels         (+25)                 │
   *  │  row 3: highlight label     (+40)                 │  bottomZone
   *  └───────────────────────────────────────────────────┘
   */
  const topStrip = 22; // reserved for μ label + N badge
  const paddingLeft = 42;
  const paddingRight = 18;
  const bottomZone = highlight != null && highlightLabel ? 48 : 32;
  const svgWidth = 640;
  const chartTop = topStrip;
  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = height - topStrip - bottomZone;
  const barW = chartWidth / binCount;
  const barGap = Math.max(1, barW * 0.1);
  const baseline = chartTop + chartHeight;

  const xScale = (val: number) =>
    paddingLeft + ((val - min) / (max - min)) * chartWidth;
  const yScale = (count: number) =>
    chartTop + chartHeight - (count / maxCount) * chartHeight;

  // Highlighted bin
  const highlightBinIdx =
    highlight != null
      ? Math.min(Math.floor((highlight - min) / binWidth), binCount - 1)
      : -1;

  // Smart y-axis ticks (integers only, even spacing)
  const yTicks: number[] = [];
  if (maxCount <= 4) {
    for (let i = 1; i <= maxCount; i++) yTicks.push(i);
  } else {
    const step = maxCount <= 10 ? 2 : maxCount <= 20 ? 5 : 10;
    for (let i = step; i <= maxCount; i += step) yTicks.push(i);
  }

  // Unique gradient IDs (avoid collisions when multiple histograms render)
  const uid = `dh-${binCount}-${height}`;

  // Pre-compute marker X positions for collision checks
  const meanX = mean != null ? xScale(mean) : null;
  const highlightX = highlight != null ? xScale(highlight) : null;
  const medianX = median != null ? xScale(median) : null;

  // Collision helper: is a given x within `radius` of any vertical marker?
  const nearMarker = (x: number, radius: number) => {
    if (meanX != null && Math.abs(x - meanX) < radius) return true;
    if (highlightX != null && Math.abs(x - highlightX) < radius) return true;
    if (medianX != null && Math.abs(x - medianX) < radius) return true;
    return false;
  };

  return (
    <svg
      viewBox={`0 0 ${svgWidth} ${height}`}
      className="w-full select-none"
      role="img"
      aria-label="Composite score distribution histogram"
    >
      <defs>
        <linearGradient id={`${uid}-bar`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6b7280" stopOpacity={0.62} />
          <stop offset="100%" stopColor="#9ca3af" stopOpacity={0.35} />
        </linearGradient>
        <linearGradient id={`${uid}-bar-hl`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0b2545" stopOpacity={0.92} />
          <stop offset="100%" stopColor="#245694" stopOpacity={0.72} />
        </linearGradient>
      </defs>

      {/* ── Classification band background zones ───────────────── */}
      {[
        { from: 0, to: 0.15, band: "unconcentrated" as const },
        { from: 0.15, to: 0.25, band: "mild" as const },
        { from: 0.25, to: 0.5, band: "moderate" as const },
        { from: 0.5, to: 1.0, band: "high" as const },
      ].map(({ from, to, band }) => (
        <rect
          key={band}
          x={xScale(from)}
          y={chartTop}
          width={xScale(to) - xScale(from)}
          height={chartHeight}
          fill={BAND_TINTS[band]}
          opacity={0.35}
        />
      ))}

      {/* ── Threshold lines (vertical dashed) ──────────────────── */}
      {[0.15, 0.25, 0.5].map((v) => (
        <line
          key={v}
          x1={xScale(v)}
          y1={chartTop}
          x2={xScale(v)}
          y2={baseline}
          stroke="#d1d5db"
          strokeWidth={0.75}
          strokeDasharray="4,3"
        />
      ))}

      {/* ── Horizontal gridlines + left-axis labels ────────────── */}
      {yTicks.map((count) => {
        const y = yScale(count);
        return (
          <g key={`g-${count}`}>
            <line
              x1={paddingLeft}
              y1={y}
              x2={svgWidth - paddingRight}
              y2={y}
              stroke="#e5e7eb"
              strokeWidth={0.5}
            />
            <text
              x={paddingLeft - 7}
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

      {/* ── Histogram bars ─────────────────────────────────────── */}
      {bins.map((bin, i) => {
        if (bin.count === 0) return null;
        const isHighlighted = i === highlightBinIdx;
        const bx = paddingLeft + i * barW + barGap;
        const bw = Math.max(barW - barGap * 2, 1);
        const by = yScale(bin.count);
        const barHeight = baseline - by;
        const r = Math.min(2, bw / 4);

        // Suppress count label if:
        //  - bar too short
        //  - a vertical marker line passes through this bar (would overlap)
        //  - adjacent bin also has a count label and they'd collide
        const barCenterX = bx + bw / 2;
        const suppressCount =
          barHeight < 12 ||
          nearMarker(barCenterX, barW * 0.6) ||
          // Adjacent-label collision: suppress if neighbour exists and bar is narrow
          (barW < 35 &&
            ((i > 0 && bins[i - 1].count > 0 && baseline - yScale(bins[i - 1].count) >= 12) ||
             (i < binCount - 1 && bins[i + 1].count > 0 && baseline - yScale(bins[i + 1].count) >= 12)));

        return (
          <g key={i}>
            <path
              d={`
                M ${bx},${by + r}
                Q ${bx},${by} ${bx + r},${by}
                L ${bx + bw - r},${by}
                Q ${bx + bw},${by} ${bx + bw},${by + r}
                L ${bx + bw},${baseline}
                L ${bx},${baseline}
                Z
              `}
              fill={isHighlighted ? `url(#${uid}-bar-hl)` : `url(#${uid}-bar)`}
            />
            {/* Count label — only when no overlap risk */}
            {!suppressCount && (
              <text
                x={barCenterX}
                y={by - 5}
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

      {/* ── Mean line + label ──────────────────────────────────── */}
      {mean != null && meanX != null && (
        <g>
          <line
            x1={meanX}
            y1={chartTop}
            x2={meanX}
            y2={baseline}
            stroke="#0b2545"
            strokeWidth={1.25}
            strokeDasharray="5,3"
            opacity={0.55}
          />
          {/* Label in top strip — safe from bar/marker overlap */}
          {(() => {
            const tooCloseHL = highlightX != null && Math.abs(meanX - highlightX) < 50;
            const anchor = tooCloseHL
              ? meanX < highlightX! ? "end" : "start"
              : "middle";
            const dx = tooCloseHL
              ? meanX < highlightX! ? -5 : 5
              : 0;
            // Also avoid N-badge (at right edge)
            const nBadgeX = svgWidth - paddingRight;
            const tooCloseN = Math.abs(meanX + dx - nBadgeX) < 50;
            const finalAnchor = tooCloseN ? "start" : anchor;
            const finalDx = tooCloseN ? Math.min(dx, -5) : dx;
            return (
              <text
                x={meanX + finalDx}
                y={topStrip - 6}
                textAnchor={finalAnchor}
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

      {/* ── Median line + label ────────────────────────────────── */}
      {median != null && medianX != null && (
        <g>
          <line
            x1={medianX}
            y1={chartTop}
            x2={medianX}
            y2={baseline}
            stroke="#6b7280"
            strokeWidth={0.75}
            strokeDasharray="2,3"
            opacity={0.5}
          />
          {/* Place median label inside chart area, top-third, nudged away from neighbours */}
          {(() => {
            let nudgeX = 5;
            let anchor: "start" | "end" = "start";
            // Avoid mean line
            if (meanX != null && meanX > medianX && Math.abs(meanX - medianX) < 50) {
              nudgeX = -5;
              anchor = "end";
            }
            if (meanX != null && meanX <= medianX && Math.abs(meanX - medianX) < 50) {
              nudgeX = 5;
              anchor = "start";
            }
            // Avoid highlight line
            if (highlightX != null && Math.abs(highlightX - medianX) < 35) {
              nudgeX = highlightX > medianX ? -5 : 5;
              anchor = highlightX > medianX ? "end" : "start";
            }
            return (
              <text
                x={medianX + nudgeX}
                y={chartTop + 14}
                textAnchor={anchor}
                fill="#6b7280"
                fontSize="8"
                fontFamily="var(--font-mono)"
                opacity={0.7}
              >
                Mdn {formatScore(median)}
              </text>
            );
          })()}
        </g>
      )}

      {/* ── Highlight marker (country) ─────────────────────────── */}
      {highlight != null && highlightX != null && (
        <g>
          <line
            x1={highlightX}
            y1={chartTop}
            x2={highlightX}
            y2={baseline}
            stroke="#0b2545"
            strokeWidth={1.75}
            opacity={0.85}
          />
          {/* Small triangle at chart-top edge, pointing down into chart */}
          <polygon
            points={`
              ${highlightX},${chartTop + 5}
              ${highlightX - 3.5},${chartTop}
              ${highlightX + 3.5},${chartTop}
            `}
            fill="#0b2545"
          />
        </g>
      )}

      {/* ── X-axis baseline ────────────────────────────────────── */}
      <line
        x1={paddingLeft}
        y1={baseline}
        x2={svgWidth - paddingRight}
        y2={baseline}
        stroke="#d1d5db"
        strokeWidth={1}
      />

      {/* ── Left axis line ─────────────────────────────────────── */}
      <line
        x1={paddingLeft}
        y1={chartTop}
        x2={paddingLeft}
        y2={baseline}
        stroke="#e5e7eb"
        strokeWidth={0.5}
      />

      {/* ── N-count badge (top-right, inside top strip) ────────── */}
      <text
        x={svgWidth - paddingRight}
        y={topStrip - 6}
        textAnchor="end"
        fill="#9ca3af"
        fontSize="8"
        fontFamily="var(--font-mono)"
        letterSpacing="0.04em"
      >
        N = {scores.length}
      </text>

      {/* ── Bottom axis: ticks → band labels → highlight label ─── */}
      {(() => {
        const row1Y = baseline + 12; // tick values
        const row2Y = baseline + 25; // band labels
        const row3Y = baseline + 40; // highlight label

        // Highlight label geometry
        const hlX = highlightX;
        const hlLabelLen = highlightLabel ? highlightLabel.length : 0;
        const hlHalfW = hlLabelLen * 3.0 + 8;

        // Band definitions — shortened labels to prevent inter-band overlap
        const bands: { cx: number; label: string; color: string }[] = [
          { cx: 0.075, label: "Unconc.", color: BAND_ACCENTS.unconcentrated },
          { cx: 0.2, label: "Mild", color: BAND_ACCENTS.mild },
          { cx: 0.375, label: "Mod.", color: BAND_ACCENTS.moderate },
          { cx: 0.75, label: "High", color: BAND_ACCENTS.high },
        ];

        const ticks = [0, 0.15, 0.25, 0.5, 0.75, 1.0];

        // Horizontal overlap helper
        const overlaps = (ax: number, ahw: number, bx: number, bhw: number) =>
          Math.abs(ax - bx) < ahw + bhw;

        // Approx half-widths (conservative estimates)
        const tickHW = (v: number) => v.toFixed(2).length * 3 + 3;
        const bandHW = (label: string) => label.length * 2.4 + 4;

        // Check tick-to-tick collisions: suppress if too close to neighbours
        const tickXPositions = ticks.map((v) => ({ v, x: xScale(v) }));

        return (
          <>
            {/* Row 1: Tick marks + numeric values */}
            {tickXPositions.map(({ v, x: tx }, idx) => {
              // Suppress if collides with highlight label (on row 1 vertical alignment)
              const hideHL =
                hlX != null && overlaps(tx, tickHW(v), hlX, hlHalfW);
              // Suppress if too close to adjacent tick
              const prevTx = idx > 0 ? tickXPositions[idx - 1].x : -999;
              const nextTx = idx < tickXPositions.length - 1 ? tickXPositions[idx + 1].x : 9999;
              const hideAdj =
                (tx - prevTx < tickHW(v) + tickHW(tickXPositions[Math.max(0, idx - 1)].v)) ||
                (nextTx - tx < tickHW(v) + tickHW(tickXPositions[Math.min(tickXPositions.length - 1, idx + 1)].v));

              return (
                <g key={`t-${v}`}>
                  <line
                    x1={tx}
                    y1={baseline}
                    x2={tx}
                    y2={baseline + 3}
                    stroke="#d1d5db"
                    strokeWidth={1}
                  />
                  {!hideHL && !hideAdj && (
                    <text
                      x={tx}
                      y={row1Y}
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

            {/* Row 2: Classification band labels */}
            {bands.map(({ cx, label, color }) => {
              const bx = xScale(cx);
              // Suppress if overlaps highlight label
              const hideHL =
                hlX != null && overlaps(bx, bandHW(label), hlX, hlHalfW);
              // Suppress if band labels would overlap each other
              const hidePeer = bands.some(
                (other) =>
                  other.label !== label &&
                  overlaps(
                    bx,
                    bandHW(label),
                    xScale(other.cx),
                    bandHW(other.label)
                  )
                  && xScale(other.cx) < bx // only suppress the right-side one
              );
              return (
                <text
                  key={`b-${label}`}
                  x={bx}
                  y={row2Y}
                  textAnchor="middle"
                  fill={color}
                  fontSize="7"
                  fontWeight="500"
                  letterSpacing="0.05em"
                  style={{ textTransform: "uppercase" }}
                  opacity={hideHL || hidePeer ? 0 : 0.7}
                >
                  {label}
                </text>
              );
            })}

            {/* Row 3: Highlight country label — always visible, dedicated row */}
            {highlight != null && highlightLabel && hlX != null && (
              <g>
                <rect
                  x={hlX - hlHalfW}
                  y={row3Y - 9}
                  width={hlHalfW * 2}
                  height={13}
                  rx={3}
                  fill="#0b2545"
                  opacity={0.07}
                />
                <text
                  x={hlX}
                  y={row3Y}
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
