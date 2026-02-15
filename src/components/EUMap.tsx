"use client";

// ============================================================================
// EU Choropleth Map — Client Component
// ============================================================================
// D3-geo + TopoJSON SVG choropleth of EU-27 ISI composite scores.
// Monochrome slate scale. Hover tooltip. Click navigates to country page.
// Responsive via ResizeObserver. Proper fitSize projection.
// ============================================================================

import {
  useCallback,
  useMemo,
  useState,
  useRef,
  useEffect,
} from "react";
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

// ─── Color Scale (monochrome slate) ────────────────────────────────

function scoreColor(score: number | null | undefined): string {
  if (score === null || score === undefined) return "#e5e7eb";
  if (score < 0.15) return "#e2e8f0";
  if (score < 0.25) return "#94a3b8";
  if (score < 0.5) return "#475569";
  return "#0f172a";
}

// ─── Constants ──────────────────────────────────────────────────────

const LEGEND_ITEMS = [
  { color: "#e2e8f0", label: "< 0.15" },
  { color: "#94a3b8", label: "0.15–0.24" },
  { color: "#475569", label: "0.25–0.49" },
  { color: "#0f172a", label: "\u2265 0.50" },
  { color: "#e5e7eb", label: "No data" },
];

// EU uses "EL" for Greece; ISO 3166 / Natural Earth use "GR".
// Normalize backend codes so they match TopoJSON ISO_A2.
const ISO_ALIAS: Record<string, string> = { EL: "GR" };
function normalizeISO(code: string): string {
  const upper = code.toUpperCase();
  return ISO_ALIAS[upper] ?? upper;
}

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

// ─── Component ──────────────────────────────────────────────────────

export default function EUMap({ countries, mean }: EUMapProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [topo, setTopo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [size, setSize] = useState({ width: 960, height: 540 });

  // ── Responsive sizing via ResizeObserver ──────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = Math.round(entry.contentRect.width);
      const h = Math.round(entry.contentRect.height);
      if (w > 0 && h > 0) setSize({ width: w, height: h });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Build lookup: normalized ISO_A2 → country data ────────────────
  const lookup = useMemo(() => {
    const map = new Map<string, ISICompositeCountry>();
    for (const c of countries) {
      map.set(normalizeISO(c.country), c);
    }
    return map;
  }, [countries]);

  // ── Load TopoJSON ─────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    fetch("/eu27.topo.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setTopo(data);
      })
      .catch(() => {
        if (!cancelled) setError("Map geometry unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Convert TopoJSON → GeoJSON, build projection + path ──────────
  const { pathFn, features } = useMemo(() => {
    if (!topo) return { pathFn: null, features: [] as GeoJSON.Feature[] };

    // Dynamically pick the first (and only) object layer
    const objectKey = Object.keys(topo.objects)[0];
    if (!objectKey) return { pathFn: null, features: [] as GeoJSON.Feature[] };

    const geo = feature(topo, topo.objects[objectKey]) as unknown as GeoJSON.FeatureCollection;

    const projection = geoMercator().fitSize(
      [size.width, size.height],
      geo,
    );

    return { pathFn: geoPath(projection), features: geo.features };
  }, [topo, size]);

  // ── Event handlers ────────────────────────────────────────────────
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
      const data = lookup.get(iso);
      if (data) router.push(countryHref(data.country));
    },
    [lookup, router],
  );

  // ─── Render ─────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="flex aspect-[16/9] w-full items-center justify-center rounded-lg border border-gray-200 bg-white text-sm text-gray-400">
        {error}
      </div>
    );
  }

  if (!topo || !pathFn) {
    return (
      <div className="flex aspect-[16/9] w-full items-center justify-center rounded-lg border border-gray-200 bg-white text-sm text-gray-400">
        Loading map&hellip;
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        ref={containerRef}
        className="relative w-full aspect-[16/9] overflow-hidden rounded-lg border border-gray-200 bg-white"
      >
        <svg
          viewBox={`0 0 ${size.width} ${size.height}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label="EU-27 ISI composite score choropleth map"
        >
          {features.map((f, idx) => {
            const props = f.properties as { ISO_A2?: string; NAME?: string } | null;
            const iso = props?.ISO_A2 ?? "";
            const name = props?.NAME ?? iso;
            const data = lookup.get(iso);
            const score = data?.isi_composite ?? null;
            const d = pathFn(f);
            if (!d) return null;

            return (
              <path
                key={iso || idx}
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
                &Delta; {tooltip.deviation > 0 ? "+" : ""}
                {formatScore(tooltip.deviation)} from mean
              </p>
            )}
          </div>
        )}
      </div>

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
