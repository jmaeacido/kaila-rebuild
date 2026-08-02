"use client";

import { useEffect } from "react";
import { StatusPage } from "../components/status-page";

export default function AppError({
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
    <div>
      <StatusPage code={500} />
      <div style={{ display: "none" }}>
        <button type="button" onClick={reset}>
          Retry
        </button>
      </div>
    </div>
  );
}
