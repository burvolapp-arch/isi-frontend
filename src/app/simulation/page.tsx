"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ISIComposite } from "@/lib/types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

let _isiCache: { data: ISIComposite; ts: number } | null = null;
const ISI_CACHE_TTL = 60_000;

async function fetchISIOnce(): Promise<ISIComposite> {
  if (_isiCache && Date.now() - _isiCache.ts < ISI_CACHE_TTL) {
    return _isiCache.data;
  }
  const r = await fetch(`${API}/isi`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const d: ISIComposite = await r.json();
  _isiCache = { data: d, ts: Date.now() };
  return d;
}

export default function SimulationPage() {
  const router = useRouter();
  const [data, setData] = useState<ISIComposite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState("");

  useEffect(() => {
    fetchISIOnce()
      .then((d) => setData(d))
      .catch((e) => setError(e.message));
  }, []);

  const countries = useMemo(
    () =>
      data?.countries
        .filter((c) => c.isi_composite !== null)
        .sort((a, b) => a.country_name.localeCompare(b.country_name)) ?? [],
    [data],
  );

  function handleLaunch() {
    if (selectedCountry) {
      router.push(`/country/${selectedCountry.toLowerCase()}#simulation`);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-[1400px] px-6 lg:px-16">
        <div className="max-w-3xl pt-10">
          <Link
            href="/"
            className="text-[13px] text-text-tertiary hover:text-text-primary"
          >
            ← Back to Overview
          </Link>
          <h1 className="mt-6 font-serif text-[40px] font-bold leading-[1.15] tracking-tight text-text-primary">
            Simulation Laboratory
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-text-tertiary">
            Simulate structural shifts in external supplier concentration.
            Adjust axis-level parameters to explore how changes in supplier
            diversification affect a country&apos;s composite ISI score and
            classification.
          </p>
        </div>

        <div className="mt-12 max-w-xl">
          {error && (
            <div className="mb-6 rounded-md border border-severity-high bg-red-50 p-4 text-[14px] text-severity-high">
              Data temporarily unavailable. Please try again later.
            </div>
          )}

          {/* Country Selector */}
          <section>
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.14em] text-text-quaternary">
              Select Member State
            </label>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="w-full border-b border-border-primary bg-surface-primary px-3 py-2.5 text-[14px] text-text-primary focus:border-navy-700 focus:outline-none"
            >
              <option value="">— Select a country —</option>
              {countries.map((c) => (
                <option key={c.country} value={c.country}>
                  {c.country_name} ({c.country})
                </option>
              ))}
            </select>
          </section>

          <section className="mt-6">
            <button
              type="button"
              onClick={handleLaunch}
              disabled={!selectedCountry}
              className={`
                rounded-md px-6 py-2.5 text-[14px] font-medium transition-colors
                ${selectedCountry
                  ? "bg-navy-900 text-white hover:bg-navy-800"
                  : "cursor-not-allowed bg-stone-200 text-stone-400"
                }
              `}
            >
              Launch Simulation Laboratory
            </button>
          </section>

          {/* Explanation */}
          <section className="mt-12 space-y-4 border-l-2 border-l-stone-300 py-4 pl-5 pr-6">
            <h3 className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-quaternary">
              How It Works
            </h3>
            <div className="space-y-2 text-[14px] text-text-tertiary">
              <p>
                The Simulation Laboratory applies user-defined adjustments
                (±5% to ±20%) to individual axis scores and recomputes the
                composite ISI score in real time via the backend simulation
                endpoint.
              </p>
              <p>
                Simulated outcomes are displayed alongside baseline values,
                with delta indicators showing the direction and magnitude
                of change for each axis and the composite.
              </p>
              <p>
                <strong className="text-text-secondary">This is a simulation tool.</strong>{" "}
                Simulation outputs do not represent forecasts, predictions,
                or policy recommendations. They illustrate the mechanical
                sensitivity of the composite score to changes in individual
                axis concentrations.
              </p>
            </div>
          </section>

          {/* Features */}
          <section className="mt-8 mb-16 rounded-md border border-border-primary bg-surface-tertiary p-5">
            <h3 className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
              Available Features
            </h3>
            <ul className="mt-3 space-y-1.5 text-[14px] text-text-tertiary">
              <li>Per-axis adjustment sliders (±5%, ±10%, ±15%, ±20%)</li>
              <li>Structural shock presets (energy diversification, defense reindustrialisation, logistics disruption)</li>
              <li>Real-time composite recomputation with classification change detection</li>
              <li>Baseline vs. simulated radar overlay</li>
              <li>Simulation timeline with history tracking</li>
              <li>JSON snapshot export</li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
