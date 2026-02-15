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
  extractFeatureCode,
  extractFeatureName,
  resolveFeature,
  buildLookupIndex,
  buildDiagnostics,
} from "@/lib/geoResolver";
import type { ISILookupIndex, MapDiagnostics } from "@/lib/geoResolver";
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
const BORDER_STROKE = "#94a3b8";
const BORDER_STROKE_WIDTH = 0.75;
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

interface ComputedMapData {
  readonly features: readonly GeoJSON.Feature[];
  readonly pathGenerator: (object: GeoPermissibleObjects) => string | null;
  readonly borderPathD: string;
  readonly diagnostics: MapDiagnostics;
}

// ─── TopoJSON type for our dataset ──────────────────────────────────

interface CountryProperties {
  readonly ISO_A2?: string;
  readonly NAME?: string;
  readonly [key: string]: unknown;
}

type CountryTopology = Topology<{
  [key: string]: GeometryCollection<CountryProperties>;
}>;

// ─── Component ──────────────────────────────────────────────────────

export default function EUMap({ countries, mean }: EUMapProps) {
  const router = useRouter();
  const [containerRef, dimensions] = useResizeObserver<HTMLDivElement>();
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [topoData, setTopoData] = useState<CountryTopology | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // ── Build ISI lookup index (memoized on countries) ────────────────

  const lookupIndex: ISILookupIndex = useMemo(
    () => buildLookupIndex(countries),
    [countries],
  );

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

    // Dynamically detect the first object key
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

    // Build projection fitted to container dimensions
    const projection = geoMercator().fitSize(
      [dimensions.width, dimensions.height],
      geojson,
    );
    const pathGenerator = geoPath(projection);

    // Build internal border mesh
    // mesh(topology, object, filter) where filter(a, b) => a !== b
    // gives internal borders only (shared between two distinct geometries)
    let borderPathD = "";
    try {
      const borderMesh = mesh(
        topoData,
        topoObject,
        (a, b) => a !== b,
      );
      borderPathD = pathGenerator(borderMesh) ?? "";
    } catch {
      // mesh() can fail on degenerate topologies with no shared arcs
      borderPathD = "";
    }

    // Build diagnostics
    const diagnostics = buildDiagnostics(
      objectKey,
      geojson.features,
      lookupIndex,
      countries,
    );

    return {
      features: geojson.features,
      pathGenerator,
      borderPathD,
      diagnostics,
    };
  }, [topoData, dimensions, lookupIndex, countries]);

  // ── Event Handlers ────────────────────────────────────────────────

  const handleMouseMove = useCallback(
    (e: React.MouseEvent, featureRef: GeoJSON.Feature) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const code = extractFeatureCode(featureRef);
      const name = extractFeatureName(featureRef);
      const record = resolveFeature(featureRef, lookupIndex);
      const score = record?.isi_composite ?? null;
      const band = classifyBand(score);

      // Compute raw position relative to container
      let tooltipX = e.clientX - rect.left;
      let tooltipY = e.clientY - rect.top - TOOLTIP_OFFSET_Y;

      // Clamp within container bounds (with padding)
      const padding = 8;
      tooltipX = Math.max(padding, Math.min(tooltipX, rect.width - padding));
      tooltipY = Math.max(padding, Math.min(tooltipY, rect.height - padding));

      setTooltip({
        x: tooltipX,
        y: tooltipY,
        name,
        code,
        score,
        classification: classificationBandLabel(band),
        delta:
          score !== null && mean !== null && Number.isFinite(score) && Number.isFinite(mean)
            ? score - mean
            : null,
      });
    },
    [containerRef, lookupIndex, mean],
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  const handleClick = useCallback(
    (featureRef: GeoJSON.Feature) => {
      const record = resolveFeature(featureRef, lookupIndex);
      if (record) {
        router.push(`/country/${record.country.toLowerCase()}`);
      }
    },
    [lookupIndex, router],
  );

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<SVGPathElement>) => {
      e.currentTarget.setAttribute("stroke", COUNTRY_HOVER_STROKE);
      e.currentTarget.setAttribute(
        "stroke-width",
        String(COUNTRY_HOVER_STROKE_WIDTH),
      );
    },
    [],
  );

  const handleMouseOut = useCallback(
    (e: React.MouseEvent<SVGPathElement>) => {
      e.currentTarget.setAttribute("stroke", COUNTRY_STROKE);
      e.currentTarget.setAttribute(
        "stroke-width",
        String(COUNTRY_STROKE_WIDTH),
      );
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
              const record = resolveFeature(f, lookupIndex);
              const score = record?.isi_composite ?? null;
              const pathD = pathGenerator(f as GeoPermissibleObjects);
              if (!pathD) return null;

              const code = extractFeatureCode(f);

              return (
                <path
                  key={`country-${code || idx}`}
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
                    {extractFeatureName(f)}
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
              Features rendered:{" "}
              <strong>{diagnostics.featureCount}</strong>
            </p>
            <p>
              Features matched to ISI:{" "}
              <strong>{diagnostics.matchedCount}</strong> /{" "}
              {diagnostics.featureCount}
            </p>
            <p>
              Mean composite:{" "}
              <strong>
                {formatMapScore(diagnostics.meanComposite)}
              </strong>
            </p>
            <p>
              Total countries in dataset:{" "}
              <strong>{diagnostics.totalDatasetCountries}</strong>
            </p>

            {diagnostics.unmatchedFeatures.length > 0 && (
              <div className="mt-2">
                <p className="font-medium">
                  Unmatched features (first{" "}
                  {diagnostics.unmatchedFeatures.length}):
                </p>
                <ul className="ml-4 list-disc">
                  {diagnostics.unmatchedFeatures.map((uf, i) => (
                    <li key={`unmatched-${i}`}>
                      <code>{uf.code || "(none)"}</code> /{" "}
                      <span>{uf.name}</span>
                      <span className="ml-1 text-amber-700">
                        props:{" "}
                        {JSON.stringify(
                          Object.fromEntries(
                            Object.entries(uf.properties).slice(0, 4),
                          ),
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-2">
              <p className="font-medium">
                Dataset sample (first {diagnostics.datasetSample.length}):
              </p>
              <ul className="ml-4 list-disc">
                {diagnostics.datasetSample.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>

            <div className="mt-2">
              <p className="font-medium">Container dimensions:</p>
              <p>
                {dimensions.width} × {dimensions.height}px
              </p>
            </div>
          </div>
        </details>
      )}
    </div>
  );
}
