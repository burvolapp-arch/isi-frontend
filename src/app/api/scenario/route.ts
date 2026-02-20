export const runtime = "nodejs";

export async function POST(req: Request) {
  const BACKEND_URL = process.env.BACKEND_URL;
  if (!BACKEND_URL) {
    return new Response(JSON.stringify({ error: "BACKEND_URL not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const upstream = await fetch(BACKEND_URL + "/scenario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: req.body,
      // @ts-expect-error — Next.js supports duplex streaming
      duplex: "half",
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: "Proxy failed", details: message }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
