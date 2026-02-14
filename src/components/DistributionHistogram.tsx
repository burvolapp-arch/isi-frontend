"use client";

/**
 * SVG-based histogram for composite score distribution.
 * Visual reference: OECD Economic Outlook statistical annexes.
 * Muted palette, subtle gridlines, no neon. Authority-grade.
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

// Muted classification band tones (desaturated, institutional)
function bandColor(midpoint: number): string {
  if (midpoint >= 0.5) return "var(--color-band-highly)";
  if (midpoint >= 0.25) return "var(--color-band-moderately)";
  if (midpoint >= 0.15) return "var(--color-band-mildly)";
  return "var(--color-band-unconcentrated)";
}

export function DistributionHistogram({
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
  const padding = { top: 24, right: 20, bottom: 44, left: 44 };
  const svgWidth = 640;
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const barWidth = chartWidth / binCount;

  const xScale = (val: number) =>
    padding.left + ((val - min) / (max - min)) * chartWidth;
  const yScale = (count: number) =>
    padding.top + chartHeight - (count / maxCount) * chartHeight;

  // Classification band boundaries
  const bands = [
    { start: 0, end: 0.15, label: "Unconcentrated" },
    { start: 0.15, end: 0.25, label: "Mild" },
    { start: 0.25, end: 0.5, label: "Moderate" },
    { start: 0.5, end: 1.0, label: "High" },
  ];

  return (
    <svg
      viewBox={`0 0 ${svgWidth} ${height}`}
      className="w-full"
      role="img"
      aria-label="Composite score distribution histogram"
    >
      {/* Classification band shading — very subtle wash */}
      {bands.map((band) => (
        <rect
          key={band.label}
          x={xScale(band.start)}
          y={padding.top}
          width={xScale(band.end) - xScale(band.start)}
          height={chartHeight}
          fill={bandColor((band.start + band.end) / 2)}
          opacity={0.04}
        />
      ))}

      {/* Horizontal gridlines — hairline, understated */}
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
              stroke="var(--color-border-primary)"
              strokeWidth={0.5}
              strokeDasharray="2,4"
            />
            <text
              x={padding.left - 8}
              y={y + 3}
              textAnchor="end"
              fill="var(--color-text-quaternary)"
              fontSize="10"
              fontFamily="var(--font-mono)"
            >
              {count}
            </text>
          </g>
        );
      })}

      {/* Histogram bars — restrained opacity, no border-radius for print feel */}
      {bins.map((bin, i) => (
        <rect
          key={i}
          x={padding.left + i * barWidth + 0.5}
          y={yScale(bin.count)}
          width={Math.max(barWidth - 1, 1)}
          height={chartHeight - (yScale(bin.count) - padding.top)}
          fill={bandColor((bin.start + bin.end) / 2)}
          opacity={bin.count > 0 ? 0.5 : 0.05}
        />
      ))}

      {/* Mean marker */}
      {mean != null && (
        <g>
          <line
            x1={xScale(mean)}
            y1={padding.top - 4}
            x2={xScale(mean)}
            y2={padding.top + chartHeight}
            stroke="var(--color-navy-700)"
            strokeWidth={1.5}
            strokeDasharray="6,3"
          />
          <text
            x={xScale(mean)}
            y={padding.top - 10}
            textAnchor="middle"
            fill="var(--color-navy-700)"
            fontSize="10"
            fontFamily="var(--font-mono)"
            fontWeight="500"
          >
            Mean {mean.toFixed(3)}
          </text>
        </g>
      )}

      {/* Median marker */}
      {median != null && (
        <g>
          <line
            x1={xScale(median)}
            y1={padding.top - 4}
            x2={xScale(median)}
            y2={padding.top + chartHeight}
            stroke="var(--color-text-tertiary)"
            strokeWidth={1}
            strokeDasharray="2,3"
          />
          <text
            x={xScale(median) + 5}
            y={padding.top + 12}
            textAnchor="start"
            fill="var(--color-text-tertiary)"
            fontSize="9"
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
            stroke="var(--color-navy-900)"
            strokeWidth={2}
          />
          <circle
            cx={xScale(highlight)}
            cy={padding.top - 2}
            r={3}
            fill="var(--color-navy-900)"
          />
          {highlightLabel && (
            <text
              x={xScale(highlight)}
              y={padding.top + chartHeight + 26}
              textAnchor="middle"
              fill="var(--color-navy-900)"
              fontSize="10"
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
        stroke="var(--color-stone-300)"
        strokeWidth={1}
      />

      {/* X-axis tick labels */}
      {[0, 0.15, 0.25, 0.5, 0.75, 1.0].map((v) => (
        <g key={v}>
          <line
            x1={xScale(v)}
            y1={padding.top + chartHeight}
            x2={xScale(v)}
            y2={padding.top + chartHeight + 4}
            stroke="var(--color-stone-300)"
            strokeWidth={1}
          />
          <text
            x={xScale(v)}
            y={padding.top + chartHeight + 16}
            textAnchor="middle"
            fill="var(--color-text-quaternary)"
            fontSize="10"
            fontFamily="var(--font-mono)"
          >
            {v.toFixed(2)}
          </text>
        </g>
      ))}

      {/* Classification band labels */}
      {bands.map((band) => (
        <text
          key={band.label}
          x={(xScale(band.start) + xScale(band.end)) / 2}
          y={padding.top + chartHeight + 32}
          textAnchor="middle"
          fill="var(--color-text-quaternary)"
          fontSize="8"
          letterSpacing="0.08em"
          style={{ textTransform: "uppercase" }}
        >
          {band.label}
        </text>
      ))}
    </svg>
  );
}
