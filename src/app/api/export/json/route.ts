import { fetchISI } from "@/lib/api";

export const revalidate = 300;

export async function GET() {
  try {
    const data = await fetchISI();

    return Response.json(data, {
      headers: {
        "Content-Disposition": `attachment; filename="isi-${data.version}.json"`,
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
