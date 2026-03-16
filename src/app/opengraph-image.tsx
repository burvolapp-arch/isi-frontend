import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "International Sovereignty Index";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "60px 72px",
          background: "linear-gradient(145deg, #0f172a 0%, #1e293b 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <span
          style={{
            fontSize: "14px",
            fontWeight: 700,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#64748b",
          }}
        >
          International Sovereignty Institute
        </span>
        <span
          style={{
            fontSize: "72px",
            fontWeight: 700,
            color: "#f1f5f9",
            marginTop: "16px",
            textAlign: "center",
            lineHeight: 1.1,
          }}
        >
          International Sovereignty Index
        </span>
        <span
          style={{
            fontSize: "26px",
            color: "#94a3b8",
            marginTop: "20px",
            textAlign: "center",
            maxWidth: "800px",
            lineHeight: 1.4,
          }}
        >
          Measuring external supplier concentration — EU-27 founding cohort — HHI framework
        </span>

        {/* Bottom accent line */}
        <div
          style={{
            display: "flex",
            gap: "32px",
            marginTop: "48px",
            alignItems: "center",
          }}
        >
          {["Financial", "Energy", "Technology", "Defence", "Critical Inputs", "Logistics"].map(
            (axis) => (
              <span
                key={axis}
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#475569",
                  padding: "6px 14px",
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: "6px",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {axis}
              </span>
            ),
          )}
        </div>
      </div>
    ),
    { ...size },
  );
}
