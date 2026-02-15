"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ============================================================================
// useResizeObserver — Fail-safe responsive dimension tracking
// ============================================================================
//
// Tracks content-box dimensions via ResizeObserver with:
// - SSR-safe guard (no ResizeObserver in Node)
// - Non-zero fallback dimensions to prevent zero-size SVG
// - Stable state updates (only fires when dimensions actually change)
// - Cleanup on unmount
// - rAF batching to avoid layout thrash
//
// ============================================================================

interface Dimensions {
  readonly width: number;
  readonly height: number;
}

const FALLBACK: Dimensions = { width: 960, height: 540 } as const;

/**
 * Observe the content-box size of a referenced HTML element.
 *
 * @returns `[ref, dimensions]` — attach `ref` to a container,
 *          `dimensions` gives its live `{ width, height }`.
 *
 * Guarantees:
 * - Returns non-zero dimensions from the first render (fallback).
 * - Only updates React state when width or height actually changes.
 * - Disconnects observer on unmount.
 * - Does nothing on the server.
 */
export function useResizeObserver<
  T extends HTMLElement = HTMLDivElement,
>(): [React.RefObject<T | null>, Dimensions] {
  const ref = useRef<T | null>(null);
  const [dims, setDims] = useState<Dimensions>(FALLBACK);
  const rafRef = useRef<number>(0);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (w > 0 && h > 0) {
      setDims((prev) => {
        if (prev.width === w && prev.height === h) return prev;
        return { width: w, height: h };
      });
    }
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof ResizeObserver === "undefined") return;

    // Measure immediately
    measure();

    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(measure);
    });

    observer.observe(el);

    return () => {
      cancelAnimationFrame(rafRef.current);
      observer.disconnect();
    };
  }, [measure]);

  return [ref, dims];
}
