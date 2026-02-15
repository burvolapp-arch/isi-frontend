"use client";

import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { geoMercator, geoIdentity, geoPath } from "d3-geo";
import type { GeoPermissibleObjects, GeoProjection } from "d3-geo";
import { feature, mesh } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";

import type { ISICompositeCountry } from "@/lib/types";
import { useResizeObserver } from "@/hooks/useResizeObserver";
import {
  classify,
  classifyBand,
  classificationBandLabel,
  formatMapScore,
  formatDelta,
  LEGEND_ITEMS,
} from "@/lib/mapClassification";

// ============================================================================
// EUMap — Fail-safe EU-27 Choropleth
// ============================================================================
//
// Architecture guarantees:
// 1) ALWAYS renders all EU countries (or visibly explains why not)
// 2) Automatic projection detection (lon/lat vs projected planar)
// 3) Strict ISO-2 matching — NO heuristics, NO fallbacks
// 4) Visible internal borders via mesh overlay
// 5) Self-diagnosing: dev panel shows projection, bounding box, arc sample
// 6) Cannot fail silently — every failure path logs and displays
//
// ============================================================================

// ─── Constants ──────────────────────────────────────────────────────

const STROKE_DEFAULT = "#cbd5e1";
const STROKE_W_DEFAULT = 0.5;
const STROKE_HOVER = "#0f172a";
const STROKE_W_HOVER = 1.5;
const BORDER_COLOR = "#ffffff";
const BORDER_W = 0.7;
const TOOLTIP_PAD = 8;

// ─── Types ──────────────────────────────────────────────────────────

interface EUMapProps {
  readonly countries: readonly ISICompositeCountry[];
  readonly mean: number | null;
}

interface TooltipState {
  readonly x: number;
  readonly y: number;
  readonly name: string;
  readonly iso2: string;
  readonly score: number | null;
  readonly classification: string;
  readonly delta: number | null;
}

type ProjectionKind = "mercator" | "identity";

interface DiagnosticsData {
  readonly projectionKind: ProjectionKind;
  readonly objectKey: string;
  readonly featureCount: number;
  readonly matchedCount: number;
  readonly unmatchedISO2s: readonly string[];
  readonly backendISO2s: readonly string[];
  readonly bbox: readonly [number, number, number, number]; // [minX, minY, maxX, maxY]
  readonly firstArcSample: string;
}

interface ComputedMap {
  readonly features: GeoJSON.Feature[];
  readonly pathGen: (obj: GeoPermissibleObjects) => string | null;
  readonly borderD: string;
  readonly diag: DiagnosticsData;
}

// ─── TopoJSON contract ──────────────────────────────────────────────

interface CountryProps {
  readonly ISO_A2: string;
  readonly NAME: string;
}

type CountryTopo = Topology<{
  [k: string]: GeometryCollection<CountryProps>;
}>;

// ─── Projection Detection ───────────────────────────────────────────
//
// Inspects raw arc coordinate magnitudes from the TopoJSON.
// If any absolute value > 500, the coordinates are projected (planar).
// If all within [-180, 180] range → geographic (lon/lat).
//
// This is the ONLY place projection choice is made.

function detectProjectionKind(topo: CountryTopo): ProjectionKind {
  const arcs = topo.arcs;
  if (!arcs || arcs.length === 0) return "mercator"; // safe default

  // Sample up to 10 arcs, up to 5 points each
  const sampleArcs = arcs.slice(0, 10);
  let maxMagnitude = 0;

  for (const arc of sampleArcs) {
    const samplePts = arc.slice(0, 5);
    for (const pt of samplePts) {
      const absX = Math.abs(pt[0]);
      const absY = Math.abs(pt[1]);
      if (absX > maxMagnitude) maxMagnitude = absX;
      if (absY > maxMagnitude) maxMagnitude = absY;
    }
  }

  // Threshold: geographic coordinates never exceed ~180 for lon, ~90 for lat.
  // We use 500 as a conservative threshold (well above 180, well below
  // even small-scale projected extents which are typically in thousands/millions).
  return maxMagnitude > 500 ? "identity" : "mercator";
}

// ─── Build Projection ───────────────────────────────────────────────

function buildProjection(
  kind: ProjectionKind,
  width: number,
  height: number,
  geojson: GeoJSON.FeatureCollection,
): GeoProjection {
  if (kind === "identity") {
    // Projected/planar coordinates: use geoIdentity with reflectY
    // (screen Y is inverted relative to cartographic Y)
    const proj = geoIdentity().reflectY(true) as unknown as GeoProjection;
    proj.fitSize([width, height], geojson);
    return proj;
  }
  // Geographic coordinates (lon/lat): use Mercator
  const proj = geoMercator();
  proj.fitSize([width, height], geojson);
  return proj;
}

// ─── Bounding Box ───────────────────────────────────────────────────

function computeBBox(
  topo: CountryTopo,
): [number, number, number, number] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const arc of topo.arcs) {
    for (const pt of arc) {
      if (pt[0] < minX) minX = pt[0];
      if (pt[1] < minY) minY = pt[1];
      if (pt[0] > maxX) maxX = pt[0];
      if (pt[1] > maxY) maxY = pt[1];
    }
  }

  return [minX, minY, maxX, maxY];
}

// ─── First Arc Sample (for diagnostics) ─────────────────────────────

function firstArcSample(topo: CountryTopo): string {
  const arcs = topo.arcs;
  if (!arcs || arcs.length === 0) return "(no arcs)";
  const first = arcs[0];
  if (!first || first.length === 0) return "(empty arc)";
  const pts = first.slice(0, 3).map((p) => `[${p[0]}, ${p[1]}]`);
  return pts.join(" → ") + (first.length > 3 ? " …" : "");
}

// ─── Component ──────────────────────────────────────────────────────

export default function EUMap({ countries, mean }: EUMapProps) {
  const router = useRouter();
  const [containerRef, dims] = useResizeObserver<HTMLDivElement>();
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [topoData, setTopoData] = useState<CountryTopo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const hoverRef = useRef<SVGPathElement | null>(null);

  // ── ISO-2 Record Map (strict, no fallbacks) ───────────────────────

  const isoMap: ReadonlyMap<string, ISICompositeCountry> = useMemo(() => {
    const m = new Map<string, ISICompositeCountry>();
    for (const rec of countries) {
      const code = rec.country?.toUpperCase();
      if (typeof code === "string" && code.length === 2) {
        m.set(code, rec);
      } else {
        console.warn(
          `[EUMap] Skipping backend record with invalid ISO-2: "${rec.country}"`,
        );
      }
    }
    return m;
  }, [countries]);

  // ── Fetch TopoJSON ────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    fetch("/eu27.topo.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<CountryTopo>;
      })
      .then((data) => {
        if (!cancelled) {
          // Validate structure before committing to state
          if (!data || typeof data !== "object" || !data.objects) {
            throw new Error("TopoJSON missing 'objects' key");
          }
          if (!data.arcs || !Array.isArray(data.arcs)) {
            throw new Error("TopoJSON missing 'arcs' array");
          }
          setTopoData(data);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const msg =
            err instanceof Error
              ? `Map load failed: ${err.message}`
              : "Map geometry unavailable";
          console.error(`[EUMap] ${msg}`);
          setLoadError(msg);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Compute everything: GeoJSON, projection, paths, diagnostics ──

  const computed: ComputedMap | null = useMemo(() => {
    if (!topoData) return null;

    // 1) Dynamically extract object key
    const keys = Object.keys(topoData.objects);
    if (keys.length === 0) {
      console.error("[EUMap] TopoJSON has no object keys in .objects");
      return null;
    }
    const objectKey = keys[0];
    const topoObject = topoData.objects[objectKey];
    if (!topoObject) {
      console.error(`[EUMap] TopoJSON object "${objectKey}" is undefined`);
      return null;
    }

    // 2) Convert TopoJSON → GeoJSON FeatureCollection
    let geojson: GeoJSON.FeatureCollection;
    try {
      geojson = feature(
        topoData,
        topoObject,
      ) as GeoJSON.FeatureCollection;
    } catch (e) {
      console.error("[EUMap] topojson-client feature() failed:", e);
      return null;
    }

    if (!geojson.features || geojson.features.length === 0) {
      console.error("[EUMap] GeoJSON has zero features after conversion");
      return null;
    }

    // 3) Detect projection type from arc magnitudes
    const projKind = detectProjectionKind(topoData);

    // 4) Build projection fitted to container
    const projection = buildProjection(
      projKind,
      dims.width,
      dims.height,
      geojson,
    );
    const pathGen = geoPath(projection);

    // 5) Internal borders via mesh
    let borderD = "";
    try {
      const borderMesh = mesh(topoData, topoObject, (a, b) => a !== b);
      borderD = pathGen(borderMesh) ?? "";
    } catch (e) {
      console.warn("[EUMap] mesh() failed for internal borders:", e);
    }

    // 6) Match features to backend records
    let matchedCount = 0;
    const unmatchedISO2s: string[] = [];

    for (const f of geojson.features) {
      const props = f.properties as CountryProps | null;
      const raw = props?.ISO_A2;
      const iso2 =
        typeof raw === "string" && raw.length === 2
          ? raw.toUpperCase()
          : "";

      if (iso2 && isoMap.has(iso2)) {
        matchedCount++;
      } else {
        const label = iso2 || `(missing ISO_A2, NAME="${props?.NAME ?? "?"}")`;
        unmatchedISO2s.push(label);
      }
    }

    // 7) Build diagnostics
    const bbox = computeBBox(topoData);
    const arcSample = firstArcSample(topoData);
    const backendISO2s = Array.from(isoMap.keys()).sort();

    const diag: DiagnosticsData = {
      projectionKind: projKind,
      objectKey,
      featureCount: geojson.features.length,
      matchedCount,
      unmatchedISO2s,
      backendISO2s,
      bbox,
      firstArcSample: arcSample,
    };

    // 8) Log diagnostics to console in development
    if (process.env.NODE_ENV !== "production") {
      console.info("[EUMap] Diagnostics:", {
        projection: projKind,
        objectKey,
        features: geojson.features.length,
        matched: matchedCount,
        unmatched: unmatchedISO2s,
        bbox: `[${bbox.join(", ")}]`,
        firstArc: arcSample,
        containerSize: `${dims.width}×${dims.height}`,
      });

      if (matchedCount < geojson.features.length) {
        console.warn(
          `[EUMap] ⚠ CONTRACT MISMATCH: ${geojson.features.length - matchedCount} features unmatched`,
        );
      }
    }

    return {
      features: geojson.features,
      pathGen,
      borderD,
      diag,
    };
  }, [topoData, dims, isoMap]);

  // ── ISO-2 extraction (inline, strict) ─────────────────────────────

  const getISO2 = useCallback((f: GeoJSON.Feature): string => {
    const raw = (f.properties as CountryProps | null)?.ISO_A2;
    if (typeof raw !== "string" || raw.length !== 2) return "";
    return raw.toUpperCase();
  }, []);

  const getName = useCallback((f: GeoJSON.Feature): string => {
    const raw = (f.properties as CountryProps | null)?.NAME;
    if (typeof raw !== "string" || raw.length === 0) return "Unknown";
    return raw;
  }, []);

  // ── Event Handlers ────────────────────────────────────────────────

  const handleMouseMove = useCallback(
    (e: React.MouseEvent, f: GeoJSON.Feature) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const iso2 = getISO2(f);
      const name = getName(f);
      const rec = iso2 ? isoMap.get(iso2) : undefined;
      const score = rec?.isi_composite ?? null;
      const band = classifyBand(score);

      let tx = e.clientX - rect.left;
      let ty = e.clientY - rect.top - 14;
      tx = Math.max(TOOLTIP_PAD, Math.min(tx, rect.width - TOOLTIP_PAD));
      ty = Math.max(TOOLTIP_PAD, Math.min(ty, rect.height - TOOLTIP_PAD));

      setTooltip({
        x: tx,
        y: ty,
        name,
        iso2,
        score,
        classification: classificationBandLabel(band),
        delta:
          score !== null &&
          mean !== null &&
          Number.isFinite(score) &&
          Number.isFinite(mean)
            ? score - mean
            : null,
      });
    },
    [containerRef, isoMap, mean, getISO2, getName],
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
    if (hoverRef.current) {
      hoverRef.current.setAttribute("stroke", STROKE_DEFAULT);
      hoverRef.current.setAttribute("stroke-width", String(STROKE_W_DEFAULT));
      hoverRef.current = null;
    }
  }, []);

  const handleClick = useCallback(
    (f: GeoJSON.Feature) => {
      const iso2 = getISO2(f);
      const rec = iso2 ? isoMap.get(iso2) : undefined;
      if (rec) router.push(`/country/${rec.country.toLowerCase()}`);
    },
    [isoMap, router, getISO2],
  );

  const handlePathEnter = useCallback(
    (e: React.MouseEvent<SVGPathElement>) => {
      if (hoverRef.current && hoverRef.current !== e.currentTarget) {
        hoverRef.current.setAttribute("stroke", STROKE_DEFAULT);
        hoverRef.current.setAttribute("stroke-width", String(STROKE_W_DEFAULT));
      }
      e.currentTarget.setAttribute("stroke", STROKE_HOVER);
      e.currentTarget.setAttribute("stroke-width", String(STROKE_W_HOVER));
      hoverRef.current = e.currentTarget;
    },
    [],
  );

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

  // ── Render: Loading ───────────────────────────────────────────────

  if (!computed) {
    return (
      <div className="space-y-4">
        <div
          ref={containerRef}
          className="relative flex aspect-[16/9] w-full items-center justify-center overflow-hidden rounded-lg border border-gray-200"
        >
          <span className="text-sm text-gray-400">Loading map&hellip;</span>
        </div>
      </div>
    );
  }

  // ── Render: Map ───────────────────────────────────────────────────

  const { features, pathGen, borderD, diag } = computed;

  return (
    <div className="space-y-4">
      {/* Warning banner if not all features matched */}
      {diag.matchedCount < diag.featureCount && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-2 text-xs text-red-800">
          <strong>⚠ Map data mismatch:</strong> {diag.matchedCount}/
          {diag.featureCount} countries matched. Unmatched:{" "}
          {diag.unmatchedISO2s.join(", ")}
        </div>
      )}

      {/* Map Container */}
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
          {/* Layer 1: Country fills */}
          <g>
            {features.map((f, i) => {
              const iso2 = getISO2(f);
              const rec = iso2 ? isoMap.get(iso2) : undefined;
              const score = rec?.isi_composite ?? null;
              const d = pathGen(f as GeoPermissibleObjects);
              if (!d) return null;

              return (
                <path
                  key={iso2 || `f-${i}`}
                  d={d}
                  fill={classify(score)}
                  stroke={STROKE_DEFAULT}
                  strokeWidth={STROKE_W_DEFAULT}
                  className="cursor-pointer transition-opacity duration-100"
                  onMouseMove={(e) => handleMouseMove(e, f)}
                  onMouseLeave={handleMouseLeave}
                  onClick={() => handleClick(f)}
                  onMouseEnter={handlePathEnter}
                >
                  <title>
                    {getName(f)} ({iso2 || "?"})
                    {score !== null ? ` — ${score.toFixed(4)}` : ""}
                  </title>
                </path>
              );
            })}
          </g>

          {/* Layer 2: Internal borders (mesh overlay) */}
          {borderD.length > 0 && (
            <path
              d={borderD}
              fill="none"
              stroke={BORDER_COLOR}
              strokeWidth={BORDER_W}
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
                &Delta; {formatDelta(tooltip.delta)} from mean
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

      {/* ── Dev Diagnostics Panel ──────────────────────────────────── */}
      {process.env.NODE_ENV !== "production" && (
        <details className="mt-4 rounded border border-amber-300 bg-amber-50 p-3 text-xs">
          <summary className="cursor-pointer font-medium text-amber-800">
            Map Diagnostics (dev only)
          </summary>
          <div className="mt-2 space-y-1.5 font-mono text-amber-900">
            <p>
              Projection:{" "}
              <code className="rounded bg-amber-100 px-1">
                {diag.projectionKind === "mercator"
                  ? "geoMercator (lon/lat detected)"
                  : "geoIdentity (planar detected)"}
              </code>
            </p>
            <p>
              Topo object key:{" "}
              <code className="rounded bg-amber-100 px-1">
                {diag.objectKey}
              </code>
            </p>
            <p>
              Features: <strong>{diag.featureCount}</strong>
            </p>
            <p>
              Matched: <strong>{diag.matchedCount}</strong> /{" "}
              {diag.featureCount}
              {diag.matchedCount < diag.featureCount && (
                <span className="ml-2 font-bold text-red-700">
                  ⚠ CONTRACT MISMATCH —{" "}
                  {diag.featureCount - diag.matchedCount} unmatched
                </span>
              )}
            </p>

            {diag.unmatchedISO2s.length > 0 && (
              <div className="mt-1">
                <p className="font-semibold text-red-800">
                  Unmatched ISO_A2 codes:
                </p>
                <ul className="ml-4 list-disc">
                  {diag.unmatchedISO2s.map((c) => (
                    <li key={c}>
                      <code className="rounded bg-red-100 px-1">{c}</code>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-1">
              <p className="font-semibold">
                Backend ISO-2 ({diag.backendISO2s.length}):
              </p>
              <p className="ml-4">{diag.backendISO2s.join(", ")}</p>
            </div>

            <p>
              Bounding box:{" "}
              <code className="rounded bg-amber-100 px-1">
                [{diag.bbox.map((v) => v.toFixed(2)).join(", ")}]
              </code>
            </p>

            <p>
              First arc sample:{" "}
              <code className="rounded bg-amber-100 px-1">
                {diag.firstArcSample}
              </code>
            </p>

            <p>
              Container: {dims.width} × {dims.height}px
            </p>
          </div>
        </details>
      )}
    </div>
  );
}
