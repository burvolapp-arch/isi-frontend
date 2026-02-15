import { NextResponse } from "next/server";
import { fetchISI } from "@/lib/api";

export const revalidate = 300;

const COLUMNS = [
  "country",
  "country_name",
  "axis_1_financial",
  "axis_2_energy",
  "axis_3_technology",
  "axis_4_defense",
  "axis_5_critical_inputs",
  "axis_6_logistics",
  "isi_composite",
  "classification",
  "complete",
] as const;

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

    const header = COLUMNS.join(",");
    const rows = data.countries.map((c) =>
      COLUMNS.map((col) => escapeCSV(c[col])).join(",")
    );
    const csv = [header, ...rows].join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="isi-${data.version}-${data.window}.csv"`,
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
