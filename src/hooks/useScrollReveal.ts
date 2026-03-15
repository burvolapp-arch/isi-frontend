"use client";

import { useEffect, useRef } from "react";

/**
 * useScrollReveal — IntersectionObserver-powered section reveal.
 *
 * Adds `.visible` to elements with `.fade-in` class when they enter
 * the viewport. Unobserves after triggering (one-shot).
 *
 * Usage:
 *   const containerRef = useScrollReveal();
 *   <section ref={containerRef}>
 *     <div className="fade-in">...</div>
 *   </section>
 *
 * Or for a single element:
 *   const ref = useScrollReveal<HTMLDivElement>();
 *   <div ref={ref} className="fade-in">...</div>
 */

export function useScrollReveal<T extends HTMLElement = HTMLElement>(
  options?: IntersectionObserverInit,
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect reduced motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Immediately show everything
      el.querySelectorAll(".fade-in").forEach((child) => {
        child.classList.add("visible");
      });
      if (el.classList.contains("fade-in")) {
        el.classList.add("visible");
      }
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        }
      },
      {
        threshold: 0.08,
        rootMargin: "0px 0px -40px 0px",
        ...options,
      },
    );

    // Observe the element itself if it has fade-in
    if (el.classList.contains("fade-in")) {
      observer.observe(el);
    }

    // Observe all children with fade-in
    el.querySelectorAll(".fade-in").forEach((child) => {
      observer.observe(child);
    });

    return () => observer.disconnect();
  }, [options]);

  return ref;
}

/**
 * useScrollRevealAll — observes all `.fade-in` elements within a container.
 * Call once at the page level to activate all reveals.
 */
export function useScrollRevealAll() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.querySelectorAll(".fade-in").forEach((el) => {
        el.classList.add("visible");
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" },
    );

    document.querySelectorAll(".fade-in").forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);
}
