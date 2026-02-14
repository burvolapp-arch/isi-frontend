import type { AxisRegistryEntry } from "@/lib/types";

interface AxisCardProps {
  axis: AxisRegistryEntry;
}

export function AxisCard({ axis }: AxisCardProps) {
  return (
    <div className="bg-surface-tertiary/60 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
            Axis {axis.id}
          </p>
          <h3 className="mt-1 font-serif text-[17px] font-semibold text-text-primary">
            {axis.name}
          </h3>
        </div>
        <span
          className={`inline-flex items-center rounded-sm px-2.5 py-1 text-[11px] font-medium ${
            axis.materialized
              ? "bg-band-unconcentrated/8 text-band-unconcentrated"
              : "bg-surface-tertiary text-text-quaternary"
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
            className="inline-flex items-center bg-surface-primary px-2.5 py-1 text-[11px] text-text-tertiary"
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
