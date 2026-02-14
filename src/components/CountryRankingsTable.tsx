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
  computePercentile,
  extractCompositeScores,
  deriveAxisColumns,
  countryHref,
  axisHref,
} from "@/lib/format";
import { StatusBadge } from "./StatusBadge";

// ─── Types ──────────────────────────────────────────────────────────

type SortKey =
  | "rank"
  | "country_name"
  | "isi_composite"
  | "percentile"
  | "deviation"
  | `axis_${string}`
  | "classification";
type SortDir = "asc" | "desc";

interface CountryRankingsTableProps {
  countries: ISICompositeCountry[];
  axes: AxisRegistryEntry[];
  mean: number | null;
}

// ─── Helpers ────────────────────────────────────────────────────────

function getSortValue(
  c: ISICompositeCountry,
  key: SortKey,
  allScores: number[],
  mean: number | null
): string | number {
  if (key === "country_name") return c.country_name;
  if (key === "isi_composite") return c.isi_composite ?? -1;
  if (key === "classification") return c.classification ?? "";
  if (key === "percentile") {
    return c.isi_composite !== null
      ? computePercentile(c.isi_composite, allScores)
      : -1;
  }
  if (key === "deviation") {
    if (c.isi_composite === null || mean === null) return -999;
    return c.isi_composite - mean;
  }
  if (key === "rank") return c.isi_composite ?? -1;
  const val = (c as unknown as Record<string, unknown>)[key];
  return typeof val === "number" ? val : -1;
}

function deviationClass(dev: number | null): string {
  if (dev === null) return "";
  const abs = Math.abs(dev);
  if (abs < 0.03) return "text-text-tertiary";
  if (dev > 0) {
    return abs > 0.1
      ? "text-deviation-positive font-medium"
      : "text-deviation-positive/80";
  }
  return abs > 0.1
    ? "text-deviation-negative font-medium"
    : "text-deviation-negative/80";
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

  const allScores = useMemo(
    () => extractCompositeScores(countries),
    [countries]
  );

  const axisColumns = useMemo(() => {
    if (countries.length === 0) return [];
    return deriveAxisColumns(countries[0], axes);
  }, [countries, axes]);

  const rows = useMemo(() => {
    let filtered = countries;

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.country_name.toLowerCase().includes(q) ||
          c.country.toLowerCase().includes(q)
      );
    }

    if (classFilter !== "all") {
      filtered = filtered.filter((c) => c.classification === classFilter);
    }

    const sorted = [...filtered].sort((a, b) => {
      const va = getSortValue(a, sortKey, allScores, mean);
      const vb = getSortValue(b, sortKey, allScores, mean);
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
  }, [countries, search, classFilter, sortKey, sortDir, allScores, mean]);

  const rankMap = useMemo(() => {
    const ranked = [...countries]
      .filter((c) => c.isi_composite !== null)
      .sort((a, b) => (b.isi_composite ?? 0) - (a.isi_composite ?? 0));
    const map = new Map<string, number>();
    ranked.forEach((c, i) => map.set(c.country, i + 1));
    return map;
  }, [countries]);

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
      <span className="ml-1 text-navy-700">
        {sortDir === "asc" ? "↑" : "↓"}
      </span>
    );
  };

  const thBase =
    "px-3 py-3 text-[11px] font-medium uppercase tracking-[0.1em] text-text-quaternary cursor-pointer select-none whitespace-nowrap hover:text-text-secondary transition-colors";

  return (
    <div>
      {/* Controls Bar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search country…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-b border-border-primary bg-transparent px-0 py-1.5 text-[14px] text-text-primary placeholder-text-quaternary outline-none focus:border-navy-700"
          />
          <select
            value={classFilter}
            onChange={(e) =>
              setClassFilter(
                e.target.value as ScoreClassification | "all"
              )
            }
            className="border-b border-border-primary bg-transparent px-0 py-1.5 text-[14px] text-text-secondary outline-none focus:border-navy-700"
          >
            <option value="all">All classifications</option>
            {CLASSIFICATION_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {classificationLabel(c)}
              </option>
            ))}
          </select>
        </div>
        <p className="text-[12px] text-text-quaternary">
          {rows.length} of {countries.length} countries
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b-2 border-navy-900">
              <th
                className={`${thBase} w-12 text-center`}
                onClick={() => handleSort("rank")}
              >
                #
                {sortIndicator("rank")}
              </th>
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
                Composite
                {sortIndicator("isi_composite")}
              </th>
              <th
                className={`${thBase} text-right`}
                onClick={() => handleSort("percentile")}
              >
                Pctl
                {sortIndicator("percentile")}
              </th>
              <th
                className={`${thBase} text-right`}
                onClick={() => handleSort("deviation")}
              >
                Δ Mean
                {sortIndicator("deviation")}
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
          <tbody>
            {rows.map((c, i) => {
              const isExpanded = expandedRow === c.country;
              const dev = deviationFromMean(c.isi_composite, mean);
              const pctl =
                c.isi_composite !== null
                  ? computePercentile(c.isi_composite, allScores)
                  : null;

              return (
                <TableRow
                  key={c.country}
                  country={c}
                  isExpanded={isExpanded}
                  deviation={dev}
                  percentile={pctl}
                  rank={rankMap.get(c.country) ?? null}
                  axisColumns={axisColumns}
                  mean={mean}
                  rowIndex={i}
                  onToggle={() =>
                    setExpandedRow(isExpanded ? null : c.country)
                  }
                />
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={axisColumns.length + 6}
                  className="px-4 py-10 text-center text-[14px] text-text-quaternary"
                >
                  No countries match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Interpretation note */}
      <p className="mt-4 text-[12px] leading-relaxed text-text-quaternary">
        Scores are Herfindahl-Hirschman Index (HHI) values on [0, 1]. Higher
        = more concentrated dependency.{" "}
        <span className="text-deviation-negative">Below-mean</span>{" "}
        values indicate less dependency;{" "}
        <span className="text-deviation-positive">above-mean</span> values
        indicate more. Δ Mean shows deviation from the EU-27 composite average.
      </p>
    </div>
  );
}

// ─── Row Sub-Component ──────────────────────────────────────────────

interface TableRowProps {
  country: ISICompositeCountry;
  isExpanded: boolean;
  deviation: number | null;
  percentile: number | null;
  rank: number | null;
  axisColumns: { fieldKey: string; axisId: number; label: string; slug: string; tooltip: string }[];
  mean: number | null;
  rowIndex: number;
  onToggle: () => void;
}

function TableRow({
  country: c,
  isExpanded,
  deviation,
  percentile,
  rank,
  axisColumns,
  mean,
  rowIndex,
  onToggle,
}: TableRowProps) {
  // Zebra striping — warm tone
  const zebraClass = rowIndex % 2 === 1 ? "bg-stone-50/60" : "";

  // Border-left indicator based on classification
  const borderIndicator = (() => {
    switch (c.classification) {
      case "highly_concentrated":
        return "border-l-2 border-l-band-highly";
      case "moderately_concentrated":
        return "border-l-2 border-l-band-moderately";
      case "mildly_concentrated":
        return "border-l-2 border-l-band-mildly";
      case "unconcentrated":
        return "border-l-2 border-l-band-unconcentrated";
      default:
        return "border-l-2 border-l-transparent";
    }
  })();

  return (
    <>
      <tr className={`border-b border-border-subtle hover:bg-stone-100/60 transition-colors ${zebraClass} ${borderIndicator}`}>
        {/* Rank */}
        <td className="whitespace-nowrap px-3 py-2.5 text-center text-[13px] text-text-quaternary">
          <button
            onClick={onToggle}
            className="inline-flex items-center gap-1.5 text-text-quaternary hover:text-text-primary transition-colors"
            aria-label={isExpanded ? "Collapse row" : "Expand row"}
          >
            <svg
              className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-90" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 4.5l7.5 7.5-7.5 7.5"
              />
            </svg>
            {rank ?? "—"}
          </button>
        </td>

        {/* Country */}
        <td className="whitespace-nowrap px-3 py-2.5 text-[14px]">
          <Link
            href={countryHref(c.country)}
            className="font-medium text-text-primary hover:text-navy-700 transition-colors"
          >
            {c.country_name}
          </Link>
          <span className="ml-2 font-mono text-[11px] text-text-quaternary">
            {c.country}
          </span>
        </td>

        {/* ISI Composite */}
        <td
          className={`whitespace-nowrap px-3 py-2.5 text-right font-mono text-[14px] font-medium ${deviationClass(deviation)}`}
        >
          {formatScore(c.isi_composite)}
        </td>

        {/* Percentile */}
        <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-[13px] text-text-tertiary">
          {percentile !== null ? `P${percentile}` : "—"}
        </td>

        {/* Deviation from mean */}
        <td
          className={`whitespace-nowrap px-3 py-2.5 text-right font-mono text-[12px] ${deviationClass(deviation)}`}
        >
          {deviation !== null
            ? `${deviation >= 0 ? "+" : ""}${deviation.toFixed(4)}`
            : "—"}
        </td>

        {/* Axis scores (dynamic) */}
        {axisColumns.map((col) => {
          const score = (c as unknown as Record<string, unknown>)[col.fieldKey] as number | null;
          const axisDev = deviationFromMean(score, mean);
          return (
            <td
              key={col.fieldKey}
              className={`whitespace-nowrap px-3 py-2.5 text-right font-mono text-[13px] ${deviationClass(axisDev)}`}
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
        <tr className="bg-surface-tertiary/40">
          <td />
          <td colSpan={axisColumns.length + 5} className="px-4 py-5">
            <div className="flex flex-wrap gap-3">
              {axisColumns.map((col) => {
                const score = (c as unknown as Record<string, unknown>)[col.fieldKey] as number | null;
                const axisDev = deviationFromMean(score, mean);
                return (
                  <Link
                    key={col.fieldKey}
                    href={axisHref(col.slug)}
                    className="bg-surface-primary px-4 py-3 transition-colors hover:bg-stone-100"
                  >
                    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
                      {col.label}
                    </p>
                    <p
                      className={`mt-1 font-mono text-[15px] font-medium ${deviationClass(axisDev)}`}
                    >
                      {formatScore(score)}
                    </p>
                    {axisDev !== null && (
                      <p className="mt-0.5 font-mono text-[11px] text-text-quaternary">
                        {axisDev >= 0 ? "+" : ""}
                        {axisDev.toFixed(4)} vs mean
                      </p>
                    )}
                  </Link>
                );
              })}
            </div>
            <div className="mt-4">
              <Link
                href={countryHref(c.country)}
                className="text-[13px] font-medium text-navy-700 hover:underline"
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
