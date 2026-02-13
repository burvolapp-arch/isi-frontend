"use client";

/**
 * Horizontal deviation bar centered at zero.
 * Shows how a score deviates from a reference (e.g., EU mean).
 * Bar extends left (below mean — green) or right (above mean — red).
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
      <div className="flex items-center gap-3 py-1.5">
        <span className="w-28 shrink-0 text-sm text-text-tertiary">
          {label}
        </span>
        <div className="flex-1 h-5 bg-surface-tertiary" />
        <span className="w-16 shrink-0 text-right font-mono text-xs text-text-quaternary">
          —
        </span>
      </div>
    );
  }

  const dev = score - mean;
  const clampedDev = Math.max(-maxDev, Math.min(maxDev, dev));
  const pct = (Math.abs(clampedDev) / maxDev) * 50; // 50% is half the bar
  const isAbove = dev >= 0;

  const LabelTag = href ? "a" : "span";

  return (
    <div className="flex items-center gap-3 py-1.5">
      <LabelTag
        {...(href ? { href } : {})}
        className={`w-28 shrink-0 text-sm font-medium ${
          href
            ? "text-text-secondary hover:text-accent"
            : "text-text-secondary"
        }`}
      >
        {label}
      </LabelTag>
      <div className="flex-1 h-5 bg-surface-tertiary relative">
        {/* Center line (mean) */}
        <div className="absolute left-1/2 top-0 h-full w-px bg-border-secondary" />
        {/* Deviation bar */}
        <div
          className={`absolute top-0 h-full ${
            isAbove ? "bg-deviation-positive/60" : "bg-deviation-negative/60"
          }`}
          style={
            isAbove
              ? { left: "50%", width: `${pct}%` }
              : { right: "50%", width: `${pct}%` }
          }
        />
      </div>
      <span className="w-16 shrink-0 text-right font-mono text-xs text-text-secondary">
        {score.toFixed(4)}
      </span>
      <span
        className={`w-16 shrink-0 text-right font-mono text-[11px] ${
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
    <div className="space-y-0.5">
      {/* Header */}
      <div className="flex items-center gap-3 py-1 text-[10px] font-medium uppercase tracking-wider text-text-quaternary">
        <span className="w-28 shrink-0">Axis</span>
        <div className="flex-1 flex justify-between px-1">
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
