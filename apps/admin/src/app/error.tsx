"use client";

import { useEffect } from "react";
import { StatusPage } from "../components/status-page";

export default function AppError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <StatusPage code={500} />;
}
