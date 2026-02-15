"use client";

import { useEffect } from "react";
import Clarity from "@microsoft/clarity";

const PROJECT_ID = "vhg0bs7xjn";

let initialized = false;

function useClarity() {
  useEffect(() => {
    if (!initialized && typeof window !== "undefined") {
      Clarity.init(PROJECT_ID);
      initialized = true;

      Clarity.identify("anonymous", undefined, window.location.pathname);
    }
  }, []);
}

export function ClarityAnalytics() {
  useClarity();
  return null;
}
