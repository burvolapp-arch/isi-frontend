import { NextResponse } from "next/server";
import { fetchISI } from "@/lib/api";

export const revalidate = 300;

export async function GET() {
  try {
    const data = await fetchISI();

    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="isi-${data.version}-${data.window}.json"`,
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
