"use client";

import { useEffect, useRef, useState } from "react";

// ═══════════════════════════════════════════════════════════════════════
// AnimatedNumber — smooth countUp/countDown transitions for KPI values
// ═══════════════════════════════════════════════════════════════════════

interface AnimatedNumberProps {
  /** Target numeric value */
  value: number | null;
  /** Decimal places to display (default: 4) */
  decimals?: number;
  /** Prefix string (e.g., "+", "−") */
  prefix?: string;
  /** Suffix string (e.g., "%", "pp") */
  suffix?: string;
  /** Animation duration in ms (default: 400) */
  duration?: number;
  /** CSS class applied to the <span> */
  className?: string;
  /** Fallback display when value is null */
  fallback?: string;
}

function formatValue(value: number, prefix: string, decimals: number, suffix: string): string {
  return `${prefix}${value.toFixed(decimals)}${suffix}`;
}

export function AnimatedNumber({
  value,
  decimals = 4,
  prefix = "",
  suffix = "",
  duration = 400,
  className,
  fallback = "—",
}: AnimatedNumberProps) {
  // Compute initial display synchronously (no effect needed)
  const initialDisplay = value !== null ? formatValue(value, prefix, decimals, suffix) : fallback;
  const [display, setDisplay] = useState(initialDisplay);
  const prevRef = useRef<number | null>(value);
  const rafRef = useRef(0);

  // Sync display when value/format changes — use rAF animation, not synchronous setState
  useEffect(() => {
    // Handle null → show fallback via rAF to avoid synchronous setState in effect
    if (value === null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setDisplay(fallback);
      });
      prevRef.current = null;
      return () => cancelAnimationFrame(rafRef.current);
    }

    const from = prevRef.current ?? value;
    prevRef.current = value;

    // Skip animation if no change or reduced motion
    if (
      from === value ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      rafRef.current = requestAnimationFrame(() => {
        setDisplay(formatValue(value, prefix, decimals, suffix));
      });
      return () => cancelAnimationFrame(rafRef.current);
    }

    const startTime = performance.now();
    const delta = value - from;

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + delta * eased;
      setDisplay(formatValue(current, prefix, decimals, suffix));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, decimals, prefix, suffix, duration, fallback]);

  return (
    <span className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {display}
    </span>
  );
}
