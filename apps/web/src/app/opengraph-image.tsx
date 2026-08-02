import { ImageResponse } from "next/og";

export const alt = "KAILA — trusted local services near you";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "linear-gradient(135deg, #0c1524 0%, #0f4bff 62%, #27b7ff 100%)",
          color: "white",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          padding: "72px",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "28px", maxWidth: "1020px" }}>
          <div style={{ color: "#8fdcff", display: "flex", fontSize: 34, fontWeight: 700, letterSpacing: 5 }}>
            KAILA
          </div>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 700, letterSpacing: -3, lineHeight: 1.06 }}>
            Get everyday jobs done by people near you.
          </div>
          <div style={{ color: "#d7dee8", display: "flex", fontSize: 32, lineHeight: 1.35 }}>
            Post a job, compare local offers, chat, and follow the work in one place.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
