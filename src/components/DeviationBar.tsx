"use client";

/**
 * Horizontal deviation bar centered at zero.
 * Visual reference: IMF Article IV consultation charts.
 * Restrained color, clean alignment, monospace numerics.
 */

interface DeviationBarProps {
  label: string;
  score: number | null;
  mean: number | null;
  /** Maximum absolute deviation for scaling (defaults to 0.3) */
  maxDev?: number;
  href?: string;
}

export function DeviationBar({
  label,
  score,
  mean,
  maxDev = 0.3,
  href,
}: DeviationBarProps) {
  if (score === null || mean === null) {
    return (
      <div className="flex items-center gap-3 border-b border-border-subtle py-2">
        <span className="w-32 shrink-0 text-[14px] text-text-tertiary">
          {label}
        </span>
        <div className="h-5 flex-1 bg-surface-tertiary" />
        <span className="w-16 shrink-0 text-right font-mono text-[13px] text-text-quaternary">
          —
        </span>
      </div>
    );
  }

  const dev = score - mean;
  const clampedDev = Math.max(-maxDev, Math.min(maxDev, dev));
  const pct = (Math.abs(clampedDev) / maxDev) * 50;
  const isAbove = dev >= 0;

  const LabelTag = href ? "a" : "span";

  return (
    <div className="flex items-center gap-3 border-b border-border-subtle py-2">
      <LabelTag
        {...(href ? { href } : {})}
        className={`w-32 shrink-0 text-[14px] font-medium ${
          href
            ? "text-text-secondary hover:text-navy-700"
            : "text-text-secondary"
        }`}
      >
        {label}
      </LabelTag>
      <div className="relative h-5 flex-1 bg-surface-tertiary">
        {/* Center line (mean) */}
        <div className="absolute left-1/2 top-0 h-full w-px bg-stone-300" />
        {/* Deviation bar */}
        <div
          className={`absolute top-0.5 bottom-0.5 ${
            isAbove ? "bg-deviation-positive/40" : "bg-deviation-negative/40"
          }`}
          style={
            isAbove
              ? { left: "50%", width: `${pct}%` }
              : { right: "50%", width: `${pct}%` }
          }
        />
      </div>
      <span className="w-16 shrink-0 text-right font-mono text-[13px] text-text-secondary">
        {score.toFixed(4)}
      </span>
      <span
        className={`w-16 shrink-0 text-right font-mono text-[12px] ${
          isAbove ? "text-deviation-positive" : "text-deviation-negative"
        }`}
      >
        {dev >= 0 ? "+" : ""}
        {dev.toFixed(4)}
      </span>
    </div>
  );
}

/**
 * A full deviation bar chart for multiple axes.
 */
interface DeviationBarChartProps {
  items: {
    label: string;
    score: number | null;
    href?: string;
  }[];
  mean: number | null;
  maxDev?: number;
}

export function DeviationBarChart({
  items,
  mean,
  maxDev = 0.3,
}: DeviationBarChartProps) {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border-primary py-2 text-[10px] font-medium uppercase tracking-[0.12em] text-text-quaternary">
        <span className="w-32 shrink-0">Axis</span>
        <div className="flex flex-1 justify-between px-1">
          <span>−{maxDev.toFixed(2)}</span>
          <span>EU Mean</span>
          <span>+{maxDev.toFixed(2)}</span>
        </div>
        <span className="w-16 shrink-0 text-right">Score</span>
        <span className="w-16 shrink-0 text-right">Δ Mean</span>
      </div>
      {items.map((item) => (
        <DeviationBar
          key={item.label}
          label={item.label}
          score={item.score}
          mean={mean}
          maxDev={maxDev}
          href={item.href}
        />
      ))}
    </div>
  );
}
