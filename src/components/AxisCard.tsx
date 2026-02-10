import type { AxisRegistryEntry } from "@/lib/types";

interface AxisCardProps {
  axis: AxisRegistryEntry;
}

export function AxisCard({ axis }: AxisCardProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
            Axis {axis.id}
          </p>
          <h3 className="mt-1 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {axis.name}
          </h3>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            axis.materialized
              ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
              : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
          }`}
        >
          {axis.materialized ? "Active" : "Pending"}
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        {axis.description}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {axis.channels.map((ch) => (
          <span
            key={ch.id}
            className="inline-flex items-center rounded border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
            title={ch.source}
          >
            Ch. {ch.id}: {ch.name}
          </span>
        ))}
      </div>
      {axis.warnings.length > 0 && (
        <div className="mt-3 space-y-1">
          {axis.warnings.map((w) => (
            <p key={w.id} className="text-xs text-zinc-500 dark:text-zinc-500">
              <span
                className={`mr-1 font-semibold ${
                  w.severity === "HIGH"
                    ? "text-red-600 dark:text-red-400"
                    : w.severity === "MEDIUM"
                      ? "text-orange-600 dark:text-orange-400"
                      : "text-zinc-400"
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
