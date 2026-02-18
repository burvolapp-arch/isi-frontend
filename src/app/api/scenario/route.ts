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
      return new NextResponse(body, {
        status: upstream.status,
        headers: { "Content-Type": upstream.headers.get("Content-Type") || "application/json" },
      });
    }

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(body);
    } catch {
      return NextResponse.json({ error: "Upstream returned non-JSON" }, { status: 502 });
    }

    const axes = Array.isArray(data.axes) ? data.axes : [];
    const simulatedAxes = axes.map((a: Record<string, unknown>) => ({
      axis_slug: a.slug ?? "",
      baseline: typeof a.value === "number" && typeof a.delta === "number" ? a.value - a.delta : null,
      simulated: typeof a.value === "number" ? a.value : null,
      delta: typeof a.delta === "number" ? a.delta : null,
    }));

    const baselineValues = simulatedAxes
      .map((a: { baseline: number | null }) => a.baseline)
      .filter((v: number | null): v is number => v !== null);
    const baselineComposite =
      baselineValues.length > 0
        ? baselineValues.reduce((s: number, v: number) => s + v, 0) / baselineValues.length
        : null;

    let parsedReq: Record<string, unknown> = {};
    try {
      parsedReq = JSON.parse(rawBody);
    } catch {
      // ignore
    }

    const composite = typeof data.composite === "number" ? data.composite : null;

    const transformed = {
      country: typeof parsedReq.country === "string" ? parsedReq.country : "",
      simulated_axes: simulatedAxes,
      simulated_composite: composite,
      simulated_rank: typeof data.rank === "number" ? data.rank : null,
      simulated_classification: typeof data.classification === "string" ? data.classification : null,
      baseline_composite: baselineComposite,
      baseline_rank: null,
      baseline_classification: null,
      delta_from_baseline:
        composite !== null && baselineComposite !== null
          ? composite - baselineComposite
          : null,
    };

    return NextResponse.json(transformed);
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
