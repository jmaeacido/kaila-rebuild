"use client";

import { useEffect } from "react";
import { AppearanceSwitcher } from "./components/appearance-switcher";
import { ThemeWordmark } from "./components/theme-wordmark";
import styles from "./global-error.module.css";

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
      <body className={styles.body}>
        <main className={styles.panel}>
          <ThemeWordmark className={styles.brand} priority />
          <h1>Operations hit an error</h1>
          <p>Something failed on our side. Refresh or retry in a moment.</p>
          <button type="button" onClick={reset}>
            Try again
          </button>
        </main>
        <AppearanceSwitcher />
      </body>
    </html>
  );
}
