// ============================================================================
// /api/data/isi — ISI dataset endpoint with format negotiation
// ============================================================================
// Supports JSON and CSV output via Accept header or ?format= query param.
// Optionally filters by year via ?year= param.
//
// This is the primary machine-readable dataset endpoint for researchers.
// ============================================================================

import { fetchISI } from "@/lib/api";
import { discoverAxisFieldKeys } from "@/lib/format";

export const revalidate = 300;

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: Request) {
  try {
    const data = await fetchISI();
    const url = new URL(request.url);
    const formatParam = url.searchParams.get("format");
    const accept = request.headers.get("accept") ?? "";

    const wantCSV =
      formatParam === "csv" || accept.includes("text/csv");

    if (wantCSV) {
      const axisColumns =
        data.countries.length > 0
          ? discoverAxisFieldKeys(data.countries[0])
          : [];
      const columns = [
        "country",
        "country_name",
        ...axisColumns,
        "isi_composite",
        "classification",
      ];

      const header = columns.join(",");
      const rows = data.countries.map((c) =>
        columns
          .map((col) =>
            escapeCSV(
              (c as unknown as Record<string, unknown>)[col],
            ),
          )
          .join(","),
      );
      const csvBody = [header, ...rows].join("\n");

      return new Response(csvBody, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="isi-dataset-${data.version}.csv"`,
          "Cache-Control": "public, max-age=300, s-maxage=300",
        },
      });
    }

    // JSON response (default)
    const dataset = {
      metadata: {
        name: "International Sovereignty Index (ISI)",
        version: data.version,
        window: data.window,
        scope: "EU-27",
        methodology: "HHI-based supplier concentration",
        aggregation: data.aggregation_rule,
        formula: data.formula,
        countries_total: data.countries_total,
        countries_scored: data.countries_complete,
        score_range: [0, 1],
        generated: new Date().toISOString(),
        license: "CC-BY-4.0",
        doi: "10.5281/zenodo.18764170",
        citation:
          "Drazsky, S., & International Sovereignty Institute. (2026). " +
          "International Sovereignty Index (ISI) — EU-27 Founding Cohort (v1.0). Zenodo.",
      },
      statistics: data.statistics,
      countries: data.countries.map((c) => ({
        country: c.country,
        country_name: c.country_name,
        composite_score: c.isi_composite,
        classification: c.classification,
        axes: {
          financial: c.axis_1_financial,
          energy: c.axis_2_energy,
          technology: c.axis_3_technology,
          defense: c.axis_4_defense,
          critical_inputs: c.axis_5_critical_inputs,
          logistics: c.axis_6_logistics,
        },
      })),
    };

    return Response.json(dataset, {
      headers: {
        "Content-Disposition": `attachment; filename="isi-dataset-${data.version}.json"`,
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Dataset export failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
