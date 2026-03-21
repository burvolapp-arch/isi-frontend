// ============================================================================
// ISI Health Check Endpoint
// ============================================================================
// Returns platform health status including backend connectivity.
// Used by uptime monitors and operational dashboards.
//
// Response shape:
//   { status, frontend, backend, latency_ms, dataset, methodology, timestamp }
// ============================================================================

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface HealthStatus {
  status: "healthy" | "degraded" | "down";
  frontend: "ok";
  backend: "ok" | "degraded" | "unreachable";
  latency_ms: number;
  dataset: string;
  methodology: string;
  timestamp: string;
}

export async function GET(): Promise<NextResponse<HealthStatus>> {
  const start = Date.now();
  let backendStatus: HealthStatus["backend"] = "unreachable";
  let dataset = "EU27_2024";
  let methodology = "ISI_v1.0";

  try {
    const url = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL;
    if (url) {
      const base = url.replace(/\/+$/, "");
      const res = await fetch(`${base}/`, {
        signal: AbortSignal.timeout(5000),
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const body = await res.json().catch(() => null);
        backendStatus = "ok";
        if (body?.version) methodology = `ISI_${body.version}`;
        if (body?.scope) dataset = body.scope.replace(/\s+/g, "_");
      } else {
        backendStatus = "degraded";
      }
    }
  } catch {
    backendStatus = "unreachable";
  }

  const latency = Date.now() - start;
  const overall: HealthStatus["status"] =
    backendStatus === "ok" ? "healthy" :
    backendStatus === "degraded" ? "degraded" :
    "down";

  const status = overall === "healthy" ? 200 : 503;

  return NextResponse.json(
    {
      status: overall,
      frontend: "ok" as const,
      backend: backendStatus,
      latency_ms: latency,
      dataset,
      methodology,
      timestamp: new Date().toISOString(),
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
  );
}
