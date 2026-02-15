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
// EUMap — EU-27 Choropleth (High-Accuracy)
// ============================================================================
//
// KEY DESIGN: ONE stable container div is always rendered. Loading and map
// content are overlaid inside it. This ensures the ResizeObserver ref never
// changes DOM elements between loading ↔ map transitions.
//
// TopoJSON: Natural Earth 10m data with SHARED arcs between neighbors.
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

// Country labels — only for countries large enough to display legibly
const LABEL_COUNTRIES = new Set([
  "FR", "DE", "ES", "IT", "PL", "RO", "SE", "FI", "BG", "GR",
  "HU", "PT", "AT", "CZ", "IE", "LT", "LV", "HR", "SK",
]);

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

  const ISO_ALIASES: Record<string, string> = { EL: "GR", GR: "EL" };

  const lookup = useMemo(() => {
    const m = new Map<string, ISICompositeCountry>();
    for (const c of countries) {
      const code = c.country?.toUpperCase();
      if (typeof code === "string" && code.length === 2) {
        m.set(code, c);
        const alias = ISO_ALIASES[code];
        if (alias && !m.has(alias)) m.set(alias, c);
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

    // 5% padding on each side for breathing room
    const pad = 0.05;
    const usableW = dims.width * (1 - 2 * pad);
    const usableH = dims.height * (1 - 2 * pad);
    const projection = geoMercator().fitSize([usableW, usableH], geojson);
    const [tx, ty] = projection.translate();
    projection.translate([tx + dims.width * pad, ty + dims.height * pad]);
    const pathFn = geoPath(projection);

    // Internal borders only — shared arcs between neighboring countries
    let borderPath = "";
    try {
      const borderGeom = mesh(topoData, topoObj, (a, b) => a !== b);
      borderPath = pathFn(borderGeom) ?? "";
    } catch {
      try {
        borderPath = pathFn(mesh(topoData, topoObj)) ?? "";
      } catch { /* non-fatal */ }
    }

    // Outer coastline / external boundary
    let outerPath = "";
    try {
      const outerGeom = mesh(topoData, topoObj, (a, b) => a === b);
      outerPath = pathFn(outerGeom) ?? "";
    } catch { /* non-fatal */ }

    // Compute centroids for country labels
    const labels: { iso: string; x: number; y: number }[] = [];
    for (const f of geojson.features) {
      const iso = (f.properties as CountryProps | null)?.ISO_A2?.toUpperCase();
      if (iso && LABEL_COUNTRIES.has(iso)) {
        const centroid = pathFn.centroid(f as GeoPermissibleObjects);
        if (centroid && Number.isFinite(centroid[0]) && Number.isFinite(centroid[1])) {
          labels.push({ iso, x: centroid[0], y: centroid[1] });
        }
      }
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
      outerPath,
      labels,
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

      const tooltipW = 260;
      const tooltipH = 96;
      let tx = e.clientX - rect.left;
      let ty = e.clientY - rect.top - 16;

      if (tx - tooltipW / 2 < 12) tx = tooltipW / 2 + 12;
      if (tx + tooltipW / 2 > rect.width - 12) tx = rect.width - tooltipW / 2 - 12;
      if (ty - tooltipH < 12) ty = e.clientY - rect.top + 28;

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

  // ── Render ────────────────────────────────────────────────────────

  const ready = mapData !== null;

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

      {/* ── STABLE CONTAINER — always mounted ─── */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-xl border border-stone-200 shadow-sm"
        style={{ minHeight: "560px", aspectRatio: "5 / 4" }}
      >
        {/* Subtle water background gradient */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(180deg, #f0f5fa 0%, #e8eef5 50%, #f0f5fa 100%)",
          }}
        />

        {/* Loading overlay */}
        {!ready && !loadError && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
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
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-red-50 text-sm text-red-600">
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
              role="img"
              aria-label="EU-27 ISI composite score choropleth map"
            >
              {/* SVG Filters for subtle depth */}
              <defs>
                <filter id="country-shadow" x="-2%" y="-2%" width="104%" height="104%">
                  <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#0b2545" floodOpacity="0.08" />
                </filter>
              </defs>

              {/* Country fills with drop shadow */}
              <g filter="url(#country-shadow)">
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
                      stroke="none"
                      opacity={hoveredIso && !isHovered ? 0.55 : 1}
                      className="cursor-pointer"
                      style={{
                        transition: "opacity 0.2s ease",
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

              {/* Internal borders — crisp white hairline */}
              {mapData.borderPath.length > 0 && (
                <path
                  d={mapData.borderPath}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth={0.8}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  pointerEvents="none"
                />
              )}

              {/* Outer coastline — subtle grey definition */}
              {mapData.outerPath.length > 0 && (
                <path
                  d={mapData.outerPath}
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth={0.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  pointerEvents="none"
                  opacity={0.6}
                />
              )}

              {/* Hover highlight stroke — rendered on top of everything */}
              {hoveredIso && mapData.features.map((f, i) => {
                const iso = iso2Of(f);
                if (iso !== hoveredIso) return null;
                const d = mapData.pathFn(f as GeoPermissibleObjects);
                if (!d) return null;
                return (
                  <path
                    key={`hover-${iso}`}
                    d={d}
                    fill="none"
                    stroke="#0b2545"
                    strokeWidth={2}
                    strokeLinejoin="round"
                    pointerEvents="none"
                    style={{ transition: "stroke-width 0.15s ease" }}
                  />
                );
              })}

              {/* Country labels */}
              <g pointerEvents="none">
                {mapData.labels.map(({ iso, x, y }) => (
                  <text
                    key={`lbl-${iso}`}
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={hoveredIso === iso ? "#0b2545" : "#374151"}
                    fillOpacity={hoveredIso && hoveredIso !== iso ? 0.3 : 0.55}
                    fontSize={dims.width > 700 ? 9 : 7}
                    fontFamily="var(--font-sans)"
                    fontWeight={500}
                    style={{ transition: "fill-opacity 0.2s ease", userSelect: "none" }}
                  >
                    {iso}
                  </text>
                ))}
              </g>
            </svg>

            {/* Tooltip */}
            {tooltip && (
              <div
                className="pointer-events-none absolute z-20 rounded-lg bg-navy-900/95 px-4 py-3 text-xs text-white shadow-xl ring-1 ring-white/10 backdrop-blur-sm"
                style={{
                  left: tooltip.x,
                  top: tooltip.y,
                  transform: "translate(-50%, -100%)",
                  maxWidth: "270px",
                  animation: "fadeIn 0.12s ease-out",
                }}
              >
                <p className="text-[13px] font-semibold leading-tight">
                  {tooltip.name}
                  <span className="ml-1.5 font-mono text-[11px] font-normal text-stone-400">
                    {tooltip.iso2}
                  </span>
                </p>

                {/* Score bar */}
                {tooltip.score !== null && (
                  <div className="mt-2">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-mono text-[16px] font-semibold tabular-nums">
                        {formatMapScore(tooltip.score)}
                      </span>
                      <span className="text-[10px] font-medium uppercase tracking-wider text-stone-400">
                        {tooltip.classification}
                      </span>
                    </div>
                    {/* Visual bar */}
                    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, (tooltip.score ?? 0) * 100)}%`,
                          backgroundColor: classify(tooltip.score),
                          transition: "width 0.2s ease",
                        }}
                      />
                    </div>
                  </div>
                )}

                {tooltip.score === null && (
                  <p className="mt-1.5 font-mono text-[13px] tabular-nums text-stone-500">
                    No data
                  </p>
                )}

                {tooltip.delta !== null && (
                  <p className="mt-1.5 text-[11px] tabular-nums text-stone-400">
                    <span className={tooltip.delta > 0 ? "text-red-400" : "text-emerald-400"}>
                      {formatDelta(tooltip.delta)}
                    </span>
                    {" "}vs EU-27 mean
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] text-text-tertiary">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-quaternary">
          ISI Composite
        </span>
        {LEGEND_ITEMS.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-7 rounded-sm border border-stone-200 shadow-sm"
              style={{ backgroundColor: item.color }}
            />
            <span className="font-mono tabular-nums">{item.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
