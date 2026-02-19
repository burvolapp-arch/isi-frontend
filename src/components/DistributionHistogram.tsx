"use client";

import { memo } from "react";
import { formatScore } from "@/lib/presentation";

/**
 * SVG-based histogram for composite score distribution.
 * Visual reference: OECD Economic Outlook statistical annexes.
 * Neutral gray bars, no background banding, thin gridlines.
 */

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
  const padding = { top: 20, right: 16, bottom: 52, left: 40 };
  const svgWidth = 640;
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const barW = chartWidth / binCount;

  const xScale = (val: number) =>
    padding.left + ((val - min) / (max - min)) * chartWidth;
  const yScale = (count: number) =>
    padding.top + chartHeight - (count / maxCount) * chartHeight;

  // Determine if a bin contains the highlighted score
  const highlightBinIdx =
    highlight != null
      ? Math.min(Math.floor((highlight - min) / binWidth), binCount - 1)
      : -1;

  return (
    <svg
      viewBox={`0 0 ${svgWidth} ${height}`}
      className="w-full"
      role="img"
      aria-label="Composite score distribution histogram"
    >
      {/* Vertical gridlines at classification thresholds */}
      {[0.15, 0.25, 0.5].map((v) => (
        <line
          key={v}
          x1={xScale(v)}
          y1={padding.top}
          x2={xScale(v)}
          y2={padding.top + chartHeight}
          stroke="#e5e7eb"
          strokeWidth={0.5}
          strokeDasharray="3,3"
        />
      ))}

      {/* Horizontal gridlines */}
      {[0.25, 0.5, 0.75, 1].map((frac) => {
        const count = Math.round(maxCount * frac);
        const y = yScale(count);
        return (
          <g key={frac}>
            <line
              x1={padding.left}
              y1={y}
              x2={svgWidth - padding.right}
              y2={y}
              stroke="#e5e7eb"
              strokeWidth={0.5}
            />
            <text
              x={padding.left - 6}
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

      {/* Histogram bars — neutral gray default, navy highlight */}
      {bins.map((bin, i) => {
        const isHighlighted = i === highlightBinIdx;
        const barFill = isHighlighted ? "#0b2545" : "#9ca3af";
        const barOpacity = bin.count > 0 ? (isHighlighted ? 0.85 : 0.45) : 0.05;
        return (
          <rect
            key={i}
            x={padding.left + i * barW + 1}
            y={yScale(bin.count)}
            width={Math.max(barW - 2, 1)}
            height={chartHeight - (yScale(bin.count) - padding.top)}
            fill={barFill}
            opacity={barOpacity}
          />
        );
      })}

      {/* Mean marker — thin dashed line */}
      {mean != null && (
        <g>
          <line
            x1={xScale(mean)}
            y1={padding.top - 2}
            x2={xScale(mean)}
            y2={padding.top + chartHeight}
            stroke="#0b2545"
            strokeWidth={1}
            strokeDasharray="4,3"
          />
          {/* Nudge mean label away from highlight if they overlap at top */}
          {(() => {
            const mx = xScale(mean);
            const hx = highlight != null ? xScale(highlight) : null;
            const tooClose = hx != null && Math.abs(mx - hx) < 40;
            // Shift label left or right if highlight overlaps
            const anchor = tooClose ? (mx < hx! ? "end" : "start") : "middle";
            const dx = tooClose ? (mx < hx! ? -6 : 6) : 0;
            return (
              <text
                x={mx + dx}
                y={padding.top - 6}
                textAnchor={anchor}
                fill="#0b2545"
                fontSize="9"
                fontFamily="var(--font-mono)"
                fontWeight="500"
              >
                Mean {formatScore(mean)}
              </text>
            );
          })()}
        </g>
      )}

      {/* Median marker — thin subtle line */}
      {median != null && (
        <g>
          <line
            x1={xScale(median)}
            y1={padding.top - 2}
            x2={xScale(median)}
            y2={padding.top + chartHeight}
            stroke="#6b7280"
            strokeWidth={0.75}
            strokeDasharray="2,3"
          />
          {/* Nudge median label to avoid both mean and highlight */}
          {(() => {
            const mdx = xScale(median);
            const mx = mean != null ? xScale(mean) : null;
            const hx = highlight != null ? xScale(highlight) : null;
            // Default: right of line
            let nudgeX = 5;
            let anchor: "start" | "end" = "start";
            // If mean is to the right and close, flip median label to the left
            if (mx != null && mx > mdx && Math.abs(mx - mdx) < 45) {
              nudgeX = -5;
              anchor = "end";
            }
            // If highlight is to the right and close, also flip
            if (hx != null && hx > mdx && Math.abs(hx - mdx) < 30) {
              nudgeX = -5;
              anchor = "end";
            }
            return (
              <text
                x={mdx + nudgeX}
                y={padding.top + 10}
                textAnchor={anchor}
                fill="#6b7280"
                fontSize="8"
                fontFamily="var(--font-mono)"
              >
                Mdn {formatScore(median)}
              </text>
            );
          })()}
        </g>
      )}

      {/* Highlight marker (for specific country) */}
      {highlight != null && (
        <g>
          <line
            x1={xScale(highlight)}
            y1={padding.top}
            x2={xScale(highlight)}
            y2={padding.top + chartHeight}
            stroke="#0b2545"
            strokeWidth={1.5}
          />
          <circle
            cx={xScale(highlight)}
            cy={padding.top - 2}
            r={2.5}
            fill="#0b2545"
          />
        </g>
      )}

      {/* X-axis baseline */}
      <line
        x1={padding.left}
        y1={padding.top + chartHeight}
        x2={svgWidth - padding.right}
        y2={padding.top + chartHeight}
        stroke="#d1d5db"
        strokeWidth={1}
      />

      {/* ── Bottom labels with collision avoidance ─────────────── */}
      {(() => {
        // Row 1: X-axis tick values (y offset +14)
        // Row 2: Classification band labels (y offset +26)
        // Row 3: Highlight country label (y offset +40)
        //
        // Strategy: compute pixel positions for all labels, then
        // suppress any tick or band label that would collide with
        // the highlight label or with each other.

        const tickY = padding.top + chartHeight + 14;
        const bandY = padding.top + chartHeight + 28;
        const highlightY = padding.top + chartHeight + 42;

        // Highlight label pixel position + approximate width
        const hlX = highlight != null ? xScale(highlight) : null;
        const hlHalfW = highlightLabel ? highlightLabel.length * 3.2 + 8 : 0;

        // Classification band definitions
        const bands = [
          { cx: 0.075, label: "Unconc." },
          { cx: 0.2, label: "Mild" },
          { cx: 0.375, label: "Mod." },
          { cx: 0.75, label: "High" },
        ];

        // Tick definitions
        const ticks = [0, 0.15, 0.25, 0.5, 0.75, 1.0];

        // Helper: do two horizontal ranges overlap?
        const overlaps = (ax: number, ahw: number, bx: number, bhw: number) =>
          Math.abs(ax - bx) < ahw + bhw;

        // Approximate half-widths (char count × avg char width)
        const tickHW = (v: number) => v.toFixed(2).length * 2.8 + 2;
        const bandHW = (label: string) => label.length * 2.2 + 2;

        return (
          <>
            {/* Tick marks + values — suppress if colliding with highlight */}
            {ticks.map((v) => {
              const tx = xScale(v);
              const hide =
                hlX != null &&
                overlaps(tx, tickHW(v), hlX, hlHalfW);
              return (
                <g key={`t-${v}`}>
                  <line
                    x1={tx}
                    y1={padding.top + chartHeight}
                    x2={tx}
                    y2={padding.top + chartHeight + 3}
                    stroke="#d1d5db"
                    strokeWidth={1}
                  />
                  {!hide && (
                    <text
                      x={tx}
                      y={tickY}
                      textAnchor="middle"
                      fill="#9ca3af"
                      fontSize="9"
                      fontFamily="var(--font-mono)"
                    >
                      {v.toFixed(2)}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Classification band labels — suppress if colliding with highlight */}
            {bands.map(({ cx, label }) => {
              const bx = xScale(cx);
              const hide =
                hlX != null &&
                overlaps(bx, bandHW(label), hlX, hlHalfW);
              return (
                <text
                  key={`b-${label}`}
                  x={bx}
                  y={bandY}
                  textAnchor="middle"
                  fill="#9ca3af"
                  fontSize="7"
                  letterSpacing="0.06em"
                  style={{ textTransform: "uppercase" }}
                  opacity={hide ? 0 : 1}
                >
                  {label}
                </text>
              );
            })}

            {/* Highlight country label — always visible, on its own row */}
            {highlight != null && highlightLabel && (
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
            )}
          </>
        );
      })()}
    </svg>
  );
});

DistributionHistogram.displayName = "DistributionHistogram";
