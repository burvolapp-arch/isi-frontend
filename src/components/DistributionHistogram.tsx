"use client";

import { memo } from "react";

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
  height = 180,
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
  const padding = { top: 20, right: 16, bottom: 36, left: 40 };
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
          <text
            x={xScale(mean)}
            y={padding.top - 6}
            textAnchor="middle"
            fill="#0b2545"
            fontSize="9"
            fontFamily="var(--font-mono)"
            fontWeight="500"
          >
            Mean {mean.toFixed(3)}
          </text>
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
          <text
            x={xScale(median) + 5}
            y={padding.top + 10}
            textAnchor="start"
            fill="#6b7280"
            fontSize="8"
            fontFamily="var(--font-mono)"
          >
            Mdn {median.toFixed(3)}
          </text>
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
          {highlightLabel && (
            <text
              x={xScale(highlight)}
              y={padding.top + chartHeight + 24}
              textAnchor="middle"
              fill="#0b2545"
              fontSize="9"
              fontWeight="600"
              fontFamily="var(--font-sans)"
            >
              {highlightLabel}
            </text>
          )}
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

      {/* X-axis tick labels */}
      {[0, 0.15, 0.25, 0.5, 0.75, 1.0].map((v) => (
        <g key={v}>
          <line
            x1={xScale(v)}
            y1={padding.top + chartHeight}
            x2={xScale(v)}
            y2={padding.top + chartHeight + 3}
            stroke="#d1d5db"
            strokeWidth={1}
          />
          <text
            x={xScale(v)}
            y={padding.top + chartHeight + 14}
            textAnchor="middle"
            fill="#9ca3af"
            fontSize="9"
            fontFamily="var(--font-mono)"
          >
            {v.toFixed(2)}
          </text>
        </g>
      ))}

      {/* Classification threshold labels */}
      {[
        { x: 0.075, label: "Unconc." },
        { x: 0.2, label: "Mild" },
        { x: 0.375, label: "Mod." },
        { x: 0.75, label: "High" },
      ].map(({ x, label }) => (
        <text
          key={label}
          x={xScale(x)}
          y={padding.top + chartHeight + 26}
          textAnchor="middle"
          fill="#9ca3af"
          fontSize="7"
          letterSpacing="0.06em"
          style={{ textTransform: "uppercase" }}
        >
          {label}
        </text>
      ))}
    </svg>
  );
});

DistributionHistogram.displayName = "DistributionHistogram";
