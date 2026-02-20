"use client";

import { useEffect } from "react";
import Clarity from "@microsoft/clarity";

const PROJECT_ID = "vhg0bs7xjn";

let initialized = false;

function useClarity() {
  useEffect(() => {
    if (!initialized && typeof window !== "undefined") {
      try {
        Clarity.init(PROJECT_ID);
        initialized = true;
        Clarity.identify("anonymous", undefined, window.location.pathname);
      } catch {
        // Clarity may fail if the network is unavailable or the beacon is blocked
        // by an ad-blocker / privacy extension. Non-critical — fail silently.
      }
    }
  }, []);
}

export function ClarityAnalytics() {
  useClarity();
  return null;
}
