"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Legacy route — redirects to /simulation.
 */
export default function ScenarioRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/simulation");
  }, [router]);

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <p className="text-[14px] text-text-tertiary">
        Redirecting to Simulation Laboratory…
      </p>
    </div>
  );
}
