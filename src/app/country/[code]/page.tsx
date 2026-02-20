import Link from "next/link";
import { fetchCountry, fetchISI, ApiError } from "@/lib/api";
import { ErrorPanel } from "@/components/ErrorPanel";
import { StatusBadge } from "@/components/StatusBadge";
import { CountryView } from "@/components/CountryView";
import {
  computePercentile,
  extractCompositeScores,
  axisHref,
  isAggregatePartner,
  computeRank,
} from "@/lib/format";
import {
  formatAxisFull,
  formatEnum,
  formatSeverity,
  formatScore,
  formatVolume,
  formatDelta,
  formatPercentage,
} from "@/lib/presentation";
import { resolveSourceCitation } from "@/lib/sourceRegistry";
import type {
  CountryDetail,
  CountryAxisDetail,
  ChannelDetail,
  Warning,
} from "@/lib/types";

export const revalidate = 300;

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function CountryPage({ params }: PageProps) {
  const { code } = await params;
  const upperCode = code.toUpperCase();

  let country: CountryDetail | null = null;
  let error: { message: string; endpoint: string; status?: number } | null = null;

  const [countryResult, isiResult] = await Promise.allSettled([
    fetchCountry(upperCode),
    fetchISI(),
  ]);

  if (countryResult.status === "fulfilled") {
    country = countryResult.value;
  } else {
    const err = countryResult.reason;
    error = {
      message: err instanceof Error ? err.message : String(err),
      endpoint: `/country/${upperCode}`,
      status: err instanceof ApiError ? err.status : undefined,
    };
  }

  const isi = isiResult.status === "fulfilled" ? isiResult.value : null;

  if (error || !country) {
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
              title={`Failed to load country ${upperCode}`}
              message={error?.message ?? "Unknown error"}
              endpoint={error?.endpoint}
              status={error?.status}
            />
          </div>
        </main>
      </div>
    );
  }

  const allScores = isi ? extractCompositeScores(isi.countries) : [];
  const percentile =
    country.isi_composite !== null && allScores.length > 0
      ? computePercentile(country.isi_composite, allScores)
      : null;
  const rank =
    country.isi_composite !== null && allScores.length > 0
      ? computeRank(country.isi_composite, allScores)
      : null;
  const totalRanked = allScores.length;
  const compositeMean = isi?.statistics.mean ?? null;

  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-[1400px] px-4 pb-16 sm:px-6 lg:px-16">
        {/* ── Breadcrumb ── */}
        <div className="pt-6 sm:pt-10">
          <Link
            href="/"
            className="text-[13px] text-text-tertiary hover:text-text-primary"
          >
            ← Back to Overview
          </Link>
        </div>

        {/* ── Country Header + Mode Toggle + Views (client) ── */}
        <CountryView
          country={country}
          isi={isi}
          code={code}
          allScores={allScores}
          rank={rank}
          totalRanked={totalRanked}
          percentile={percentile}
          compositeMean={compositeMean}
        />

        {/* ── Per-Axis Details (always visible) ── */}
        <div className="mt-10 mb-16 space-y-3">
          {country.axes.map((axis) => (
            <AxisSection key={axis.axis_id} axis={axis} />
          ))}
        </div>
      </main>
    </div>
  );
}

// ─── Axis Section Sub-Component ────────────────────────────────────

function AxisSection({ axis }: { axis: CountryAxisDetail }) {
  return (
    <section className="mt-8 rounded-md border border-border-primary">
      <div className="border-b border-border-subtle px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
              Axis {axis.axis_id}
            </p>
            <h3 className="mt-1 font-serif text-[16px] font-semibold text-text-primary sm:text-[17px]">
              <Link
                href={axisHref(axis.axis_slug)}
                className="hover:text-navy-700"
              >
                {formatAxisFull(axis.axis_slug)}
              </Link>
            </h3>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="font-mono text-lg font-bold text-text-primary">
              {formatScore(axis.score)}
            </span>
            <StatusBadge classification={axis.classification} />
          </div>
        </div>
        <p className="mt-2 text-sm text-text-tertiary">
          {axis.driver_statement}
        </p>
      </div>

      <div className="px-4 py-4 space-y-4 sm:px-5">
        {/* Audit breakdown */}
        {axis.audit && (() => {
          const entries = Object.entries(axis.audit).filter(
            ([, val]) => val !== null && val !== undefined && val !== ""
          );
          if (entries.length === 0) return null;
          return (
            <div>
              <h4 className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
                Audit Breakdown
              </h4>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {entries.map(([key, val]) => (
                  <div
                    key={key}
                    className="rounded-md border border-border-primary bg-surface-tertiary p-3"
                  >
                    <p className="text-[11px] text-text-quaternary">
                      {formatEnum(key)}
                    </p>
                    <p className="font-mono text-sm font-medium text-text-secondary">
                      {typeof val === "number"
                        ? /volume|trade_value|import|export/i.test(key) && val > 1000
                          ? formatVolume(val)
                          : formatScore(val)
                        : formatEnum(String(val))}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Channels with partners */}
        {axis.channels && axis.channels.length > 0 && (
          <div>
            <h4 className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
              Channels
            </h4>
            <div className="mt-2 space-y-3">
              {axis.channels.map((ch: ChannelDetail) => (
                <ChannelBlock key={ch.channel_id} channel={ch} />
              ))}
            </div>
          </div>
        )}

        {/* Fuel concentrations (axis-specific) */}
        {axis.fuel_concentrations && (
          <div>
            <h4 className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
              Fuel Concentrations
            </h4>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
              {Object.entries(axis.fuel_concentrations).map(([fuel, hhi]) => (
                <div
                  key={fuel}
                  className="rounded-md border border-border-primary bg-surface-tertiary p-3"
                >
                  <p className="text-[11px] text-text-quaternary">
                    {formatEnum(fuel)}
                  </p>
                  <p className="font-mono text-sm font-medium text-text-secondary">
                    {formatScore(hhi)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warnings */}
        {axis.warnings.length > 0 && (
          <div>
            <h4 className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
              Warnings
            </h4>
            <ul className="mt-2 space-y-1">
              {axis.warnings.map((w: Warning) => (
                <li
                  key={w.id}
                  className="text-xs text-text-tertiary"
                >
                  <span
                    className={`mr-1 font-semibold ${
                      w.severity === "HIGH"
                        ? "text-severity-high"
                        : w.severity === "MEDIUM"
                          ? "text-severity-medium"
                          : "text-text-quaternary"
                    }`}
                  >
                    [{formatSeverity(w.severity)}]
                  </span>
                  {w.text}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Channel Block Sub-Component ───────────────────────────────────

function ChannelBlock({ channel }: { channel: ChannelDetail }) {
  const citation = resolveSourceCitation(channel.source);
  return (
    <div className="rounded-md border border-border-primary bg-surface-tertiary p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-text-secondary">
          Ch.&thinsp;{channel.channel_id}: {formatEnum(channel.channel_name)}
        </p>
        {channel.total_partners != null && (
          <span className="text-[11px] text-text-quaternary">
            {channel.total_partners} partners
          </span>
        )}
      </div>
      <p className="text-[11px] text-text-quaternary">
        {citation.displayName}
        {citation.publisher !== "See source documentation" && (
          <span> · {citation.publisher}</span>
        )}
      </p>

      {/* Top partners */}
      {(() => {
        const validPartners = (channel.top_partners ?? []).filter(
          (p) => !isAggregatePartner(p.partner)
        );
        if (validPartners.length === 0) return null;
        return (
          <div className="mt-2">
            <p className="text-[11px] font-medium text-text-quaternary">Top Partners</p>
            <div className="mt-1 space-y-1">
              {validPartners.map((p, i) => (
                <div
                  key={`${p.partner}-${i}`}
                  className="flex items-center justify-between"
                >
                  <span className="text-xs text-text-tertiary">
                    {p.partner}
                  </span>
                    <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 overflow-hidden bg-stone-200">
                      <div
                        className="h-full bg-navy-700"
                        style={{ width: formatPercentage(p.share, "share") }}
                      />
                    </div>
                    <span className="w-14 text-right font-mono text-[11px] text-text-quaternary">
                      {formatPercentage(p.share, "share")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Subcategories */}
      {channel.subcategories && channel.subcategories.length > 0 && (
        <div className="mt-2">
          <p className="text-[11px] font-medium text-text-quaternary">Subcategories</p>
          <div className="mt-1 overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-text-quaternary">
                  <th className="pr-3 text-left font-medium">Category</th>
                  <th className="pr-3 text-right font-medium">HHI</th>
                  <th className="text-right font-medium">Volume</th>
                </tr>
              </thead>
              <tbody>
                {channel.subcategories.map((s, i) => (
                  <tr
                    key={`${s.category}-${i}`}
                    className="text-text-tertiary"
                  >
                    <td className="pr-3 py-0.5">{formatEnum(s.category)}</td>
                    <td className="pr-3 py-0.5 text-right font-mono">
                      {formatScore(s.concentration)}
                    </td>
                    <td className="py-0.5 text-right font-mono">
                      {s.volume !== undefined
                        ? formatVolume(s.volume)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
