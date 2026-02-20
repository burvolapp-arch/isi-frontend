"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { RadarChart } from "@/components/RadarChart";
import { StatusBadge } from "@/components/StatusBadge";
import {
  fetchScenario,
  ApiError,
  classifyFetchError,
  type FailureKind,
} from "@/lib/api";
import {
  classificationLabel,
  classifyScore,
} from "@/lib/format";
import {
  normalizeAxisKey,
  ALL_AXIS_SLUGS,
  type AxisSlug,
} from "@/lib/axisRegistry";
import { formatAxisLabel, formatScore, formatDelta } from "@/lib/presentation";
import type {
  CountryDetail,
  ScenarioResponse,
  ScoreClassification,
} from "@/lib/types";

// ═══════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════

const SHIFT_OPTIONS = [-0.20, -0.10, -0.05, 0, 0.05, 0.10, 0.20] as const;

const SHIFT_LABELS: Record<number, string> = {
  [-0.20]: "−20%",
  [-0.10]: "−10%",
  [-0.05]: "−5%",
  [0]: "Base",
  [0.05]: "+5%",
  [0.10]: "+10%",
  [0.20]: "+20%",
};

const DEBOUNCE_MS = 100;
const RETRY_DELAYS = [800, 2400] as const;
const MAX_AUTO_RETRIES = 2;
const MAX_TIMELINE_ENTRIES = 10;

// ═══════════════════════════════════════════════════════════════════════
// Structural Shock Presets
// ═══════════════════════════════════════════════════════════════════════

interface StructuralPreset {
  id: string;
  label: string;
  description: string;
  adjustments: Partial<Record<AxisSlug, number>>;
}

const STRUCTURAL_PRESETS: StructuralPreset[] = [
  {
    id: "energy-diversification",
    label: "Energy Diversification",
    description: "−15% energy concentration",
    adjustments: { energy: -0.15 },
  },
  {
    id: "defense-reindustrialization",
    label: "Defense Reindustrialization",
    description: "−20% defense concentration",
    adjustments: { defense: -0.20 },
  },
  {
    id: "logistics-disruption",
    label: "Logistics Disruption",
    description: "+20% logistics concentration",
    adjustments: { logistics: 0.20 },
  },
  {
    id: "technology-decoupling",
    label: "Technology Decoupling",
    description: "+15% tech concentration",
    adjustments: { technology: 0.15 },
  },
  {
    id: "financial-fragmentation",
    label: "Financial Fragmentation",
    description: "+10% financial concentration",
    adjustments: { financial: 0.10 },
  },
];

// ═══════════════════════════════════════════════════════════════════════
// State Machine
// ═══════════════════════════════════════════════════════════════════════

type ScenarioState =
  | { status: "IDLE" }
  | { status: "COMPUTING" }
  | { status: "RETRYING" }
  | { status: "SUCCESS"; data: ScenarioResponse }
  | { status: "SERVICE_DOWN"; cached: ScenarioResponse | null }
  | { status: "ERROR"; cached: ScenarioResponse | null };

function getScenarioData(state: ScenarioState): ScenarioResponse | null {
  return state.status === "SUCCESS" ? state.data : null;
}

function getCachedData(state: ScenarioState): ScenarioResponse | null {
  if (state.status === "SERVICE_DOWN" || state.status === "ERROR") {
    return state.cached;
  }
  return null;
}

type ServiceState = "IDLE" | "COMPUTING" | "SUCCESS" | "RETRYING" | "SERVICE_DOWN" | "ERROR";
function getServiceStatus(state: ScenarioState): ServiceState {
  return state.status;
}

// ═══════════════════════════════════════════════════════════════════════
// Runtime Validation
// ═══════════════════════════════════════════════════════════════════════

function isFiniteOrNull(v: unknown): v is number | null {
  return v === null || (typeof v === "number" && Number.isFinite(v));
}
function isStringOrNull(v: unknown): v is string | null {
  return v === null || typeof v === "string";
}
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}
function isValidAggregate(a: unknown): boolean {
  if (!isPlainObject(a)) return false;
  return (
    isFiniteOrNull(a.composite) &&
    isFiniteOrNull(a.rank) &&
    isStringOrNull(a.classification) &&
    isPlainObject(a.axes)
  );
}
function isValidDelta(d: unknown): boolean {
  if (!isPlainObject(d)) return false;
  return (
    isFiniteOrNull(d.composite) &&
    isFiniteOrNull(d.rank) &&
    isPlainObject(d.axes)
  );
}
function isValidScenarioResponse(r: unknown): r is ScenarioResponse {
  if (r == null || typeof r !== "object") return false;
  const resp = r as Record<string, unknown>;
  return (
    typeof resp.country === "string" &&
    isValidAggregate(resp.baseline) &&
    isValidAggregate(resp.simulated) &&
    isValidDelta(resp.delta)
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════

const _loggedErrors = new Set<string>();
const _isDev = typeof process !== "undefined" && process.env?.NODE_ENV !== "production";
function logOnce(key: string, ...args: unknown[]) {
  if (!_isDev || _loggedErrors.has(key)) return;
  _loggedErrors.add(key);
  console.error("[ISI Scenario]", ...args);
}

function classifyErrorLocal(err: unknown): FailureKind {
  return classifyFetchError(err);
}

// ═══════════════════════════════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════════════════════════════

interface TimelineEntry {
  id: string;
  timestamp: string;
  adjustments: Record<string, number>;
  composite: number | null;
  rank: number | null;
  classification: ScoreClassification | null;
  presetLabel: string | null;
}

interface ScenarioLaboratoryProps {
  country: CountryDetail;
  baselineRank: number | null;
  totalRanked: number;
}

// ═══════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════

export function ScenarioLaboratory({
  country,
  baselineRank,
  totalRanked,
}: ScenarioLaboratoryProps) {
  const searchParams = useSearchParams();
  const code = country.country;

  // ── Scenario state ──
  const [scenarioState, setScenarioState] = useState<ScenarioState>({ status: "IDLE" });
  const [failureTimestamp, setFailureTimestamp] = useState<string | null>(null);
  const [failureStatus, setFailureStatus] = useState<number | null>(null);
  const [failureMessage, setFailureMessage] = useState<string | null>(null);

  const scenario = getScenarioData(scenarioState);
  const serviceState = getServiceStatus(scenarioState);
  const showingCached = getCachedData(scenarioState) !== null;

  // ── Adjustments state ──
  const [adjustments, setAdjustments] = useState<Record<AxisSlug, number>>(() => {
    const init: Record<string, number> = {};
    for (const slug of ALL_AXIS_SLUGS) init[slug] = 0;          // default ALL to 0
    for (const slug of ALL_AXIS_SLUGS) {
      const param = searchParams.get(slug);
      if (param !== null) {
        const val = parseFloat(param);
        if (!isNaN(val) && val >= -0.30 && val <= 0.30) init[slug] = val;
      }
    }
    return init as Record<AxisSlug, number>;
  });

  const lastSuccessRef = useRef<ScenarioResponse | null>(null);
  const [activePresetLabel, setActivePresetLabel] = useState<string | null>(null);

  // ── Timeline ──
  const [timeline, setTimeline] = useState<TimelineEntry[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = sessionStorage.getItem(`isi-timeline-${code}`);
      if (stored) {
        const parsed = JSON.parse(stored) as TimelineEntry[];
        return Array.isArray(parsed) ? parsed.slice(0, MAX_TIMELINE_ENTRIES) : [];
      }
    } catch { /* ignore */ }
    return [];
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Persist timeline ──
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      sessionStorage.setItem(`isi-timeline-${code}`, JSON.stringify(timeline));
    } catch { /* quota exceeded */ }
  }, [timeline, code]);

  // ── Derived ──
  const baselineRadarAxes = useMemo(
    () => country.axes.map((a) => ({ slug: a.axis_slug, value: a.score })),
    [country],
  );

  const activeAdjustments = useMemo(() => {
    const active: Record<string, number> = {};
    for (const [slug, val] of Object.entries(adjustments)) {
      if (val !== 0) active[slug] = val;
    }
    return active;
  }, [adjustments]);

  const hasAdjustments = Object.keys(activeAdjustments).length > 0;

  const controlsLocked =
    serviceState === "SERVICE_DOWN" ||
    serviceState === "RETRYING" ||
    serviceState === "COMPUTING";

  // ── URL sync (lightweight — bypasses Next.js router) ──
  const urlRafRef = useRef(0);
  useEffect(() => {
    cancelAnimationFrame(urlRafRef.current);
    urlRafRef.current = requestAnimationFrame(() => {
      const qp = new URLSearchParams();
      for (const [slug, val] of Object.entries(adjustments)) {
        if (val !== 0) qp.set(slug, val.toFixed(2));
      }
      const qs = qp.toString();
      const newPath = `/country/${code.toLowerCase()}${qs ? `?${qs}` : ""}`;
      window.history.replaceState(null, "", newPath);
    });
    return () => cancelAnimationFrame(urlRafRef.current);
  }, [adjustments, code]);

  // ── Core fetch with retry ──
  const executeScenarioRequest = useCallback(
    async (adj: Record<string, number>, isRetry: boolean) => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setScenarioState(isRetry ? { status: "RETRYING" } : { status: "COMPUTING" });

      try {
        const result = await fetchScenario(code, adj, controller.signal);
        if (controller.signal.aborted) return;

        if (!isValidScenarioResponse(result)) {
          logOnce("invalid-response", "Response failed validation", result);
          setScenarioState({ status: "ERROR", cached: lastSuccessRef.current });
          setFailureTimestamp(new Date().toISOString());
          setFailureStatus(null);
          setFailureMessage("Response validation failed.");
          return;
        }

        lastSuccessRef.current = result;
        retryCountRef.current = 0;
        // Batch all state updates together
        setScenarioState({ status: "SUCCESS", data: result });
        setFailureTimestamp(null);
        setFailureStatus(null);
        setFailureMessage(null);

        setTimeline((prev) => {
          const entry: TimelineEntry = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: new Date().toISOString(),
            adjustments: { ...adj },
            composite: result.simulated?.composite ?? null,
            rank: result.simulated?.rank ?? null,
            classification: (result.simulated?.classification as ScoreClassification) ?? null,
            presetLabel: activePresetLabel,
          };
          return [entry, ...prev].slice(0, MAX_TIMELINE_ENTRIES);
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        const kind = classifyErrorLocal(err);
        const httpStatus = err instanceof ApiError ? err.status : null;
        logOnce(`${kind}-${httpStatus}`, `${kind}: status=${httpStatus ?? "N/A"}`);
        setFailureTimestamp(new Date().toISOString());
        setFailureStatus(httpStatus);
        setFailureMessage(err instanceof ApiError && err.body ? err.body : null);

        if (kind === "ROUTE_MISSING" || kind === "BAD_INPUT" || kind === "TRANSPORT_LAYER_BLOCKED") {
          if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
          retryCountRef.current = MAX_AUTO_RETRIES;
          const failStatus = kind === "BAD_INPUT" || kind === "ROUTE_MISSING" ? "ERROR" : "SERVICE_DOWN";
          setScenarioState({ status: failStatus as "ERROR" | "SERVICE_DOWN", cached: lastSuccessRef.current });
          return;
        }

        if (httpStatus === 500 || httpStatus === 502) {
          if (retryCountRef.current < MAX_AUTO_RETRIES) {
            const delay = RETRY_DELAYS[retryCountRef.current] ?? 2400;
            retryCountRef.current += 1;
            retryTimerRef.current = setTimeout(() => executeScenarioRequest(adj, true), delay);
            return;
          }
          setScenarioState({ status: "SERVICE_DOWN", cached: lastSuccessRef.current });
          return;
        }

        setScenarioState({ status: "ERROR", cached: lastSuccessRef.current });
      }
    },
    [code, activePresetLabel],
  );

  // ── Debounced trigger ──
  const runScenario = useCallback(
    (adj: Record<string, number>) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (abortRef.current) abortRef.current.abort();
      retryCountRef.current = 0;

      if (Object.keys(adj).length === 0) {
        setScenarioState({ status: "IDLE" });
        setFailureTimestamp(null);
        setFailureStatus(null);
        return;
      }

      debounceRef.current = setTimeout(() => executeScenarioRequest(adj, false), DEBOUNCE_MS);
    },
    [executeScenarioRequest],
  );

  useEffect(() => { runScenario(activeAdjustments); }, [activeAdjustments, runScenario]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  // ── Actions ──
  const retrySimulation = useCallback(() => {
    retryCountRef.current = 0;
    setScenarioState({ status: "IDLE" });
    setFailureTimestamp(null);
    setFailureStatus(null);
    setFailureMessage(null);
    if (hasAdjustments) executeScenarioRequest(activeAdjustments, false);
  }, [hasAdjustments, activeAdjustments, executeScenarioRequest]);

  const setAxisAdjustment = useCallback((slug: AxisSlug, value: number) => {
    setAdjustments((prev) => ({ ...prev, [slug]: value }));
    setActivePresetLabel(null);
  }, []);

  const applyPreset = useCallback((preset: StructuralPreset) => {
    const next: Record<string, number> = {};
    for (const slug of ALL_AXIS_SLUGS) next[slug] = 0;
    for (const [slug, val] of Object.entries(preset.adjustments)) next[slug] = val;
    setAdjustments(next as Record<AxisSlug, number>);
    setActivePresetLabel(preset.label);
  }, []);

  const resetToBaseline = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    if (abortRef.current) abortRef.current.abort();
    retryCountRef.current = 0;
    const reset: Record<string, number> = {};
    for (const slug of ALL_AXIS_SLUGS) reset[slug] = 0;
    setAdjustments(reset as Record<AxisSlug, number>);
    setScenarioState({ status: "IDLE" });
    setFailureTimestamp(null);
    setFailureStatus(null);
    setFailureMessage(null);
    setActivePresetLabel(null);
  }, []);

  const restoreTimelineEntry = useCallback((entry: TimelineEntry) => {
    const next: Record<string, number> = {};
    for (const slug of ALL_AXIS_SLUGS) next[slug] = entry.adjustments[slug] ?? 0;
    setAdjustments(next as Record<AxisSlug, number>);
    setActivePresetLabel(entry.presetLabel);
  }, []);

  // ── Derived data ──
  const simulatedRadarAxes = useMemo(() => {
    if (!scenario?.simulated?.axes) return null;
    return Object.entries(scenario.simulated.axes).map(([key, score]) => ({
      slug: normalizeAxisKey(key) ?? key,
      value: score,
    }));
  }, [scenario]);

  const classificationChanged = useMemo(() => {
    if (!scenario) return false;
    return (
      scenario.simulated.classification !== null &&
      country.isi_classification !== null &&
      scenario.simulated.classification !== country.isi_classification
    );
  }, [country, scenario]);

  // Dev-only: warn when backend classification doesn't match composite score
  useEffect(() => {
    if (!_isDev || !scenario?.simulated) return;
    const comp = scenario.simulated.composite;
    const cls = scenario.simulated.classification;
    if (comp == null || cls == null) return;
    const expected = classifyScore(comp);
    if (expected !== cls) {
      console.warn(
        `[ISI Scenario] Backend classification mismatch: composite=${comp.toFixed(4)} ` +
        `should be "${expected}" but backend returned "${cls}". ` +
        `This is a backend bug — the frontend displays the backend value faithfully.`
      );
    }
  }, [scenario]);

  const decomposition = useMemo(() => {
    if (!scenario?.delta?.axes) return null;
    const items = Object.entries(scenario.delta.axes)
      .filter(([, d]) => d != null && d !== 0)
      .map(([slug, d]) => ({ slug, label: formatAxisLabel(slug), delta: d }));
    return items.length === 0 ? null : items;
  }, [scenario]);

  const maxAbsDelta = useMemo(() => {
    if (!decomposition) return 0;
    return Math.max(...decomposition.map((d) => Math.abs(d.delta)), 0.0001);
  }, [decomposition]);

  const exportSnapshot = useCallback(() => {
    if (!scenario) return;
    const snapshot = {
      country: country.country,
      baseline: { composite: scenario.baseline.composite, classification: scenario.baseline.classification, rank: scenario.baseline.rank ?? baselineRank, axes: scenario.baseline.axes },
      simulated: { composite: scenario.simulated.composite, classification: scenario.simulated.classification, rank: scenario.simulated.rank, axes: scenario.simulated.axes },
      delta: { composite: scenario.delta.composite, rank: scenario.delta.rank, axes: scenario.delta.axes },
      adjustments: activeAdjustments,
      timestamp: new Date().toISOString(),
      version: "2.0",
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `isi-simulation-${country.country.toLowerCase()}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [scenario, country, baselineRank, activeAdjustments]);

  const showSimulated = hasAdjustments && scenario !== null && serviceState === "SUCCESS";

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════

  // ── Contribution summary helpers ──
  const mainDriver = decomposition
    ? [...decomposition].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0] ?? null
    : null;
  const offsetting = decomposition && decomposition.length > 1
    ? [...decomposition]
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
        .find((d) => mainDriver && Math.sign(d.delta) !== Math.sign(mainDriver.delta)) ?? null
    : null;

  return (
    <div className="mt-6 space-y-6">

      {/* ═══ 1. RESULTS SUMMARY ═══ */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Composite */}
        <div className="rounded border border-border-primary bg-surface-tertiary px-4 py-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
            {showSimulated ? "Simulated Composite" : "Baseline Composite"}
          </p>
          <p className="mt-1 font-mono text-[24px] font-medium leading-none tracking-tight text-text-primary">
            {showSimulated
              ? formatScore(scenario.simulated.composite)
              : formatScore(country.isi_composite)}
          </p>
        </div>

        {/* Delta */}
        <div className="rounded border border-border-primary bg-surface-tertiary px-4 py-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
            Delta vs. Baseline
          </p>
          {showSimulated && scenario.delta.composite != null ? (
            <p
              className={`mt-1 font-mono text-[20px] font-medium leading-none tracking-tight ${
                scenario.delta.composite > 0
                  ? "text-deviation-positive"
                  : scenario.delta.composite < 0
                    ? "text-deviation-negative"
                    : "text-text-primary"
              }`}
            >
              {formatDelta(scenario.delta.composite)}
            </p>
          ) : (
            <p className="mt-1 font-mono text-[20px] font-medium leading-none tracking-tight text-text-quaternary">—</p>
          )}
        </div>

        {/* Rank */}
        <div className="rounded border border-border-primary bg-surface-tertiary px-4 py-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
            {showSimulated ? "Simulated Rank" : "Baseline Rank"}
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="font-mono text-[20px] font-medium leading-none tracking-tight text-text-primary">
              {showSimulated && scenario.simulated.rank != null
                ? `${scenario.simulated.rank} / ${totalRanked}`
                : baselineRank != null
                  ? `${baselineRank} / ${totalRanked}`
                  : "—"}
            </p>
            {showSimulated && (() => {
              const base = scenario.baseline.rank ?? baselineRank;
              const sim = scenario.simulated.rank;
              if (base == null || sim == null || base === sim) return null;
              const shift = base - sim;
              // shift > 0 → sim rank is numerically lower → MORE concentrated → BAD (red)
              // shift < 0 → sim rank is numerically higher → LESS concentrated → GOOD (green)
              return (
                <span className={`font-mono text-[13px] font-medium ${shift > 0 ? "text-deviation-positive" : "text-deviation-negative"}`}>
                  {shift > 0 ? "↑" : "↓"}{Math.abs(shift)}
                </span>
              );
            })()}
          </div>
        </div>

        {/* Classification */}
        <div className={`rounded border px-4 py-3 ${
          classificationChanged
            ? "border-l-2 border-l-accent border-border-primary bg-surface-tertiary"
            : "border-border-primary bg-surface-tertiary"
        }`}>
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
            {showSimulated ? "Simulated Class." : "Baseline Class."}
          </p>
          <div className="mt-1.5">
            <StatusBadge
              classification={
                showSimulated
                  ? (scenario.simulated.classification as ScoreClassification | null)
                  : country.isi_classification
              }
            />
          </div>
          {classificationChanged && (
            <div className="mt-2 flex items-center gap-2 text-[11px]">
              <span className="text-text-quaternary">
                {classificationLabel(country.isi_classification)}
              </span>
              <span className="text-text-quaternary" aria-hidden="true">→</span>
              <span className="font-medium text-text-secondary">
                {classificationLabel(
                  (scenario?.simulated.classification as ScoreClassification) ?? null
                )}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Per-axis results (compact) — always visible */}
      <section className="rounded border border-border-primary bg-surface-tertiary px-4 py-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
          {showSimulated ? "Per-Axis Results" : "Baseline Per-Axis Scores"}
        </p>
        <div className="mt-2 space-y-1">
          {showSimulated && scenario.simulated.axes
            ? Object.entries(scenario.simulated.axes).map(([slug, simScore]) => {
                const baseScore = scenario.baseline.axes[slug] ?? null;
                const axisDelta = scenario.delta.axes[slug] ?? null;
                return (
                  <div key={slug} className="flex items-center justify-between text-[12px]">
                    <span className="text-text-secondary">{formatAxisLabel(slug)}</span>
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="text-text-quaternary">{formatScore(baseScore)}</span>
                      <span className="text-text-quaternary">→</span>
                      <span className="text-text-primary">{formatScore(simScore)}</span>
                      {axisDelta != null && axisDelta !== 0 && (
                        <span className={axisDelta > 0 ? "text-deviation-positive" : "text-deviation-negative"}>
                          {formatDelta(axisDelta)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            : country.axes.map((axis) => (
                <div key={axis.axis_slug} className="flex items-center justify-between text-[12px]">
                  <span className="text-text-secondary">{formatAxisLabel(axis.axis_slug)}</span>
                  <span className="font-mono text-[11px] text-text-primary">{formatScore(axis.score)}</span>
                </div>
              ))
          }
        </div>
      </section>

      {/* ═══ 2. STRUCTURAL SHOCK PRESETS ═══ */}
      <section>
        <h3 className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-quaternary">
          Structural Shock Presets
        </h3>
        {activePresetLabel && (
          <p className="mt-1 text-[12px] text-text-tertiary">
            Active Simulation:{" "}
            <span className="font-medium text-text-secondary">{activePresetLabel}</span>
            {(() => {
              const preset = STRUCTURAL_PRESETS.find((p) => p.label === activePresetLabel);
              return preset ? (
                <span className="ml-1 text-text-quaternary">({preset.description})</span>
              ) : null;
            })()}
          </p>
        )}
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {STRUCTURAL_PRESETS.map((preset) => {
            const isActive = activePresetLabel === preset.label;
            return (
              <button
                key={preset.id}
                type="button"
                disabled={controlsLocked}
                onClick={() => applyPreset(preset)}
                title={preset.description}
                className={`
                  rounded border px-2.5 py-1.5 text-[11px] font-medium
                  focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-navy-700
                  disabled:opacity-40 disabled:cursor-not-allowed
                  ${isActive
                    ? "border-navy-700 bg-navy-700 text-white"
                    : "border-border-primary bg-white text-text-secondary hover:bg-stone-50"
                  }
                `}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* ═══ 3. AXIS-LEVEL ADJUSTMENTS ═══ */}
      <section>
        <h3 className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-quaternary">
          Axis-Level Adjustments
        </h3>
        <div className="mt-2.5 space-y-1.5">
          {country.axes.map((axis) => {
            const slug = axis.axis_slug as AxisSlug;
            const currentAdj = adjustments[slug] ?? 0;
            return (
              <div
                key={slug}
                className={`rounded border border-border-primary px-3 py-2 ${
                  controlsLocked ? "bg-stone-50 opacity-70" : "bg-surface-tertiary"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 shrink-0">
                    <p className="text-[12px] font-medium text-text-secondary">
                      {formatAxisLabel(slug)}
                    </p>
                    <p className="font-mono text-[11px] text-text-quaternary">
                      Baseline: {formatScore(axis.score)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    {SHIFT_OPTIONS.map((shift) => {
                      const isActive = currentAdj === shift;
                      const isBase = shift === 0;
                      return (
                        <button
                          key={shift}
                          type="button"
                          disabled={controlsLocked}
                          onClick={() => setAxisAdjustment(slug, shift)}
                          aria-label={`Set ${formatAxisLabel(slug)} to ${SHIFT_LABELS[shift]}`}
                          aria-pressed={isActive}
                          className={`
                            w-[42px] rounded px-1 py-0.5 text-center font-mono text-[10px] font-medium whitespace-nowrap
                            focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-navy-700
                            disabled:opacity-40 disabled:cursor-not-allowed
                            ${isActive
                              ? isBase
                                ? "bg-stone-700 text-white"
                                : "bg-navy-700 text-white"
                              : "border border-border-primary bg-white text-text-tertiary hover:bg-stone-50"
                            }
                          `}
                        >
                          {SHIFT_LABELS[shift]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══ 4. ACTIONS ═══ */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={resetToBaseline}
          disabled={(!hasAdjustments && serviceState === "IDLE") || serviceState === "COMPUTING"}
          className="rounded border border-border-primary bg-white px-3.5 py-1.5 text-[12px] font-medium text-text-secondary hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-navy-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Reset to Baseline
        </button>
        {(serviceState === "SERVICE_DOWN" || serviceState === "ERROR") && (
          <button
            type="button"
            onClick={retrySimulation}
            className="rounded border border-border-primary bg-white px-3.5 py-1.5 text-[12px] font-medium text-text-secondary hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-navy-700"
          >
            Retry
          </button>
        )}
        {showSimulated && (
          <button
            type="button"
            onClick={exportSnapshot}
            className="rounded border border-border-primary bg-white px-3.5 py-1.5 text-[12px] font-medium text-text-secondary hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-navy-700"
          >
            Export JSON
          </button>
        )}
        {(serviceState === "COMPUTING" || serviceState === "RETRYING") && (
          <span className="text-[11px] text-text-quaternary">
            {serviceState === "RETRYING" ? "Retrying…" : "Computing…"}
          </span>
        )}
      </div>

      {/* ═══ FAILURE PANEL ═══ */}
      {(serviceState === "SERVICE_DOWN" || serviceState === "ERROR") && (
        <div role="alert" className="rounded border border-stone-200 bg-stone-50 px-4 py-3">
          <p className="text-[13px] font-medium text-stone-600">
            {failureStatus === 404
              ? "Country not available for simulation."
              : failureStatus === 400
                ? (failureMessage || "Invalid input parameters.")
                : (failureStatus === 500 || failureStatus === 502)
                  ? "Simulation service temporarily unavailable."
                  : failureStatus === null
                    ? "Network connection error."
                    : "Simulation error."}
          </p>
          {showingCached && (
            <p className="mt-1.5 text-[11px] text-stone-500">
              Displaying last successful result.
            </p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={retrySimulation}
              className="rounded border border-stone-300 bg-white px-3 py-1 text-[11px] font-medium text-stone-600 hover:bg-stone-50"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={resetToBaseline}
              className="rounded border border-stone-300 bg-white px-3 py-1 text-[11px] font-medium text-stone-600 hover:bg-stone-50"
            >
              Reset
            </button>
          </div>
          <details className="mt-2">
            <summary className="cursor-pointer text-[10px] text-stone-400 hover:text-stone-500">
              Technical details
            </summary>
            <div className="mt-1 font-mono text-[10px] text-stone-400">
              <p>HTTP: {failureStatus ?? "N/A"} · {failureTimestamp ?? new Date().toISOString()}</p>
            </div>
          </details>
        </div>
      )}

      {/* ═══ 5. RADAR + CONTRIBUTION BREAKDOWN ═══ */}
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        {/* Radar Chart */}
        <div className="relative flex flex-col overflow-hidden rounded-lg bg-[#070e1a] px-4 py-4 sm:px-5 sm:py-5 ring-1 ring-white/[0.06]">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
            {showSimulated ? "Baseline vs. Simulated" : "Baseline Profile"}
          </p>
          {activePresetLabel && showSimulated && (
            <p className="mt-0.5 text-[10px] text-slate-600">{activePresetLabel}</p>
          )}
          <div className="mt-2 w-full">
            {showSimulated && simulatedRadarAxes ? (
              <RadarChart
                axes={simulatedRadarAxes}
                compareAxes={baselineRadarAxes}
                compareLabel="Baseline"
                label="Simulated"
              />
            ) : (
              <RadarChart axes={baselineRadarAxes} label={country.country_name} />
            )}
          </div>
        </div>

        {/* Contribution Breakdown */}
        {showSimulated && decomposition ? (
          <div className="rounded border border-border-primary px-4 py-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
              Contribution Breakdown
            </p>
            {scenario.delta.composite != null && (
              <p className="mt-1.5 font-mono text-[13px] font-medium text-text-primary">
                Composite Δ:{" "}
                <span className={
                  scenario.delta.composite > 0
                    ? "text-deviation-positive"
                    : scenario.delta.composite < 0
                      ? "text-deviation-negative"
                      : ""
                }>
                  {formatDelta(scenario.delta.composite)}
                </span>
              </p>
            )}
            {/* Main driver / offsetting summary */}
            {mainDriver && (
              <p className="mt-1 text-[11px] text-text-tertiary">
                Main driver: <span className="font-medium text-text-secondary">{mainDriver.label}</span>
                {" "}({formatDelta(mainDriver.delta)})
                {offsetting && (
                  <>
                    {" · "}Offsetting: <span className="font-medium text-text-secondary">{offsetting.label}</span>
                    {" "}({formatDelta(offsetting.delta)})
                  </>
                )}
              </p>
            )}
            <div className="mt-3 space-y-1">
              {decomposition.map((item) => {
                const pct = (Math.abs(item.delta) / maxAbsDelta) * 100;
                const isPositive = item.delta > 0;
                return (
                  <div key={item.slug} className="flex items-center gap-2.5">
                    <span className="w-24 shrink-0 text-[11px] font-medium text-text-secondary">
                      {item.label}
                    </span>
                    <div className="relative flex h-3 flex-1 items-center">
                      <div className="absolute inset-0 rounded bg-stone-100" />
                      <div
                        className={`relative h-full rounded ${isPositive ? "bg-stone-400" : "bg-stone-300"}`}
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                    <span className={`w-16 shrink-0 text-right font-mono text-[10px] font-medium ${
                      isPositive ? "text-deviation-positive" : "text-deviation-negative"
                    }`}>
                      {formatDelta(item.delta)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center rounded border border-border-primary px-4 py-8">
            <p className="text-[12px] text-text-quaternary">
              Apply adjustments to view contribution breakdown.
            </p>
          </div>
        )}
      </div>

      {/* ═══ 6. TIMELINE ═══ */}
      {timeline.length > 0 && (
        <section>
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
            Session Timeline
          </p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="border-b border-border-primary text-[10px] font-medium uppercase tracking-[0.1em] text-text-quaternary">
                  <th className="pb-1.5 pr-3">Time</th>
                  <th className="pb-1.5 pr-3">Composite</th>
                  <th className="pb-1.5 pr-3">Rank</th>
                  <th className="pb-1.5 pr-3">Classification</th>
                  <th className="pb-1.5 pr-3">Simulation</th>
                  <th className="pb-1.5" />
                </tr>
              </thead>
              <tbody>
                {timeline.map((entry) => (
                  <tr key={entry.id} className="border-b border-stone-100 text-text-secondary">
                    <td className="py-1.5 pr-3 font-mono text-[10px] text-text-quaternary">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-1.5 pr-3 font-mono">{formatScore(entry.composite)}</td>
                    <td className="py-1.5 pr-3 font-mono">{entry.rank ?? "—"}</td>
                    <td className="py-1.5 pr-3">
                      {entry.classification ? classificationLabel(entry.classification) : "—"}
                    </td>
                    <td className="py-1.5 pr-3 text-text-quaternary">
                      {entry.presetLabel ?? "Custom"}
                    </td>
                    <td className="py-1.5">
                      <button
                        type="button"
                        onClick={() => restoreTimelineEntry(entry)}
                        disabled={controlsLocked}
                        className="text-[10px] font-medium text-stone-500 hover:text-stone-700 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Restore
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ═══ Institutional Note ═══ */}
      <p className="text-[11px] leading-relaxed text-text-quaternary">
        Simulation results are computed server-side and reflect proportional adjustments
        to HHI concentration indices.
      </p>
    </div>
  );
}
