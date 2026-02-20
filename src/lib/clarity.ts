"use client";

import { useEffect } from "react";

const PROJECT_ID = "vhg0bs7xjn";

let initialized = false;

/**
 * Clarity analytics — non-critical, production-only.
 *
 * Guards:
 *   - Skipped in development / non-production builds.
 *   - Skipped when Do Not Track is active.
 *   - Skipped when offline.
 *   - Dynamic import so the module never loads if guards fail.
 *   - Full try/catch — any failure is silent.
 */
function useClarity() {
  useEffect(() => {
    if (initialized) return;
    if (typeof window === "undefined") return;
    if (process.env.NODE_ENV !== "production") return;
    if (navigator.doNotTrack === "1") return;
    if (!navigator.onLine) return;

    // Defer until after hydration + initial paint
    const init = () => {
      if (initialized) return;
      import("@microsoft/clarity")
        .then((mod) => {
          const Clarity = mod.default ?? mod;
          try {
            Clarity.init(PROJECT_ID);
            initialized = true;
            Clarity.identify("anonymous", undefined, window.location.pathname);
          } catch {
            // Beacon blocked, ad-blocker, network — silent.
          }
        })
        .catch(() => {
          // Module failed to load — silent.
        });
    };

    if (document.readyState === "complete") {
      init();
    } else {
      window.addEventListener("load", init, { once: true });
      return () => window.removeEventListener("load", init);
    }
  }, []);
}

export function ClarityAnalytics() {
  useClarity();
  return null;
}
