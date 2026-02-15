"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { geoMercator, geoPath } from "d3-geo";
import type { GeoPermissibleObjects } from "d3-geo";
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

// ─── SVG Constants ──────────────────────────────────────────────────

const COUNTRY_STROKE = "#cbd5e1";
const COUNTRY_STROKE_WIDTH = 0.5;
const COUNTRY_HOVER_STROKE = "#0f172a";
const COUNTRY_HOVER_STROKE_WIDTH = 1.5;
const BORDER_STROKE = "#ffffff";
const BORDER_STROKE_WIDTH = 0.6;
const TOOLTIP_OFFSET_Y = 12;

// ─── Types ──────────────────────────────────────────────────────────

interface EUMapProps {
  readonly countries: readonly ISICompositeCountry[];
  readonly mean: number | null;
}

interface TooltipState {
  readonly x: number;
  readonly y: number;
  readonly name: string;
  readonly code: string;
  readonly score: number | null;
  readonly classification: string;
  readonly delta: number | null;
}

interface DiagnosticsData {
  readonly objectKey: string;
  readonly featureCount: number;
  readonly matchedCount: number;
  readonly unmatchedISO2s: readonly string[];
  readonly backendISO2s: readonly string[];
}

interface ComputedMapData {
  readonly features: readonly GeoJSON.Feature[];
  readonly pathGenerator: (object: GeoPermissibleObjects) => string | null;
  readonly borderPathD: string;
  readonly diagnostics: DiagnosticsData;
}

// ─── TopoJSON type for our dataset ──────────────────────────────────
// Contract: each geometry has properties.ISO_A2 (string, 2-char ISO code)
// and properties.NAME (string, display name).

interface CountryProperties {
  readonly ISO_A2: string;
  readonly NAME: string;
}

type CountryTopology = Topology<{
  [key: string]: GeometryCollection<CountryProperties>;
}>;

// ─── Deterministic ISO-2 extraction ─────────────────────────────────
// No fallbacks. No guessing. Strict contract.

function getFeatureISO2(f: GeoJSON.Feature): string {
  const props = f.properties as CountryProperties | null;
  if (!props) return "";
  const raw = props.ISO_A2;
  if (typeof raw !== "string" || raw.length !== 2) return "";
  return raw.toUpperCase();
}

function getFeatureName(f: GeoJSON.Feature): string {
  const props = f.properties as CountryProperties | null;
  if (!props) return "Unknown";
  const raw = props.NAME;
  if (typeof raw !== "string" || raw.length === 0) return "Unknown";
  return raw;
}

// ─── Component ──────────────────────────────────────────────────────

export default function EUMap({ countries, mean }: EUMapProps) {
  const router = useRouter();
  const [containerRef, dimensions] = useResizeObserver<HTMLDivElement>();
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [topoData, setTopoData] = useState<CountryTopology | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // ── Build strict ISO-2 record map from backend data ───────────────
  // Contract: ISICompositeCountry.country is a 2-char ISO code.

  const recordMap: ReadonlyMap<string, ISICompositeCountry> = useMemo(() => {
    const map = new Map<string, ISICompositeCountry>();
    for (const record of countries) {
      const iso2 = record.country?.toUpperCase();
      if (iso2 && iso2.length === 2) {
        map.set(iso2, record);
      }
    }
    return map;
  }, [countries]);

  // ── Fetch TopoJSON ────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    fetch("/eu27.topo.json")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`TopoJSON fetch failed: HTTP ${response.status}`);
        }
        return response.json() as Promise<CountryTopology>;
      })
      .then((data) => {
        if (!cancelled) {
          setTopoData(data);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Map geometry unavailable";
          setFetchError(message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Compute GeoJSON, projection, paths, mesh, diagnostics ────────

  const computed: ComputedMapData | null = useMemo(() => {
    if (!topoData || !topoData.objects) return null;

    const objectKeys = Object.keys(topoData.objects);
    if (objectKeys.length === 0) return null;
    const objectKey = objectKeys[0];

    const topoObject = topoData.objects[objectKey];
    if (!topoObject) return null;

    // Convert TopoJSON → GeoJSON FeatureCollection
    const geojson = feature(
      topoData,
      topoObject,
    ) as GeoJSON.FeatureCollection<GeoJSON.GeometryObject, CountryProperties>;

    if (!geojson || !geojson.features || geojson.features.length === 0) {
      return null;
    }

    // Canonical D3 projection pattern
    const projection = geoMercator();
    projection.fitSize([dimensions.width, dimensions.height], geojson);
    const pathGenerator = geoPath(projection);

    // Internal borders via mesh: (a, b) => a !== b gives shared (internal) edges only
    let borderPathD = "";
    try {
      const borderMesh = mesh(
        topoData,
        topoObject,
        (a, b) => a !== b,
      );
      borderPathD = pathGenerator(borderMesh) ?? "";
    } catch {
      borderPathD = "";
    }

    // Build diagnostics
    let matchedCount = 0;
    const unmatchedISO2s: string[] = [];

    for (const f of geojson.features) {
      const iso2 = getFeatureISO2(f);
      const record = iso2 ? recordMap.get(iso2) : undefined;
      if (record) {
        matchedCount += 1;
      } else {
        unmatchedISO2s.push(iso2 || "(no ISO_A2)");
      }
    }

    const backendISO2s = Array.from(recordMap.keys()).sort();

    const diagnostics: DiagnosticsData = {
      objectKey,
      featureCount: geojson.features.length,
      matchedCount,
      unmatchedISO2s,
      backendISO2s,
    };

    return {
      features: geojson.features,
      pathGenerator,
      borderPathD,
      diagnostics,
    };
  }, [topoData, dimensions, recordMap]);

  // ── Event Handlers ────────────────────────────────────────────────

  const handleMouseMove = useCallback(
    (e: React.MouseEvent, f: GeoJSON.Feature) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const iso2 = getFeatureISO2(f);
      const name = getFeatureName(f);
      const record = iso2 ? recordMap.get(iso2) : undefined;
      const score = record?.isi_composite ?? null;
      const band = classifyBand(score);

      let tooltipX = e.clientX - rect.left;
      let tooltipY = e.clientY - rect.top - TOOLTIP_OFFSET_Y;

      const padding = 8;
      tooltipX = Math.max(padding, Math.min(tooltipX, rect.width - padding));
      tooltipY = Math.max(padding, Math.min(tooltipY, rect.height - padding));

      setTooltip({
        x: tooltipX,
        y: tooltipY,
        name,
        code: iso2,
        score,
        classification: classificationBandLabel(band),
        delta:
          score !== null && mean !== null && Number.isFinite(score) && Number.isFinite(mean)
            ? score - mean
            : null,
      });
    },
    [containerRef, recordMap, mean],
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  const handleClick = useCallback(
    (f: GeoJSON.Feature) => {
      const iso2 = getFeatureISO2(f);
      const record = iso2 ? recordMap.get(iso2) : undefined;
      if (record) {
        router.push(`/country/${record.country.toLowerCase()}`);
      }
    },
    [recordMap, router],
  );

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<SVGPathElement>) => {
      e.currentTarget.setAttribute("stroke", COUNTRY_HOVER_STROKE);
      e.currentTarget.setAttribute("stroke-width", String(COUNTRY_HOVER_STROKE_WIDTH));
    },
    [],
  );

  const handleMouseOut = useCallback(
    (e: React.MouseEvent<SVGPathElement>) => {
      e.currentTarget.setAttribute("stroke", COUNTRY_STROKE);
      e.currentTarget.setAttribute("stroke-width", String(COUNTRY_STROKE_WIDTH));
    },
    [],
  );

  // ── Render: Error State ───────────────────────────────────────────

  if (fetchError) {
    return (
      <div className="flex aspect-[16/9] w-full items-center justify-center rounded-lg border border-gray-200 text-sm text-gray-400">
        {fetchError}
      </div>
    );
  }

  // ── Render: Loading State ─────────────────────────────────────────

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

  const { features, pathGenerator, borderPathD, diagnostics } = computed;

  return (
    <div className="space-y-4">
      {/* Map Container */}
      <div
        ref={containerRef}
        className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-gray-200"
      >
        <svg
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 h-full w-full"
          style={{ background: "transparent" }}
          role="img"
          aria-label="EU-27 ISI composite score choropleth map"
        >
          {/* Layer 1: Country fills */}
          <g>
            {features.map((f, idx) => {
              const iso2 = getFeatureISO2(f);
              const record = iso2 ? recordMap.get(iso2) : undefined;
              const score = record?.isi_composite ?? null;
              const pathD = pathGenerator(f as GeoPermissibleObjects);
              if (!pathD) return null;

              return (
                <path
                  key={`country-${iso2 || idx}`}
                  d={pathD}
                  fill={classify(score)}
                  stroke={COUNTRY_STROKE}
                  strokeWidth={COUNTRY_STROKE_WIDTH}
                  className="cursor-pointer transition-opacity duration-100"
                  onMouseMove={(e) => handleMouseMove(e, f)}
                  onMouseLeave={handleMouseLeave}
                  onClick={() => handleClick(f)}
                  onMouseEnter={handleMouseEnter}
                  onMouseOut={handleMouseOut}
                >
                  <title>
                    {getFeatureName(f)}
                    {score !== null ? ` — ${score.toFixed(4)}` : ""}
                  </title>
                </path>
              );
            })}
          </g>

          {/* Layer 2: Internal borders (mesh overlay) */}
          {borderPathD.length > 0 && (
            <path
              d={borderPathD}
              fill="none"
              stroke={BORDER_STROKE}
              strokeWidth={BORDER_STROKE_WIDTH}
              strokeLinejoin="round"
              strokeLinecap="round"
              pointerEvents="none"
            />
          )}
        </svg>

        {/* Tooltip overlay */}
        {tooltip !== null && (
          <div
            className="pointer-events-none absolute z-10 max-w-[220px] rounded-md bg-gray-900 px-3 py-2 text-xs text-white shadow-lg"
            style={{
              left: tooltip.x,
              top: tooltip.y,
              transform: "translate(-50%, -100%)",
            }}
          >
            <p className="font-medium leading-tight">{tooltip.name}</p>
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
          <span
            key={item.label}
            className="inline-flex items-center gap-1.5"
          >
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
          <div className="mt-2 space-y-1.5 text-amber-900">
            <p>
              Topo object key:{" "}
              <code className="rounded bg-amber-100 px-1">
                {diagnostics.objectKey}
              </code>
            </p>
            <p>
              Features:{" "}
              <strong>{diagnostics.featureCount}</strong>
            </p>
            <p>
              Matched:{" "}
              <strong>{diagnostics.matchedCount}</strong> / {diagnostics.featureCount}
              {diagnostics.matchedCount < diagnostics.featureCount && (
                <span className="ml-2 font-bold text-red-700">
                  ⚠ CONTRACT MISMATCH — {diagnostics.featureCount - diagnostics.matchedCount} unmatched
                </span>
              )}
            </p>

            {diagnostics.unmatchedISO2s.length > 0 && (
              <div className="mt-2">
                <p className="font-medium text-red-800">
                  Unmatched TopoJSON ISO_A2 codes:
                </p>
                <ul className="ml-4 list-disc">
                  {diagnostics.unmatchedISO2s.map((code) => (
                    <li key={code}>
                      <code className="rounded bg-red-100 px-1">{code}</code>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-2">
              <p className="font-medium">
                Backend ISO-2 codes ({diagnostics.backendISO2s.length}):
              </p>
              <p className="ml-4 font-mono">
                {diagnostics.backendISO2s.join(", ")}
              </p>
            </div>

            <div className="mt-2">
              <p className="font-medium">Container:</p>
              <p className="ml-4">
                {dimensions.width} × {dimensions.height}px
              </p>
            </div>
          </div>
        </details>
      )}
    </div>
  );
}
