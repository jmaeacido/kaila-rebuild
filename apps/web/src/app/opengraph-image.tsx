import { ImageResponse } from "next/og";
import { SITE_URL } from "./seo";

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
        <div style={{ alignItems: "center", display: "flex", gap: "48px", maxWidth: "1060px" }}>
          <img
            alt=""
            height={300}
            src={`${SITE_URL}/brand/kaila-bull-app-icon-v2.png`}
            style={{ borderRadius: "48px" }}
            width={300}
          />
          <div style={{ display: "flex", flex: 1, flexDirection: "column", gap: "28px" }}>
            <div style={{ background: "white", borderRadius: "20px", display: "flex", padding: "16px 24px", width: "360px" }}>
              <img alt="KAILA" height={80} src={`${SITE_URL}/brand/kaila-wordmark-bull-v1.png`} width={240} />
            </div>
            <div style={{ display: "flex", fontSize: 62, fontWeight: 700, letterSpacing: -3, lineHeight: 1.06 }}>
              Get everyday jobs done by people near you.
            </div>
            <div style={{ color: "#d7dee8", display: "flex", fontSize: 28, lineHeight: 1.35 }}>
              Post a job, compare local offers, chat, and follow the work in one place.
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
