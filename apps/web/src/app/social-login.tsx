"use client";

import { useEffect, useState } from "react";
import { beginMobileSocialLogin } from "@kaila/mobile/oauth";
import styles from "./auth.module.css";

type SocialLoginProps = {
  destination: string;
  providerIntent?: boolean;
};

export function SocialLogin({
  destination,
  providerIntent = false,
}: SocialLoginProps) {
  const [loading, setLoading] = useState<"google" | null>(null);

  useEffect(() => {
    const browserClosed = () => setLoading(null);
    window.addEventListener("kaila:social-browser-closed", browserClosed);
    return () => window.removeEventListener("kaila:social-browser-closed", browserClosed);
  }, []);

  async function continueWith(provider: "google") {
    setLoading(provider);
    const query = new URLSearchParams({
      next: destination,
      providerIntent: providerIntent ? "1" : "0",
    });
    const path = `/api/v1/auth/social/${provider}/redirect?${query.toString()}`;
    try {
      const opened = await beginMobileSocialLogin(new URL(path, window.location.origin));
      if (!opened) window.location.assign(path);
    } catch {
      setLoading(null);
    }
  }

  return (
    <section className={styles.social} aria-label="Social sign in">
      <div className={styles.divider}>
        <span>or continue with</span>
      </div>
      <div className={styles.socialButtons}>
        <button
          disabled={loading !== null}
          onClick={() => void continueWith("google")}
          type="button"
        >
          <span aria-hidden="true">G</span>
          {loading === "google" ? "Connecting…" : "Google"}
        </button>
      </div>
      <p>
        By continuing, you agree to KAILA’s Terms and Privacy Policy.
      </p>
    </section>
  );
}
