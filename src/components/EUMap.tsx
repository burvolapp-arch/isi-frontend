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
// The TopoJSON uses raw WGS84 lon/lat arcs → geoMercator + fitSize.
// Each country arc is independent (no shared arcs), so mesh() uses no filter.
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
  const hoverRef = useRef<SVGPathElement | null>(null);
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

    // Immediate measure
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
  }, []); // Container div is always mounted — this is safe

  // ── ISO-2 lookup map (strict) ─────────────────────────────────────

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

    // Build projection: raw WGS84 → geoMercator, fitted to container
    const projection = geoMercator().fitSize(
      [dims.width, dims.height],
      geojson,
    );
    const pathFn = geoPath(projection);

    // All-boundaries mesh (no shared arcs in this TopoJSON, so no filter)
    let borderPath = "";
    try {
      const borderGeom = mesh(topoData, topoObj);
      borderPath = pathFn(borderGeom) ?? "";
    } catch {
      // non-fatal
    }

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

      const pad = 8;
      let tx = e.clientX - rect.left;
      let ty = e.clientY - rect.top - 14;
      tx = Math.max(pad, Math.min(tx, rect.width - pad));
      ty = Math.max(pad, Math.min(ty, rect.height - pad));

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
    if (hoverRef.current) {
      hoverRef.current.style.filter = "";
      hoverRef.current = null;
    }
  }, []);

  const onClick = useCallback(
    (f: GeoJSON.Feature) => {
      const iso = iso2Of(f);
      const rec = iso ? lookup.get(iso) : undefined;
      if (rec) router.push(`/country/${rec.country.toLowerCase()}`);
    },
    [lookup, router, iso2Of],
  );

  const onEnter = useCallback((e: React.MouseEvent<SVGPathElement>) => {
    if (hoverRef.current && hoverRef.current !== e.currentTarget) {
      hoverRef.current.style.filter = "";
    }
    e.currentTarget.style.filter = "brightness(1.15)";
    hoverRef.current = e.currentTarget;
  }, []);

  // ── Determine ready state ─────────────────────────────────────────

  const ready = mapData !== null;

  // ── Render ────────────────────────────────────────────────────────
  //
  // CRITICAL: The container div with ref={containerRef} is ALWAYS rendered.
  // Loading, error, and map content are overlaid inside it. This prevents
  // the ResizeObserver from losing its target element.

  return (
    <div className="space-y-4">
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
        className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-gray-200"
      >
        {/* Loading overlay */}
        {!ready && !loadError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm text-gray-400">Loading map…</span>
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

                  return (
                    <path
                      key={iso || `f-${i}`}
                      d={d}
                      fill={classify(score)}
                      stroke="#ffffff"
                      strokeWidth={0.5}
                      className="cursor-pointer"
                      onMouseMove={(e) => onMove(e, f)}
                      onMouseLeave={onLeave}
                      onClick={() => onClick(f)}
                      onMouseEnter={onEnter}
                    >
                      <title>
                        {nameOf(f)} ({iso || "?"})
                        {score !== null ? ` — ${score.toFixed(4)}` : ""}
                      </title>
                    </path>
                  );
                })}
              </g>

              {/* Border overlay */}
              {mapData.borderPath.length > 0 && (
                <path
                  d={mapData.borderPath}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth={0.7}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  pointerEvents="none"
                />
              )}
            </svg>

            {/* Tooltip */}
            {tooltip && (
              <div
                className="pointer-events-none absolute z-10 max-w-[230px] rounded-md bg-gray-900 px-3 py-2 text-xs text-white shadow-lg"
                style={{
                  left: tooltip.x,
                  top: tooltip.y,
                  transform: "translate(-50%, -100%)",
                }}
              >
                <p className="font-medium leading-tight">
                  {tooltip.name}{" "}
                  <span className="font-mono text-gray-400">
                    ({tooltip.iso2})
                  </span>
                </p>
                <p className="mt-1 font-mono tabular-nums">
                  Composite: {formatMapScore(tooltip.score)}
                </p>
                {tooltip.score !== null && (
                  <p className="tabular-nums text-gray-300">
                    {tooltip.classification}
                  </p>
                )}
                {tooltip.delta !== null && (
                  <p className="tabular-nums text-gray-300">
                    Δ {formatDelta(tooltip.delta)} from mean
                  </p>
                )}
              </div>
            )}
          </>
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
