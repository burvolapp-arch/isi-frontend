"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { RadarChart } from "@/components/RadarChart";
import { StatusBadge } from "@/components/StatusBadge";
import { KPICard } from "@/components/KPICard";
import {
  fetchCountry,
  fetchISI,
  fetchScenario,
  ApiError,
  classifyFetchError,
  type FailureKind,
} from "@/lib/api";
import {
  formatScore,
  extractCompositeScores,
  computeRank,
  classificationLabel,
} from "@/lib/format";
import {
  getCanonicalAxisName,
  ALL_AXIS_SLUGS,
  type AxisSlug,
} from "@/lib/axisRegistry";
import type {
  CountryDetail,
  ISIComposite,
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

const DEBOUNCE_MS = 300;
const RETRY_DELAYS = [800, 2400] as const;
const MAX_AUTO_RETRIES = 2;
const MAX_TIMELINE_ENTRIES = 10;

// ═══════════════════════════════════════════════════════════════════════
// Structural Shock Presets
// ═══════════════════════════════════════════════════════════════════════

interface StructuralPreset {
  id: string;
  label: string;
  adjustments: Partial<Record<AxisSlug, number>>;
}

const STRUCTURAL_PRESETS: StructuralPreset[] = [
  {
    id: "energy-diversification",
    label: "Energy Supply Diversification (−15%)",
    adjustments: { energy: -0.15 },
  },
  {
    id: "defense-reindustrialization",
    label: "Defense Reindustrialization (−20%)",
    adjustments: { defense: -0.20 },
  },
  {
    id: "logistics-disruption",
    label: "Logistics Disruption (+20%)",
    adjustments: { logistics: 0.20 },
  },
  {
    id: "technology-decoupling",
    label: "Technology Decoupling (+15%)",
    adjustments: { technology: 0.15 },
  },
  {
    id: "financial-fragmentation",
    label: "Financial Fragmentation (+10%)",
    adjustments: { financial: 0.10 },
  },
];

// ═══════════════════════════════════════════════════════════════════════
// Sensitivity View Modes
// ═══════════════════════════════════════════════════════════════════════

type SensitivityView = "composite" | "rank" | "elasticity";

const SENSITIVITY_VIEW_LABELS: Record<SensitivityView, string> = {
  composite: "Composite Impact View",
  rank: "Rank Impact View",
  elasticity: "Axis Elasticity View",
};

// ═══════════════════════════════════════════════════════════════════════
// Timeline Entry
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

// ═══════════════════════════════════════════════════════════════════════
// Service State Machine
// ═══════════════════════════════════════════════════════════════════════

type ServiceState =
  | "IDLE"
  | "COMPUTING"
  | "SUCCESS"
  | "RETRYING"
  | "SERVICE_DOWN"
  | "ERROR";

// ═══════════════════════════════════════════════════════════════════════
// Deduplicated console logging
// ═══════════════════════════════════════════════════════════════════════

const _loggedErrors = new Set<string>();

function logOnce(key: string, ...args: unknown[]) {
  if (_loggedErrors.has(key)) return;
  _loggedErrors.add(key);
  console.error("[ISI Scenario]", ...args);
}

// ═══════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════

function classifyErrorLocal(err: unknown): FailureKind {
  return classifyFetchError(err);
}

/** Short domain label for decomposition bars */
function shortDomain(slug: string): string {
  const map: Record<string, string> = {
    financial: "Financial",
    energy: "Energy",
    technology: "Technology",
    defense: "Defense",
    critical_inputs: "Critical Inputs",
    logistics: "Logistics",
  };
  return map[slug] ?? slug;
}

// ═══════════════════════════════════════════════════════════════════════
// Page Component
// ═══════════════════════════════════════════════════════════════════════

export default function ScenarioPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const code = (params.code ?? "").toUpperCase();

  // ── Data state ──
  const [country, setCountry] = useState<CountryDetail | null>(null);
  const [isi, setISI] = useState<ISIComposite | null>(null);
  const [loadError, setLoadError] = useState<{
    message: string;
    status?: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Scenario state ──
  const [adjustments, setAdjustments] = useState<Record<AxisSlug, number>>(
    () => {
      const init: Record<string, number> = {};
      for (const slug of ALL_AXIS_SLUGS) {
        const param = searchParams.get(slug);
        if (param !== null) {
          const val = parseFloat(param);
          if (!isNaN(val) && val >= -0.30 && val <= 0.30) {
            init[slug] = val;
          }
        }
      }
      return init as Record<AxisSlug, number>;
    },
  );
  const [scenario, setScenario] = useState<ScenarioResponse | null>(null);
  const [serviceState, setServiceState] = useState<ServiceState>("IDLE");
  const [failureTimestamp, setFailureTimestamp] = useState<string | null>(null);
  const [failureStatus, setFailureStatus] = useState<number | null>(null);

  // ── In-memory cache ──
  const lastSuccessRef = useRef<ScenarioResponse | null>(null);
  const [showingCached, setShowingCached] = useState(false);

  // ── Preset tracking ──
  const [activePresetLabel, setActivePresetLabel] = useState<string | null>(
    null,
  );

  // ── Sensitivity view ──
  const [sensitivityView, setSensitivityView] =
    useState<SensitivityView>("composite");

  // ── Timeline ──
  const [timeline, setTimeline] = useState<TimelineEntry[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = sessionStorage.getItem(`isi-timeline-${code}`);
      if (stored) {
        const parsed = JSON.parse(stored) as TimelineEntry[];
        return Array.isArray(parsed) ? parsed.slice(0, MAX_TIMELINE_ENTRIES) : [];
      }
    } catch {
      // Ignore parse errors
    }
    return [];
  });

  // ── Refs ──
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Persist timeline to sessionStorage ──
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      sessionStorage.setItem(
        `isi-timeline-${code}`,
        JSON.stringify(timeline),
      );
    } catch {
      // Quota exceeded — silently ignore
    }
  }, [timeline, code]);

  // ── Initial data fetch ──
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [countryRes, isiRes] = await Promise.allSettled([
          fetchCountry(code),
          fetchISI(),
        ]);

        if (cancelled) return;

        if (countryRes.status === "fulfilled") {
          setCountry(countryRes.value);
        } else {
          setLoadError({
            message: "Country data is temporarily unavailable.",
            status:
              countryRes.reason instanceof ApiError
                ? countryRes.reason.status
                : undefined,
          });
        }

        if (isiRes.status === "fulfilled") {
          setISI(isiRes.value);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [code]);

  // ── Derived baseline data ──
  const allScores = useMemo(
    () => (isi ? extractCompositeScores(isi.countries) : []),
    [isi],
  );

  const baselineRank = useMemo(
    () =>
      country?.isi_composite != null && allScores.length > 0
        ? computeRank(country.isi_composite, allScores)
        : null,
    [country, allScores],
  );

  const totalRanked = allScores.length;

  const baselineRadarAxes = useMemo(
    () =>
      country?.axes.map((a) => ({ slug: a.axis_slug, value: a.score })) ?? [],
    [country],
  );

  // ── Active adjustments (non-zero only) ──
  const activeAdjustments = useMemo(() => {
    const active: Record<string, number> = {};
    for (const [slug, val] of Object.entries(adjustments)) {
      if (val !== 0) active[slug] = val;
    }
    return active;
  }, [adjustments]);

  const hasAdjustments = Object.keys(activeAdjustments).length > 0;

  // ── Controls locked ──
  const controlsLocked =
    serviceState === "SERVICE_DOWN" ||
    serviceState === "RETRYING" ||
    serviceState === "COMPUTING";

  // ── URL sync ──
  useEffect(() => {
    if (!country) return;

    const qp = new URLSearchParams();
    for (const [slug, val] of Object.entries(adjustments)) {
      if (val !== 0) {
        qp.set(slug, val.toFixed(2));
      }
    }

    const qs = qp.toString();
    const newPath = `/country/${code.toLowerCase()}/scenario${qs ? `?${qs}` : ""}`;
    router.replace(newPath, { scroll: false });
  }, [adjustments, code, country, router]);

  // ── Core scenario fetch with retry ──
  const executeScenarioRequest = useCallback(
    async (adj: Record<string, number>, isRetry: boolean) => {
      if (abortRef.current) abortRef.current.abort();

      const controller = new AbortController();
      abortRef.current = controller;

      setServiceState(isRetry ? "RETRYING" : "COMPUTING");
      setShowingCached(false);

      try {
        const result = await fetchScenario(
          { country: code, adjustments: adj },
          controller.signal,
        );

        if (controller.signal.aborted) return;

        setScenario(result);
        lastSuccessRef.current = result;
        setServiceState("SUCCESS");
        setShowingCached(false);
        setFailureTimestamp(null);
        setFailureStatus(null);
        retryCountRef.current = 0;

        // Add to timeline
        setTimeline((prev) => {
          const entry: TimelineEntry = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: new Date().toISOString(),
            adjustments: { ...adj },
            composite: result.simulated_composite,
            rank: result.simulated_rank,
            classification: result.simulated_classification,
            presetLabel: activePresetLabel,
          };
          const next = [entry, ...prev].slice(0, MAX_TIMELINE_ENTRIES);
          return next;
        });
      } catch (err) {
        if (controller.signal.aborted) return;

        const kind = classifyErrorLocal(err);
        const httpStatus = err instanceof ApiError ? err.status : null;
        const now = new Date().toISOString();

        logOnce(`${kind}-${httpStatus}`, `${kind}: status=${httpStatus ?? "N/A"}`);

        setFailureTimestamp(now);
        setFailureStatus(httpStatus);

        // ROUTE_MISSING or TRANSPORT — never auto-retry
        if (
          kind === "ROUTE_MISSING" ||
          kind === "TRANSPORT_LAYER_BLOCKED"
        ) {
          if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
          retryCountRef.current = MAX_AUTO_RETRIES;

          if (lastSuccessRef.current) {
            setScenario(lastSuccessRef.current);
            setShowingCached(true);
          } else {
            setScenario(null);
          }
          setServiceState("SERVICE_DOWN");
          return;
        }

        // SERVICE_ERROR — auto-retry with backoff
        if (retryCountRef.current < MAX_AUTO_RETRIES) {
          const delay = RETRY_DELAYS[retryCountRef.current] ?? 2400;
          retryCountRef.current += 1;

          retryTimerRef.current = setTimeout(() => {
            executeScenarioRequest(adj, true);
          }, delay);
          return;
        }

        // Exhausted retries
        if (lastSuccessRef.current) {
          setScenario(lastSuccessRef.current);
          setShowingCached(true);
        } else {
          setScenario(null);
        }
        setServiceState("ERROR");
      }
    },
    [code, activePresetLabel],
  );

  // ── Debounced scenario trigger ──
  const runScenario = useCallback(
    (adj: Record<string, number>) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (abortRef.current) abortRef.current.abort();

      retryCountRef.current = 0;

      if (Object.keys(adj).length === 0) {
        setScenario(null);
        setServiceState("IDLE");
        setShowingCached(false);
        setFailureTimestamp(null);
        setFailureStatus(null);
        return;
      }

      debounceRef.current = setTimeout(() => {
        executeScenarioRequest(adj, false);
      }, DEBOUNCE_MS);
    },
    [executeScenarioRequest],
  );

  // ── Trigger scenario on adjustment change ──
  useEffect(() => {
    runScenario(activeAdjustments);
  }, [activeAdjustments, runScenario]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  // ── Manual retry ──
  const retrySimulation = useCallback(() => {
    retryCountRef.current = 0;
    setServiceState("IDLE");
    setFailureTimestamp(null);
    setFailureStatus(null);
    if (hasAdjustments) {
      executeScenarioRequest(activeAdjustments, false);
    }
  }, [hasAdjustments, activeAdjustments, executeScenarioRequest]);

  // ── Adjustment handler ──
  const setAxisAdjustment = useCallback((slug: AxisSlug, value: number) => {
    setAdjustments((prev) => ({ ...prev, [slug]: value }));
    setActivePresetLabel(null);
  }, []);

  // ── Apply preset ──
  const applyPreset = useCallback((preset: StructuralPreset) => {
    const next: Record<string, number> = {};
    for (const slug of ALL_AXIS_SLUGS) {
      next[slug] = 0;
    }
    for (const [slug, val] of Object.entries(preset.adjustments)) {
      next[slug] = val;
    }
    setAdjustments(next as Record<AxisSlug, number>);
    setActivePresetLabel(preset.label);
  }, []);

  // ── Reset ──
  const resetToBaseline = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    if (abortRef.current) abortRef.current.abort();
    retryCountRef.current = 0;

    const reset: Record<string, number> = {};
    for (const slug of ALL_AXIS_SLUGS) {
      reset[slug] = 0;
    }
    setAdjustments(reset as Record<AxisSlug, number>);
    setScenario(null);
    setServiceState("IDLE");
    setShowingCached(false);
    setFailureTimestamp(null);
    setFailureStatus(null);
    setActivePresetLabel(null);
  }, []);

  // ── Restore from timeline ──
  const restoreTimelineEntry = useCallback((entry: TimelineEntry) => {
    const next: Record<string, number> = {};
    for (const slug of ALL_AXIS_SLUGS) {
      next[slug] = entry.adjustments[slug] ?? 0;
    }
    setAdjustments(next as Record<AxisSlug, number>);
    setActivePresetLabel(entry.presetLabel);
  }, []);

  // ── Simulated radar axes ──
  const simulatedRadarAxes = useMemo(() => {
    if (!scenario?.simulated_axes) return null;
    return scenario.simulated_axes.map((a) => ({
      slug: a.axis_slug,
      value: a.simulated,
    }));
  }, [scenario]);

  // ── Classification change detection ──
  const classificationChanged = useMemo(() => {
    if (!country || !scenario) return false;
    return (
      scenario.simulated_classification !== null &&
      country.isi_classification !== null &&
      scenario.simulated_classification !== country.isi_classification
    );
  }, [country, scenario]);

  // ── Delta decomposition data ──
  const decomposition = useMemo(() => {
    if (!scenario?.simulated_axes) return null;
    const items = scenario.simulated_axes
      .filter((a) => a.delta != null && a.delta !== 0)
      .map((a) => ({
        slug: a.axis_slug,
        label: shortDomain(a.axis_slug),
        delta: a.delta as number,
      }));
    if (items.length === 0) return null;
    return items;
  }, [scenario]);

  // ── Max absolute delta for bar scaling ──
  const maxAbsDelta = useMemo(() => {
    if (!decomposition) return 0;
    return Math.max(...decomposition.map((d) => Math.abs(d.delta)), 0.0001);
  }, [decomposition]);

  // ── Elasticity data (delta per 1% shift) ──
  const elasticityData = useMemo(() => {
    if (!scenario?.simulated_axes) return null;
    const items = scenario.simulated_axes
      .map((a) => {
        const adj = activeAdjustments[a.axis_slug] ?? 0;
        const pctShift = Math.abs(adj * 100);
        if (pctShift === 0 || a.delta == null) return null;
        return {
          slug: a.axis_slug,
          label: shortDomain(a.axis_slug),
          elasticity: Math.abs(a.delta) / pctShift,
          delta: a.delta,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.elasticity - a.elasticity);
    if (items.length === 0) return null;
    return items;
  }, [scenario, activeAdjustments]);

  const maxElasticity = useMemo(() => {
    if (!elasticityData) return 0;
    return Math.max(...elasticityData.map((d) => d.elasticity), 0.000001);
  }, [elasticityData]);

  // ── Structural insight ──
  const insightText = useMemo(() => {
    if (!scenario || !country) return null;
    if (!hasAdjustments) return null;

    const parts: string[] = [];
    for (const [slug, val] of Object.entries(activeAdjustments)) {
      const name = getCanonicalAxisName(slug);
      const pct = Math.abs(val * 100).toFixed(0);
      const dir = val > 0 ? "Increasing" : "Reducing";
      parts.push(`${dir} ${name} by ${pct}%`);
    }

    const adjustDesc = parts.join("; ");
    const delta = scenario.delta_from_baseline;
    const deltaStr =
      delta !== null
        ? `${delta >= 0 ? "raises" : "lowers"} composite exposure by ${Math.abs(delta).toFixed(4)}`
        : "has no measurable effect on composite exposure";

    const baseRank = scenario.baseline_rank ?? baselineRank;
    const simRank = scenario.simulated_rank;
    let rankStr = "";
    if (baseRank !== null && simRank !== null && baseRank !== simRank) {
      rankStr = ` and ${simRank < baseRank ? "improves" : "worsens"} rank from ${baseRank} to ${simRank}`;
    }

    let classStr = "";
    if (classificationChanged && scenario.simulated_classification) {
      classStr = `. Classification shifts to ${classificationLabel(scenario.simulated_classification)}`;
    }

    return `${adjustDesc} ${deltaStr}${rankStr}${classStr}.`;
  }, [
    scenario,
    country,
    hasAdjustments,
    activeAdjustments,
    baselineRank,
    classificationChanged,
  ]);

  // ── Mode banner ──
  const modeBanner = useMemo<{ text: string; visible: boolean }>(() => {
    if (serviceState === "SERVICE_DOWN" || serviceState === "ERROR") {
      return {
        text: "Simulation temporarily unavailable. Published baseline remains authoritative.",
        visible: true,
      };
    }
    if (
      hasAdjustments &&
      (serviceState === "SUCCESS" ||
        serviceState === "COMPUTING" ||
        serviceState === "RETRYING")
    ) {
      return {
        text: "Scenario Mode Active — results reflect simulated structural adjustments computed server-side.",
        visible: true,
      };
    }
    return { text: "", visible: false };
  }, [serviceState, hasAdjustments]);

  // ── Export snapshot ──
  const exportSnapshot = useCallback(() => {
    if (!scenario || !country) return;
    const snapshot = {
      country: country.country,
      baseline: {
        composite: country.isi_composite,
        classification: country.isi_classification,
        rank: baselineRank,
        axes: country.axes.map((a) => ({
          axis_slug: a.axis_slug,
          score: a.score,
        })),
      },
      simulated: {
        composite: scenario.simulated_composite,
        classification: scenario.simulated_classification,
        rank: scenario.simulated_rank,
        axes: scenario.simulated_axes.map((a) => ({
          axis_slug: a.axis_slug,
          baseline: a.baseline,
          simulated: a.simulated,
          delta: a.delta,
        })),
      },
      deltas: {
        composite: scenario.delta_from_baseline,
        per_axis: Object.fromEntries(
          scenario.simulated_axes
            .filter((a) => a.delta != null)
            .map((a) => [a.axis_slug, a.delta]),
        ),
      },
      adjustments: activeAdjustments,
      timestamp: new Date().toISOString(),
      version: "1.0",
    };

    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `isi-scenario-${country.country.toLowerCase()}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [scenario, country, baselineRank, activeAdjustments]);

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-10 lg:px-16">
          <div className="h-4 w-32 animate-pulse bg-surface-tertiary" />
          <div className="mt-6 space-y-4">
            <div className="h-10 w-64 animate-pulse bg-surface-tertiary" />
            <div className="h-4 w-48 animate-pulse bg-surface-tertiary" />
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-md border border-border-primary bg-surface-tertiary"
              />
            ))}
          </div>
        </main>
      </div>
    );
  }

  // ── Load error ──
  if (loadError || !country) {
    return (
      <div className="min-h-screen bg-white">
        <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-10 lg:px-16">
          <Link
            href="/"
            className="text-[13px] text-text-tertiary hover:text-text-primary"
          >
            ← Back to Overview
          </Link>
          <div className="mt-6 rounded-md border border-border-primary bg-surface-tertiary px-5 py-5">
            <h3 className="text-[14px] font-medium text-text-primary">
              Country Data Temporarily Unavailable
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-text-tertiary">
              The requested country profile could not be loaded at this time.
              This does not affect published index data.
            </p>
            {loadError?.status != null && (
              <details className="mt-3">
                <summary className="cursor-pointer text-[11px] text-text-quaternary hover:text-text-tertiary">
                  Technical Details
                </summary>
                <div className="mt-1 font-mono text-[11px] text-text-quaternary">
                  <p>Status: {loadError.status}</p>
                  <p>Timestamp: {new Date().toISOString()}</p>
                </div>
              </details>
            )}
          </div>
        </main>
      </div>
    );
  }

  const showSimulated =
    hasAdjustments && scenario !== null && serviceState === "SUCCESS";

  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-[1400px] px-4 pb-16 sm:px-6 lg:px-16">
        {/* ── Breadcrumb ── */}
        <div className="pt-6 sm:pt-10">
          <nav className="flex items-center gap-1.5 text-[13px] text-text-tertiary">
            <Link href="/" className="hover:text-text-primary">
              Overview
            </Link>
            <span aria-hidden="true">›</span>
            <Link
              href={`/country/${code.toLowerCase()}`}
              className="hover:text-text-primary"
            >
              {country.country_name}
            </Link>
            <span aria-hidden="true">›</span>
            <span className="text-text-quaternary">Scenario Laboratory</span>
          </nav>
        </div>

        {/* ── Header ── */}
        <section className="mt-6">
          <div className="flex flex-wrap items-baseline gap-2 sm:gap-3">
            <h1
              className="font-serif font-bold leading-[1.15] tracking-tight text-text-primary"
              style={{ fontSize: "clamp(1.5rem, 4vw, 2.25rem)" }}
            >
              Structural Simulation Console
            </h1>
            <span className="font-mono text-[14px] text-text-quaternary sm:text-[15px]">
              {country.country_name} ({country.country})
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-text-tertiary">
            Simulate structural adjustments to external supplier concentration.
            All computations are performed server-side. Baseline data is
            immutable.
          </p>
        </section>

        {/* ── Mode Banner ── */}
        {modeBanner.visible && (
          <div
            role="status"
            aria-live="polite"
            className="mt-6 rounded-md border border-stone-200 bg-stone-50 px-4 py-2.5"
          >
            <p className="text-[12px] font-medium text-stone-600">
              {modeBanner.text}
            </p>
          </div>
        )}

        {/* ═══ BASELINE STRUCTURE (always visible) ═══ */}
        <section className="mt-10">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-quaternary">
            Published Baseline (Immutable)
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
            <KPICard
              label="Baseline Composite"
              value={formatScore(country.isi_composite)}
              variant="highlight"
            />
            <div className="flex items-center rounded-md border border-border-primary bg-surface-tertiary px-5">
              <StatusBadge classification={country.isi_classification} />
            </div>
            <KPICard
              label="EU-27 Rank"
              value={
                baselineRank !== null
                  ? `${baselineRank} / ${totalRanked}`
                  : "—"
              }
            />
            <KPICard
              label="Axes Coverage"
              value={`${country.axes_available} / ${country.axes_required}`}
            />
          </div>
        </section>

        {/* ═══ STRUCTURAL SHOCK PRESETS ═══ */}
        <section className="mt-10">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-quaternary">
            Structural Shock Presets
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {STRUCTURAL_PRESETS.map((preset) => {
              const isActive = activePresetLabel === preset.label;
              return (
                <button
                  key={preset.id}
                  type="button"
                  disabled={controlsLocked}
                  onClick={() => applyPreset(preset)}
                  className={`
                    rounded-md border px-3 py-2 text-[12px] font-medium
                    transition-colors duration-100
                    focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-navy-700
                    disabled:opacity-40 disabled:cursor-not-allowed
                    ${
                      isActive
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
          {activePresetLabel && (
            <p className="mt-2 text-[11px] text-text-quaternary">
              Active preset: {activePresetLabel}
            </p>
          )}
        </section>

        {/* ═══ AXIS ADJUSTMENT CONTROLS ═══ */}
        <section className="mt-10">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-quaternary">
            Axis-Level Adjustments
          </h2>
          <p className="mt-2 text-[12px] text-text-quaternary">
            Adjustments represent proportional shifts in axis concentration
            structure. Positive values increase concentration; negative values
            decrease it.
          </p>

          <div className="mt-6 space-y-3">
            {country.axes.map((axis) => {
              const slug = axis.axis_slug as AxisSlug;
              const currentAdj = adjustments[slug] ?? 0;
              const label = getCanonicalAxisName(slug);

              return (
                <div
                  key={slug}
                  className={`rounded-md border border-border-primary px-4 py-3 sm:px-5 ${
                    controlsLocked
                      ? "bg-stone-50 opacity-70"
                      : "bg-surface-tertiary"
                  }`}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-text-secondary">
                        {label}
                      </p>
                      <p className="mt-0.5 font-mono text-[12px] text-text-quaternary">
                        Baseline: {formatScore(axis.score)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {SHIFT_OPTIONS.map((shift) => {
                        const isActive = currentAdj === shift;
                        const isBase = shift === 0;

                        return (
                          <button
                            key={shift}
                            type="button"
                            disabled={controlsLocked}
                            onClick={() => setAxisAdjustment(slug, shift)}
                            aria-label={`Set ${label} adjustment to ${SHIFT_LABELS[shift]}`}
                            aria-pressed={isActive}
                            className={`
                              rounded px-2.5 py-1.5 font-mono text-[11px] font-medium
                              transition-colors duration-100
                              focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-navy-700
                              disabled:opacity-40 disabled:cursor-not-allowed
                              ${
                                isActive
                                  ? isBase
                                    ? "bg-stone-700 text-white"
                                    : "bg-navy-700 text-white"
                                  : "border border-border-primary bg-white text-text-secondary hover:bg-stone-50"
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

          {/* Control actions */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={resetToBaseline}
              disabled={
                (!hasAdjustments && serviceState === "IDLE") ||
                serviceState === "COMPUTING"
              }
              className="
                rounded-md border border-border-primary bg-white px-4 py-2
                text-[13px] font-medium text-text-secondary
                transition-colors duration-100
                hover:bg-stone-50
                focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-navy-700
                disabled:opacity-40 disabled:cursor-not-allowed
              "
            >
              Reset to Baseline
            </button>
            {(serviceState === "SERVICE_DOWN" || serviceState === "ERROR") && (
              <button
                type="button"
                onClick={retrySimulation}
                className="
                  rounded-md border border-border-primary bg-white px-4 py-2
                  text-[13px] font-medium text-text-secondary
                  transition-colors duration-100
                  hover:bg-stone-50
                  focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-navy-700
                "
              >
                Retry Simulation
              </button>
            )}
            {showSimulated && (
              <button
                type="button"
                onClick={exportSnapshot}
                className="
                  rounded-md border border-border-primary bg-white px-4 py-2
                  text-[13px] font-medium text-text-secondary
                  transition-colors duration-100
                  hover:bg-stone-50
                  focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-navy-700
                "
              >
                Export Simulation Snapshot
              </button>
            )}
            {(serviceState === "COMPUTING" || serviceState === "RETRYING") && (
              <span className="text-[12px] text-text-quaternary">
                {serviceState === "RETRYING" ? "Retrying…" : "Computing…"}
              </span>
            )}
          </div>
        </section>

        {/* ═══ FAILURE PANEL ═══ */}
        {(serviceState === "SERVICE_DOWN" || serviceState === "ERROR") && (
          <section
            role="alert"
            aria-live="assertive"
            className="mt-6 rounded-md border border-stone-200 bg-stone-50 px-5 py-4"
          >
            <h3 className="text-[14px] font-medium text-stone-700">
              Simulation Service Unavailable
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-stone-500">
              Structural simulation is temporarily unreachable. Published
              baseline metrics remain authoritative.
            </p>
            {showingCached && (
              <p className="mt-2 text-[12px] font-medium text-stone-500">
                Displaying most recent successful structural simulation.
              </p>
            )}
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={retrySimulation}
                className="rounded-md border border-stone-300 bg-white px-3.5 py-1.5 text-[12px] font-medium text-stone-600 transition-colors duration-100 hover:bg-stone-50"
              >
                Retry Simulation
              </button>
              <button
                type="button"
                onClick={resetToBaseline}
                className="rounded-md border border-stone-300 bg-white px-3.5 py-1.5 text-[12px] font-medium text-stone-600 transition-colors duration-100 hover:bg-stone-50"
              >
                Reset to Baseline
              </button>
            </div>
            {(failureStatus != null || failureTimestamp != null) && (
              <details className="mt-3">
                <summary className="cursor-pointer text-[11px] text-stone-400 hover:text-stone-500">
                  Technical Status
                </summary>
                <div className="mt-1 font-mono text-[11px] text-stone-400">
                  {failureStatus != null && <p>Code: {failureStatus}</p>}
                  {failureTimestamp && <p>Timestamp: {failureTimestamp}</p>}
                </div>
              </details>
            )}
          </section>
        )}

        {/* ═══ SENSITIVITY VIEW TOGGLE ═══ */}
        {showSimulated && (
          <section className="mt-10">
            <h2 className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-quaternary">
              Analysis View
            </h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(
                Object.entries(SENSITIVITY_VIEW_LABELS) as [
                  SensitivityView,
                  string,
                ][]
              ).map(([key, viewLabel]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSensitivityView(key)}
                  className={`
                    rounded-md border px-3 py-1.5 text-[11px] font-medium
                    transition-colors duration-100
                    ${
                      sensitivityView === key
                        ? "border-stone-700 bg-stone-700 text-white"
                        : "border-border-primary bg-white text-text-secondary hover:bg-stone-50"
                    }
                  `}
                >
                  {viewLabel}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ═══ RADAR + RESULTS PANEL ═══ */}
        <section className="mt-8 grid gap-4 sm:gap-6 lg:grid-cols-[3fr_2fr]">
          {/* Radar */}
          <div className="relative flex flex-col overflow-hidden rounded-md border border-border-primary px-2 pt-3 pb-1 sm:px-3 sm:pt-4 sm:pb-2">
            <h2 className="text-[12.5px] font-semibold uppercase tracking-[0.14em] text-text-quaternary">
              {showSimulated
                ? "Baseline vs. Simulated Profile"
                : "Baseline Profile"}
            </h2>
            {activePresetLabel && showSimulated && (
              <p className="mt-1 text-[11px] text-text-quaternary">
                {activePresetLabel}
              </p>
            )}
            <div className="mt-4 flex w-full items-center justify-center">
              {showSimulated && simulatedRadarAxes ? (
                <RadarChart
                  axes={simulatedRadarAxes}
                  compareAxes={baselineRadarAxes}
                  compareLabel="Baseline"
                  label="Simulated"
                />
              ) : (
                <RadarChart
                  axes={baselineRadarAxes}
                  label={country.country_name}
                />
              )}
            </div>
          </div>

          {/* Results panel */}
          <div className="space-y-3">
            {/* Composite */}
            <div className="rounded-md border border-border-primary bg-surface-tertiary px-4 py-3 sm:px-5 sm:py-4">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
                {showSimulated ? "Simulated Composite" : "Composite Score"}
              </p>
              <p className="mt-1 font-mono text-[24px] font-medium leading-none tracking-tight text-text-primary">
                {showSimulated
                  ? formatScore(scenario.simulated_composite)
                  : formatScore(country.isi_composite)}
              </p>
            </div>

            {/* Rank */}
            {sensitivityView !== "elasticity" && (
              <div className="rounded-md border border-border-primary bg-surface-tertiary px-4 py-3 sm:px-5 sm:py-4">
                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
                  {showSimulated ? "Simulated Rank" : "Baseline Rank"}
                </p>
                <p className="mt-1 font-mono text-[24px] font-medium leading-none tracking-tight text-text-primary">
                  {showSimulated && scenario.simulated_rank != null
                    ? `${scenario.simulated_rank} / ${totalRanked}`
                    : baselineRank != null
                      ? `${baselineRank} / ${totalRanked}`
                      : "—"}
                </p>
              </div>
            )}

            {/* Classification with trajectory */}
            <div
              className={`rounded-md border px-4 py-3 sm:px-5 sm:py-4 transition-all duration-150 ${
                classificationChanged
                  ? "border-l-2 border-l-accent border-border-primary bg-surface-tertiary"
                  : "border-border-primary bg-surface-tertiary"
              }`}
            >
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
                {showSimulated
                  ? "Simulated Classification"
                  : "Baseline Classification"}
              </p>
              <div className="mt-2">
                <StatusBadge
                  classification={
                    showSimulated
                      ? scenario.simulated_classification
                      : country.isi_classification
                  }
                />
              </div>
              {classificationChanged && (
                <div className="mt-3 flex items-center gap-2 text-[12px]">
                  <span className="rounded bg-stone-100 px-2 py-0.5 font-medium text-stone-600">
                    {classificationLabel(country.isi_classification)}
                  </span>
                  <span className="text-text-quaternary" aria-hidden="true">
                    →
                  </span>
                  <span className="rounded bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
                    {classificationLabel(
                      scenario?.simulated_classification ?? null,
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Delta */}
            {showSimulated && scenario.delta_from_baseline != null && (
              <div className="rounded-md border border-border-primary bg-surface-tertiary px-4 py-3 sm:px-5 sm:py-4">
                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
                  Delta vs. Baseline
                </p>
                <p
                  className={`mt-1 font-mono text-[20px] font-medium leading-none tracking-tight ${
                    scenario.delta_from_baseline > 0
                      ? "text-deviation-positive"
                      : scenario.delta_from_baseline < 0
                        ? "text-deviation-negative"
                        : "text-text-primary"
                  }`}
                >
                  {scenario.delta_from_baseline >= 0 ? "+" : ""}
                  {scenario.delta_from_baseline.toFixed(4)}
                </p>
              </div>
            )}

            {/* Per-axis results */}
            {showSimulated && scenario.simulated_axes && (
              <div className="rounded-md border border-border-primary bg-surface-tertiary px-4 py-3 sm:px-5 sm:py-4">
                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
                  Per-Axis Results
                </p>
                <div className="mt-3 space-y-2">
                  {scenario.simulated_axes.map((sa) => (
                    <div
                      key={sa.axis_slug}
                      className="flex items-center justify-between text-[13px]"
                    >
                      <span className="text-text-secondary">
                        {getCanonicalAxisName(sa.axis_slug)}
                      </span>
                      <div className="flex items-center gap-3 font-mono text-[12px]">
                        <span className="text-text-quaternary">
                          {formatScore(sa.baseline)}
                        </span>
                        <span className="text-text-quaternary">→</span>
                        <span className="text-text-primary">
                          {formatScore(sa.simulated)}
                        </span>
                        {sa.delta != null && sa.delta !== 0 && (
                          <span
                            className={
                              sa.delta > 0
                                ? "text-deviation-positive"
                                : "text-deviation-negative"
                            }
                          >
                            {sa.delta >= 0 ? "+" : ""}
                            {sa.delta.toFixed(4)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ═══ DELTA DECOMPOSITION ═══ */}
        {showSimulated && decomposition && sensitivityView === "composite" && (
          <section className="mt-10">
            <h2 className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-quaternary">
              Contribution Breakdown
            </h2>
            {scenario.delta_from_baseline != null && (
              <p className="mt-2 font-mono text-[14px] font-medium text-text-primary">
                Composite Change:{" "}
                <span
                  className={
                    scenario.delta_from_baseline > 0
                      ? "text-deviation-positive"
                      : scenario.delta_from_baseline < 0
                        ? "text-deviation-negative"
                        : ""
                  }
                >
                  {scenario.delta_from_baseline >= 0 ? "+" : ""}
                  {scenario.delta_from_baseline.toFixed(4)}
                </span>
              </p>
            )}
            <div className="mt-4 space-y-2">
              {decomposition.map((item) => {
                const pct = (Math.abs(item.delta) / maxAbsDelta) * 100;
                const isPositive = item.delta > 0;
                return (
                  <div key={item.slug} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-[12px] font-medium text-text-secondary">
                      {item.label}
                    </span>
                    <div className="relative flex h-5 flex-1 items-center">
                      <div className="absolute inset-0 rounded bg-stone-100" />
                      <div
                        className={`relative h-full rounded transition-all duration-150 ${
                          isPositive ? "bg-red-200" : "bg-emerald-200"
                        }`}
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                    <span
                      className={`w-20 shrink-0 text-right font-mono text-[11px] font-medium ${
                        isPositive
                          ? "text-deviation-positive"
                          : "text-deviation-negative"
                      }`}
                    >
                      {item.delta >= 0 ? "+" : ""}
                      {item.delta.toFixed(4)}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ═══ RANK IMPACT VIEW ═══ */}
        {showSimulated && sensitivityView === "rank" && (
          <section className="mt-10">
            <h2 className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-quaternary">
              Rank Impact Analysis
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-md border border-border-primary bg-surface-tertiary px-4 py-3">
                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
                  Baseline Rank
                </p>
                <p className="mt-1 font-mono text-[20px] font-medium text-text-primary">
                  {scenario.baseline_rank ?? baselineRank ?? "—"}
                </p>
              </div>
              <div className="rounded-md border border-border-primary bg-surface-tertiary px-4 py-3">
                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
                  Simulated Rank
                </p>
                <p className="mt-1 font-mono text-[20px] font-medium text-text-primary">
                  {scenario.simulated_rank ?? "—"}
                </p>
              </div>
              <div className="rounded-md border border-border-primary bg-surface-tertiary px-4 py-3">
                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
                  Rank Shift
                </p>
                {(() => {
                  const base = scenario.baseline_rank ?? baselineRank;
                  const sim = scenario.simulated_rank;
                  if (base == null || sim == null) {
                    return (
                      <p className="mt-1 font-mono text-[20px] font-medium text-text-primary">
                        —
                      </p>
                    );
                  }
                  const shift = base - sim;
                  return (
                    <p
                      className={`mt-1 font-mono text-[20px] font-medium ${
                        shift > 0
                          ? "text-deviation-negative"
                          : shift < 0
                            ? "text-deviation-positive"
                            : "text-text-primary"
                      }`}
                    >
                      {shift > 0 ? "↑" : shift < 0 ? "↓" : "—"}{" "}
                      {shift !== 0 ? Math.abs(shift) : ""}
                    </p>
                  );
                })()}
              </div>
            </div>
          </section>
        )}

        {/* ═══ ELASTICITY VIEW ═══ */}
        {showSimulated &&
          sensitivityView === "elasticity" &&
          elasticityData && (
            <section className="mt-10">
              <h2 className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-quaternary">
                Axis Elasticity (Composite Delta per 1% Shift)
              </h2>
              <p className="mt-2 text-[11px] text-text-quaternary">
                Indicates which axis produces the largest composite movement per
                unit of proportional adjustment. Based on backend-returned
                simulation data.
              </p>
              <div className="mt-4 space-y-2">
                {elasticityData.map((item) => {
                  const pct =
                    (item.elasticity / maxElasticity) * 100;
                  return (
                    <div
                      key={item.slug}
                      className="flex items-center gap-3"
                    >
                      <span className="w-28 shrink-0 text-[12px] font-medium text-text-secondary">
                        {item.label}
                      </span>
                      <div className="relative flex h-5 flex-1 items-center">
                        <div className="absolute inset-0 rounded bg-stone-100" />
                        <div
                          className="relative h-full rounded bg-indigo-200 transition-all duration-150"
                          style={{
                            width: `${Math.max(pct, 2)}%`,
                          }}
                        />
                      </div>
                      <span className="w-24 shrink-0 text-right font-mono text-[11px] font-medium text-text-secondary">
                        {item.elasticity.toFixed(6)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

        {/* ═══ STRUCTURAL INSIGHT ═══ */}
        {insightText && (
          <section className="mt-8 rounded-md border border-border-primary bg-surface-tertiary p-5">
            <h3 className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-quaternary">
              Structural Insight
            </h3>
            <p className="mt-3 text-[14px] leading-relaxed text-text-secondary">
              {insightText}
            </p>
          </section>
        )}

        {/* ═══ SIMULATION TIMELINE ═══ */}
        {timeline.length > 0 && (
          <section className="mt-10">
            <h2 className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-quaternary">
              Simulation Timeline (Session)
            </h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="border-b border-border-primary text-[10px] font-medium uppercase tracking-[0.1em] text-text-quaternary">
                    <th className="pb-2 pr-4">Time</th>
                    <th className="pb-2 pr-4">Composite</th>
                    <th className="pb-2 pr-4">Rank</th>
                    <th className="pb-2 pr-4">Classification</th>
                    <th className="pb-2 pr-4">Scenario</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {timeline.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b border-stone-100 text-text-secondary"
                    >
                      <td className="py-2 pr-4 font-mono text-[11px] text-text-quaternary">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2 pr-4 font-mono">
                        {formatScore(entry.composite)}
                      </td>
                      <td className="py-2 pr-4 font-mono">
                        {entry.rank ?? "—"}
                      </td>
                      <td className="py-2 pr-4">
                        {entry.classification
                          ? classificationLabel(entry.classification)
                          : "—"}
                      </td>
                      <td className="py-2 pr-4 text-text-quaternary">
                        {entry.presetLabel ?? "Custom"}
                      </td>
                      <td className="py-2">
                        <button
                          type="button"
                          onClick={() => restoreTimelineEntry(entry)}
                          disabled={controlsLocked}
                          className="text-[11px] font-medium text-stone-500 hover:text-stone-700 disabled:opacity-40 disabled:cursor-not-allowed"
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

        {/* ═══ RIGOR DISCLAIMER + STRUCTURAL INTEGRITY ═══ */}
        <section className="mt-12 space-y-3">
          <div className="rounded-md border border-border-primary px-5 py-4">
            <p className="text-[12px] leading-relaxed text-text-quaternary">
              Simulations model proportional adjustments to
              Herfindahl–Hirschman concentration indices. Results do not
              incorporate dynamic substitution, geopolitical feedback loops, or
              endogenous industrial response.
            </p>
          </div>
          <div className="rounded-md border border-border-primary px-5 py-3">
            <p className="text-[11px] leading-relaxed text-text-quaternary">
              Simulation results are computed server-side. The interface does not
              estimate structural adjustments locally.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
