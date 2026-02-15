"use client";

// ============================================================================
// EU Choropleth Map — Client Component
// ============================================================================
// D3-geo + TopoJSON SVG choropleth of EU-27 ISI composite scores.
// Monochrome slate scale. Hover tooltip. Click navigates to country page.
// 16:9 responsive aspect ratio. Proper fitExtent projection.
// ============================================================================

import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { ISICompositeCountry } from "@/lib/types";
import {
  formatScore,
  classificationLabel,
  classifyScore,
  deviationFromMean,
  countryHref,
} from "@/lib/format";

// ─── Local TopoJSON type stubs ─────────────────────────────────────
// Avoids direct dependency on @types/topojson-specification

interface TopoGeometry {
  type: string;
  geometries?: TopoGeometry[];
  arcs?: unknown;
  coordinates?: unknown;
  properties?: Record<string, unknown>;
}

interface TopoTopology {
  type: "Topology";
  objects: Record<string, TopoGeometry>;
  arcs: number[][][];
  bbox?: number[];
  transform?: { scale: [number, number]; translate: [number, number] };
}

// ─── Color Scale (monochrome slate) ────────────────────────────────

function scoreColor(score: number | null): string {
  if (score === null) return "#e5e7eb";
  if (score < 0.15) return "#e2e8f0";
  if (score < 0.25) return "#94a3b8";
  if (score < 0.5) return "#475569";
  return "#0f172a";
}

// ─── Constants ──────────────────────────────────────────────────────

const VIEW_W = 960;
const VIEW_H = 540; // 16:9
const PAD = 24;

const LEGEND_ITEMS = [
  { color: "#e2e8f0", label: "< 0.15" },
  { color: "#94a3b8", label: "0.15–0.24" },
  { color: "#475569", label: "0.25–0.49" },
  { color: "#0f172a", label: "≥ 0.50" },
  { color: "#e5e7eb", label: "No data" },
];

// ─── Types ──────────────────────────────────────────────────────────

interface EUMapProps {
  countries: ISICompositeCountry[];
  mean: number | null;
}

interface TooltipState {
  x: number;
  y: number;
  name: string;
  score: number | null;
  deviation: number | null;
}

interface CountryProperties {
  ISO_A2: string;
  NAME: string;
}

// ─── Component ──────────────────────────────────────────────────────

export default function EUMap({ countries, mean }: EUMapProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [topology, setTopology] = useState<TopoTopology | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lookup = useMemo(() => {
    const map = new Map<string, ISICompositeCountry>();
    for (const c of countries) map.set(c.country.toUpperCase(), c);
    return map;
  }, [countries]);

  // Load TopoJSON
  useEffect(() => {
    let cancelled = false;
    fetch("/eu27.topo.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: TopoTopology) => {
        if (!cancelled) setTopology(data);
      })
      .catch(() => {
        if (!cancelled) setError("Map geometry unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Project & path generator
  const { pathFn, features } = useMemo(() => {
    if (!topology) return { pathFn: null, features: [] as GeoJSON.Feature[] };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const geom = (topology as any).objects.countries;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fc = feature(topology as any, geom) as unknown as GeoJSON.FeatureCollection;

    const projection = geoMercator().fitExtent(
      [
        [PAD, PAD],
        [VIEW_W - PAD, VIEW_H - PAD],
      ],
      fc,
    );

    return { pathFn: geoPath(projection), features: fc.features };
  }, [topology]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent, iso: string, name: string) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const data = lookup.get(iso);
      const score = data?.isi_composite ?? null;
      setTooltip({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top - 12,
        name,
        score,
        deviation: deviationFromMean(score, mean),
      });
    },
    [lookup, mean],
  );

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  const handleClick = useCallback(
    (iso: string) => {
      if (lookup.has(iso)) router.push(countryHref(iso));
    },
    [lookup, router],
  );

  // ─── Render ─────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="flex aspect-[16/9] items-center justify-center rounded-lg border border-gray-200 bg-white text-sm text-gray-400">
        {error}
      </div>
    );
  }

  if (!topology || !pathFn) {
    return (
      <div className="flex aspect-[16/9] items-center justify-center rounded-lg border border-gray-200 bg-white text-sm text-gray-400">
        Loading map…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 16:9 aspect-ratio container — no layout shift */}
      <div
        ref={containerRef}
        className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-gray-200 bg-white"
      >
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label="EU-27 ISI composite score choropleth map"
        >
          {features.map((f) => {
            const props = f.properties as CountryProperties | null;
            const iso = props?.ISO_A2 ?? "";
            const name = props?.NAME ?? iso;
            const data = lookup.get(iso);
            const score = data?.isi_composite ?? null;
            const d = pathFn(f);
            if (!d) return null;

            return (
              <path
                key={iso}
                d={d}
                fill={scoreColor(score)}
                stroke="#ffffff"
                strokeWidth={0.5}
                className="cursor-pointer"
                onMouseMove={(e) => handleMouseMove(e, iso, name)}
                onMouseLeave={handleMouseLeave}
                onClick={() => handleClick(iso)}
                onMouseEnter={(e) => {
                  e.currentTarget.setAttribute("stroke", "#0f172a");
                  e.currentTarget.setAttribute("stroke-width", "1.5");
                }}
                onMouseOut={(e) => {
                  e.currentTarget.setAttribute("stroke", "#ffffff");
                  e.currentTarget.setAttribute("stroke-width", "0.5");
                }}
              />
            );
          })}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="pointer-events-none absolute z-10 rounded bg-gray-900 px-3 py-2 text-xs text-white shadow-lg"
            style={{
              left: tooltip.x,
              top: tooltip.y,
              transform: "translate(-50%, -100%)",
            }}
          >
            <p className="font-medium">{tooltip.name}</p>
            <p className="mt-0.5 tabular-nums">
              Composite: {formatScore(tooltip.score)}
            </p>
            {tooltip.score !== null && (
              <p className="tabular-nums text-gray-300">
                {classificationLabel(classifyScore(tooltip.score))}
              </p>
            )}
            {tooltip.deviation !== null && (
              <p className="tabular-nums text-gray-300">
                Δ {tooltip.deviation > 0 ? "+" : ""}
                {formatScore(tooltip.deviation)} from mean
              </p>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-500">
        <span className="font-medium text-gray-700">ISI Composite</span>
        {LEGEND_ITEMS.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-sm border border-gray-300"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
