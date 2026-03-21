"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Floating scroll-to-top button — appears after scrolling past one viewport.
 * Smooth animation in/out. Positioned above mobile nav.
 */
export function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  const checkScroll = useCallback(() => {
    const threshold = typeof window !== "undefined" ? window.innerHeight * 0.9 : 600;
    const shouldShow = window.scrollY > threshold;
    setVisible(shouldShow);
    if (shouldShow && !mounted) setMounted(true);
  }, [mounted]);

  useEffect(() => {
    window.addEventListener("scroll", checkScroll, { passive: true });
    return () => window.removeEventListener("scroll", checkScroll);
  }, [checkScroll]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  if (!mounted) return null;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Scroll to top"
      className={`
        fixed bottom-20 right-4 z-40 flex h-10 w-10 items-center justify-center
        rounded-full border border-border-primary bg-surface-primary/90
        text-text-secondary shadow-[var(--shadow-tooltip)] backdrop-blur-sm
        transition-colors hover:bg-surface-elevated hover:text-text-primary
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent
        sm:bottom-8 sm:right-6
        ${visible ? "scroll-top-visible" : "scroll-top-hidden"}
      `}
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
      </svg>
    </button>
  );
}
