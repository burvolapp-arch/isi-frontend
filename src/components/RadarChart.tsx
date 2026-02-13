"use client";

/**
 * SVG-based radar chart for multi-axis country profiles.
 * Supports overlaying EU mean as a reference polygon.
 * Dynamic — axis count is driven by data, never hardcoded.
 */

interface RadarAxis {
  label: string;
  value: number | null;
}

interface RadarChartProps {
  /** Primary country's axis scores */
  axes: RadarAxis[];
  /** EU mean per axis (same order as axes), for reference overlay */
  euMean?: (number | null)[];
  /** Second country overlay (for comparison mode) */
  compareAxes?: RadarAxis[];
  compareLabel?: string;
  /** Country label */
  label?: string;
  size?: number;
}

export function RadarChart({
  axes,
  euMean,
  compareAxes,
  compareLabel,
  label,
  size = 300,
}: RadarChartProps) {
  if (axes.length === 0) return null;

  const n = axes.length;
  const center = size / 2;
  const radius = (size - 80) / 2;
  const angleStep = (2 * Math.PI) / n;

  // Convert value (0–1) to point on radar
  const polarToXY = (value: number, index: number) => {
    const angle = angleStep * index - Math.PI / 2; // Start from top
    return {
      x: center + radius * value * Math.cos(angle),
      y: center + radius * value * Math.sin(angle),
    };
  };

  // Build polygon path from values
  const buildPath = (values: (number | null)[]) => {
    const points = values.map((v, i) => {
      const val = v ?? 0;
      return polarToXY(val, i);
    });
    return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
  };

  // Concentric grid rings at 0.25, 0.50, 0.75, 1.00
  const rings = [0.25, 0.5, 0.75, 1.0];

  const primaryValues = axes.map((a) => a.value);
  const primaryPath = buildPath(primaryValues);
  const euMeanPath = euMean ? buildPath(euMean) : null;
  const comparePath = compareAxes ? buildPath(compareAxes.map((a) => a.value)) : null;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="w-full max-w-xs mx-auto"
      role="img"
      aria-label={label ? `Radar chart for ${label}` : "Radar chart"}
    >
      {/* Grid rings */}
      {rings.map((r) => (
        <polygon
          key={r}
          points={Array.from({ length: n }, (_, i) => {
            const p = polarToXY(r, i);
            return `${p.x},${p.y}`;
          }).join(" ")}
          fill="none"
          stroke="var(--color-border-primary)"
          strokeWidth={0.5}
        />
      ))}

      {/* Grid spokes */}
      {axes.map((_, i) => {
        const p = polarToXY(1, i);
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={p.x}
            y2={p.y}
            stroke="var(--color-border-primary)"
            strokeWidth={0.5}
          />
        );
      })}

      {/* Ring labels */}
      {rings.map((r) => (
        <text
          key={r}
          x={center + 4}
          y={center - radius * r + 3}
          className="fill-text-quaternary text-[8px]"
        >
          {r.toFixed(2)}
        </text>
      ))}

      {/* EU Mean polygon (reference) */}
      {euMeanPath && (
        <path
          d={euMeanPath}
          fill="var(--color-accent)"
          fillOpacity={0.05}
          stroke="var(--color-accent)"
          strokeWidth={1}
          strokeDasharray="3,3"
        />
      )}

      {/* Comparison polygon */}
      {comparePath && (
        <path
          d={comparePath}
          fill="var(--color-text-tertiary)"
          fillOpacity={0.06}
          stroke="var(--color-text-tertiary)"
          strokeWidth={1.5}
          strokeDasharray="4,2"
        />
      )}

      {/* Primary polygon */}
      <path
        d={primaryPath}
        fill="var(--color-accent)"
        fillOpacity={0.12}
        stroke="var(--color-accent)"
        strokeWidth={2}
      />

      {/* Data points */}
      {axes.map((axis, i) => {
        if (axis.value === null) return null;
        const p = polarToXY(axis.value, i);
        return (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={3}
            fill="var(--color-accent)"
            stroke="var(--color-surface-primary)"
            strokeWidth={1.5}
          />
        );
      })}

      {/* Axis labels */}
      {axes.map((axis, i) => {
        const labelPoint = polarToXY(1.18, i);
        return (
          <text
            key={i}
            x={labelPoint.x}
            y={labelPoint.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-text-secondary text-[10px] font-medium"
          >
            {axis.label}
          </text>
        );
      })}

      {/* Legend */}
      {(euMean || compareAxes) && (
        <g>
          {label && (
            <g>
              <line x1={16} y1={size - 28} x2={28} y2={size - 28} stroke="var(--color-accent)" strokeWidth={2} />
              <text x={32} y={size - 25} className="fill-text-secondary text-[9px]">{label}</text>
            </g>
          )}
          {euMean && (
            <g>
              <line x1={16} y1={size - 16} x2={28} y2={size - 16} stroke="var(--color-accent)" strokeWidth={1} strokeDasharray="3,3" />
              <text x={32} y={size - 13} className="fill-text-tertiary text-[9px]">EU-27 Mean</text>
            </g>
          )}
          {compareLabel && (
            <g>
              <line x1={120} y1={size - 28} x2={132} y2={size - 28} stroke="var(--color-text-tertiary)" strokeWidth={1.5} strokeDasharray="4,2" />
              <text x={136} y={size - 25} className="fill-text-tertiary text-[9px]">{compareLabel}</text>
            </g>
          )}
        </g>
      )}
    </svg>
  );
}
