"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          fontFamily: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
          background:
            "radial-gradient(circle at 12% 18%, rgba(39,183,255,0.16), transparent 32%), #f7f9fc",
          color: "#0a1220",
          display: "grid",
          placeItems: "center",
          padding: "2rem 1rem",
        }}
      >
        <main style={{ maxWidth: "28rem", textAlign: "center" }}>
          <img
            alt="KAILA"
            src="/brand/kaila-wordmark.png"
            width={176}
            height={40}
            style={{ height: "auto", width: "8rem" }}
          />
          <p
            style={{
              marginTop: "1.5rem",
              color: "#1463ff",
              fontSize: "0.75rem",
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            500 Server error
          </p>
          <h1 style={{ fontSize: "1.75rem", lineHeight: 1.2, margin: "0.75rem 0" }}>
            Something went wrong on our side
          </h1>
          <p style={{ color: "#667085", lineHeight: 1.5, margin: 0 }}>
            KAILA hit an unexpected problem. Refresh the page or come back shortly.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              minHeight: 44,
              minWidth: "11rem",
              border: 0,
              borderRadius: "0.875rem",
              padding: "0.5rem 1rem",
              background: "linear-gradient(135deg, #1463ff, #27b7ff)",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
