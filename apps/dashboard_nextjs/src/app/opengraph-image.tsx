import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Go Now — Tel Aviv Coast Buddy";
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
          background: "linear-gradient(160deg, #0F1724 0%, #0A0E1A 50%, #111827 100%)",
          position: "relative",
          overflow: "hidden",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 5,
            background: "linear-gradient(90deg, #FF5757 0%, #FFBD59 50%, #22C55E 100%)",
            display: "flex",
          }}
        />

        {/* Subtle radial glow */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(34,197,94,0.07) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Decorative wave circles - bottom right */}
        <div
          style={{
            position: "absolute",
            bottom: "-80px",
            right: "-80px",
            width: "380px",
            height: "380px",
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.04)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-40px",
            right: "-40px",
            width: "280px",
            height: "280px",
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "0px",
            right: "0px",
            width: "180px",
            height: "180px",
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "72px 80px",
            flex: 1,
          }}
        >
          {/* Title */}
          <div
            style={{
              fontSize: 80,
              fontWeight: 800,
              color: "#F8FAFC",
              letterSpacing: "-3px",
              lineHeight: 1,
              marginBottom: 14,
              display: "flex",
            }}
          >
            Go Now
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: 26,
              color: "#64748B",
              marginBottom: 44,
              display: "flex",
            }}
          >
            Tel Aviv Coast Buddy
          </div>

          {/* Score cards row */}
          <div style={{ display: "flex", columnGap: "20px", marginBottom: 52 }}>
            {/* Swim card */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 16,
                padding: "22px 32px",
                minWidth: 200,
              }}
            >
              <div style={{ fontSize: 14, color: "#475569", marginBottom: 10, display: "flex" }}>
                SWIM
              </div>
              <div style={{ display: "flex", alignItems: "baseline", columnGap: 12 }}>
                <span style={{ fontSize: 52, fontWeight: 700, color: "#22C55E", display: "flex" }}>
                  85
                </span>
                <span style={{ fontSize: 18, color: "#22C55E", display: "flex" }}>Perfect</span>
              </div>
            </div>

            {/* Run card */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 16,
                padding: "22px 32px",
                minWidth: 200,
              }}
            >
              <div style={{ fontSize: 14, color: "#475569", marginBottom: 10, display: "flex" }}>
                RUN
              </div>
              <div style={{ display: "flex", alignItems: "baseline", columnGap: 12 }}>
                <span style={{ fontSize: 52, fontWeight: 700, color: "#4ADE80", display: "flex" }}>
                  72
                </span>
                <span style={{ fontSize: 18, color: "#4ADE80", display: "flex" }}>Good</span>
              </div>
            </div>

            {/* Swim + dog card */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 16,
                padding: "22px 32px",
                minWidth: 200,
              }}
            >
              <div style={{ fontSize: 14, color: "#334155", marginBottom: 10, display: "flex" }}>
                SWIM + DOG
              </div>
              <div style={{ display: "flex", alignItems: "baseline", columnGap: 12 }}>
                <span style={{ fontSize: 52, fontWeight: 700, color: "#F59E0B", display: "flex" }}>
                  61
                </span>
                <span style={{ fontSize: 18, color: "#F59E0B", display: "flex" }}>Meh</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div style={{ display: "flex", marginBottom: 44 }}>
            <div
              style={{
                fontSize: 20,
                color: "#94A3B8",
                lineHeight: 1.5,
                maxWidth: 680,
                display: "flex",
              }}
            >
              Hourly scores for swim &amp; run conditions using wave, UV, AQI, wind, and rain data.
            </div>
          </div>

          {/* Tech stack */}
          <div style={{ display: "flex", columnGap: 12 }}>
            {["Python", "FastAPI", "Next.js", "TypeScript", "GCP Cloud Run"].map((tech) => (
              <div
                key={tech}
                style={{
                  display: "flex",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8,
                  padding: "6px 14px",
                  fontSize: 14,
                  color: "#64748B",
                }}
              >
                {tech}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
