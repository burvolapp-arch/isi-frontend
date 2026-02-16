"use client";

import { memo, useMemo } from "react";
import {
  getCanonicalAxisName,
  assertCanonicalLabel,
  type AxisSlug,
} from "@/lib/axisRegistry";

/**
 * SVG-based radar chart for multi-axis country profiles.
 * Visual reference: NATO Strategic Foresight Analysis diagrams.
 * Muted, institutional. No neon fills. Subtle grid hierarchy.
 *
 * ARCHITECTURAL INVARIANT:
 * This component resolves ALL display labels internally via
 * getCanonicalAxisName(). It NEVER accepts display labels as props.
 * It NEVER reads backend label fields.
 */

// ─── Constants ──────────────────────────────────────────────────────

const GRID_RINGS = [0.25, 0.5, 0.75, 1.0] as const;
const LABEL_OFFSET = 1.35; // multiplicative distance of labels from chart edge
const LABEL_FONT_SIZE = 7.5;
const LABEL_LINE_HEIGHT = 9.5;
const LABEL_MAX_CHARS = 22; // break label lines beyond this width
const MARGIN = 90; // viewBox margin around the radar for labels
const LEGEND_HEIGHT = 36; // space below chart for legend
const DATA_POINT_RADIUS = 2.5;
const OUTER_RING_STROKE = 0.75;
const INNER_RING_STROKE = 0.5;
const SPOKE_STROKE = 0.5;

// ─── Types ──────────────────────────────────────────────────────────

/** Each axis is identified by slug + numeric value. Label is resolved internally. */
interface RadarAxisInput {
  slug: string;
  value: number | null;
}

interface RadarChartProps {
  /** Primary country's axis scores — slug + value only */
  axes: RadarAxisInput[];
  /** EU mean per axis (same order as axes), for reference overlay */
  euMean?: (number | null)[];
  /** Second country overlay (for comparison mode) */
  compareAxes?: RadarAxisInput[];
  compareLabel?: string;
  /** Country label */
  label?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────

/** Split a label into multiple lines at " / " or whitespace near LABEL_MAX_CHARS. */
function wrapLabel(text: string): string[] {
  // First try splitting at " / " delimiter
  if (text.includes(" / ")) return text.split(" / ");
  if (text.length <= LABEL_MAX_CHARS) return [text];

  // Word-wrap at nearest space
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (current && (current + " " + word).length > LABEL_MAX_CHARS) {
      lines.push(current);
      current = word;
    } else {
      current = current ? current + " " + word : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// ─── Component ──────────────────────────────────────────────────────

const CHART_SIZE = 300;

export const RadarChart = memo(function RadarChart({
  axes,
  euMean,
  compareAxes,
  compareLabel,
  label,
}: RadarChartProps) {
  if (axes.length === 0) return null;

  // Resolve canonical labels from slugs — the ONLY label resolution path
  const resolvedAxes = useMemo(
    () =>
      axes.map((a) => {
        const canonicalLabel = getCanonicalAxisName(a.slug);
        // Regression guard — assert label validity in development
        assertCanonicalLabel(canonicalLabel, "RadarChart");
        return { label: canonicalLabel, value: a.value };
      }),
    [axes],
  );

  const n = resolvedAxes.length;
  const radius = (CHART_SIZE - 80) / 2;
  const center = CHART_SIZE / 2;
  const vbMargin = MARGIN;
  const vbSize = CHART_SIZE + vbMargin * 2;
  const vbCenter = vbSize / 2;
  const legendY = CHART_SIZE + vbMargin + 4;
  const angleStep = (2 * Math.PI) / n;

  const polarToXY = (value: number, index: number) => {
    const angle = angleStep * index - Math.PI / 2;
    return {
      x: vbCenter + radius * value * Math.cos(angle),
      y: vbCenter + radius * value * Math.sin(angle),
    };
  };

  const buildPath = (values: (number | null)[]) => {
    const points = values.map((v, i) => polarToXY(v ?? 0, i));
    return (
      points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z"
    );
  };

  const hasLegend = !!(euMean || compareAxes);
  const totalHeight = vbSize + (hasLegend ? LEGEND_HEIGHT : 0);

  const primaryPath = useMemo(() => buildPath(resolvedAxes.map((a) => a.value)), [resolvedAxes]);
  const euMeanPath = useMemo(
    () => (euMean ? buildPath(euMean) : null),
    [euMean],
  );
  const comparePath = useMemo(
    () => (compareAxes ? buildPath(compareAxes.map((a) => a.value)) : null),
    [compareAxes],
  );

  return (
    <svg
      viewBox={`0 0 ${vbSize} ${totalHeight}`}
      className="mx-auto w-full max-w-sm"
      role="img"
      aria-label={
        label
          ? `Radar chart showing multi-axis profile for ${label}`
          : "Radar chart showing multi-axis profile"
      }
    >
      {/* Grid rings — hairline, subtle */}
      {GRID_RINGS.map((r) => (
        <polygon
          key={r}
          points={Array.from({ length: n }, (_, i) => {
            const p = polarToXY(r, i);
            return `${p.x},${p.y}`;
          }).join(" ")}
          fill="none"
          stroke="var(--color-stone-200)"
          strokeWidth={r === 1.0 ? OUTER_RING_STROKE : INNER_RING_STROKE}
        />
      ))}

      {/* Grid spokes */}
      {resolvedAxes.map((_, i) => {
        const p = polarToXY(1, i);
        return (
          <line
            key={i}
            x1={vbCenter}
            y1={vbCenter}
            x2={p.x}
            y2={p.y}
            stroke="var(--color-stone-200)"
            strokeWidth={SPOKE_STROKE}
          />
        );
      })}

      {/* Ring scale labels */}
      {GRID_RINGS.map((r) => (
        <text
          key={r}
          x={vbCenter + 4}
          y={vbCenter - radius * r + 3}
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
      {resolvedAxes.map((axis, i) => {
        if (axis.value === null) return null;
        const p = polarToXY(axis.value, i);
        return (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={DATA_POINT_RADIUS}
            fill="var(--color-navy-700)"
            stroke="var(--color-surface-primary)"
            strokeWidth={1.5}
          />
        );
      })}

      {/* Axis labels — multi-line wrapping, full canonical names */}
      {resolvedAxes.map((axis, i) => {
        const labelPoint = polarToXY(LABEL_OFFSET, i);
        const lines = wrapLabel(axis.label);
        const lineCount = lines.length;
        const startDy = -((lineCount - 1) * LABEL_LINE_HEIGHT) / 2;

        // Determine text-anchor based on horizontal position
        const angle = angleStep * i - Math.PI / 2;
        const cos = Math.cos(angle);
        let textAnchor: "start" | "middle" | "end" = "middle";
        if (cos > 0.3) textAnchor = "start";
        else if (cos < -0.3) textAnchor = "end";

        return (
          <text
            key={i}
            x={labelPoint.x}
            y={labelPoint.y}
            textAnchor={textAnchor}
            dominantBaseline="middle"
            fill="var(--color-text-secondary)"
            fontSize={LABEL_FONT_SIZE}
            fontFamily="var(--font-sans)"
            fontWeight="500"
          >
            {lines.map((line, li) => (
              <tspan
                key={li}
                x={labelPoint.x}
                dy={li === 0 ? startDy : LABEL_LINE_HEIGHT}
              >
                {line}
              </tspan>
            ))}
          </text>
        );
      })}

      {/* Legend — positioned below chart */}
      {hasLegend && (
        <g>
          {label && (
            <g>
              <line x1={vbMargin} y1={legendY} x2={vbMargin + 12} y2={legendY} stroke="var(--color-navy-700)" strokeWidth={1.5} />
              <text x={vbMargin + 16} y={legendY + 3} fill="var(--color-text-secondary)" fontSize="9" fontFamily="var(--font-sans)">{label}</text>
            </g>
          )}
          {euMean && (
            <g>
              <line x1={vbMargin} y1={legendY + 14} x2={vbMargin + 12} y2={legendY + 14} stroke="var(--color-stone-400)" strokeWidth={1} strokeDasharray="3,3" />
              <text x={vbMargin + 16} y={legendY + 17} fill="var(--color-text-tertiary)" fontSize="9" fontFamily="var(--font-sans)">EU-27 Mean</text>
            </g>
          )}
          {compareLabel && (
            <g>
              <line x1={vbMargin + 120} y1={legendY} x2={vbMargin + 132} y2={legendY} stroke="var(--color-stone-500)" strokeWidth={1.5} strokeDasharray="4,2" />
              <text x={vbMargin + 136} y={legendY + 3} fill="var(--color-text-tertiary)" fontSize="9" fontFamily="var(--font-sans)">{compareLabel}</text>
            </g>
          )}
        </g>
      )}
    </svg>
  );
});

RadarChart.displayName = "RadarChart";
