"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type {
  ISICompositeCountry,
  AxisRegistryEntry,
  ScoreClassification,
} from "@/lib/types";
import {
  formatScore,
  classificationLabel,
  classificationDescription,
  deviationFromMean,
  countryHref,
  getAxisScores,
} from "@/lib/format";
import { StatusBadge } from "./StatusBadge";

// ─── Types ──────────────────────────────────────────────────────────

type SortKey =
  | "country_name"
  | "isi_composite"
  | `axis_${string}`
  | "classification";
type SortDir = "asc" | "desc";

interface CountryRankingsTableProps {
  countries: ISICompositeCountry[];
  axes: AxisRegistryEntry[];
  mean: number | null;
}

// ─── Helpers ────────────────────────────────────────────────────────

const AXIS_FIELD_KEYS: (keyof ISICompositeCountry)[] = [
  "axis_1_financial",
  "axis_2_energy",
  "axis_3_technology",
  "axis_4_defense",
  "axis_5_critical_inputs",
  "axis_6_logistics",
];

function getSortValue(c: ISICompositeCountry, key: SortKey): string | number {
  if (key === "country_name") return c.country_name;
  if (key === "isi_composite") return c.isi_composite ?? -1;
  if (key === "classification") return c.classification ?? "";
  // axis fields
  const val = c[key as keyof ISICompositeCountry];
  return typeof val === "number" ? val : -1;
}

function deviationClass(dev: number | null): string {
  if (dev === null) return "";
  const abs = Math.abs(dev);
  if (abs < 0.05) return "";
  if (dev > 0) {
    return abs > 0.15
      ? "text-red-700 dark:text-red-400 font-semibold"
      : "text-red-600/80 dark:text-red-400/80";
  }
  return abs > 0.15
    ? "text-green-700 dark:text-green-400 font-semibold"
    : "text-green-600/80 dark:text-green-400/80";
}

const CLASSIFICATION_OPTIONS: ScoreClassification[] = [
  "highly_concentrated",
  "moderately_concentrated",
  "mildly_concentrated",
  "unconcentrated",
];

// ─── Component ──────────────────────────────────────────────────────

export function CountryRankingsTable({
  countries,
  axes,
  mean,
}: CountryRankingsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("isi_composite");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState<ScoreClassification | "all">(
    "all"
  );
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Build axis metadata map (id → registry entry) for tooltips
  const axisMap = useMemo(() => {
    const m = new Map<number, AxisRegistryEntry>();
    for (const a of axes) m.set(a.id, a);
    return m;
  }, [axes]);

  // Derive column headers dynamically from axis registry
  const axisColumns = useMemo(() => {
    return AXIS_FIELD_KEYS.map((fieldKey, i) => {
      const entry = axisMap.get(i + 1);
      return {
        fieldKey,
        label: entry?.name ?? fieldKey.replace(/^axis_\d+_/, ""),
        tooltip: entry
          ? `${entry.description} (${entry.unit})`
          : "Axis metadata unavailable",
      };
    });
  }, [axisMap]);

  // Filter & sort
  const rows = useMemo(() => {
    let filtered = countries;

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.country_name.toLowerCase().includes(q) ||
          c.country.toLowerCase().includes(q)
      );
    }

    // Classification filter
    if (classFilter !== "all") {
      filtered = filtered.filter((c) => c.classification === classFilter);
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      const va = getSortValue(a, sortKey);
      const vb = getSortValue(b, sortKey);
      if (typeof va === "string" && typeof vb === "string") {
        return sortDir === "asc"
          ? va.localeCompare(vb)
          : vb.localeCompare(va);
      }
      const na = typeof va === "number" ? va : -1;
      const nb = typeof vb === "number" ? vb : -1;
      return sortDir === "asc" ? na - nb : nb - na;
    });

    return sorted;
  }, [countries, search, classFilter, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "country_name" ? "asc" : "desc");
    }
  }

  const sortIndicator = (colKey: SortKey) => {
    if (sortKey !== colKey) return null;
    return (
      <span className="ml-1 text-blue-500">
        {sortDir === "asc" ? "↑" : "↓"}
      </span>
    );
  };

  const thBase =
    "px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 cursor-pointer select-none whitespace-nowrap transition-colors hover:text-zinc-700 dark:hover:text-zinc-200";

  return (
    <div>
      {/* Controls Bar */}
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search country…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-800 placeholder-zinc-400 outline-none ring-blue-500 focus:border-blue-400 focus:ring-1 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:placeholder-zinc-500"
          />
          <select
            value={classFilter}
            onChange={(e) =>
              setClassFilter(
                e.target.value as ScoreClassification | "all"
              )
            }
            className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 outline-none ring-blue-500 focus:border-blue-400 focus:ring-1 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
          >
            <option value="all">All classifications</option>
            {CLASSIFICATION_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {classificationLabel(c)}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-zinc-400">
          {rows.length} of {countries.length} countries
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              {/* Expand toggle placeholder */}
              <th className="w-8 px-2 py-2.5" />
              <th
                className={`${thBase} text-left`}
                onClick={() => handleSort("country_name")}
              >
                Country
                {sortIndicator("country_name")}
              </th>
              <th
                className={`${thBase} text-right`}
                onClick={() => handleSort("isi_composite")}
              >
                ISI Composite
                {sortIndicator("isi_composite")}
              </th>
              {axisColumns.map((col) => (
                <th
                  key={col.fieldKey}
                  className={`${thBase} text-right`}
                  onClick={() => handleSort(col.fieldKey as SortKey)}
                  title={col.tooltip}
                >
                  {col.label}
                  {sortIndicator(col.fieldKey as SortKey)}
                </th>
              ))}
              <th
                className={`${thBase} text-center`}
                onClick={() => handleSort("classification")}
              >
                Classification
                {sortIndicator("classification")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-950">
            {rows.map((c) => {
              const isExpanded = expandedRow === c.country;
              const dev = deviationFromMean(c.isi_composite, mean);
              const axisScores = getAxisScores(c);

              return (
                <TableRow
                  key={c.country}
                  country={c}
                  isExpanded={isExpanded}
                  deviation={dev}
                  axisColumns={axisColumns}
                  axisScores={axisScores}
                  mean={mean}
                  onToggle={() =>
                    setExpandedRow(isExpanded ? null : c.country)
                  }
                />
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={axisColumns.length + 4}
                  className="px-4 py-8 text-center text-sm text-zinc-400"
                >
                  No countries match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Interpretation note */}
      <p className="mt-2 text-[11px] text-zinc-400 dark:text-zinc-500">
        Scores are Herfindahl-Hirschman Index (HHI) values on [0, 1]. Higher
        = more concentrated dependency.{" "}
        <span className="text-green-600 dark:text-green-400">Green</span>{" "}
        cells are below EU-27 mean;{" "}
        <span className="text-red-600 dark:text-red-400">red</span> cells are
        above.
      </p>
    </div>
  );
}

// ─── Row Sub-Component ──────────────────────────────────────────────

interface TableRowProps {
  country: ISICompositeCountry;
  isExpanded: boolean;
  deviation: number | null;
  axisColumns: { fieldKey: string; label: string; tooltip: string }[];
  axisScores: { key: string; label: string; value: number | null }[];
  mean: number | null;
  onToggle: () => void;
}

function TableRow({
  country: c,
  isExpanded,
  deviation,
  axisColumns,
  axisScores,
  mean,
  onToggle,
}: TableRowProps) {
  return (
    <>
      <tr className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900">
        {/* Expand toggle */}
        <td className="px-2 py-2.5 text-center">
          <button
            onClick={onToggle}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            aria-label={isExpanded ? "Collapse row" : "Expand row"}
          >
            <svg
              className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 4.5l7.5 7.5-7.5 7.5"
              />
            </svg>
          </button>
        </td>

        {/* Country */}
        <td className="whitespace-nowrap px-3 py-2.5 text-sm">
          <Link
            href={countryHref(c.country)}
            className="font-medium text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
          >
            {c.country_name}
          </Link>
          <span className="ml-1.5 text-xs text-zinc-400">{c.country}</span>
        </td>

        {/* ISI Composite */}
        <td
          className={`whitespace-nowrap px-3 py-2.5 text-right font-mono text-sm font-semibold ${deviationClass(deviation)}`}
        >
          {formatScore(c.isi_composite)}
        </td>

        {/* Axis scores */}
        {axisColumns.map((col, i) => {
          const score = axisScores[i]?.value ?? null;
          const axisDev = deviationFromMean(score, mean);
          return (
            <td
              key={col.fieldKey}
              className={`whitespace-nowrap px-3 py-2.5 text-right font-mono text-sm text-zinc-600 dark:text-zinc-400 ${deviationClass(axisDev)}`}
              title={col.tooltip}
            >
              {formatScore(score)}
            </td>
          );
        })}

        {/* Classification */}
        <td className="whitespace-nowrap px-3 py-2.5 text-center">
          <span title={c.classification ? classificationDescription(c.classification) : undefined}>
            <StatusBadge classification={c.classification} />
          </span>
        </td>
      </tr>

      {/* Expanded Row — Quick breakdown */}
      {isExpanded && (
        <tr className="bg-zinc-50/50 dark:bg-zinc-900/50">
          <td />
          <td colSpan={axisColumns.length + 3} className="px-3 py-4">
            <div className="flex flex-wrap gap-3">
              {axisScores.map((a) => {
                const axisDev = deviationFromMean(a.value, mean);
                return (
                  <div
                    key={a.key}
                    className="rounded-md border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                      {a.label}
                    </p>
                    <p
                      className={`mt-0.5 font-mono text-sm font-semibold ${deviationClass(axisDev)}`}
                    >
                      {formatScore(a.value)}
                    </p>
                    {axisDev !== null && (
                      <p className="text-[10px] text-zinc-400">
                        {axisDev >= 0 ? "+" : ""}
                        {axisDev.toFixed(4)} vs mean
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-3">
              <Link
                href={countryHref(c.country)}
                className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                View full country analysis →
              </Link>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
