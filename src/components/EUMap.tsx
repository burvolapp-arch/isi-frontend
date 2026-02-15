"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { geoMercator, geoPath } from "d3-geo";
import type { GeoPermissibleObjects } from "d3-geo";
import { feature, mesh } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";

import type { ISICompositeCountry } from "@/lib/types";
import {
  classify,
  classifyBand,
  classificationBandLabel,
  formatMapScore,
  formatDelta,
  LEGEND_ITEMS,
} from "@/lib/mapClassification";

// ============================================================================
// EUMap — EU-27 Choropleth
// ============================================================================
//
// KEY DESIGN: ONE stable container div is always rendered. Loading and map
// content are overlaid inside it. This ensures the ResizeObserver ref never
// changes DOM elements between loading ↔ map transitions.
//
// TopoJSON: Natural Earth 50m data with SHARED arcs between neighbors.
// mesh() with (a,b) => a !== b produces clean internal borders only.
// geoMercator + fitSize for WGS84 projection.
// ============================================================================

// ─── Types ──────────────────────────────────────────────────────────

interface EUMapProps {
  readonly countries: readonly ISICompositeCountry[];
  readonly mean: number | null;
}

interface TooltipData {
  x: number;
  y: number;
  name: string;
  iso2: string;
  score: number | null;
  classification: string;
  delta: number | null;
}

interface CountryProps {
  readonly ISO_A2: string;
  readonly NAME: string;
}

type EUTopology = Topology<{
  [key: string]: GeometryCollection<CountryProps>;
}>;

// ============================================================================
// COMPONENT
// ============================================================================

export default function EUMap({ countries, mean }: EUMapProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dims, setDims] = useState({ width: 0, height: 0 });
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [topoData, setTopoData] = useState<EUTopology | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hoveredIso, setHoveredIso] = useState<string | null>(null);
  const rafRef = useRef(0);

  // ── ResizeObserver — always watches the ONE container div ─────────

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) {
        setDims((prev) =>
          prev.width === w && prev.height === h ? prev : { width: w, height: h },
        );
      }
    };

    measure();

    if (typeof ResizeObserver === "undefined") return;

    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(measure);
    });
    ro.observe(el);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, []);

  // ── ISO-2 lookup map ──────────────────────────────────────────────

  const lookup = useMemo(() => {
    const m = new Map<string, ISICompositeCountry>();
    for (const c of countries) {
      const code = c.country?.toUpperCase();
      if (typeof code === "string" && code.length === 2) {
        m.set(code, c);
      }
    }
    return m;
  }, [countries]);

  // ── Fetch TopoJSON ────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    fetch("/eu27.topo.json")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<EUTopology>;
      })
      .then((data) => {
        if (cancelled) return;
        if (!data?.objects) throw new Error("Missing objects in TopoJSON");
        if (!Array.isArray(data.arcs)) throw new Error("Missing arcs in TopoJSON");
        setTopoData(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error(`[EUMap] Load failed: ${msg}`);
        setLoadError(msg);
      });
    return () => { cancelled = true; };
  }, []);

  // ── Compute map data ──────────────────────────────────────────────

  const mapData = useMemo(() => {
    if (!topoData || dims.width <= 0 || dims.height <= 0) return null;

    const objectKey = Object.keys(topoData.objects)[0];
    if (!objectKey) return null;
    const topoObj = topoData.objects[objectKey];
    if (!topoObj) return null;

    let geojson: GeoJSON.FeatureCollection;
    try {
      geojson = feature(topoData, topoObj) as GeoJSON.FeatureCollection;
    } catch {
      console.error("[EUMap] feature() conversion failed");
      return null;
    }
    if (!geojson.features?.length) return null;

    // Pad to give breathing room — 4% on each side
    const pad = 0.04;
    const usableW = dims.width * (1 - 2 * pad);
    const usableH = dims.height * (1 - 2 * pad);
    const projection = geoMercator().fitSize([usableW, usableH], geojson);
    // Offset the fitted projection so it's centered with padding
    const [tx, ty] = projection.translate();
    projection.translate([tx + dims.width * pad, ty + dims.height * pad]);
    const pathFn = geoPath(projection);

    // Internal borders only — shared arcs between neighboring countries
    let borderPath = "";
    try {
      const borderGeom = mesh(
        topoData,
        topoObj,
        (a, b) => a !== b,
      );
      borderPath = pathFn(borderGeom) ?? "";
    } catch {
      // Fallback: all boundaries if filter fails
      try {
        const borderGeom = mesh(topoData, topoObj);
        borderPath = pathFn(borderGeom) ?? "";
      } catch { /* non-fatal */ }
    }

    // Outer coastline / external boundary
    let outerPath = "";
    try {
      const outerGeom = mesh(
        topoData,
        topoObj,
        (a, b) => a === b,
      );
      outerPath = pathFn(outerGeom) ?? "";
    } catch { /* non-fatal */ }

    // Match features to backend data
    let matchedCount = 0;
    const unmatchedCodes: string[] = [];
    for (const f of geojson.features) {
      const iso = (f.properties as CountryProps | null)?.ISO_A2?.toUpperCase();
      if (iso && lookup.has(iso)) {
        matchedCount++;
      } else {
        unmatchedCodes.push(iso || "(missing ISO_A2)");
      }
    }

    return {
      features: geojson.features,
      pathFn,
      borderPath,
      outerPath,
      featureCount: geojson.features.length,
      matchedCount,
      unmatchedCodes,
    };
  }, [topoData, dims, lookup]);

  // ── Helpers ───────────────────────────────────────────────────────

  const iso2Of = useCallback((f: GeoJSON.Feature): string => {
    const raw = (f.properties as CountryProps | null)?.ISO_A2;
    return typeof raw === "string" && raw.length === 2 ? raw.toUpperCase() : "";
  }, []);

  const nameOf = useCallback((f: GeoJSON.Feature): string => {
    const raw = (f.properties as CountryProps | null)?.NAME;
    return typeof raw === "string" && raw.length > 0 ? raw : "Unknown";
  }, []);

  // ── Event handlers ────────────────────────────────────────────────

  const onMove = useCallback(
    (e: React.MouseEvent, f: GeoJSON.Feature) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const iso = iso2Of(f);
      const name = nameOf(f);
      const rec = iso ? lookup.get(iso) : undefined;
      const score = rec?.isi_composite ?? null;
      const band = classifyBand(score);

      // Position tooltip with smart edge clamping
      const tooltipW = 240;
      const tooltipH = 90;
      let tx = e.clientX - rect.left;
      let ty = e.clientY - rect.top - 16;

      // Clamp horizontally
      if (tx - tooltipW / 2 < 8) tx = tooltipW / 2 + 8;
      if (tx + tooltipW / 2 > rect.width - 8) tx = rect.width - tooltipW / 2 - 8;
      // Flip below cursor if too close to top
      if (ty - tooltipH < 8) ty = e.clientY - rect.top + 24;

      setHoveredIso(iso || null);
      setTooltip({
        x: tx,
        y: ty,
        name,
        iso2: iso,
        score,
        classification: classificationBandLabel(band),
        delta:
          score !== null && mean !== null && Number.isFinite(score) && Number.isFinite(mean)
            ? score - mean
            : null,
      });
    },
    [lookup, mean, iso2Of, nameOf],
  );

  const onLeave = useCallback(() => {
    setTooltip(null);
    setHoveredIso(null);
  }, []);

  const onClick = useCallback(
    (f: GeoJSON.Feature) => {
      const iso = iso2Of(f);
      const rec = iso ? lookup.get(iso) : undefined;
      if (rec) router.push(`/country/${rec.country.toLowerCase()}`);
    },
    [lookup, router, iso2Of],
  );

  // ── Determine ready state ─────────────────────────────────────────

  const ready = mapData !== null;

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Mismatch warning */}
      {ready && mapData.matchedCount < mapData.featureCount && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-2 text-xs text-red-800">
          <strong>⚠ Map data mismatch:</strong> {mapData.matchedCount}/
          {mapData.featureCount} countries matched. Unmatched:{" "}
          {mapData.unmatchedCodes.join(", ")}
        </div>
      )}

      {/* ── STABLE CONTAINER — always mounted, ref never moves ─── */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-lg border border-border-primary bg-stone-50"
        style={{ minHeight: "520px", aspectRatio: "4 / 3" }}
      >
        {/* Loading overlay */}
        {!ready && !loadError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-2.5 text-sm text-stone-400">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Loading map…
            </div>
          </div>
        )}

        {/* Error overlay */}
        {loadError && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-50 text-sm text-red-600">
            <div className="text-center">
              <p className="font-medium">Map rendering failed</p>
              <p className="mt-1 text-xs text-red-500">{loadError}</p>
            </div>
          </div>
        )}

        {/* Map SVG */}
        {ready && (
          <>
            <svg
              viewBox={`0 0 ${dims.width} ${dims.height}`}
              preserveAspectRatio="xMidYMid meet"
              className="absolute inset-0 h-full w-full"
              style={{ background: "transparent" }}
              role="img"
              aria-label="EU-27 ISI composite score choropleth map"
            >
              {/* Country fills */}
              <g>
                {mapData.features.map((f, i) => {
                  const iso = iso2Of(f);
                  const rec = iso ? lookup.get(iso) : undefined;
                  const score = rec?.isi_composite ?? null;
                  const d = mapData.pathFn(f as GeoPermissibleObjects);
                  if (!d) return null;

                  const isHovered = hoveredIso === iso && iso !== "";
                  const baseColor = classify(score);

                  return (
                    <path
                      key={iso || `f-${i}`}
                      d={d}
                      fill={baseColor}
                      stroke={isHovered ? "#0b2545" : "#ffffff"}
                      strokeWidth={isHovered ? 1.8 : 0.5}
                      opacity={hoveredIso && !isHovered ? 0.6 : 1}
                      className="cursor-pointer"
                      style={{
                        transition: "fill 0.15s ease, stroke 0.15s ease, stroke-width 0.15s ease, opacity 0.2s ease",
                      }}
                      onMouseMove={(e) => onMove(e, f)}
                      onMouseLeave={onLeave}
                      onClick={() => onClick(f)}
                    >
                      <title>
                        {nameOf(f)} ({iso || "?"})
                        {score !== null ? ` — ${score.toFixed(4)}` : ""}
                      </title>
                    </path>
                  );
                })}
              </g>

              {/* Internal borders — thin, subtle */}
              {mapData.borderPath.length > 0 && (
                <path
                  d={mapData.borderPath}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth={0.8}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  pointerEvents="none"
                  style={{ opacity: 0.9 }}
                />
              )}

              {/* Outer coastline — slightly heavier */}
              {mapData.outerPath.length > 0 && (
                <path
                  d={mapData.outerPath}
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth={0.6}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  pointerEvents="none"
                />
              )}
            </svg>

            {/* Tooltip */}
            {tooltip && (
              <div
                className="pointer-events-none absolute z-10 rounded-lg border border-stone-700 bg-navy-900 px-4 py-3 text-xs text-white shadow-xl"
                style={{
                  left: tooltip.x,
                  top: tooltip.y,
                  transform: "translate(-50%, -100%)",
                  maxWidth: "260px",
                  animation: "fadeIn 0.1s ease-out",
                }}
              >
                <p className="text-[13px] font-semibold leading-tight">
                  {tooltip.name}
                  <span className="ml-1.5 font-mono text-[11px] font-normal text-stone-400">
                    {tooltip.iso2}
                  </span>
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-mono text-[15px] font-medium tabular-nums">
                    {formatMapScore(tooltip.score)}
                  </span>
                  {tooltip.score !== null && (
                    <span className="text-[11px] text-stone-400">
                      {tooltip.classification}
                    </span>
                  )}
                </div>
                {tooltip.delta !== null && (
                  <p className="mt-1 text-[11px] tabular-nums text-stone-400">
                    <span className={tooltip.delta > 0 ? "text-red-400" : "text-emerald-400"}>
                      {formatDelta(tooltip.delta)}
                    </span>
                    {" "}from EU-27 mean
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] text-text-tertiary">
        <span className="text-[11px] font-medium uppercase tracking-wide text-text-quaternary">
          ISI Composite
        </span>
        {LEGEND_ITEMS.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-6 rounded-sm border border-stone-300"
              style={{ backgroundColor: item.color }}
            />
            <span className="font-mono tabular-nums">{item.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
