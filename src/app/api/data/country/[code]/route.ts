// ============================================================================
// /api/data/country/[code] — Per-country dataset endpoint
// ============================================================================
// Returns structured country-level ISI data for a specific EU-27 country.
// Supports JSON and CSV via ?format= or Accept header.
// ============================================================================

import { fetchCountry } from "@/lib/api";

export const revalidate = 300;

interface RouteProps {
  params: Promise<{ code: string }>;
}

export async function GET(request: Request, { params }: RouteProps) {
  try {
    const { code } = await params;
    const upperCode = code.toUpperCase();
    const country = await fetchCountry(upperCode);

    const url = new URL(request.url);
    const formatParam = url.searchParams.get("format");
    const accept = request.headers.get("accept") ?? "";
    const wantCSV = formatParam === "csv" || accept.includes("text/csv");

    const axes = country.axes.map((a) => ({
      axis_slug: a.axis_slug,
      axis_name: a.axis_name,
      score: a.score,
      classification: a.classification,
      driver_statement: a.driver_statement,
      channels: (a.channels ?? []).map((ch) => ({
        channel_id: ch.channel_id,
        channel_name: ch.channel_name,
        source: ch.source,
        top_partners: ch.top_partners ?? [],
      })),
    }));

    if (wantCSV) {
      const header = "axis_slug,score,classification,driver_statement";
      const rows = axes.map(
        (a) =>
          `${a.axis_slug},${a.score ?? ""},${a.classification ?? ""},${
            a.driver_statement ? `"${a.driver_statement.replace(/"/g, '""')}"` : ""
          }`,
      );
      const csvBody = [
        `# Country: ${country.country_name} (${country.country})`,
        `# Composite: ${country.isi_composite}`,
        `# Classification: ${country.isi_classification}`,
        `# Version: ${country.version}`,
        `# Window: ${country.window}`,
        "",
        header,
        ...rows,
      ].join("\n");

      return new Response(csvBody, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="isi-${country.country.toLowerCase()}.csv"`,
          "Cache-Control": "public, max-age=300, s-maxage=300",
        },
      });
    }

    // JSON response
    const dataset = {
      country: country.country,
      country_name: country.country_name,
      version: country.version,
      window: country.window,
      composite_score: country.isi_composite,
      classification: country.isi_classification,
      axes_available: country.axes_available,
      axes_required: country.axes_required,
      axes,
      metadata: {
        generated: new Date().toISOString(),
        license: "CC-BY-4.0",
        doi: "10.5281/zenodo.18764170",
      },
    };

    return Response.json(dataset, {
      headers: {
        "Content-Disposition": `attachment; filename="isi-${country.country.toLowerCase()}.json"`,
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Country dataset export failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
