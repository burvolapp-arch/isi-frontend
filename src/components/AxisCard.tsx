import type { AxisRegistryEntry } from "@/lib/types";

interface AxisCardProps {
  axis: AxisRegistryEntry;
}

export function AxisCard({ axis }: AxisCardProps) {
  return (
    <div className="border border-border-primary bg-surface-primary p-5 dark:bg-surface-primary">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-text-quaternary">
            Axis {axis.id}
          </p>
          <h3 className="mt-1 text-base font-semibold text-text-primary">
            {axis.name}
          </h3>
        </div>
        <span
          className={`inline-flex items-center border px-2 py-0.5 text-[11px] font-medium ${
            axis.materialized
              ? "border-severity-none/30 text-severity-none"
              : "border-border-primary text-text-quaternary"
          }`}
        >
          {axis.materialized ? "Active" : "Pending"}
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-text-tertiary">
        {axis.description}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {axis.channels.map((ch) => (
          <span
            key={ch.id}
            className="inline-flex items-center border border-border-primary bg-surface-tertiary px-2 py-0.5 text-[11px] text-text-tertiary"
            title={ch.source}
          >
            Ch. {ch.id}: {ch.name}
          </span>
        ))}
      </div>
      {axis.warnings.length > 0 && (
        <div className="mt-3 space-y-1">
          {axis.warnings.map((w) => (
            <p key={w.id} className="text-[11px] text-text-quaternary">
              <span
                className={`mr-1 font-semibold ${
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
