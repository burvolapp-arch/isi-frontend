import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  // Only expose env info in development
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }
  return NextResponse.json({
    backend_url: process.env.BACKEND_URL ?? null,
    node_env: process.env.NODE_ENV ?? null,
  });
}
