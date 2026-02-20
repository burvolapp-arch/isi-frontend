import type { AxisRegistryEntry } from "@/lib/types";
import { formatAxisFull, formatSeverity, formatEnum } from "@/lib/presentation";
import { formatSourceInline } from "@/lib/sourceRegistry";

interface AxisCardProps {
  axis: AxisRegistryEntry;
}

export function AxisCard({ axis }: AxisCardProps) {
  return (
    <div className="group rounded-md border border-border-primary bg-white p-5 transition-[border-color,box-shadow] duration-150 hover:border-stone-300 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
            Axis {axis.id}
          </p>
          <h3 className="mt-1 font-serif text-[17px] font-semibold text-text-primary transition-colors group-hover:text-navy-700">
            {formatAxisFull(axis.slug)}
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
            title={formatSourceInline(ch.source)}
          >
            Ch. {ch.id}: {formatEnum(ch.name)}
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
                [{formatSeverity(w.severity)}]
              </span>
              {w.text}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
