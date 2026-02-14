"use client";

/**
 * SVG-based radar chart for multi-axis country profiles.
 * Visual reference: NATO Strategic Foresight Analysis diagrams.
 * Muted, institutional. No neon fills. Subtle grid hierarchy.
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

  const polarToXY = (value: number, index: number) => {
    const angle = angleStep * index - Math.PI / 2;
    return {
      x: center + radius * value * Math.cos(angle),
      y: center + radius * value * Math.sin(angle),
    };
  };

  const buildPath = (values: (number | null)[]) => {
    const points = values.map((v, i) => {
      const val = v ?? 0;
      return polarToXY(val, i);
    });
    return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
  };

  const rings = [0.25, 0.5, 0.75, 1.0];

  const primaryValues = axes.map((a) => a.value);
  const primaryPath = buildPath(primaryValues);
  const euMeanPath = euMean ? buildPath(euMean) : null;
  const comparePath = compareAxes ? buildPath(compareAxes.map((a) => a.value)) : null;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto w-full max-w-sm"
      role="img"
      aria-label={label ? `Radar chart for ${label}` : "Radar chart"}
    >
      {/* Grid rings — hairline, subtle */}
      {rings.map((r) => (
        <polygon
          key={r}
          points={Array.from({ length: n }, (_, i) => {
            const p = polarToXY(r, i);
            return `${p.x},${p.y}`;
          }).join(" ")}
          fill="none"
          stroke="var(--color-stone-200)"
          strokeWidth={r === 1.0 ? 0.75 : 0.5}
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
            stroke="var(--color-stone-200)"
            strokeWidth={0.5}
          />
        );
      })}

      {/* Ring scale labels */}
      {rings.map((r) => (
        <text
          key={r}
          x={center + 4}
          y={center - radius * r + 3}
          fill="var(--color-text-quaternary)"
          fontSize="8"
          fontFamily="var(--font-mono)"
        >
          {r.toFixed(2)}
        </text>
      ))}

      {/* EU Mean polygon (reference) */}
      {euMeanPath && (
        <path
          d={euMeanPath}
          fill="var(--color-stone-300)"
          fillOpacity={0.15}
          stroke="var(--color-stone-400)"
          strokeWidth={1}
          strokeDasharray="3,3"
        />
      )}

      {/* Comparison polygon */}
      {comparePath && (
        <path
          d={comparePath}
          fill="var(--color-stone-500)"
          fillOpacity={0.08}
          stroke="var(--color-stone-500)"
          strokeWidth={1.5}
          strokeDasharray="4,2"
        />
      )}

      {/* Primary polygon — navy, restrained */}
      <path
        d={primaryPath}
        fill="var(--color-navy-700)"
        fillOpacity={0.1}
        stroke="var(--color-navy-700)"
        strokeWidth={1.5}
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
            r={2.5}
            fill="var(--color-navy-700)"
            stroke="var(--color-surface-primary)"
            strokeWidth={1.5}
          />
        );
      })}

      {/* Axis labels */}
      {axes.map((axis, i) => {
        const labelPoint = polarToXY(1.2, i);
        return (
          <text
            key={i}
            x={labelPoint.x}
            y={labelPoint.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--color-text-secondary)"
            fontSize="10"
            fontFamily="var(--font-sans)"
            fontWeight="500"
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
              <line x1={16} y1={size - 28} x2={28} y2={size - 28} stroke="var(--color-navy-700)" strokeWidth={1.5} />
              <text x={32} y={size - 25} fill="var(--color-text-secondary)" fontSize="9" fontFamily="var(--font-sans)">{label}</text>
            </g>
          )}
          {euMean && (
            <g>
              <line x1={16} y1={size - 16} x2={28} y2={size - 16} stroke="var(--color-stone-400)" strokeWidth={1} strokeDasharray="3,3" />
              <text x={32} y={size - 13} fill="var(--color-text-tertiary)" fontSize="9" fontFamily="var(--font-sans)">EU-27 Mean</text>
            </g>
          )}
          {compareLabel && (
            <g>
              <line x1={120} y1={size - 28} x2={132} y2={size - 28} stroke="var(--color-stone-500)" strokeWidth={1.5} strokeDasharray="4,2" />
              <text x={136} y={size - 25} fill="var(--color-text-tertiary)" fontSize="9" fontFamily="var(--font-sans)">{compareLabel}</text>
            </g>
          )}
        </g>
      )}
    </svg>
  );
}
