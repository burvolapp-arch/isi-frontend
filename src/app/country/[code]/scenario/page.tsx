"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { RadarChart } from "@/components/RadarChart";
import { StatusBadge } from "@/components/StatusBadge";
import { ErrorPanel } from "@/components/ErrorPanel";
import { KPICard } from "@/components/KPICard";
import { fetchCountry, fetchISI, fetchScenario, ApiError } from "@/lib/api";
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

// ─── Constants ──────────────────────────────────────────────────────

/** Discrete percentage shift options (as proportions, not percentages). */
const SHIFT_OPTIONS = [-0.20, -0.10, -0.05, 0, 0.05, 0.10, 0.20] as const;

/** Labels for the discrete shift buttons */
const SHIFT_LABELS: Record<number, string> = {
  [-0.20]: "−20%",
  [-0.10]: "−10%",
  [-0.05]: "−5%",
  [0]: "Base",
  [0.05]: "+5%",
  [0.10]: "+10%",
  [0.20]: "+20%",
};

/** Debounce delay for scenario API calls (ms) */
const DEBOUNCE_MS = 300;

// ─── Page ───────────────────────────────────────────────────────────

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
    endpoint?: string;
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
    }
  );
  const [scenario, setScenario] = useState<ScenarioResponse | null>(null);
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [scenarioError, setScenarioError] = useState<string | null>(null);

  // ── Refs for debounce ──
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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
          const err = countryRes.reason;
          setLoadError({
            message: err instanceof Error ? err.message : String(err),
            endpoint: `/country/${code}`,
            status: err instanceof ApiError ? err.status : undefined,
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
    [isi]
  );

  const baselineRank = useMemo(
    () =>
      country?.isi_composite != null && allScores.length > 0
        ? computeRank(country.isi_composite, allScores)
        : null,
    [country, allScores]
  );

  const totalRanked = allScores.length;

  const baselineRadarAxes = useMemo(
    () =>
      country?.axes.map((a) => ({ slug: a.axis_slug, value: a.score })) ?? [],
    [country]
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

  // ── URL sync — encode adjustments into query params ──
  useEffect(() => {
    if (!country) return;

    const params = new URLSearchParams();
    for (const [slug, val] of Object.entries(adjustments)) {
      if (val !== 0) {
        params.set(slug, val.toFixed(2));
      }
    }

    const qs = params.toString();
    const newPath = `/country/${code.toLowerCase()}/scenario${qs ? `?${qs}` : ""}`;

    router.replace(newPath, { scroll: false });
  }, [adjustments, code, country, router]);

  // ── Scenario fetch with debounce ──
  const runScenario = useCallback(
    (adj: Record<string, number>) => {
      // Clear previous debounce
      if (debounceRef.current) clearTimeout(debounceRef.current);
      // Abort in-flight request
      if (abortRef.current) abortRef.current.abort();

      if (Object.keys(adj).length === 0) {
        setScenario(null);
        setScenarioError(null);
        return;
      }

      setScenarioLoading(true);
      setScenarioError(null);

      debounceRef.current = setTimeout(async () => {
        const controller = new AbortController();
        abortRef.current = controller;

        try {
          const result = await fetchScenario({
            country: code,
            adjustments: adj,
          });

          if (!controller.signal.aborted) {
            setScenario(result);
            setScenarioError(null);
          }
        } catch (err) {
          if (!controller.signal.aborted) {
            setScenarioError(
              err instanceof Error ? err.message : "Scenario computation failed"
            );
            setScenario(null);
          }
        } finally {
          if (!controller.signal.aborted) {
            setScenarioLoading(false);
          }
        }
      }, DEBOUNCE_MS);
    },
    [code]
  );

  // ── Trigger scenario on adjustment change ──
  useEffect(() => {
    runScenario(activeAdjustments);
  }, [activeAdjustments, runScenario]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  // ── Adjustment handler ──
  const setAxisAdjustment = useCallback((slug: AxisSlug, value: number) => {
    setAdjustments((prev) => ({ ...prev, [slug]: value }));
  }, []);

  // ── Reset ──
  const resetToBaseline = useCallback(() => {
    const reset: Record<string, number> = {};
    for (const slug of ALL_AXIS_SLUGS) {
      reset[slug] = 0;
    }
    setAdjustments(reset as Record<AxisSlug, number>);
    setScenario(null);
    setScenarioError(null);
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

  // ── Structural insight text ──
  const insightText = useMemo(() => {
    if (!scenario || !country) return null;
    if (!hasAdjustments) return null;

    const parts: string[] = [];

    // Describe each adjustment
    for (const [slug, val] of Object.entries(activeAdjustments)) {
      const name = getCanonicalAxisName(slug);
      const pct = Math.abs(val * 100).toFixed(0);
      const dir = val > 0 ? "Increasing" : "Reducing";
      parts.push(`${dir} ${name} by ${pct}%`);
    }

    const adjustDesc = parts.join("; ");

    // Delta
    const delta = scenario.delta_from_baseline;
    const deltaStr =
      delta !== null
        ? `${delta >= 0 ? "raises" : "lowers"} composite exposure by ${Math.abs(delta).toFixed(4)}`
        : "has no measurable effect on composite exposure";

    // Rank change
    const baseRank = scenario.baseline_rank ?? baselineRank;
    const simRank = scenario.simulated_rank;
    let rankStr = "";
    if (baseRank !== null && simRank !== null && baseRank !== simRank) {
      rankStr = ` and ${simRank < baseRank ? "improves" : "worsens"} rank from ${baseRank} to ${simRank}`;
    }

    // Classification change
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

  // ── Loading state ──
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

  // ── Error state ──
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
          <div className="mt-6">
            <ErrorPanel
              title={`Failed to load country ${code}`}
              message={loadError?.message ?? "Unknown error"}
              endpoint={loadError?.endpoint}
              status={loadError?.status}
            />
          </div>
        </main>
      </div>
    );
  }

  // ─── RENDER ───────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-[1400px] px-4 pb-16 sm:px-6 lg:px-16">
        {/* ── Breadcrumb ─── */}
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

        {/* ── Header ─── */}
        <section className="mt-6">
          <div className="flex flex-wrap items-baseline gap-2 sm:gap-3">
            <h1
              className="font-serif font-bold leading-[1.15] tracking-tight text-text-primary"
              style={{ fontSize: "clamp(1.5rem, 4vw, 2.25rem)" }}
            >
              Scenario Laboratory
            </h1>
            <span className="font-mono text-[14px] text-text-quaternary sm:text-[15px]">
              {country.country_name} ({country.country})
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-text-tertiary">
            Simulate structural adjustments to external supplier concentration.
            All computations are performed server-side. Baseline data is immutable.
          </p>
        </section>

        {/* ═══ SECTION 1 — Baseline Structure ═══ */}
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

        {/* ═══ SECTION 2 — Axis Adjustment Controls ═══ */}
        <section className="mt-12">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-quaternary">
            Structural Adjustment Controls
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
                  className="rounded-md border border-border-primary bg-surface-tertiary px-4 py-3 sm:px-5"
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
                            disabled={scenarioLoading}
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

          {/* Reset button */}
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={resetToBaseline}
              disabled={!hasAdjustments || scenarioLoading}
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
            {scenarioLoading && (
              <span className="text-[12px] text-text-quaternary">
                Computing…
              </span>
            )}
          </div>
        </section>

        {/* ═══ SECTION 3 — Simulated Overlay ═══ */}
        <section className="mt-12 grid gap-4 sm:gap-6 lg:grid-cols-[3fr_2fr]">
          {/* Radar overlay */}
          <div className="relative flex flex-col overflow-hidden rounded-md border border-border-primary px-2 pt-3 pb-1 sm:px-3 sm:pt-4 sm:pb-2">
            <h2 className="text-[12.5px] font-semibold uppercase tracking-[0.14em] text-text-quaternary">
              {hasAdjustments
                ? "Baseline vs. Simulated Profile"
                : "Baseline Profile"}
            </h2>
            <div className="mt-4 flex w-full items-center justify-center">
              {simulatedRadarAxes ? (
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

          {/* Simulated results panel */}
          <div className="space-y-3">
            {/* Simulated composite */}
            <div className="rounded-md border border-border-primary bg-surface-tertiary px-4 py-3 sm:px-5 sm:py-4">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
                {hasAdjustments ? "Simulated Composite" : "Composite Score"}
              </p>
              <p className="mt-1 font-mono text-[24px] font-medium leading-none tracking-tight text-text-primary">
                {hasAdjustments && scenario
                  ? formatScore(scenario.simulated_composite)
                  : formatScore(country.isi_composite)}
              </p>
            </div>

            {/* Simulated rank */}
            <div className="rounded-md border border-border-primary bg-surface-tertiary px-4 py-3 sm:px-5 sm:py-4">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
                {hasAdjustments ? "Simulated Rank" : "Baseline Rank"}
              </p>
              <p className="mt-1 font-mono text-[24px] font-medium leading-none tracking-tight text-text-primary">
                {hasAdjustments && scenario?.simulated_rank != null
                  ? `${scenario.simulated_rank} / ${totalRanked}`
                  : baselineRank != null
                    ? `${baselineRank} / ${totalRanked}`
                    : "—"}
              </p>
            </div>

            {/* Classification */}
            <div
              className={`rounded-md border px-4 py-3 sm:px-5 sm:py-4 ${
                classificationChanged
                  ? "border-l-2 border-l-accent border-border-primary bg-surface-tertiary"
                  : "border-border-primary bg-surface-tertiary"
              }`}
            >
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
                {hasAdjustments
                  ? "Simulated Classification"
                  : "Baseline Classification"}
              </p>
              <div className="mt-2">
                <StatusBadge
                  classification={
                    hasAdjustments && scenario
                      ? scenario.simulated_classification
                      : country.isi_classification
                  }
                />
              </div>
              {classificationChanged && (
                <p className="mt-2 text-[11px] text-text-tertiary">
                  Classification boundary crossed from{" "}
                  {classificationLabel(country.isi_classification)} →{" "}
                  {classificationLabel(scenario?.simulated_classification ?? null)}
                </p>
              )}
            </div>

            {/* Delta */}
            {hasAdjustments && scenario?.delta_from_baseline != null && (
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

            {/* Per-axis deltas */}
            {hasAdjustments && scenario?.simulated_axes && (
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

        {/* ═══ SECTION 4 — Structural Insight Panel ═══ */}
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

        {/* ═══ Scenario Error ═══ */}
        {scenarioError && (
          <div className="mt-6">
            <ErrorPanel
              title="Scenario computation failed"
              message={scenarioError}
              endpoint="/scenario"
            />
          </div>
        )}

        {/* ═══ SECTION 6 — Rigor Disclaimer ═══ */}
        <section className="mt-12 rounded-md border border-border-primary px-5 py-4">
          <p className="text-[12px] leading-relaxed text-text-quaternary">
            Scenario results are simulated structural adjustments. They do not
            represent policy feasibility or dynamic substitution effects.
            Adjustments model proportional changes in Herfindahl–Hirschman
            concentration indices and do not account for partner reweighting,
            domestic production capacity, or geopolitical constraints.
          </p>
        </section>
      </main>
    </div>
  );
}
