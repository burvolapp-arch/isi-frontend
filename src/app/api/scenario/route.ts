import { z } from "zod";

export const runtime = "nodejs";

const MAX_BODY_SIZE = 4096; // 4 KB — scenario payloads are tiny

const ScenarioRequestSchema = z.object({
  country: z.string().length(2).toUpperCase(),
  adjustments: z.record(z.string(), z.number().min(-0.3).max(0.3)),
});

export async function POST(req: Request) {
  const BACKEND_URL = process.env.BACKEND_URL;
  if (!BACKEND_URL) {
    return new Response(JSON.stringify({ error: "BACKEND_URL not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return new Response(JSON.stringify({ error: "Content-Type must be application/json" }), {
      status: 415,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Read and validate request body with size limit
    const text = await req.text();
    if (text.length > MAX_BODY_SIZE) {
      return new Response(JSON.stringify({ error: "Request body too large" }), {
        status: 413,
        headers: { "Content-Type": "application/json" },
      });
    }

    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const parsed = ScenarioRequestSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid request", details: parsed.error.issues }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const upstream = await fetch(BACKEND_URL + "/scenario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
      signal: AbortSignal.timeout(15_000),
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      return new Response(JSON.stringify({ error: "Backend timeout" }), {
        status: 504,
        headers: { "Content-Type": "application/json" },
      });
    }
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: "Proxy failed", details: message }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
