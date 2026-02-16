// ============================================================================
// Next.js API Route — Scenario Proxy
// ============================================================================
// Eliminates browser-level CORS by proxying scenario POST requests
// through the Next.js server. The browser only talks to the same origin;
// the server-side fetch to the backend has no CORS constraints.
//
// This route:
//   1. Receives POST from client (same origin — no preflight)
//   2. Validates request shape
//   3. Forwards to backend NEXT_PUBLIC_API_URL/scenario
//   4. Returns backend response verbatim
//   5. Never exposes backend URL to the browser
// ============================================================================

import { NextRequest, NextResponse } from "next/server";

function getBackendUrl(): string {
  // Server-side: prefer BACKEND_URL (private), fall back to NEXT_PUBLIC_API_URL
  const url =
    process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    throw new Error("Neither BACKEND_URL nor NEXT_PUBLIC_API_URL is configured.");
  }
  return url.replace(/\/+$/, "");
}

export async function POST(request: NextRequest) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  // Minimal shape validation — backend is authoritative
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("country" in payload) ||
    !("adjustments" in payload)
  ) {
    return NextResponse.json(
      { error: "Missing required fields: country, adjustments" },
      { status: 400 }
    );
  }

  const backendUrl = getBackendUrl();

  try {
    const upstream = await fetch(`${backendUrl}/scenario`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      // No caching — ephemeral simulation
      cache: "no-store",
    });

    if (!upstream.ok) {
      // Drain body but don't expose it to client
      await upstream.text().catch(() => "");
      return NextResponse.json(
        { error: "Upstream simulation failed", status: upstream.status },
        { status: upstream.status }
      );
    }

    const data = await upstream.json();
    return NextResponse.json(data);
  } catch {
    // Network-level failure (backend unreachable, DNS, timeout)
    return NextResponse.json(
      { error: "Simulation service unreachable" },
      { status: 502 }
    );
  }
}
