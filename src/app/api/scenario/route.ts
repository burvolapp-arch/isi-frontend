// ============================================================================
// Next.js API Route — Scenario Proxy
// ============================================================================
// Eliminates browser-level CORS by proxying scenario POST requests
// through the Next.js server. The browser only talks to the same origin;
// the server-side fetch to the backend has no CORS constraints.
//
// CONTRACT (backend v0.2):
//   Backend expects:  { country_code: "SE", axis_shifts: { defense: 0.10, ... } }
//   Backend returns:  { composite, rank, classification, axes[], request_id }
//   Frontend expects: { simulated_axes[], simulated_composite, simulated_rank,
//                       simulated_classification, baseline_composite, ... }
//
// This proxy validates, sanitizes, and transforms in both directions.
// No unknown keys are forwarded. No invalid payloads reach the backend.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { validateProxyBody } from "@/lib/scenarioValidation";

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

function isValidBackendResponse(d: unknown): d is BackendScenarioResponse {
  if (typeof d !== "object" || d === null) return false;
  const obj = d as Record<string, unknown>;
  return (
    typeof obj.composite === "number" &&
    typeof obj.rank === "number" &&
    typeof obj.classification === "string" &&
    Array.isArray(obj.axes) &&
    obj.axes.every(
      (a: unknown) =>
        typeof a === "object" &&
        a !== null &&
        typeof (a as Record<string, unknown>).slug === "string" &&
        typeof (a as Record<string, unknown>).value === "number" &&
        typeof (a as Record<string, unknown>).delta === "number",
    )
  );
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
    logError("rejected malformed payload:", JSON.stringify(rawBody).slice(0, 300));
    return NextResponse.json(
      { error: "Invalid scenario input: payload does not match expected schema" },
      { status: 400 },
    );
  }

  // ── 3. Construct exact backend payload — no extra keys ──

  const backendPayload = {
    country_code: validated.country_code,
    axis_shifts: validated.axis_shifts,
  };

  log("→", `${backendUrl}/scenario`, JSON.stringify(backendPayload).slice(0, 300));

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

    if (upstream.status === 400) {
      return NextResponse.json(
        { error: "Backend rejected scenario input", detail: text },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Upstream simulation service error", upstream_status: upstream.status },
      { status: 502 },
    );
  }

  // ── 6. Parse and validate upstream JSON ──

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

  if (!isValidBackendResponse(data)) {
    logError("upstream shape mismatch:", JSON.stringify(data).slice(0, 500));
    return NextResponse.json(
      { error: "Upstream response shape mismatch" },
      { status: 502 },
    );
  }

  // ── 7. Transform backend v0.2 → frontend ScenarioResponse ──

  const simulatedAxes = data.axes.map((a) => ({
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
    simulated_composite: data.composite,
    simulated_rank: data.rank,
    simulated_classification: data.classification,
    baseline_composite: baselineComposite,
    baseline_rank: null as number | null,
    baseline_classification: null as string | null,
    delta_from_baseline:
      baselineComposite !== null
        ? data.composite - baselineComposite
        : null,
  };

  log("← transformed ok, composite:", data.composite, "rank:", data.rank);

  return NextResponse.json(transformed);
}

// ── GET — 405 Method Not Allowed ────────────────────────────────────

export function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST." },
    { status: 405 },
  );
}
