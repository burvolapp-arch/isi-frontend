"use client";

import { memo, useMemo } from "react";
import {
  getCanonicalAxisName,
  assertCanonicalLabel,
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
const LABEL_OFFSET = 1.10; // labels hug the outer ring — pure polar, no drift
const LABEL_FONT_SIZE = 18;
const LABEL_LINE_HEIGHT = 22;
const LABEL_MAX_CHARS = 22; // break label lines beyond this width
const MARGIN_X = 270; // horizontal viewBox margin — zero clipping at font 18 with offset 1.10
const MARGIN_Y = 270; // vertical viewBox margin — generous for top/bottom 3-line labels at 18px
const LEGEND_HEIGHT = 60; // space below chart for legend
const DATA_POINT_RADIUS = 4;
const GRID_STROKE = 1; // uniform grid stroke
const GRID_OPACITY = 0.12; // subtle grid presence

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

/** Split a label into multiple lines. First splits at " / ", then word-wraps any long segments. */
function wrapLabel(text: string): string[] {
  const segments = text.includes(" / ") ? text.split(" / ") : [text];
  const lines: string[] = [];

  for (const segment of segments) {
    if (segment.length <= LABEL_MAX_CHARS) {
      lines.push(segment);
      continue;
    }
    // Word-wrap this segment
    const words = segment.split(" ");
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
  }
  return lines;
}

// ─── Component ──────────────────────────────────────────────────────

const CHART_SIZE = 360;

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
  const radius = 302; // +4% from 290 — polygon occupies ~75% vertical card space
  const vbWidth = CHART_SIZE + MARGIN_X * 2;
  const vbHeight = CHART_SIZE + MARGIN_Y * 2;
  const vbCenterX = vbWidth / 2;
  const vbCenterY = vbHeight / 2;
  const legendY = CHART_SIZE + MARGIN_Y + 4;
  const angleStep = (2 * Math.PI) / n;

  const polarToXY = (value: number, index: number) => {
    const angle = angleStep * index - Math.PI / 2;
    return {
      x: vbCenterX + radius * value * Math.cos(angle),
      y: vbCenterY + radius * value * Math.sin(angle),
    };
  };

  const buildPath = (values: (number | null)[]) => {
    const points = values.map((v, i) => polarToXY(v ?? 0, i));
    return (
      points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z"
    );
  };

  const hasLegend = !!(euMean || compareAxes);
  const totalHeight = vbHeight + (hasLegend ? LEGEND_HEIGHT : 0);

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
      viewBox={`0 0 ${vbWidth} ${totalHeight}`}
      preserveAspectRatio="xMidYMid meet"
      className="mx-auto w-full"
      style={{ overflow: "visible" }}
      shapeRendering="geometricPrecision"
      textRendering="optimizeLegibility"
      role="img"
      aria-label={
        label
          ? `Radar chart showing multi-axis profile for ${label}`
          : "Radar chart showing multi-axis profile"
      }
    >
      {/* Grid rings — uniform stroke, opacity-based hierarchy */}
      {GRID_RINGS.map((r) => (
        <polygon
          key={r}
          points={Array.from({ length: n }, (_, i) => {
            const p = polarToXY(r, i);
            return `${p.x},${p.y}`;
          }).join(" ")}
          fill="none"
          stroke="var(--color-stone-300)"
          strokeWidth={GRID_STROKE}
          strokeOpacity={r === 1.0 ? 0.25 : GRID_OPACITY}
        />
      ))}

      {/* Grid spokes */}
      {resolvedAxes.map((_, i) => {
        const p = polarToXY(1, i);
        return (
          <line
            key={i}
            x1={vbCenterX}
            y1={vbCenterY}
            x2={p.x}
            y2={p.y}
            stroke="var(--color-stone-300)"
            strokeWidth={GRID_STROKE}
            strokeOpacity={GRID_OPACITY}
          />
        );
      })}

      {/* Ring scale labels — polar-aligned, optically centered on grid rings */}
      {GRID_RINGS.map((r) => (
        <text
          key={r}
          x={vbCenterX + 8}
          y={vbCenterY - radius * r}
          textAnchor="start"
          dominantBaseline="middle"
          fill="var(--color-text-quaternary)"
          fontSize="14"
          fontFamily="var(--font-mono)"
          opacity={0.6}
        >
          {r.toFixed(2)}
        </text>
      ))}

      {/* EU Mean polygon (reference) */}
      {euMeanPath && (
        <path
          d={euMeanPath}
          fill="var(--color-stone-300)"
          fillOpacity={0.12}
          stroke="var(--color-stone-400)"
          strokeWidth={1.6}
          strokeDasharray="4 4"
          strokeLinejoin="round"
        />
      )}

      {/* Comparison polygon */}
      {comparePath && (
        <path
          d={comparePath}
          fill="var(--color-stone-500)"
          fillOpacity={0.06}
          stroke="var(--color-stone-500)"
          strokeWidth={2.2}
          strokeDasharray="5 3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {/* Primary polygon — navy, institutional */}
      <path
        d={primaryPath}
        fill="var(--color-navy-700)"
        fillOpacity={0.1}
        stroke="var(--color-navy-700)"
        strokeWidth={2.2}
        strokeLinejoin="round"
        strokeLinecap="round"
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

      {/* Axis labels — pure polar placement, no artificial offsets */}
      {resolvedAxes.map((axis, i) => {
        const labelPoint = polarToXY(LABEL_OFFSET, i);
        const lines = wrapLabel(axis.label);
        const lineCount = lines.length;
        const startDy = -((lineCount - 1) * LABEL_LINE_HEIGHT) / 2;

        // Clean dynamic anchor — pure cosine threshold, no hemisphere hacks
        const angle = angleStep * i - Math.PI / 2;
        const cos = Math.cos(angle);
        let textAnchor: "start" | "middle" | "end" = "middle";
        if (cos > 0.1) {
          textAnchor = "start";
        } else if (cos < -0.1) {
          textAnchor = "end";
        }

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
              <line x1={MARGIN_X} y1={legendY} x2={MARGIN_X + 24} y2={legendY} stroke="var(--color-navy-700)" strokeWidth={2.2} strokeLinecap="round" />
              <text x={MARGIN_X + 32} y={legendY + 6} fill="var(--color-text-secondary)" fontSize="16" fontFamily="var(--font-sans)" fontWeight="500">{label}</text>
            </g>
          )}
          {euMean && (
            <g>
              <line x1={MARGIN_X} y1={legendY + 26} x2={MARGIN_X + 24} y2={legendY + 26} stroke="var(--color-stone-400)" strokeWidth={1.6} strokeDasharray="4 4" strokeLinecap="round" />
              <text x={MARGIN_X + 32} y={legendY + 32} fill="var(--color-text-tertiary)" fontSize="16" fontFamily="var(--font-sans)">EU-27 Mean</text>
            </g>
          )}
          {compareLabel && (
            <g>
              <line x1={MARGIN_X + 200} y1={legendY} x2={MARGIN_X + 224} y2={legendY} stroke="var(--color-stone-500)" strokeWidth={2.2} strokeDasharray="5 3" strokeLinecap="round" />
              <text x={MARGIN_X + 232} y={legendY + 6} fill="var(--color-text-tertiary)" fontSize="16" fontFamily="var(--font-sans)">{compareLabel}</text>
            </g>
          )}
        </g>
      )}
    </svg>
  );
});

RadarChart.displayName = "RadarChart";
