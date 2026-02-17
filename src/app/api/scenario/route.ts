// ============================================================================
// Next.js API Route — Scenario Proxy
// ============================================================================
// Eliminates browser-level CORS by proxying scenario POST requests
// through the Next.js server. The browser only talks to the same origin;
// the server-side fetch to the backend has no CORS constraints.
//
// CONTRACT BRIDGE:
//   Frontend sends:  { country: "SE", adjustments: { defense: 0.10 } }
//   Backend expects:  { country_code: "SE", adjustments: { defense: 0.10 } }
//   Backend returns:  { composite, rank, classification, axes[], request_id }
//   Frontend expects: { simulated_axes[], simulated_composite, simulated_rank,
//                       simulated_classification, baseline_composite, ... }
//
// This proxy transforms in both directions so neither side changes.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getBackendUrl(): string | null {
  const url = process.env.BACKEND_URL;
  if (!url) return null;
  return url.replace(/\/+$/, "");
}

// ── Backend response shape (v0.2 contract) ──────────────────────────

interface BackendAxis {
  slug: string;
  value: number;
  delta: number;
}

interface BackendScenarioResponse {
  composite: number;
  rank: number;
  classification: string;
  axes: BackendAxis[];
  request_id: string;
}

// ── POST /api/scenario ──────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const backendUrl = getBackendUrl();

  if (!backendUrl) {
    return NextResponse.json(
      { error: "Backend URL not configured" },
      { status: 500 },
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  if (
    typeof payload !== "object" ||
    payload === null ||
    !("country" in payload) ||
    !("adjustments" in payload)
  ) {
    return NextResponse.json(
      { error: "Missing required fields: country, adjustments" },
      { status: 400 },
    );
  }

  const { country, adjustments } = payload as {
    country: string;
    adjustments: Record<string, number>;
  };

  // Transform to backend contract: country → country_code
  const backendPayload = {
    country_code: country,
    adjustments,
  };

  if (process.env.NODE_ENV !== "production") {
    console.log(
      "[scenario proxy] forwarding →",
      `${backendUrl}/scenario`,
      JSON.stringify(backendPayload).slice(0, 200),
    );
  }

  try {
    const upstream = await fetch(`${backendUrl}/scenario`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(backendPayload),
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      if (process.env.NODE_ENV !== "production") {
        console.error(
          "[scenario proxy] upstream error",
          upstream.status,
          text.slice(0, 300),
        );
      }
      return NextResponse.json(
        { error: "Upstream simulation service unavailable", status: upstream.status },
        { status: upstream.status },
      );
    }

    const data: BackendScenarioResponse = await upstream.json();

    // ── Transform backend response → frontend ScenarioResponse ──
    const simulatedAxes = data.axes.map((a) => ({
      axis_slug: a.slug,
      baseline: a.value - a.delta,
      simulated: a.value,
      delta: a.delta,
    }));

    // Baseline composite = mean of baseline values (ISI uses equal-weight mean)
    const baselineValues = simulatedAxes.map((a) => a.baseline);
    const baselineComposite =
      baselineValues.length > 0
        ? baselineValues.reduce((s, v) => s + v, 0) / baselineValues.length
        : null;

    const transformed = {
      country,
      simulated_axes: simulatedAxes,
      simulated_composite: data.composite,
      simulated_rank: data.rank,
      simulated_classification: data.classification,
      baseline_composite: baselineComposite,
      baseline_rank: null,                 // not returned by backend; page falls back to locally computed rank
      baseline_classification: null,       // not returned by backend; page falls back to country data
      delta_from_baseline:
        baselineComposite !== null
          ? data.composite - baselineComposite
          : null,
    };

    return NextResponse.json(transformed);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[scenario proxy] network failure", err);
    }
    return NextResponse.json(
      { error: "Upstream simulation service unavailable" },
      { status: 502 },
    );
  }
}

// ── GET — 405 Method Not Allowed ────────────────────────────────────

export function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST." },
    { status: 405 },
  );
}
