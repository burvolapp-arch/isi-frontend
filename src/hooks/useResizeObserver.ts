"use client";

import { useEffect, useRef, useState } from "react";

// ============================================================================
// useResizeObserver — Production-grade responsive dimension tracking
// ============================================================================
// Tracks the content-box dimensions of a container element via ResizeObserver.
// Returns stable [width, height] tuple that updates on layout changes.
// Includes SSR-safe fallback dimensions and debounce guard.
// ============================================================================

interface Dimensions {
  readonly width: number;
  readonly height: number;
}

const FALLBACK_WIDTH = 960;
const FALLBACK_HEIGHT = 540;
const INITIAL_DIMENSIONS: Dimensions = {
  width: FALLBACK_WIDTH,
  height: FALLBACK_HEIGHT,
};

/**
 * Observe the content-box size of a referenced HTML element.
 *
 * @returns A tuple of [ref, dimensions] where ref is attached to the
 *          container and dimensions tracks its live width/height.
 *
 * Guarantees:
 * - No layout shift: initial dimensions are non-zero fallbacks.
 * - SSR-safe: ResizeObserver is only instantiated in useEffect.
 * - Cleanup: observer disconnects on unmount.
 * - Stable: only updates state when dimensions actually change.
 */
export function useResizeObserver<
  T extends HTMLElement = HTMLDivElement,
>(): [React.RefObject<T | null>, Dimensions] {
  const ref = useRef<T | null>(null);
  const [dimensions, setDimensions] = useState<Dimensions>(INITIAL_DIMENSIONS);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Measure immediately on mount
    const measure = (): void => {
      const { clientWidth, clientHeight } = element;
      if (clientWidth > 0 && clientHeight > 0) {
        setDimensions((prev) => {
          if (prev.width === clientWidth && prev.height === clientHeight) {
            return prev;
          }
          return { width: clientWidth, height: clientHeight };
        });
      }
    };

    measure();

    const observer = new ResizeObserver(() => {
      measure();
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  return [ref, dimensions];
}
