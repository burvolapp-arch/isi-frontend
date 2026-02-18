// ============================================================================
// Next.js API Route — Scenario Proxy
// ============================================================================
// Same-origin proxy for scenario simulation. The browser only talks to
// this route; the server-side fetch to the backend has no CORS constraints.
//
// STABILIZED CONTRACT:
//   Backend expects:  { country_code, adjustments: { <canonical_slug>: float }, meta }
//   Backend returns:  { composite, rank, classification, axes[], request_id }
//   Frontend expects: { simulated_axes[], simulated_composite, simulated_rank,
//                       simulated_classification, baseline_composite, ... }
//
// INVARIANTS:
//   - All 6 canonical axes present in adjustments (no partials)
//   - All values are floats clamped to [-0.20, +0.20]
//   - No unknown keys forwarded
//   - 200 responses validated for required fields before returning
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { validateProxyBody, isValidScenarioResponse } from "@/lib/scenarioValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── Helpers ─────────────────────────────────────────────────────────

function getBackendUrl(): string {
  const url =
    process.env.BACKEND_URL ||
    "https://isi-backend-production.up.railway.app";
  return url.replace(/\/+$/, "");
}

function log(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.log("[scenario proxy]", ...args);
}
function logError(...args: unknown[]) {
  console.error("[scenario proxy]", ...args);
}

// ── POST /api/scenario ──────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const backendUrl = getBackendUrl();

  // ── 1. Parse incoming request ──

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  // ── 2. Validate and sanitize — only canonical keys, only valid ranges ──

  const validated = validateProxyBody(rawBody);
  if (!validated) {
    logError("rejected malformed payload:", JSON.stringify(rawBody).slice(0, 500));
    return NextResponse.json(
      { error: "Invalid scenario input: payload does not match expected schema" },
      { status: 400 },
    );
  }

  // ── 3. Construct exact backend payload — no extra keys ──

  const backendPayload = {
    country_code: validated.country_code,
    adjustments: validated.adjustments,
    meta: validated.meta,
  };

  log("→", `${backendUrl}/scenario`, JSON.stringify(backendPayload).slice(0, 500));

  // ── 4. Forward to backend ──

  let upstream: Response;
  try {
    upstream = await fetch(`${backendUrl}/scenario`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      cache: "no-store",
      body: JSON.stringify(backendPayload),
    });
  } catch (err) {
    logError("network failure reaching backend:", String(err));
    return NextResponse.json(
      { error: "Cannot reach simulation backend" },
      { status: 502 },
    );
  }

  // ── 5. Handle upstream errors ──

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    logError("upstream", upstream.status, text.slice(0, 500));

    // 400 → bad input (never retry)
    if (upstream.status === 400) {
      return NextResponse.json(
        { error: "Backend rejected scenario input", detail: text },
        { status: 400 },
      );
    }

    // 404 → country not found (never retry)
    if (upstream.status === 404) {
      return NextResponse.json(
        { error: "Country not available for simulation" },
        { status: 404 },
      );
    }

    // Everything else → 502 (proxy signals "backend problem")
    return NextResponse.json(
      { error: "Upstream simulation service error", upstream_status: upstream.status },
      { status: 502 },
    );
  }

  // ── 6. Parse upstream JSON ──

  let data: unknown;
  try {
    data = await upstream.json();
  } catch (err) {
    logError("upstream returned non-JSON:", String(err));
    return NextResponse.json(
      { error: "Upstream returned invalid JSON" },
      { status: 502 },
    );
  }

  log("← raw upstream:", JSON.stringify(data).slice(0, 500));

  // ── 7. Validate response has required fields ──

  if (!isValidScenarioResponse(data)) {
    logError("upstream 200 but missing required fields:", JSON.stringify(data).slice(0, 500));
    return NextResponse.json(
      { error: "Upstream response missing required fields" },
      { status: 502 },
    );
  }

  // Safe to cast after validation
  const resp = data as {
    composite: number;
    rank: number;
    classification: string;
    axes: { slug: string; value: number; delta: number }[];
    request_id?: string;
  };

  // ── 8. Transform backend → frontend ScenarioResponse ──

  const simulatedAxes = resp.axes.map((a) => ({
    axis_slug: a.slug,
    baseline: a.value - a.delta,
    simulated: a.value,
    delta: a.delta,
  }));

  const baselineValues = simulatedAxes.map((a) => a.baseline);
  const baselineComposite =
    baselineValues.length > 0
      ? baselineValues.reduce((s, v) => s + v, 0) / baselineValues.length
      : null;

  const transformed = {
    country: validated.country_code,
    simulated_axes: simulatedAxes,
    simulated_composite: resp.composite,
    simulated_rank: resp.rank,
    simulated_classification: resp.classification,
    baseline_composite: baselineComposite,
    baseline_rank: null as number | null,
    baseline_classification: null as string | null,
    delta_from_baseline:
      baselineComposite !== null
        ? resp.composite - baselineComposite
        : null,
  };

  log("← transformed ok, composite:", resp.composite, "rank:", resp.rank);

  return NextResponse.json(transformed);
}

// ── GET — 405 Method Not Allowed ────────────────────────────────────

export function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST." },
    { status: 405 },
  );
}
