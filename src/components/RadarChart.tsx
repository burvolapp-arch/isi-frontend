"use client";

import { memo, useId, useMemo, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  formatAxisShort,
  formatAxisFull,
  formatScore,
  formatDelta,
} from "@/lib/presentation";

/**
 * SVG-based radar chart for multi-axis country profiles.
 * Visual reference: NATO Strategic Foresight Analysis × ESA Mission Control HUD.
 * Dark-field institutional. Luminous grid hierarchy. Subtle glow depth.
 *
 * ARCHITECTURAL INVARIANT:
 * This component resolves ALL display labels internally via
 * getCanonicalAxisName(). It NEVER accepts display labels as props.
 * It NEVER reads backend label fields.
 *
 * Interactive: hover for axis tooltip, click to navigate to axis detail.
 */

// ─── Constants ──────────────────────────────────────────────────────

const GRID_RINGS = [0.2, 0.4, 0.6, 0.8, 1.0] as const;
const LABEL_OFFSET = 1.28; // push labels out slightly for dark background
const LABEL_FONT_SIZE = 10;
const LABEL_LINE_HEIGHT = 13;
const LABEL_MAX_CHARS = 18; // break label lines — keep them compact
const VB_SIZE = 460; // compact viewBox — chart fills more of the card
const RADAR_RADIUS = Math.round(VB_SIZE * 0.28); // ~129
const MARGIN = (VB_SIZE - RADAR_RADIUS * 2) / 2;
const LEGEND_HEIGHT = 32; // space below chart for legend
const DATA_POINT_RADIUS = 3;
const GRID_STROKE = 0.6;
const GRID_OPACITY = 0.22;
const OUTER_RING_OPACITY = 0.55;

// ─── Palette (institutional) ─────────────────────────────
const GRID_COLOR = "#2a4a72";     // muted blue-grey grid
const GRID_OUTER = "#3a6a9a";     // brighter outer ring
const SPOKE_COLOR = "#1e3a5c";    // subtle spokes
const PRIMARY_FILL = "#3b82f6";   // blue-500 primary polygon fill
const PRIMARY_STROKE = "#60a5fa"; // blue-400 primary polygon stroke
const PRIMARY_GLOW = "#3b82f6";   // glow colour
const EU_MEAN_STROKE = "#64748b"; // slate-500 dashed EU mean
const EU_MEAN_FILL = "#64748b";
const COMPARE_STROKE = "#f59e0b"; // amber-500 comparison overlay
const COMPARE_FILL = "#f59e0b";
const LABEL_COLOR = "#94a3b8";    // slate-400 axis labels
const LABEL_ACTIVE = "#e2e8f0";   // slate-200 hovered label
const SCALE_COLOR = "#475569";    // slate-600 ring scale numbers
const DOT_GLOW = "#60a5fa";       // blue-400 data point glow
const TICK_COLOR = "#1e3a5c";     // HUD corner tick marks

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
      className="pointer-events-none rounded-lg border border-stone-200 bg-white px-4 py-3 shadow-lg backdrop-blur-sm"
    >
      <p className="mb-2 text-sm font-semibold text-stone-800">
        {data.label}
      </p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
        <span className="text-stone-500">Score</span>
        <span className="font-mono text-stone-800">
          {fmtScore(data.score)}
        </span>
        <span className="text-stone-500">EU-27 Mean</span>
        <span className="font-mono text-stone-800">
          {fmtScore(data.euMean)}
        </span>
        <span className="text-stone-500">Deviation</span>
        <span className="font-mono text-stone-800">
          {data.deviation != null
            ? formatDelta(data.deviation)
            : "—"}
        </span>
        {data.rank != null && data.totalRanked != null && (
          <>
            <span className="text-stone-500">Rank</span>
            <span className="font-mono text-stone-800">
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
  const uid = useId().replace(/:/g, ""); // unique per-instance, safe for SVG IDs

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
      {/* ── SVG Definitions: gradients, filters, masks ── */}
      <defs>
        {/* Dark radial background gradient */}
        <radialGradient id={`bg-${uid}`} cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor={GRID_OUTER} />
          <stop offset="75%" stopColor={GRID_COLOR} />
          <stop offset="100%" stopColor={GRID_COLOR} />
        </radialGradient>

        {/* Primary polygon fill gradient — subtle depth */}
        <radialGradient id={`fill-${uid}`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={PRIMARY_FILL} stopOpacity="0.28" />
          <stop offset="100%" stopColor={PRIMARY_FILL} stopOpacity="0.08" />
        </radialGradient>

        {/* Comparison polygon fill gradient */}
        <radialGradient id={`cmp-${uid}`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={COMPARE_FILL} stopOpacity="0.18" />
          <stop offset="100%" stopColor={COMPARE_FILL} stopOpacity="0.04" />
        </radialGradient>

        {/* Soft glow filter for primary polygon */}
        <filter id={`gp-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
          <feFlood floodColor={PRIMARY_GLOW} floodOpacity="0.35" result="color" />
          <feComposite in="color" in2="blur" operator="in" result="shadow" />
          <feMerge>
            <feMergeNode in="shadow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Subtle glow for data points */}
        <filter id={`gd-${uid}`} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
          <feFlood floodColor={DOT_GLOW} floodOpacity="0.6" result="color" />
          <feComposite in="color" in2="blur" operator="in" result="shadow" />
          <feMerge>
            <feMergeNode in="shadow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Hovered dot intensified glow */}
        <filter id={`ga-${uid}`} x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
          <feFlood floodColor={DOT_GLOW} floodOpacity="0.8" result="color" />
          <feComposite in="color" in2="blur" operator="in" result="shadow" />
          <feMerge>
            <feMergeNode in="shadow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Outer ring glow */}
        <filter id={`gr-${uid}`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
          <feFlood floodColor={GRID_OUTER} floodOpacity="0.3" result="color" />
          <feComposite in="color" in2="blur" operator="in" result="shadow" />
          <feMerge>
            <feMergeNode in="shadow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* No dark background field. Institutional white substrate. */}

      {/* ── HUD corner tick marks ── */}
      {(() => {
        const inset = radius * 1.36;
        const tickLen = 14;
        const ticks = [
          // top-left
          `M ${vbCenterX - inset} ${vbCenterY - inset + tickLen} L ${vbCenterX - inset} ${vbCenterY - inset} L ${vbCenterX - inset + tickLen} ${vbCenterY - inset}`,
          // top-right
          `M ${vbCenterX + inset - tickLen} ${vbCenterY - inset} L ${vbCenterX + inset} ${vbCenterY - inset} L ${vbCenterX + inset} ${vbCenterY - inset + tickLen}`,
          // bottom-left
          `M ${vbCenterX - inset} ${vbCenterY + inset - tickLen} L ${vbCenterX - inset} ${vbCenterY + inset} L ${vbCenterX - inset + tickLen} ${vbCenterY + inset}`,
          // bottom-right
          `M ${vbCenterX + inset - tickLen} ${vbCenterY + inset} L ${vbCenterX + inset} ${vbCenterY + inset} L ${vbCenterX + inset} ${vbCenterY + inset - tickLen}`,
        ];
        return ticks.map((d, i) => (
          <path
            key={`tick-${i}`}
            d={d}
            fill="none"
            stroke={TICK_COLOR}
            strokeWidth={1}
            strokeOpacity={0.5}
            vectorEffect="non-scaling-stroke"
          />
        ));
      })()}

      {/* ── Grid rings — luminous hierarchy ── */}
      {GRID_RINGS.map((r) => {
        const isOuter = r === 1.0;
        return (
          <polygon
            key={r}
            points={Array.from({ length: n }, (_, i) => {
              const p = polarToXY(r, i);
              return `${p.x},${p.y}`;
            }).join(" ")}
            fill="none"
            stroke={isOuter ? GRID_OUTER : GRID_COLOR}
            strokeWidth={isOuter ? 1 : GRID_STROKE}
            strokeOpacity={isOuter ? OUTER_RING_OPACITY : GRID_OPACITY}
            vectorEffect="non-scaling-stroke"
            filter={isOuter ? `url(#gr-${uid})` : undefined}
          />
        );
      })}

      {/* ── Grid spokes ── */}
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

      {/* ── Center dot (origin marker) ── */}
      <circle
        cx={vbCenterX}
        cy={vbCenterY}
        r={2}
        fill={GRID_COLOR}
        fillOpacity={0.5}
      />

      {/* ── Ring scale labels ── */}
      {GRID_RINGS.map((r) => (
        <text
          key={r}
          x={vbCenterX}
          y={vbCenterY - radius * r}
          dx={6}
          textAnchor="start"
          dominantBaseline="middle"
          fill={SCALE_COLOR}
          fontSize="8"
          fontFamily="var(--font-mono)"
          opacity={0.6}
        >
          {r.toFixed(1)}
        </text>
      ))}

      {/* ── EU Mean polygon (reference) ── */}
      {typeof euMeanPath === "string" && (
        <path
          d={euMeanPath}
          fill={EU_MEAN_FILL}
          fillOpacity={0.06}
          stroke={EU_MEAN_STROKE}
          strokeWidth={1}
          strokeDasharray="4 4"
          strokeOpacity={0.5}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      )}

      {/* ── Comparison polygon ── */}
      {comparePath && (
        <path
          d={comparePath}
          fill={`url(#cmp-${uid})`}
          stroke={COMPARE_STROKE}
          strokeWidth={1.3}
          strokeDasharray="5 3"
          strokeOpacity={0.7}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      )}

      {/* ── Primary polygon — glowing fill ── */}
      <path
        d={primaryPath}
        fill={`url(#fill-${uid})`}
        stroke={PRIMARY_STROKE}
        strokeWidth={1.8}
        strokeOpacity={hoveredAxis !== null ? 0.9 : 0.75}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        filter={`url(#gp-${uid})`}
        style={{ transition: "stroke-opacity 0.2s ease" }}
      />

      {/* ── Hovered axis edge highlight ── */}
      {hoveredAxis !== null && resolvedAxes[hoveredAxis]?.value != null && (
        <line
          x1={vbCenterX}
          y1={vbCenterY}
          x2={polarToXY(resolvedAxes[hoveredAxis].value!, hoveredAxis).x}
          y2={polarToXY(resolvedAxes[hoveredAxis].value!, hoveredAxis).y}
          stroke={PRIMARY_STROKE}
          strokeWidth={2}
          strokeOpacity={0.6}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      )}

      {/* ── Data points — glowing dots ── */}
      {resolvedAxes.map((axis, i) => {
        if (axis.value == null || !Number.isFinite(axis.value)) return null;
        const { x, y } = polarToXY(axis.value, i);
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={DATA_POINT_RADIUS}
            fill={PRIMARY_FILL}
            fillOpacity={0.9}
            stroke={PRIMARY_STROKE}
            strokeWidth={1.2}
            vectorEffect="non-scaling-stroke"
            filter={`url(#gd-${uid})`}
          />
        );
      })}

      {/* ── Hovered data point — intensified glow ── */}
      {hoveredAxis !== null && resolvedAxes[hoveredAxis]?.value != null && (
        <circle
          cx={polarToXY(resolvedAxes[hoveredAxis].value!, hoveredAxis).x}
          cy={polarToXY(resolvedAxes[hoveredAxis].value!, hoveredAxis).y}
          r={DATA_POINT_RADIUS * 1.2}
          fill={PRIMARY_FILL}
          fillOpacity={1}
          stroke={PRIMARY_STROKE}
          strokeWidth={1.6}
          vectorEffect="non-scaling-stroke"
          filter={`url(#ga-${uid})`}
        />
      )}

      {/* ── Legend — country & comparison labels ── */}
      {hasLegend && (
        <g
          transform={`translate(0 ${legendY})`}
          fontFamily="var(--font-sans)"
          fontSize={LABEL_FONT_SIZE}
          textAnchor="middle"
        >
          {/* Primary country label */}
          {label && (
            <text
              x={VB_SIZE / 2}
              y={LABEL_OFFSET}
              fill={LABEL_COLOR}
              opacity={0.9}
              style={{ mixBlendMode: "multiply" }}
            >
              {label}
            </text>
          )}

          {/* EU mean label */}
          {euMean && (
            <text
              x={VB_SIZE / 2}
              y={LABEL_OFFSET + 16}
              fill={LABEL_COLOR}
              opacity={0.7}
              style={{ mixBlendMode: "multiply" }}
            >
              EU-27 Mean
            </text>
          )}

          {/* Comparison label */}
          {compareLabel && (
            <text
              x={VB_SIZE / 2}
              y={LABEL_OFFSET + 32}
              fill={LABEL_COLOR}
              opacity={0.7}
              style={{ mixBlendMode: "multiply" }}
            >
              {compareLabel}
            </text>
          )}
        </g>
      )}

      {/* ── Debug: axis value labels (temporary) ── */}
      {false && (
        <g
          transform={`translate(0 ${legendY})`}
          fontFamily="var(--font-mono)"
          fontSize={10}
          textAnchor="middle"
          fill="var(--color-stone-600)"
        >
          {resolvedAxes.map((axis, i) => {
            const { x, y } = polarToXY(axis.value ?? 0, i);
            return (
              <text
                key={i}
                x={x}
                y={y}
                dy="-0.3em"
                opacity={0.8}
                style={{ pointerEvents: "none" }}
              >
                {axis.value != null ? axis.value.toFixed(2) : "—"}
              </text>
            );
          })}
        </g>
      )}
    </svg>
  );
});
