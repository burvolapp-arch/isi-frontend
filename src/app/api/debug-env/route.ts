import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    backend_url: process.env.BACKEND_URL ?? null,
    node_env: process.env.NODE_ENV ?? null,
  });
}
