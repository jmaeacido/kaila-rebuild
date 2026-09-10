"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink, Smartphone } from "lucide-react";
import { ANDROID_INTERNAL_TEST_URL } from "../android-download";
import styles from "./android-test.module.css";

export default function AndroidTestInvitePage() {
  return (
    <main className={styles.page}>
      <Link className={styles.back} href="/notifications">
        <ArrowLeft aria-hidden="true" /> Back to notifications
      </Link>
      <section className={styles.card} aria-labelledby="android-test-title">
        <span className={styles.icon} aria-hidden="true">
          <Smartphone />
        </span>
        <p className={styles.eyebrow}>KAILA invitation</p>
        <h1 id="android-test-title">You’re invited to test KAILA on Android</h1>
        <p>
          KAILA invited you to join our Android internal testing on Google Play. Open the link with the Google account
          for your KAILA email, choose Become a tester, then download and install KAILA.
        </p>
        <p className={styles.hint}>Your feedback helps us catch issues before public release.</p>
        <div className={styles.actions}>
          <a className={styles.primary} href={ANDROID_INTERNAL_TEST_URL} target="_blank" rel="noopener noreferrer">
            Become a tester <ExternalLink aria-hidden="true" />
          </a>
          <Link className={styles.secondary} href="/notifications">
            Keep browsing
          </Link>
        </div>
      </section>
    </main>
  );
}
