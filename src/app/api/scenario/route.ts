// ============================================================================
// Next.js API Route — Scenario Proxy
// ============================================================================
// Eliminates browser-level CORS by proxying scenario POST requests
// through the Next.js server. The browser only talks to the same origin;
// the server-side fetch to the backend has no CORS constraints.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getBackendUrl(): string | null {
  const url = process.env.BACKEND_URL;
  if (!url) return null;
  return url.replace(/\/+$/, "");
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

  if (process.env.NODE_ENV !== "production") {
    console.log(
      "[scenario proxy] forwarding →",
      `${backendUrl}/scenario`,
      JSON.stringify(payload).slice(0, 200),
    );
  }

  try {
    const upstream = await fetch(`${backendUrl}/scenario`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(payload),
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

    const data = await upstream.json();
    return NextResponse.json(data);
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
