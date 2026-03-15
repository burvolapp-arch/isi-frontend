import { fetchISI } from "@/lib/api";
import { discoverAxisFieldKeys } from "@/lib/format";

export const revalidate = 300;

/** Fixed columns that always appear at the start/end of the CSV */
const PREFIX_COLUMNS = ["country", "country_name"] as const;
const SUFFIX_COLUMNS = ["isi_composite", "classification", "complete"] as const;

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET() {
  try {
    const data = await fetchISI();

    // Derive axis columns dynamically from data shape
    const axisColumns = data.countries.length > 0
      ? discoverAxisFieldKeys(data.countries[0])
      : [];
    const columns = [...PREFIX_COLUMNS, ...axisColumns, ...SUFFIX_COLUMNS];

    const header = columns.join(",");
    const rows = data.countries.map((c) =>
      columns.map((col) => escapeCSV((c as unknown as Record<string, unknown>)[col])).join(",")
    );
    const csvString = [header, ...rows].join("\n");

    const encoder = new TextEncoder();
    const body = encoder.encode(csvString);

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="isi-${data.version}.csv"`,
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
