// ============================================================================
// Next.js API Route — Scenario Proxy
// ============================================================================
// Same-origin proxy for scenario simulation. The browser only talks to
// this route; the server-side fetch to the backend has no CORS constraints.
//
// CONTRACT (scenario-v1):
//   Browser sends:   { country: "SE", adjustments: { "financial_external_supplier_concentration": 0.05, … } }
//   Backend expects:  same — { country, adjustments }
//   Backend returns:  { composite, rank, classification, axes[], request_id? }
//   Frontend gets:    transformed { simulated_axes[], simulated_composite, … }
//
// VALIDATION:
//   - Request validated with Zod (ScenarioRequestSchema)
//   - Response validated with Zod (BackendResponseSchema)
//   - Upstream non-2xx errors pass through status + body (no fake wrapping)
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import {
  ScenarioRequestSchema,
  BackendResponseSchema,
  transformBackendResponse,
} from "@/lib/scenarioContract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── Helpers ─────────────────────────────────────────────────────────

function getBackendUrl(): string {
  const url =
    process.env.BACKEND_URL ||
    "https://isi-backend-production.up.railway.app";
  return url.replace(/\/+$/, "");
}

const isDev = process.env.NODE_ENV !== "production";

function log(...args: unknown[]) {
  if (!isDev) return;
  // eslint-disable-next-line no-console
  console.log("[scenario proxy]", ...args);
}
function logError(...args: unknown[]) {
  if (!isDev) return;
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
      { error: "Invalid request body — could not parse JSON" },
      { status: 400 },
    );
  }

  // ── 2. Validate with Zod ──

  const parsed = ScenarioRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    logError("Zod rejected request:", issues);
    return NextResponse.json(
      { error: "Invalid scenario input", issues },
      { status: 400 },
    );
  }

  const payload = parsed.data;

  // ── 3. Forward exact payload to backend ──

  log("→", `${backendUrl}/scenario`, JSON.stringify(payload).slice(0, 500));

  let upstream: Response;
  try {
    upstream = await fetch(`${backendUrl}/scenario`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(payload),
    });
  } catch (err) {
    logError("network failure reaching backend:", String(err));
    return NextResponse.json(
      { error: "Cannot reach simulation backend" },
      { status: 502 },
    );
  }

  // ── 4. Handle upstream errors — pass through status + body ──

  if (!upstream.ok) {
    let body: string;
    try {
      body = await upstream.text();
    } catch {
      body = "";
    }

    logError("upstream", upstream.status, body.slice(0, 500));

    // Try to parse as JSON and pass through; otherwise wrap as text
    let jsonBody: unknown;
    try {
      jsonBody = JSON.parse(body);
    } catch {
      jsonBody = null;
    }

    if (jsonBody && typeof jsonBody === "object") {
      // Extract human-readable message for client convenience
      const obj = jsonBody as Record<string, unknown>;
      const msg =
        typeof obj.detail === "string" ? obj.detail
        : typeof obj.error === "string" ? obj.error
        : typeof obj.message === "string" ? obj.message
        : body;
      return NextResponse.json(
        { error: msg },
        { status: upstream.status },
      );
    }

    return NextResponse.json(
      { error: body || `Upstream error ${upstream.status}` },
      { status: upstream.status },
    );
  }

  // ── 5. Parse upstream JSON ──

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

  // ── 6. Validate response with Zod ──

  const respParsed = BackendResponseSchema.safeParse(data);
  if (!respParsed.success) {
    const issues = respParsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    logError("Zod rejected upstream response:", issues);
    return NextResponse.json(
      { error: "UPSTREAM_INVALID_RESPONSE", issues },
      { status: 502 },
    );
  }

  // ── 7. Transform backend → frontend shape ──

  const transformed = transformBackendResponse(payload.country, respParsed.data);

  log("← transformed ok, composite:", respParsed.data.composite, "rank:", respParsed.data.rank);

  return NextResponse.json(transformed);
}

// ── GET — 405 Method Not Allowed ────────────────────────────────────

export function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST." },
    { status: 405 },
  );
}
