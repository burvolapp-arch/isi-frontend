import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FALLBACK_BACKEND = "https://isi-backend-production.up.railway.app";

export async function POST(request: NextRequest) {
  try {
    const backendBase = (process.env.BACKEND_URL || FALLBACK_BACKEND).replace(/\/+$/, "");
    const target = `${backendBase}/scenario`;

    let rawBody: string;
    try {
      rawBody = await request.text();
    } catch {
      return NextResponse.json({ error: "Failed to read request body" }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    let upstream: Response;
    try {
      upstream = await fetch(target, {
        method: "POST",
        headers: {
          "Content-Type": request.headers.get("Content-Type") || "application/json",
          Accept: request.headers.get("Accept") || "application/json",
        },
        body: rawBody,
        signal: controller.signal,
      });
    } catch (fetchErr: unknown) {
      clearTimeout(timeout);
      const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      console.error(`[scenario proxy] fetch error: ${msg}`);
      return NextResponse.json({ error: "Proxy fetch failed", details: msg }, { status: 502 });
    }

    clearTimeout(timeout);

    let body: string;
    try {
      body = await upstream.text();
    } catch {
      return NextResponse.json({ error: "Failed to read upstream body" }, { status: 502 });
    }

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const axes: any[] = Array.isArray(data.axes) ? data.axes : [];
    const simulatedAxes = axes.map((a) => ({
      axis_slug: String(a?.slug ?? ""),
      baseline:
        typeof a?.value === "number" && typeof a?.delta === "number"
          ? a.value - a.delta
          : null,
      simulated: typeof a?.value === "number" ? a.value : null,
      delta: typeof a?.delta === "number" ? a.delta : null,
    }));

    const baselineValues = simulatedAxes
      .map((a) => a.baseline)
      .filter((v): v is number => v !== null);
    const baselineComposite =
      baselineValues.length > 0
        ? baselineValues.reduce((s, v) => s + v, 0) / baselineValues.length
        : null;

    let parsedReq: Record<string, unknown> = {};
    try { parsedReq = JSON.parse(rawBody); } catch { /* ignore */ }

    const composite = typeof data.composite === "number" ? data.composite : null;

    return NextResponse.json({
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
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[scenario proxy] unhandled: ${message}`);
    return NextResponse.json({ error: "Internal proxy error", details: message }, { status: 502 });
  }
}

export function GET() {
  return NextResponse.json({ error: "Method not allowed. Use POST." }, { status: 405 });
}
