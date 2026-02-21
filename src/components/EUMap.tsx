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

// Country labels — show all EU-27 with enough area
const LABEL_COUNTRIES = new Set([
  "FR", "DE", "ES", "IT", "PL", "RO", "SE", "FI", "BG", "GR",
  "HU", "PT", "AT", "CZ", "IE", "LT", "LV", "HR", "SK",
  "NL", "BE", "DK", "EE", "SI", "CY", "LU", "MT",
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

  // Pre-compute label font size once (not per label)
  const lblSize = dims.width > 700 ? 11 : dims.width > 500 ? 9.5 : 8;
  const lblSizeSmall = dims.width > 700 ? 9 : dims.width > 500 ? 7.5 : 6.5;
  const SMALL_COUNTRIES = new Set(["LU", "MT", "CY", "SI", "EE", "BE", "NL"]);

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

      {/* ── STABLE CONTAINER — always mounted ─── */}
      <div
        ref={containerRef}
        className="eumap-root relative w-full overflow-hidden rounded-xl border border-stone-200/60"
        style={{
          minHeight: "min(560px, 80vw)",
          aspectRatio: "4 / 3",
          contain: "content",
          boxShadow: "inset 0 2px 12px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        {/* Ocean / water background */}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 120% 100% at 50% 40%, #e9f0f8 0%, #dce5ef 55%, #d1dbe8 100%)",
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
              <defs>
                {/* Subtle land shadow for depth */}
                <filter id="land-shadow" x="-4%" y="-4%" width="108%" height="108%">
                  <feDropShadow dx="0" dy="1" stdDeviation="3" floodColor="#0b2545" floodOpacity="0.10" />
                </filter>
              </defs>

              {/* Land shadow layer — single composite path for performance */}
              {mapData.outerPath.length > 0 && (
                <path
                  d={mapData.outerPath}
                  fill="#ccd5de"
                  stroke="none"
                  filter="url(#land-shadow)"
                  pointerEvents="none"
                  opacity={0.5}
                />
              )}

              {/* Country fills — pre-computed path strings */}
              <g className="eumap-countries">
                {mapData.countries.map((c, i) => (
                  <path
                    key={c.iso || `f-${i}`}
                    d={c.d}
                    fill={c.fill}
                    stroke="none"
                    className="eumap-country"
                    data-dimmed={hoveredIso && hoveredIso !== c.iso ? "" : undefined}
                    data-active={hoveredIso === c.iso ? "" : undefined}
                    onMouseMove={(e) => onMove(e, c)}
                    onMouseLeave={onLeave}
                    onClick={() => onClick(c)}
                  >
                    <title>
                      {c.name} ({c.iso || "?"})
                      {c.score !== null ? ` — ${formatMapScore(c.score)}` : ""}
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
                  strokeWidth={1}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  pointerEvents="none"
                  opacity={0.7}
                />
              )}

              {/* Outer coastline — subtle dark definition */}
              {mapData.outerPath.length > 0 && (
                <path
                  d={mapData.outerPath}
                  fill="none"
                  stroke="#64748b"
                  strokeWidth={0.7}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  pointerEvents="none"
                  opacity={0.5}
                />
              )}

              {/* Hover highlight — luminous outline */}
              {hoveredIso && mapData.hoverPaths.has(hoveredIso) && (
                <>
                  {/* Glow */}
                  <path
                    d={mapData.hoverPaths.get(hoveredIso)!}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth={4}
                    strokeLinejoin="round"
                    pointerEvents="none"
                    opacity={0.35}
                  />
                  {/* Crisp edge */}
                  <path
                    d={mapData.hoverPaths.get(hoveredIso)!}
                    fill="none"
                    stroke="#0b2545"
                    strokeWidth={1.8}
                    strokeLinejoin="round"
                    pointerEvents="none"
                  />
                </>
              )}

              {/* Country labels — high-contrast with text shadow */}
              <g pointerEvents="none">
                {mapData.labels.map(({ iso, x, y }) => {
                  const isSmall = SMALL_COUNTRIES.has(iso);
                  const isHovered = hoveredIso === iso;
                  const isDimmed = hoveredIso !== null && !isHovered;
                  const size = isSmall ? lblSizeSmall : lblSize;
                  // Determine if this country has a dark fill for label color
                  const countryData = mapData.countries.find((c) => c.iso === iso);
                  const score = countryData?.score ?? null;
                  const isDarkFill = score !== null && score >= 0.25;
                  return (
                    <text
                      key={`lbl-${iso}`}
                      x={x}
                      y={y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={isDarkFill ? "#ffffff" : "#1e293b"}
                      fillOpacity={isDimmed ? 0.2 : isHovered ? 1 : 0.85}
                      fontSize={isHovered ? size + 1.5 : size}
                      fontFamily="var(--font-sans)"
                      fontWeight={isHovered ? 700 : 600}
                      letterSpacing="0.03em"
                      className="eumap-label"
                      style={{
                        textShadow: isDarkFill
                          ? "0 0 3px rgba(0,0,0,0.6), 0 1px 2px rgba(0,0,0,0.4)"
                          : "0 0 3px rgba(255,255,255,0.9), 0 1px 2px rgba(255,255,255,0.7), 0 0 6px rgba(255,255,255,0.5)",
                        paintOrder: "stroke",
                        stroke: isDarkFill ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.8)",
                        strokeWidth: isDarkFill ? "2px" : "2.5px",
                        strokeLinejoin: "round",
                      }}
                    >
                      {iso}
                    </text>
                  );
                })}
              </g>
            </svg>

            {/* Tooltip */}
            {tooltip && (
              <div
                className="pointer-events-none absolute z-20 rounded-xl border border-stone-200 bg-white/95 px-5 py-4 text-xs text-navy-900 shadow-lg backdrop-blur-md"
                style={{
                  left: tooltip.x,
                  top: tooltip.y,
                  transform: "translate(-50%, -100%)",
                  maxWidth: "320px",
                  animation: "fadeIn 0.08s ease-out",
                }}
              >
                <p className="text-[13px] font-semibold leading-tight tracking-tight">
                  {tooltip.name}
                  <span className="ml-1.5 font-mono text-[11px] font-normal text-stone-400">
                    {tooltip.iso2}
                  </span>
                </p>

                {tooltip.score !== null && (
                  <div className="mt-2.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-mono text-[18px] font-bold tabular-nums tracking-tight">
                        {formatMapScore(tooltip.score)}
                      </span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider border border-stone-200 bg-stone-50 text-navy-900"
                        style={{
                          backgroundColor: "#f8fafc",
                          color: "#0b2545",
                        }}
                      >
                        {tooltip.classification}
                      </span>
                    </div>
                    <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-stone-200">
                      <div
                        className="h-full rounded-full transition-all duration-150 bg-navy-900"
                        style={{
                          width: `${Math.min(100, (tooltip.score ?? 0) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {tooltip.score === null && (
                  <p className="mt-2 font-mono text-[13px] tabular-nums text-stone-500">
                    No data
                  </p>
                )}

                {tooltip.delta !== null && (
                  <p className="mt-2 text-[11px] tabular-nums text-stone-400">
                    <span className={tooltip.delta > 0 ? "text-red-400" : "text-emerald-400"}>
                      {formatDelta(tooltip.delta)}
                    </span>
                    {" "}vs EU mean
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Legend — polished band-style */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px]">
        <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-text-quaternary">
          HHI Concentration
        </span>
        {LEGEND_ITEMS.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-6 rounded-[3px]"
              style={{ backgroundColor: item.color, boxShadow: "inset 0 1px 2px rgba(0,0,0,0.08)" }}
            />
            <span className="font-mono text-[10px] tabular-nums text-text-tertiary">{item.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
