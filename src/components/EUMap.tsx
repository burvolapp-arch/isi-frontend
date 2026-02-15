"use client";

// ============================================================================
// EU Choropleth Map — Client Component
// ============================================================================
// D3-geo + TopoJSON SVG choropleth of EU-27 ISI composite scores.
// Monochrome slate scale. Hover tooltip. Click navigates to country page.
// ============================================================================

import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import * as d3Geo from "d3-geo";
import * as topojson from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { ISICompositeCountry } from "@/lib/types";
import {
  formatScore,
  classificationLabel,
  classifyScore,
  deviationFromMean,
  countryHref,
} from "@/lib/format";

// ─── Color Scale (monochrome slate) ────────────────────────────────

function scoreColor(score: number | null): string {
  if (score === null) return "#e5e7eb"; // gray-200 — no data
  if (score < 0.15) return "#e2e8f0"; // slate-200
  if (score < 0.25) return "#94a3b8"; // slate-400
  if (score < 0.5) return "#475569"; // slate-600
  return "#0f172a"; // slate-900
}

// ─── Constants ──────────────────────────────────────────────────────

const SVG_WIDTH = 700;
const SVG_HEIGHT = 500;
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

interface CountryFeature {
  type: string;
  geometry: unknown;
  properties: CountryProperties | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GeoPathFn = (feature: any) => string | null;

// ─── Component ──────────────────────────────────────────────────────

export default function EUMap({ countries, mean }: EUMapProps) {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [topology, setTopology] = useState<Topology | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Build lookup: ISO_A2 → country data
  const lookup = useMemo(() => {
    const map = new Map<string, ISICompositeCountry>();
    for (const c of countries) {
      map.set(c.country.toUpperCase(), c);
    }
    return map;
  }, [countries]);

  // Load TopoJSON
  useEffect(() => {
    fetch("/eu27.topo.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: Topology) => setTopology(data))
      .catch(() => setError("Map geometry unavailable"));
  }, []);

  // Project & path generator
  const { path, features } = useMemo<{
    path: GeoPathFn | null;
    features: CountryFeature[];
  }>(() => {
    if (!topology) return { path: null, features: [] };

    const geom = topology.objects.countries as GeometryCollection<CountryProperties>;
    const fc = topojson.feature(topology, geom);
    const feats = fc.features as CountryFeature[];

    const projection = d3Geo
      .geoMercator()
      .fitSize([SVG_WIDTH, SVG_HEIGHT], fc);
    const pathGen = d3Geo.geoPath(projection) as unknown as GeoPathFn;

    return { path: pathGen, features: feats };
  }, [topology]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent, iso: string, name: string) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
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
    [lookup, mean]
  );

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  const handleClick = useCallback(
    (iso: string) => {
      if (lookup.has(iso)) {
        router.push(countryHref(iso));
      }
    },
    [lookup, router]
  );

  // ─── Render ─────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
        {error}
      </div>
    );
  }

  if (!topology || !path) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
        Loading map…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative rounded-lg border border-gray-200 bg-white overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="w-full h-auto"
          role="img"
          aria-label="EU-27 ISI composite score choropleth map"
        >
          {features.map((f) => {
            const iso = f.properties?.ISO_A2 ?? "";
            const name = f.properties?.NAME ?? iso;
            const data = lookup.get(iso);
            const score = data?.isi_composite ?? null;

            return (
              <path
                key={iso}
                d={path(f) ?? ""}
                fill={scoreColor(score)}
                stroke="#ffffff"
                strokeWidth={0.5}
                className="cursor-pointer transition-[stroke,stroke-width] duration-100"
                onMouseMove={(e) => handleMouseMove(e, iso, name)}
                onMouseLeave={handleMouseLeave}
                onClick={() => handleClick(iso)}
                style={{}}
                onMouseEnter={(e) => {
                  const target = e.currentTarget;
                  target.style.stroke = "#0f172a";
                  target.style.strokeWidth = "1.5";
                }}
                onMouseOut={(e) => {
                  const target = e.currentTarget;
                  target.style.stroke = "#ffffff";
                  target.style.strokeWidth = "0.5";
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
