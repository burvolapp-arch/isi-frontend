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
// EUMap — EU-27 Choropleth (High-Accuracy, High-Performance)
// ============================================================================
//
// PERFORMANCE DESIGN:
// • Path strings are pre-computed in useMemo — never recomputed during hover
// • No SVG filters (feDropShadow) — they force per-frame GPU rasterisation
// • Mouse events throttled to one update per animation frame
// • Hover state stored in a ref AND state to avoid stale closures
// • Hover overlay path is pre-computed in a Map for O(1) lookup
// • CSS opacity uses will-change for GPU compositing
// • Tooltip positioned with transform (composited, no layout thrash)
//
// ACCURACY: Natural Earth 10m source, quantile 0.20 simplification,
// ~7K coordinate points for crisp coastlines at any zoom.
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

interface PrecomputedCountry {
  iso: string;
  name: string;
  d: string;           // SVG path string — computed once
  fill: string;        // Choropleth colour
  score: number | null;
  feature: GeoJSON.Feature;
}

type EUTopology = Topology<{
  [key: string]: GeometryCollection<CountryProps>;
}>;

// Country labels — only for countries large enough to display legibly
const LABEL_COUNTRIES = new Set([
  "FR", "DE", "ES", "IT", "PL", "RO", "SE", "FI", "BG", "GR",
  "HU", "PT", "AT", "CZ", "IE", "LT", "LV", "HR", "SK",
]);

const ISO_ALIASES: Record<string, string> = { EL: "GR", GR: "EL" };

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
  const hoveredRef = useRef<string | null>(null);
  const rafResize = useRef(0);
  const rafHover = useRef(0);

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
      cancelAnimationFrame(rafResize.current);
      rafResize.current = requestAnimationFrame(measure);
    });
    ro.observe(el);

    return () => {
      cancelAnimationFrame(rafResize.current);
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

  // ── Compute ALL map geometry once ─────────────────────────────────
  // Pre-computes: path strings, fills, border/outer meshes, labels,
  // and a hover-path lookup map. Nothing in the render loop ever calls
  // pathFn again — it's all string lookups.

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

    // Pre-compute all country path strings + metadata
    const precomputed: PrecomputedCountry[] = [];
    const hoverPaths = new Map<string, string>(); // iso → path d
    let matchedCount = 0;
    const unmatchedCodes: string[] = [];

    for (const f of geojson.features) {
      const rawIso = (f.properties as CountryProps | null)?.ISO_A2;
      const iso = typeof rawIso === "string" && rawIso.length === 2 ? rawIso.toUpperCase() : "";
      const rawName = (f.properties as CountryProps | null)?.NAME;
      const name = typeof rawName === "string" && rawName.length > 0 ? rawName : "Unknown";
      const d = pathFn(f as GeoPermissibleObjects);
      if (!d) continue;

      const rec = iso ? lookup.get(iso) : undefined;
      const score = rec?.isi_composite ?? null;
      const fill = classify(score);

      if (rec) matchedCount++;
      else unmatchedCodes.push(iso || "(missing ISO_A2)");

      precomputed.push({ iso, name, d, fill, score, feature: f });
      if (iso) hoverPaths.set(iso, d);
    }

    // Internal borders — shared arcs
    let borderPath = "";
    try {
      borderPath = pathFn(mesh(topoData, topoObj, (a, b) => a !== b)) ?? "";
    } catch {
      try { borderPath = pathFn(mesh(topoData, topoObj)) ?? ""; }
      catch { /* non-fatal */ }
    }

    // Outer coastline
    let outerPath = "";
    try {
      outerPath = pathFn(mesh(topoData, topoObj, (a, b) => a === b)) ?? "";
    } catch { /* non-fatal */ }

    // Labels
    const labels: { iso: string; x: number; y: number }[] = [];
    for (const f of geojson.features) {
      const iso = (f.properties as CountryProps | null)?.ISO_A2?.toUpperCase();
      if (iso && LABEL_COUNTRIES.has(iso)) {
        const c = pathFn.centroid(f as GeoPermissibleObjects);
        if (c && Number.isFinite(c[0]) && Number.isFinite(c[1])) {
          labels.push({ iso, x: c[0], y: c[1] });
        }
      }
    }

    return {
      countries: precomputed,
      hoverPaths,
      borderPath,
      outerPath,
      labels,
      featureCount: geojson.features.length,
      matchedCount,
      unmatchedCodes,
    };
  }, [topoData, dims, lookup]);

  // ── RAF-throttled hover handler ───────────────────────────────────
  // Stores pending mouse data in a ref, commits at most once per frame.

  const pendingMove = useRef<{ e: React.MouseEvent; c: PrecomputedCountry } | null>(null);

  const commitHover = useCallback(() => {
    const p = pendingMove.current;
    if (!p) return;
    pendingMove.current = null;

    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const { e, c } = p;
    const band = classifyBand(c.score);

    const tooltipW = 260;
    const tooltipH = 96;
    let tx = e.clientX - rect.left;
    let ty = e.clientY - rect.top - 16;
    if (tx - tooltipW / 2 < 12) tx = tooltipW / 2 + 12;
    if (tx + tooltipW / 2 > rect.width - 12) tx = rect.width - tooltipW / 2 - 12;
    if (ty - tooltipH < 12) ty = e.clientY - rect.top + 28;

    const nextIso = c.iso || null;
    // Only update hoveredIso state if it actually changed
    if (hoveredRef.current !== nextIso) {
      hoveredRef.current = nextIso;
      setHoveredIso(nextIso);
    }
    setTooltip({
      x: tx,
      y: ty,
      name: c.name,
      iso2: c.iso,
      score: c.score,
      classification: classificationBandLabel(band),
      delta:
        c.score !== null && mean !== null && Number.isFinite(c.score) && Number.isFinite(mean)
          ? c.score - mean
          : null,
    });
  }, [mean]);

  const onMove = useCallback(
    (e: React.MouseEvent, c: PrecomputedCountry) => {
      // Persist the synthetic event's position data
      // (React pools synthetic events, but clientX/Y are read synchronously
      // in the rAF callback because we capture them on the native event object
      // through the persisted reference — safe because we only read, never call
      // methods on the event.)
      pendingMove.current = { e, c };
      cancelAnimationFrame(rafHover.current);
      rafHover.current = requestAnimationFrame(commitHover);
    },
    [commitHover],
  );

  const onLeave = useCallback(() => {
    cancelAnimationFrame(rafHover.current);
    pendingMove.current = null;
    hoveredRef.current = null;
    setTooltip(null);
    setHoveredIso(null);
  }, []);

  const onClick = useCallback(
    (c: PrecomputedCountry) => {
      const rec = c.iso ? lookup.get(c.iso) : undefined;
      if (rec) router.push(`/country/${rec.country.toLowerCase()}`);
    },
    [lookup, router],
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
        className="relative w-full overflow-hidden rounded-lg border border-stone-200 shadow-sm sm:rounded-xl"
        style={{ minHeight: "min(560px, 80vw)", aspectRatio: "4 / 3" }}
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
              style={{ shapeRendering: "geometricPrecision" }}
            >
              {/* Country fills — pre-computed path strings, no filter */}
              <g>
                {mapData.countries.map((c, i) => (
                  <path
                    key={c.iso || `f-${i}`}
                    d={c.d}
                    fill={c.fill}
                    stroke="none"
                    opacity={hoveredIso && hoveredIso !== c.iso ? 0.5 : 1}
                    className="cursor-pointer"
                    style={{ willChange: "opacity", transition: "opacity 0.12s ease-out" }}
                    onMouseMove={(e) => onMove(e, c)}
                    onMouseLeave={onLeave}
                    onClick={() => onClick(c)}
                  >
                    <title>
                      {c.name} ({c.iso || "?"})
                      {c.score !== null ? ` — ${c.score.toFixed(4)}` : ""}
                    </title>
                  </path>
                ))}
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

              {/* Hover highlight — O(1) pre-computed path lookup */}
              {hoveredIso && mapData.hoverPaths.has(hoveredIso) && (
                <path
                  d={mapData.hoverPaths.get(hoveredIso)!}
                  fill="none"
                  stroke="#0b2545"
                  strokeWidth={2}
                  strokeLinejoin="round"
                  pointerEvents="none"
                />
              )}

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
                    fillOpacity={hoveredIso && hoveredIso !== iso ? 0.25 : 0.5}
                    fontSize={dims.width > 700 ? 9 : 7}
                    fontFamily="var(--font-sans)"
                    fontWeight={500}
                    style={{ transition: "fill-opacity 0.12s ease-out", userSelect: "none" }}
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
                  animation: "fadeIn 0.1s ease-out",
                }}
              >
                <p className="text-[13px] font-semibold leading-tight">
                  {tooltip.name}
                  <span className="ml-1.5 font-mono text-[11px] font-normal text-stone-400">
                    {tooltip.iso2}
                  </span>
                </p>

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
                    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, (tooltip.score ?? 0) * 100)}%`,
                          backgroundColor: classify(tooltip.score),
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
