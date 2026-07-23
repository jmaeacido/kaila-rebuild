"use client";

import { useState } from "react";
import styles from "./auth.module.css";

type SocialLoginProps = {
  destination: string;
  providerIntent?: boolean;
};

export function SocialLogin({
  destination,
  providerIntent = false,
}: SocialLoginProps) {
  const [loading, setLoading] = useState<"google" | "facebook" | null>(null);

  function continueWith(provider: "google" | "facebook") {
    setLoading(provider);
    const query = new URLSearchParams({
      next: destination,
      providerIntent: providerIntent ? "1" : "0",
    });
    window.location.assign(
      `/api/v1/auth/social/${provider}/redirect?${query.toString()}`,
    );
  }

  return (
    <section className={styles.social} aria-label="Social sign in">
      <div className={styles.divider}>
        <span>or continue with</span>
      </div>
      <div className={styles.socialButtons}>
        <button
          disabled={loading !== null}
          onClick={() => continueWith("google")}
          type="button"
        >
          <span aria-hidden="true">G</span>
          {loading === "google" ? "Connecting…" : "Google"}
        </button>
        <button
          disabled={loading !== null}
          onClick={() => continueWith("facebook")}
          type="button"
        >
          <span aria-hidden="true">f</span>
          {loading === "facebook" ? "Connecting…" : "Facebook"}
        </button>
      </div>
      <p>
        By continuing, you agree to KAILA’s Terms and Privacy Policy.
      </p>
    </section>
  );
}
