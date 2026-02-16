import type { AxisRegistryEntry } from "@/lib/types";
import { getCanonicalAxisName } from "@/lib/axisRegistry";

interface AxisCardProps {
  axis: AxisRegistryEntry;
}

export function AxisCard({ axis }: AxisCardProps) {
  return (
    <div className="rounded-md border border-border-primary bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
            Axis {axis.id}
          </p>
          <h3 className="mt-1 font-serif text-[17px] font-semibold text-text-primary">
            {getCanonicalAxisName(axis.slug)}
          </h3>
        </div>
        <span
          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium ${
            axis.materialized
              ? "text-band-unconcentrated"
              : "text-text-quaternary"
          }`}
        >
          {axis.materialized ? "Active" : "Pending"}
        </span>
      </div>
      <p className="mt-3 text-[14px] leading-relaxed text-text-tertiary">
        {axis.description}
      </p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {axis.channels.map((ch) => (
          <span
            key={ch.id}
            className="inline-flex items-center rounded-md border border-border-primary px-2 py-0.5 text-[10px] text-text-tertiary"
            title={ch.source}
          >
            Ch. {ch.id}: {ch.name}
          </span>
        ))}
      </div>
      {axis.warnings.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {axis.warnings.map((w) => (
            <p key={w.id} className="text-[12px] text-text-quaternary">
              <span
                className={`mr-1.5 font-medium ${
                  w.severity === "HIGH"
                    ? "text-severity-high"
                    : w.severity === "MEDIUM"
                      ? "text-severity-medium"
                      : "text-text-quaternary"
                }`}
              >
                [{w.severity}]
              </span>
              {w.text}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
