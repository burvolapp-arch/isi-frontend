"use client";

import {
  useCallback,
  useMemo,
  useState,
  useRef,
  useEffect,
} from "react";
import { useRouter } from "next/navigation";
import { geoMercator, geoPath } from "d3-geo";
import { feature, mesh } from "topojson-client";
import type { ISICompositeCountry } from "@/lib/types";
import {
  formatScore,
  classificationLabel,
  classifyScore,
  deviationFromMean,
  countryHref,
} from "@/lib/format";

/* ─── Color scale ────────────────────────────────────────────────── */

function scoreColor(score: number | null | undefined): string {
  if (score === null || score === undefined) return "#e5e7eb";
  if (score < 0.15) return "#e2e8f0";
  if (score < 0.25) return "#94a3b8";
  if (score < 0.5) return "#475569";
  return "#0f172a";
}

const LEGEND_ITEMS = [
  { color: "#e2e8f0", label: "< 0.15" },
  { color: "#94a3b8", label: "0.15\u20130.24" },
  { color: "#475569", label: "0.25\u20130.49" },
  { color: "#0f172a", label: "\u2265 0.50" },
  { color: "#e5e7eb", label: "No data" },
];

/* ─── ISO alias map (EU "EL" = ISO "GR", etc.) ──────────────────── */

const ISO2_ALIAS: Record<string, string> = { EL: "GR", UK: "GB" };

function normalize2(code: string): string {
  const u = code.toUpperCase().trim();
  return ISO2_ALIAS[u] ?? u;
}

/* ─── Types ──────────────────────────────────────────────────────── */

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

interface DiagInfo {
  objectKey: string;
  featureCount: number;
  matchedCount: number;
  unmatchedFeatures: string[];
  isiSample: string[];
}

/* ─── Resolve a GeoJSON feature to an ISO-2 code ────────────────── */

function resolveFeatureCode(f: GeoJSON.Feature): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = (f.properties ?? {}) as Record<string, any>;

  // Try standard ISO-2 properties
  for (const key of ["ISO_A2", "ISO2", "iso2", "iso_a2", "ISO_A2_EH"]) {
    const v = p[key];
    if (typeof v === "string" && v.length === 2 && v !== "-1" && v !== "-99") {
      return normalize2(v);
    }
  }

  // Try ADM0_A3 / ISO3 — take first 2 chars is wrong; instead keep full for name lookup
  for (const key of ["ADM0_A3", "ISO3", "ISO_A3", "iso3"]) {
    const v = p[key];
    if (typeof v === "string" && v.length >= 2) {
      return v.toUpperCase();
    }
  }

  // Try feature id
  if (typeof f.id === "string" && f.id.length >= 2) {
    return f.id.toUpperCase();
  }

  return "";
}

function resolveFeatureName(f: GeoJSON.Feature): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = (f.properties ?? {}) as Record<string, any>;
  for (const key of ["NAME", "name", "NAME_EN", "name_en", "ADMIN", "admin"]) {
    const v = p[key];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return resolveFeatureCode(f);
}

/* ─── Build a multi-strategy lookup from ISI countries ───────────── */

function buildISILookup(countries: ISICompositeCountry[]) {
  const byCode = new Map<string, ISICompositeCountry>();
  const byName = new Map<string, ISICompositeCountry>();

  for (const c of countries) {
    // The `country` field from the backend is the identifier — could be ISO-2
    const code = normalize2(c.country);
    byCode.set(code, c);

    // Also index by ASCII-folded name for fallback
    const folded = c.country_name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
    byName.set(folded, c);
  }

  return { byCode, byName };
}

function lookupCountry(
  code: string,
  name: string,
  byCode: Map<string, ISICompositeCountry>,
  byName: Map<string, ISICompositeCountry>,
): ISICompositeCountry | undefined {
  // Direct code match
  const norm = normalize2(code);
  const direct = byCode.get(norm);
  if (direct) return direct;

  // Name match
  const folded = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  return byName.get(folded);
}

/* ─── Component ──────────────────────────────────────────────────── */

export default function EUMap({ countries, mean }: EUMapProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [topo, setTopo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [size, setSize] = useState({ width: 960, height: 540 });

  /* Responsive sizing */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) setSize({ width: w, height: h });
    };
    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ISI lookup maps */
  const { byCode, byName } = useMemo(() => buildISILookup(countries), [countries]);

  /* Load TopoJSON */
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

  /* Convert TopoJSON → GeoJSON, build projection + path + mesh */
  const computed = useMemo(() => {
    if (!topo || !topo.objects) return null;

    const objectKey = Object.keys(topo.objects)[0];
    if (!objectKey) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const topoObj = topo.objects[objectKey] as any;

    // feature() returns FeatureCollection for GeometryCollection objects
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const geo = feature(topo as any, topoObj) as unknown as GeoJSON.FeatureCollection;

    if (!geo || !geo.features || geo.features.length === 0) return null;

    const projection = geoMercator().fitSize([size.width, size.height], geo);
    const pathGen = geoPath(projection);

    // Internal borders via mesh — filter where a !== b for internal only
    let borderPath = "";
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const borders = mesh(topo as any, topoObj, (a: any, b: any) => a !== b);
      borderPath = pathGen(borders) || "";
    } catch {
      // mesh might fail on simplified topologies with no shared arcs — that's fine
      borderPath = "";
    }

    // Build diagnostics
    let matchedCount = 0;
    const unmatchedFeatures: string[] = [];

    for (const f of geo.features) {
      const code = resolveFeatureCode(f);
      const name = resolveFeatureName(f);
      const record = lookupCountry(code, name, byCode, byName);
      if (record) {
        matchedCount++;
      } else {
        unmatchedFeatures.push(`${code}/${name}`);
      }
    }

    const diag: DiagInfo = {
      objectKey,
      featureCount: geo.features.length,
      matchedCount,
      unmatchedFeatures: unmatchedFeatures.slice(0, 10),
      isiSample: countries.slice(0, 10).map((c) => `${c.country}/${c.country_name}`),
    };

    return { pathGen, features: geo.features, borderPath, diag };
  }, [topo, size, byCode, byName, countries]);

  /* Event handlers */
  const handleMouseMove = useCallback(
    (e: React.MouseEvent, code: string, name: string) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const record = lookupCountry(code, name, byCode, byName);
      const score = record?.isi_composite ?? null;
      setTooltip({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top - 12,
        name,
        score,
        deviation: deviationFromMean(score, mean),
      });
    },
    [byCode, byName, mean],
  );

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  const handleClick = useCallback(
    (code: string, name: string) => {
      const record = lookupCountry(code, name, byCode, byName);
      if (record) router.push(countryHref(record.country));
    },
    [byCode, byName, router],
  );

  /* Render */

  if (error) {
    return (
      <div className="flex aspect-[16/9] w-full items-center justify-center rounded-lg border border-gray-200 text-sm text-gray-400">
        {error}
      </div>
    );
  }

  if (!computed) {
    return (
      <div className="flex aspect-[16/9] w-full items-center justify-center rounded-lg border border-gray-200 text-sm text-gray-400">
        Loading map&hellip;
      </div>
    );
  }

  const { pathGen, features, borderPath, diag } = computed;

  return (
    <div className="space-y-4">
      <div
        ref={containerRef}
        className="relative w-full aspect-[16/9] overflow-hidden rounded-lg border border-gray-200"
      >
        <svg
          viewBox={`0 0 ${size.width} ${size.height}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label="EU-27 ISI composite score choropleth map"
        >
          {/* Country fills */}
          {features.map((f, idx) => {
            const code = resolveFeatureCode(f);
            const name = resolveFeatureName(f);
            const record = lookupCountry(code, name, byCode, byName);
            const score = record?.isi_composite ?? null;
            const d = pathGen(f);
            if (!d) return null;

            return (
              <path
                key={code || idx}
                d={d}
                fill={scoreColor(score)}
                stroke="#cbd5e1"
                strokeWidth={0.5}
                className="cursor-pointer"
                onMouseMove={(e) => handleMouseMove(e, code, name)}
                onMouseLeave={handleMouseLeave}
                onClick={() => handleClick(code, name)}
                onMouseEnter={(e) => {
                  e.currentTarget.setAttribute("stroke", "#0f172a");
                  e.currentTarget.setAttribute("stroke-width", "1.5");
                }}
                onMouseOut={(e) => {
                  e.currentTarget.setAttribute("stroke", "#cbd5e1");
                  e.currentTarget.setAttribute("stroke-width", "0.5");
                }}
              />
            );
          })}

          {/* Internal borders overlay */}
          {borderPath && (
            <path
              d={borderPath}
              fill="none"
              stroke="#94a3b8"
              strokeWidth={0.75}
              strokeLinejoin="round"
              pointerEvents="none"
            />
          )}
        </svg>

        {/* Tooltip */}
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

      {/* Dev-only diagnostics */}
      {process.env.NODE_ENV !== "production" && (
        <details className="mt-4 rounded border border-amber-300 bg-amber-50 p-3 text-xs">
          <summary className="cursor-pointer font-medium text-amber-800">
            Map Diagnostics (dev only)
          </summary>
          <div className="mt-2 space-y-1 text-amber-900">
            <p>Topo object key: <code>{diag.objectKey}</code></p>
            <p>Features rendered: <strong>{diag.featureCount}</strong></p>
            <p>Features matched to ISI: <strong>{diag.matchedCount}</strong> / {diag.featureCount}</p>
            {diag.unmatchedFeatures.length > 0 && (
              <div>
                <p className="font-medium">Unmatched features (code/name):</p>
                <ul className="ml-4 list-disc">
                  {diag.unmatchedFeatures.map((u) => (
                    <li key={u}>{u}</li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <p className="font-medium">ISI records sample (code/name):</p>
              <ul className="ml-4 list-disc">
                {diag.isiSample.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          </div>
        </details>
      )}
    </div>
  );
}
