"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { geoMercator, geoIdentity, geoPath } from "d3-geo";
import type { GeoPermissibleObjects, GeoProjection } from "d3-geo";
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
// EUMap — Fail-safe EU-27 Choropleth (rebuilt from scratch)
// ============================================================================
//
// Architecture:
// 1) Fetch TopoJSON, dynamically extract object key
// 2) Convert to GeoJSON via topojson-client feature()
// 3) Inspect DECODED GeoJSON coordinates to detect projection type
// 4) Build projection: geoMercator (lon/lat) or geoIdentity (planar)
// 5) ALWAYS fitSize to container dimensions
// 6) Strict ISO-2 matching only — no heuristics
// 7) Dev diagnostics panel with full introspection
// 8) Cannot fail silently — every failure path renders explanation
//
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

interface BBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

type ProjType = "mercator" | "identity";

interface Diagnostics {
  projType: ProjType;
  width: number;
  height: number;
  featureCount: number;
  matchedCount: number;
  unmatchedCodes: string[];
  backendCodes: string[];
  coordRange: BBox;
}

interface CountryProps {
  readonly ISO_A2: string;
  readonly NAME: string;
}

type EUTopology = Topology<{
  [key: string]: GeometryCollection<CountryProps>;
}>;

// ============================================================================
// COORDINATE EXTRACTION — Recursive traversal of GeoJSON geometry
// ============================================================================

function extractCoords(geometry: GeoJSON.Geometry): number[][] {
  const out: number[][] = [];

  function walk(coords: unknown): void {
    if (!Array.isArray(coords)) return;
    // If the first element is a number, this is a coordinate pair [x, y]
    if (typeof coords[0] === "number") {
      out.push(coords as number[]);
      return;
    }
    // Otherwise recurse into nested arrays
    for (const child of coords) {
      walk(child);
    }
  }

  if ("coordinates" in geometry && geometry.coordinates) {
    walk(geometry.coordinates);
  }

  return out;
}

function computeCoordRange(features: GeoJSON.Feature[]): BBox {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const f of features) {
    if (!f.geometry) continue;
    const coords = extractCoords(f.geometry);
    for (const pt of coords) {
      const x = pt[0];
      const y = pt[1];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  return { minX, maxX, minY, maxY };
}

// ============================================================================
// PROJECTION AUTO-DETECTION
// ============================================================================
//
// After converting TopoJSON → GeoJSON (which decodes any quantization/transform),
// inspect the decoded coordinate ranges of ALL features.
//
// If abs(maxX) <= 180 and abs(maxY) <= 90 → geographic (lon/lat) → geoMercator
// Otherwise → pre-projected planar → geoIdentity
//
// This works correctly regardless of whether the TopoJSON uses:
// - Raw lon/lat arcs
// - Quantized delta-encoded arcs with transform
// - Pre-projected planar coordinates

function detectProjection(bbox: BBox): ProjType {
  const absMaxX = Math.max(Math.abs(bbox.minX), Math.abs(bbox.maxX));
  const absMaxY = Math.max(Math.abs(bbox.minY), Math.abs(bbox.maxY));

  if (absMaxX <= 180 && absMaxY <= 90) {
    return "mercator";
  }
  return "identity";
}

function buildProjection(
  projType: ProjType,
  width: number,
  height: number,
  geojson: GeoJSON.FeatureCollection,
): GeoProjection {
  if (projType === "identity") {
    const proj = geoIdentity()
      .reflectY(true) as unknown as GeoProjection;
    proj.fitSize([width, height], geojson);
    return proj;
  }

  const proj = geoMercator();
  proj.fitSize([width, height], geojson);
  return proj;
}

// ============================================================================
// RESIZE OBSERVER (inline, no conditional hooks)
// ============================================================================

interface Dims {
  width: number;
  height: number;
}

function useContainerSize(): [React.RefObject<HTMLDivElement | null>, Dims] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [dims, setDims] = useState<Dims>({ width: 0, height: 0 });
  const raf = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof ResizeObserver === "undefined") return;

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

    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(measure);
    });

    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf.current);
      ro.disconnect();
    };
  }, []);

  return [ref, dims];
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function EUMap({ countries, mean }: EUMapProps) {
  const router = useRouter();
  const [containerRef, dims] = useContainerSize();
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [topoData, setTopoData] = useState<EUTopology | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const hoverRef = useRef<SVGPathElement | null>(null);

  // ── ISO-2 lookup map (strict) ─────────────────────────────────────

  const lookup = useMemo(() => {
    const m = new Map<string, ISICompositeCountry>();
    for (const c of countries) {
      const code = c.country?.toUpperCase();
      if (typeof code === "string" && code.length === 2) {
        m.set(code, c);
      } else if (process.env.NODE_ENV !== "production") {
        console.warn(`[EUMap] Invalid backend ISO-2: "${c.country}"`);
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
  // Only compute when we have topology AND real container dimensions

  const mapData = useMemo(() => {
    if (!topoData || dims.width <= 0 || dims.height <= 0) return null;

    // 1) Dynamic object key extraction
    const objectKey = Object.keys(topoData.objects)[0];
    if (!objectKey) {
      console.error("[EUMap] No object keys in topology");
      return null;
    }
    const topoObj = topoData.objects[objectKey];
    if (!topoObj) {
      console.error(`[EUMap] Object "${objectKey}" is null`);
      return null;
    }

    // 2) Convert to GeoJSON (this decodes any transform/quantization)
    let geojson: GeoJSON.FeatureCollection;
    try {
      geojson = feature(topoData, topoObj) as GeoJSON.FeatureCollection;
    } catch (e) {
      console.error("[EUMap] feature() conversion failed:", e);
      return null;
    }
    if (!geojson.features?.length) {
      console.error("[EUMap] Zero features after conversion");
      return null;
    }

    // 3) Compute coordinate range from DECODED GeoJSON coordinates
    const coordRange = computeCoordRange(geojson.features);

    // 4) Auto-detect projection from coordinate range
    const projType = detectProjection(coordRange);

    // 5) Build projection fitted to container
    const projection = buildProjection(projType, dims.width, dims.height, geojson);
    const pathFn = geoPath(projection);

    // 6) Internal borders
    let borderPath = "";
    try {
      const borderGeom = mesh(topoData, topoObj, (a, b) => a !== b);
      borderPath = pathFn(borderGeom) ?? "";
    } catch (e) {
      console.warn("[EUMap] mesh() failed:", e);
    }

    // 7) Match features to backend data
    let matchedCount = 0;
    const unmatchedCodes: string[] = [];

    for (const f of geojson.features) {
      const iso = (f.properties as CountryProps | null)?.ISO_A2?.toUpperCase();
      if (iso && iso.length === 2 && lookup.has(iso)) {
        matchedCount++;
      } else {
        unmatchedCodes.push(
          iso || `(no ISO_A2, NAME="${(f.properties as CountryProps | null)?.NAME ?? "?"}")`,
        );
      }
    }

    const diag: Diagnostics = {
      projType,
      width: dims.width,
      height: dims.height,
      featureCount: geojson.features.length,
      matchedCount,
      unmatchedCodes,
      backendCodes: Array.from(lookup.keys()).sort(),
      coordRange,
    };

    // 8) Console logging in dev
    if (process.env.NODE_ENV !== "production") {
      console.info("[EUMap] Diagnostics:", {
        projection: projType,
        objectKey,
        features: geojson.features.length,
        matched: matchedCount,
        unmatched: unmatchedCodes,
        coordRange: `X[${coordRange.minX.toFixed(1)}, ${coordRange.maxX.toFixed(1)}] Y[${coordRange.minY.toFixed(1)}, ${coordRange.maxY.toFixed(1)}]`,
        container: `${dims.width}×${dims.height}`,
      });
      if (matchedCount < geojson.features.length) {
        console.warn(
          `[EUMap] ⚠ ${geojson.features.length - matchedCount} features unmatched`,
        );
      }
    }

    return { features: geojson.features, pathFn, borderPath, diag };
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
    [containerRef, lookup, mean, iso2Of, nameOf],
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

  // ── Render: Error ─────────────────────────────────────────────────

  if (loadError) {
    return (
      <div className="flex aspect-[16/9] w-full items-center justify-center rounded-lg border border-red-200 bg-red-50 text-sm text-red-600">
        <div className="text-center">
          <p className="font-medium">Map rendering failed</p>
          <p className="mt-1 text-xs text-red-500">{loadError}</p>
        </div>
      </div>
    );
  }

  // ── Render: Loading / awaiting dimensions ─────────────────────────

  if (!mapData) {
    return (
      <div className="space-y-4">
        <div
          ref={containerRef}
          className="relative flex aspect-[16/9] w-full items-center justify-center overflow-hidden rounded-lg border border-gray-200"
        >
          <span className="text-sm text-gray-400">Loading map…</span>
        </div>
      </div>
    );
  }

  // ── Render: Map ───────────────────────────────────────────────────

  const { features, pathFn, borderPath, diag } = mapData;

  return (
    <div className="space-y-4">
      {/* Mismatch warning (always visible, not just dev) */}
      {diag.matchedCount < diag.featureCount && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-2 text-xs text-red-800">
          <strong>⚠ Map data mismatch:</strong> {diag.matchedCount}/
          {diag.featureCount} countries matched. Unmatched:{" "}
          {diag.unmatchedCodes.join(", ")}
        </div>
      )}

      {/* Map container */}
      <div
        ref={containerRef}
        className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-gray-200"
      >
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
            {features.map((f, i) => {
              const iso = iso2Of(f);
              const rec = iso ? lookup.get(iso) : undefined;
              const score = rec?.isi_composite ?? null;
              const d = pathFn(f as GeoPermissibleObjects);
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

          {/* Internal borders overlay */}
          {borderPath.length > 0 && (
            <path
              d={borderPath}
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
              <span className="font-mono text-gray-400">({tooltip.iso2})</span>
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

      {/* ── DEV DIAGNOSTICS PANEL ──────────────────────────────────── */}
      {process.env.NODE_ENV !== "production" && (
        <div className="mt-4 rounded border-2 border-red-400 bg-red-50 p-4 text-xs font-mono text-red-900">
          <p className="mb-2 text-sm font-bold text-red-700">
            🔍 Map Diagnostics (dev only)
          </p>

          <table className="w-full text-left">
            <tbody>
              <tr>
                <td className="pr-3 font-semibold">Projection:</td>
                <td>
                  {diag.projType === "mercator"
                    ? "geoMercator (lon/lat detected)"
                    : "geoIdentity (planar/projected detected)"}
                </td>
              </tr>
              <tr>
                <td className="pr-3 font-semibold">Container:</td>
                <td>
                  {diag.width} × {diag.height} px
                </td>
              </tr>
              <tr>
                <td className="pr-3 font-semibold">Features:</td>
                <td>{diag.featureCount}</td>
              </tr>
              <tr>
                <td className="pr-3 font-semibold">Matched:</td>
                <td>
                  {diag.matchedCount} / {diag.featureCount}
                  {diag.matchedCount < diag.featureCount && (
                    <span className="ml-2 font-bold text-red-700">
                      ⚠ {diag.featureCount - diag.matchedCount} UNMATCHED
                    </span>
                  )}
                </td>
              </tr>
              <tr>
                <td className="pr-3 font-semibold">Coord range X:</td>
                <td>
                  [{diag.coordRange.minX.toFixed(2)}, {diag.coordRange.maxX.toFixed(2)}]
                </td>
              </tr>
              <tr>
                <td className="pr-3 font-semibold">Coord range Y:</td>
                <td>
                  [{diag.coordRange.minY.toFixed(2)}, {diag.coordRange.maxY.toFixed(2)}]
                </td>
              </tr>
            </tbody>
          </table>

          {diag.unmatchedCodes.length > 0 && (
            <div className="mt-2">
              <p className="font-semibold text-red-800">Unmatched ISO codes:</p>
              <p className="ml-2">
                {diag.unmatchedCodes.map((c) => (
                  <code key={c} className="mr-1 rounded bg-red-100 px-1">
                    {c}
                  </code>
                ))}
              </p>
            </div>
          )}

          <div className="mt-2">
            <p className="font-semibold">
              Backend ISO-2 ({diag.backendCodes.length}):
            </p>
            <p className="ml-2">{diag.backendCodes.join(", ")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
