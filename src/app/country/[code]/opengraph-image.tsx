import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "ISI Country Profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://isi-backend-production.up.railway.app";

/** Classification label and color */
function classInfo(c: string | null): { label: string; color: string; bg: string } {
  switch (c) {
    case "highly_concentrated":
      return { label: "Highly Concentrated", color: "#991b1b", bg: "#fef2f2" };
    case "moderately_concentrated":
      return { label: "Moderately Concentrated", color: "#92400e", bg: "#fffbeb" };
    case "mildly_concentrated":
      return { label: "Mildly Concentrated", color: "#3b82f6", bg: "#eff6ff" };
    case "unconcentrated":
      return { label: "Unconcentrated", color: "#166534", bg: "#f0fdf4" };
    default:
      return { label: "N/A", color: "#6b7280", bg: "#f9fafb" };
  }
}

export default async function Image({ params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();

  let name = code;
  let composite: string = "—";
  let classification: string | null = null;
  let axisCount = 0;
  let axisTotal = 0;

  try {
    const res = await fetch(`${API}/country/${code}`, { next: { revalidate: 300 } });
    if (res.ok) {
      const data = await res.json();
      name = data.country_name ?? code;
      composite = data.isi_composite != null ? data.isi_composite.toFixed(4) : "—";
      classification = data.isi_classification ?? null;
      axisCount = data.axes_available ?? 0;
      axisTotal = data.axes_required ?? 0;
    }
  } catch {
    // fallback to code-only display
  }

  const cls = classInfo(classification);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px 72px",
          background: "linear-gradient(145deg, #0f172a 0%, #1e293b 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Top — Title */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <span
              style={{
                fontSize: "16px",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#94a3b8",
              }}
            >
              International Sovereignty Index
            </span>
          </div>
          <span
            style={{
              fontSize: "64px",
              fontWeight: 700,
              color: "#f1f5f9",
              marginTop: "16px",
              lineHeight: 1.1,
            }}
          >
            {name}
          </span>
          <span
            style={{
              fontSize: "22px",
              color: "#64748b",
              marginTop: "8px",
            }}
          >
            {code} · EU-27 Cohort · Concentration Profile
          </span>
        </div>

        {/* Bottom — Score Card Row */}
        <div
          style={{
            display: "flex",
            gap: "24px",
            alignItems: "flex-end",
          }}
        >
          {/* Composite Score */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              background: "rgba(255,255,255,0.06)",
              borderRadius: "12px",
              padding: "24px 36px",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <span
              style={{
                fontSize: "13px",
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#94a3b8",
              }}
            >
              ISI Composite
            </span>
            <span
              style={{
                fontSize: "48px",
                fontWeight: 700,
                color: "#f1f5f9",
                fontFamily: "monospace",
                marginTop: "4px",
              }}
            >
              {composite}
            </span>
          </div>

          {/* Classification Badge */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              background: "rgba(255,255,255,0.06)",
              borderRadius: "12px",
              padding: "24px 36px",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <span
              style={{
                fontSize: "13px",
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#94a3b8",
              }}
            >
              Classification
            </span>
            <span
              style={{
                fontSize: "28px",
                fontWeight: 700,
                color: cls.color,
                marginTop: "8px",
                padding: "4px 16px",
                background: cls.bg,
                borderRadius: "8px",
              }}
            >
              {cls.label}
            </span>
          </div>

          {/* Axes */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              background: "rgba(255,255,255,0.06)",
              borderRadius: "12px",
              padding: "24px 36px",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <span
              style={{
                fontSize: "13px",
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#94a3b8",
              }}
            >
              Axes Coverage
            </span>
            <span
              style={{
                fontSize: "48px",
                fontWeight: 700,
                color: "#f1f5f9",
                fontFamily: "monospace",
                marginTop: "4px",
              }}
            >
              {axisCount}/{axisTotal}
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
