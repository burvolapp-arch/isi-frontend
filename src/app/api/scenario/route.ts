import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const BACKEND_URL = process.env.BACKEND_URL;

  if (!BACKEND_URL) {
    return NextResponse.json(
      { error: "BACKEND_URL not configured" },
      { status: 500 },
    );
  }

  const target = `${BACKEND_URL.replace(/\/+$/, "")}/scenario`;

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json(
      { error: "Failed to read request body" },
      { status: 400 },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const upstream = await fetch(target, {
      method: "POST",
      headers: {
        "Content-Type": request.headers.get("Content-Type") || "application/json",
        Accept: request.headers.get("Accept") || "application/json",
      },
      body: rawBody,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const body = await upstream.text();

    if (!upstream.ok) {
      console.error(`[scenario proxy] upstream ${upstream.status}: ${body.slice(0, 500)}`);
    }

    return new NextResponse(body, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("Content-Type") || "application/json" },
    });
  } catch (err: unknown) {
    clearTimeout(timeout);
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[scenario proxy] fetch failed: ${message}`);
    return NextResponse.json(
      { error: "Proxy failed", details: message },
      { status: 502 },
    );
  }
}

export function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST." },
    { status: 405 },
  );
}
