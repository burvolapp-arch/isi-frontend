"use client";

/**
 * SVG-based histogram for composite score distribution.
 * Shows frequency bars with quartile shading and EU mean/median markers.
 * Pure client component — no hardcoded axis assumptions.
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

// Classification band colors (institutional)
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
  const padding = { top: 20, right: 16, bottom: 40, left: 40 };
  const svgWidth = 600;
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
      {/* Classification band shading */}
      {bands.map((band) => (
        <rect
          key={band.label}
          x={xScale(band.start)}
          y={padding.top}
          width={xScale(band.end) - xScale(band.start)}
          height={chartHeight}
          fill={bandColor((band.start + band.end) / 2)}
          opacity={0.06}
        />
      ))}

      {/* Y-axis gridlines */}
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
            />
            <text
              x={padding.left - 6}
              y={y + 3}
              textAnchor="end"
              className="fill-text-quaternary text-[10px]"
            >
              {count}
            </text>
          </g>
        );
      })}

      {/* Histogram bars */}
      {bins.map((bin, i) => (
        <rect
          key={i}
          x={padding.left + i * barWidth + 1}
          y={yScale(bin.count)}
          width={Math.max(barWidth - 2, 1)}
          height={chartHeight - (yScale(bin.count) - padding.top)}
          fill={bandColor((bin.start + bin.end) / 2)}
          opacity={bin.count > 0 ? 0.7 : 0.1}
          rx={1}
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
            stroke="var(--color-accent)"
            strokeWidth={1.5}
            strokeDasharray="4,3"
          />
          <text
            x={xScale(mean)}
            y={padding.top - 8}
            textAnchor="middle"
            className="fill-accent text-[10px] font-medium"
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
            x={xScale(median) + 4}
            y={padding.top + 12}
            textAnchor="start"
            className="fill-text-tertiary text-[9px]"
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
            stroke="var(--color-text-primary)"
            strokeWidth={2}
          />
          {highlightLabel && (
            <text
              x={xScale(highlight)}
              y={padding.top + chartHeight + 24}
              textAnchor="middle"
              className="fill-text-primary text-[10px] font-semibold"
            >
              {highlightLabel}
            </text>
          )}
        </g>
      )}

      {/* X-axis */}
      <line
        x1={padding.left}
        y1={padding.top + chartHeight}
        x2={svgWidth - padding.right}
        y2={padding.top + chartHeight}
        stroke="var(--color-border-secondary)"
        strokeWidth={1}
      />

      {/* X-axis labels */}
      {[0, 0.15, 0.25, 0.5, 0.75, 1.0].map((v) => (
        <text
          key={v}
          x={xScale(v)}
          y={padding.top + chartHeight + 16}
          textAnchor="middle"
          className="fill-text-quaternary text-[10px]"
        >
          {v.toFixed(2)}
        </text>
      ))}

      {/* Classification band labels */}
      {bands.map((band) => (
        <text
          key={band.label}
          x={(xScale(band.start) + xScale(band.end)) / 2}
          y={padding.top + chartHeight + 30}
          textAnchor="middle"
          className="fill-text-quaternary text-[8px] uppercase tracking-wider"
        >
          {band.label}
        </text>
      ))}
    </svg>
  );
}
