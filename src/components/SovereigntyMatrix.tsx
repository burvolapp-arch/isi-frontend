import type { ISICompositeCountry } from "@/lib/types";
import { AXIS_FIELD_MAP, type AxisSlug } from "@/lib/axisRegistry";
import { formatAxisShort, formatScore } from "@/lib/presentation";

// ─── Axis definitions (derived from canonical registry) ─────────────

interface AxisDef {
  slug: AxisSlug;
  field: keyof ISICompositeCountry;
}

// Short uppercase labels for compact matrix display — via presentation layer
function matrixLabel(slug: AxisSlug): string {
  return formatAxisShort(slug).toUpperCase();
}

const AXES: AxisDef[] = [
  { slug: "energy", field: AXIS_FIELD_MAP.energy as keyof ISICompositeCountry },
  { slug: "financial", field: AXIS_FIELD_MAP.financial as keyof ISICompositeCountry },
  { slug: "defense", field: AXIS_FIELD_MAP.defense as keyof ISICompositeCountry },
  { slug: "technology", field: AXIS_FIELD_MAP.technology as keyof ISICompositeCountry },
  { slug: "critical_inputs", field: AXIS_FIELD_MAP.critical_inputs as keyof ISICompositeCountry },
  { slug: "logistics", field: AXIS_FIELD_MAP.logistics as keyof ISICompositeCountry },
];

const SCALE_MAX = 0.5;
const GRIDLINES = [0.1, 0.2, 0.3, 0.4, 0.5];

// ─── Mean computation ───────────────────────────────────────────────

function computeAxisMean(
  countries: readonly ISICompositeCountry[],
  field: keyof ISICompositeCountry,
): number | null {
  const values: number[] = [];
  for (const c of countries) {
    const v = c[field];
    if (typeof v === "number") values.push(v);
  }
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

// ─── Component ──────────────────────────────────────────────────────

interface SovereigntyMatrixProps {
  readonly countries: readonly ISICompositeCountry[];
}

export default function SovereigntyMatrix({
  countries,
}: SovereigntyMatrixProps) {
  const rows = AXES.map((axis) => ({
    label: matrixLabel(axis.slug),
    mean: computeAxisMean(countries, axis.field),
  }));

  return (
    <div className="w-full" role="figure" aria-label="EU-27 Mean Axis Exposure matrix">
      {/* Title */}
      <p
        className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500"
      >
        EU-27 Mean Axis Exposure
      </p>

      {/* Rows */}
      <div className="mt-4 space-y-4">
        {rows.map((row) => {
          const pct =
            row.mean !== null
              ? Math.min(row.mean / SCALE_MAX, 1) * 100
              : 0;
          return (
            <div key={row.label}>
              {/* Label row */}
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="block text-[11px] font-medium tracking-[0.08em] text-slate-400">
                    {row.label}
                  </span>
                  <span className="block text-[9px] tracking-[0.04em] text-slate-600">
                    HHI mean
                  </span>
                </div>
                <span className="font-mono text-[11px] tabular-nums text-slate-300">
                  {row.mean !== null ? formatScore(row.mean) : "—"}
                </span>
              </div>

              {/* Bar track */}
              <div className="relative mt-1.5 h-[6px] rounded-[3px] bg-slate-800">
                {/* Gridlines */}
                {GRIDLINES.map((v) => (
                  <div
                    key={v}
                    className="pointer-events-none absolute top-0 h-full w-px bg-slate-500"
                    style={{
                      left: `${(v / SCALE_MAX) * 100}%`,
                      opacity: 0.15,
                    }}
                  />
                ))}
                {/* Fill */}
                {row.mean !== null && (
                  <div
                    className="absolute inset-y-0 left-0 rounded-[3px] bg-slate-300"
                    style={{ width: `${pct}%` }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scale labels */}
      <div className="mt-2 flex justify-between">
        <span className="font-mono text-[9px] text-slate-600">0.00</span>
        <span className="font-mono text-[9px] text-slate-600">0.50</span>
      </div>
    </div>
  );
}
