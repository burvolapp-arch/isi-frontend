"use client";

import { memo, useMemo, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  formatAxisShort,
  formatAxisFull,
  formatScore,
  formatDelta,
} from "@/lib/presentation";

/**
 * SVG-based radar chart for multi-axis country profiles.
 * Visual reference: NATO Strategic Foresight Analysis diagrams.
 * Muted, institutional. No neon fills. Subtle grid hierarchy.
 *
 * ARCHITECTURAL INVARIANT:
 * This component resolves ALL display labels internally via
 * getCanonicalAxisName(). It NEVER accepts display labels as props.
 * It NEVER reads backend label fields.
 *
 * Interactive: hover for axis tooltip, click to navigate to axis detail.
 */

// ─── Constants ──────────────────────────────────────────────────────

const GRID_RINGS = [0.25, 0.5, 0.75, 1.0] as const;
const LABEL_OFFSET = 1.22; // pull labels inward — prevent clipping
const LABEL_FONT_SIZE = 10.5;
const LABEL_LINE_HEIGHT = 13;
const LABEL_MAX_CHARS = 18; // break label lines — keep them compact
const VB_SIZE = 460; // compact viewBox — chart fills more of the card
const RADAR_RADIUS = Math.round(VB_SIZE * 0.28); // ~129 — 78% fill, ample label margin
const MARGIN = (VB_SIZE - RADAR_RADIUS * 2) / 2; // margin for labels
const LEGEND_HEIGHT = 28; // space below chart for legend
const DATA_POINT_RADIUS = 3.5;
const GRID_STROKE = 0.8; // clearly visible grid lines
const GRID_OPACITY = 0.28; // visible grid
const OUTER_RING_OPACITY = 0.40; // outer ring more prominent

// ─── Types ──────────────────────────────────────────────────────────

/** Each axis is identified by slug + numeric value. Label is resolved internally. */
interface RadarAxisInput {
  slug: string;
  value: number | null;
}

/** Optional per-axis metadata for tooltip display. Order must match axes. */
export interface RadarAxisMeta {
  euMeanScore?: number | null;
  deviation?: number | null;
  rank?: number | null;
  totalRanked?: number | null;
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
  /** Country code for axis navigation (e.g. "SE") */
  countryCode?: string;
  /** Per-axis metadata for tooltip display. Must match axes order. */
  axisMeta?: RadarAxisMeta[];
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

// ─── Tooltip ────────────────────────────────────────────────────────

function fmtScore(v: number | null | undefined): string {
  return formatScore(v ?? null);
}

interface TooltipData {
  label: string;
  score: number | null;
  euMean: number | null;
  deviation: number | null;
  rank: number | null;
  totalRanked: number | null;
}

function RadarTooltip({
  data,
  mouseX,
  mouseY,
}: {
  data: TooltipData;
  mouseX: number;
  mouseY: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Viewport-clamped positioning
  const style = useMemo(() => {
    const pad = 16;
    const approxW = 260;
    const approxH = 140;
    let left = mouseX + pad;
    let top = mouseY + pad;
    if (typeof window !== "undefined") {
      if (left + approxW > window.innerWidth - pad) left = mouseX - approxW - pad;
      if (top + approxH > window.innerHeight - pad) top = mouseY - approxH - pad;
    }
    return { position: "fixed" as const, left, top, zIndex: 50 };
  }, [mouseX, mouseY]);

  return (
    <div
      ref={ref}
      role="tooltip"
      style={style}
      className="pointer-events-none rounded-lg border border-stone-200 bg-white px-4 py-3 shadow-lg dark:border-stone-700 dark:bg-stone-900"
    >
      <p className="mb-2 text-sm font-semibold text-stone-800 dark:text-stone-100">
        {data.label}
      </p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
        <span className="text-stone-500">Score</span>
        <span className="font-mono text-stone-800 dark:text-stone-200">
          {fmtScore(data.score)}
        </span>
        <span className="text-stone-500">EU-27 Mean</span>
        <span className="font-mono text-stone-800 dark:text-stone-200">
          {fmtScore(data.euMean)}
        </span>
        <span className="text-stone-500">Deviation</span>
        <span className="font-mono text-stone-800 dark:text-stone-200">
          {data.deviation != null
            ? formatDelta(data.deviation)
            : "—"}
        </span>
        {data.rank != null && data.totalRanked != null && (
          <>
            <span className="text-stone-500">Rank</span>
            <span className="font-mono text-stone-800 dark:text-stone-200">
              {data.rank} / {data.totalRanked}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Wedge geometry ─────────────────────────────────────────────────

/** Builds an SVG path for a pie-slice wedge around axis `index`. */
function buildWedge(
  index: number,
  n: number,
  cx: number,
  cy: number,
  reach: number,
): string {
  const step = (2 * Math.PI) / n;
  const centerAngle = step * index - Math.PI / 2;
  const halfStep = step / 2;
  const a1 = centerAngle - halfStep;
  const a2 = centerAngle + halfStep;
  const x1 = cx + reach * Math.cos(a1);
  const y1 = cy + reach * Math.sin(a1);
  const x2 = cx + reach * Math.cos(a2);
  const y2 = cy + reach * Math.sin(a2);
  // Arc: large-arc=0 since halfStep < π, sweep=1 for clockwise
  return `M ${cx} ${cy} L ${x1} ${y1} A ${reach} ${reach} 0 0 1 ${x2} ${y2} Z`;
}

// ─── Component ──────────────────────────────────────────────────────

export const RadarChart = memo(function RadarChart({
  axes,
  euMean,
  compareAxes,
  compareLabel,
  label,
  countryCode,
  axisMeta,
}: RadarChartProps) {
  const router = useRouter();

  // ── Interaction state ──
  const [hoveredAxis, setHoveredAxis] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  if (axes.length === 0) return null;

  // ── Safety invariant: filter out undefined/invalid axis entries ──
  const safeAxes = axes.filter(
    (a): a is RadarAxisInput =>
      a != null &&
      typeof a.slug === "string" &&
      a.slug.length > 0,
  );
  if (safeAxes.length === 0) return null;

  // Resolve canonical labels from slugs — the ONLY label resolution path
  const resolvedAxes = useMemo(
    () =>
      safeAxes.map((a) => {
        const shortLabel = formatAxisShort(a.slug);
        const fullLabel = formatAxisFull(a.slug);
        // Clamp value to [0, 1] and replace NaN/Infinity with null
        const safeValue =
          a.value === null || a.value === undefined || !Number.isFinite(a.value)
            ? null
            : Math.max(0, Math.min(1, a.value));
        return { slug: a.slug, label: shortLabel, fullLabel, value: safeValue };
      }),
    [safeAxes],
  );

  const n = resolvedAxes.length;

  // Radius from authoritative constant — no runtime arithmetic drift
  const radius = RADAR_RADIUS; // 193 — VB_SIZE * 0.42

  const vbCenterX = VB_SIZE / 2;
  const vbCenterY = VB_SIZE / 2;
  const angleStep = (2 * Math.PI) / n;

  const polarToXY = (value: number, index: number) => {
    const angle = angleStep * index - Math.PI / 2;
    const safeVal = Number.isFinite(value) ? value : 0;
    return {
      x: vbCenterX + radius * safeVal * Math.cos(angle),
      y: vbCenterY + radius * safeVal * Math.sin(angle),
    };
  };

  const buildPath = (values: (number | null)[]) => {
    const points = values.map((v, i) => {
      const safe = v != null && Number.isFinite(v) ? v : 0;
      return polarToXY(safe, i);
    });
    return (
      points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z"
    );
  };

  const hasLegend = !!(euMean || compareAxes);
  const totalHeight = VB_SIZE + (hasLegend ? LEGEND_HEIGHT : 0);
  const legendY = VB_SIZE + 2;

  const primaryPath = useMemo(() => buildPath(resolvedAxes.map((a) => a.value)), [resolvedAxes]);
  const euMeanPath = useMemo(
    () => (euMean ? buildPath(euMean) : null),
    [euMean],
  );
  const comparePath = useMemo(
    () => (compareAxes && compareAxes.length > 0 ? buildPath(compareAxes.map((a) => a?.value ?? null)) : null),
    [compareAxes],
  );

  // ── Interaction handlers ──
  const wedgeReach = radius * 1.15; // wedge extends slightly beyond axis tips

  const handleAxisHover = useCallback((index: number) => {
    setHoveredAxis(index);
  }, []);

  const handleAxisMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleAxisLeave = useCallback(() => {
    setHoveredAxis(null);
  }, []);

  const handleAxisClick = useCallback(
    (index: number) => {
      if (!countryCode) return;
      const slug = resolvedAxes[index]?.slug;
      if (slug) {
        router.push(`/country/${countryCode}#axis-${slug}`);
      }
    },
    [countryCode, resolvedAxes, router],
  );

  const handleAxisKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleAxisClick(index);
      }
    },
    [handleAxisClick],
  );

  // ── Tooltip data computation ──
  const tooltipData: TooltipData | null = useMemo(() => {
    if (hoveredAxis === null) return null;
    const axis = resolvedAxes[hoveredAxis];
    if (!axis) return null;

    const meta = axisMeta?.[hoveredAxis];
    const euMeanVal = meta?.euMeanScore ?? euMean?.[hoveredAxis] ?? null;
    const deviation =
      meta?.deviation ??
      (axis.value != null && euMeanVal != null
        ? axis.value - euMeanVal
        : null);

    return {
      label: axis.fullLabel,
      score: axis.value,
      euMean: euMeanVal,
      deviation,
      rank: meta?.rank ?? null,
      totalRanked: meta?.totalRanked ?? null,
    };
  }, [hoveredAxis, resolvedAxes, axisMeta, euMean]);

  const svg = (
    <svg
      viewBox={`0 0 ${VB_SIZE} ${totalHeight}`}
      preserveAspectRatio="xMidYMid meet"
      className="mx-auto w-full"
      style={{ overflow: "visible" }}
      shapeRendering="geometricPrecision"
      textRendering="optimizeLegibility"
      strokeLinejoin="round"
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
          strokeOpacity={r === 1.0 ? OUTER_RING_OPACITY : GRID_OPACITY}
          vectorEffect="non-scaling-stroke"
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
            vectorEffect="non-scaling-stroke"
          />
        );
      })}

      {/* Ring scale labels */}
      {GRID_RINGS.map((r) => (
        <text
          key={r}
          x={vbCenterX}
          y={vbCenterY - radius * r}
          dx={5}
          textAnchor="start"
          dominantBaseline="middle"
          fill="var(--color-text-quaternary)"
          fontSize="9"
          fontFamily="var(--font-mono)"
          opacity={0.7}
        >
          {r.toFixed(2)}
        </text>
      ))}

      {/* EU Mean polygon (reference) */}
      {euMeanPath && (
        <path
          d={euMeanPath}
          fill="var(--color-stone-300)"
          fillOpacity={0.14}
          stroke="var(--color-stone-400)"
          strokeWidth={1}
          strokeDasharray="3 3"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      )}

      {/* Comparison polygon — dashed, clearly visible baseline reference */}
      {comparePath && (
        <path
          d={comparePath}
          fill="var(--color-stone-400)"
          fillOpacity={0.12}
          stroke="var(--color-stone-500)"
          strokeWidth={1.4}
          strokeDasharray="4 3"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      )}

      {/* Primary polygon — solid navy, clearly visible fill */}
      <path
        d={primaryPath}
        fill="var(--color-navy-700)"
        fillOpacity={hoveredAxis !== null ? 0.18 : 0.35}
        stroke="var(--color-navy-700)"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />

      {/* Hovered axis edge highlight */}
      {hoveredAxis !== null && resolvedAxes[hoveredAxis]?.value != null && (
        <line
          x1={vbCenterX}
          y1={vbCenterY}
          x2={polarToXY(resolvedAxes[hoveredAxis].value!, hoveredAxis).x}
          y2={polarToXY(resolvedAxes[hoveredAxis].value!, hoveredAxis).y}
          stroke="var(--color-navy-700)"
          strokeWidth={2.5}
          strokeOpacity={0.45}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      )}

      {/* Data points — enlarge on hover */}
      {resolvedAxes.map((axis, i) => {
        if (axis.value === null) return null;
        const p = polarToXY(axis.value, i);
        const isHovered = hoveredAxis === i;
        return (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={isHovered ? DATA_POINT_RADIUS + 1 : DATA_POINT_RADIUS}
            fill="var(--color-navy-700)"
            stroke="var(--color-surface-primary)"
            strokeWidth={isHovered ? 1.5 : 1}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}

      {/* Axis labels — dim non-hovered on interaction */}
      {resolvedAxes.map((axis, i) => {
        const labelPoint = polarToXY(LABEL_OFFSET, i);
        const lines = wrapLabel(axis.label);
        const lineCount = lines.length;
        const startDy = -((lineCount - 1) * LABEL_LINE_HEIGHT) / 2;

        const angle = angleStep * i - Math.PI / 2;
        const cos = Math.cos(angle);
        let textAnchor: "start" | "middle" | "end" = "middle";
        if (cos > 0.1) {
          textAnchor = "start";
        } else if (cos < -0.1) {
          textAnchor = "end";
        }

        const dimmed = hoveredAxis !== null && hoveredAxis !== i;

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
            opacity={dimmed ? 0.4 : 1}
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

      {/* Interactive wedge overlay — transparent pie-slice hit areas per axis */}
      {resolvedAxes.map((axis, i) => (
        <path
          key={`wedge-${i}`}
          d={buildWedge(i, n, vbCenterX, vbCenterY, wedgeReach)}
          fill="transparent"
          cursor={countryCode ? "pointer" : "default"}
          role="button"
          tabIndex={0}
          aria-label={`${axis.label}: ${fmtScore(axis.value)}`}
          onMouseEnter={() => handleAxisHover(i)}
          onMouseMove={handleAxisMove}
          onMouseLeave={handleAxisLeave}
          onClick={() => handleAxisClick(i)}
          onKeyDown={(e) => handleAxisKeyDown(e, i)}
        />
      ))}

      {/* Legend — positioned below chart */}
      {hasLegend && (
        <g>
          {label && (
            <g>
              <line x1={MARGIN} y1={legendY} x2={MARGIN + 14} y2={legendY} stroke="var(--color-navy-700)" strokeWidth={1.8} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              <text x={MARGIN + 19} y={legendY + 3} fill="var(--color-text-secondary)" fontSize="8" fontFamily="var(--font-sans)" fontWeight="500">{label}</text>
            </g>
          )}
          {euMean && (
            <g>
              <line x1={MARGIN} y1={legendY + 14} x2={MARGIN + 14} y2={legendY + 14} stroke="var(--color-stone-400)" strokeWidth={1} strokeDasharray="3 3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              <text x={MARGIN + 19} y={legendY + 17} fill="var(--color-text-tertiary)" fontSize="8" fontFamily="var(--font-sans)">EU-27 Mean</text>
            </g>
          )}
          {compareLabel && (
            <g>
              <line x1={MARGIN + 110} y1={legendY} x2={MARGIN + 124} y2={legendY} stroke="var(--color-stone-400)" strokeWidth={1.2} strokeDasharray="4 3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              <text x={MARGIN + 129} y={legendY + 3} fill="var(--color-text-tertiary)" fontSize="8" fontFamily="var(--font-sans)">{compareLabel}</text>
            </g>
          )}
        </g>
      )}
    </svg>
  );

  return (
    <>
      {svg}
      {tooltipData && (
        <RadarTooltip
          data={tooltipData}
          mouseX={mousePos.x}
          mouseY={mousePos.y}
        />
      )}
    </>
  );
});

RadarChart.displayName = "RadarChart";
