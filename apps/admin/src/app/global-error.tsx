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
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: '"Segoe UI", Arial, sans-serif', background: "#f7f9fc", color: "#0a1220", padding: "2rem 1rem" }}>
        <main style={{ maxWidth: "28rem", textAlign: "center" }}>
          <img alt="KAILA" src="/brand/kaila-wordmark.png" width={176} height={40} style={{ width: "8rem", height: "auto" }} />
          <h1 style={{ fontSize: "1.75rem" }}>Operations hit an error</h1>
          <p style={{ color: "#667085" }}>Something failed on our side. Refresh or retry in a moment.</p>
          <button type="button" onClick={reset} style={{ marginTop: "1.5rem", minHeight: 44, border: 0, borderRadius: "0.875rem", padding: "0.5rem 1rem", background: "linear-gradient(135deg,#1463ff,#27b7ff)", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
