"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { CheckCircle2, Mail, ScanLine, Smartphone } from "lucide-react";
import { prepareCsrf } from "../app/auth-client";
import { BrandWordmark } from "./brand-mark";
import { AndroidDownloadQr } from "./android-download-qr";
import styles from "./android-download-section.module.css";

const accessSteps = [
  {
    icon: Mail,
    title: "Request early access",
    description:
      "Share your name and the Google account email you use on Play Store.",
  },
  {
    icon: ScanLine,
    title: "Accept the Play invite",
    description:
      "We email you a KAILA invite. Open it with that Google account and tap Become a tester.",
  },
  {
    icon: Smartphone,
    title: "Install from Google Play",
    description: "Install KAILA from Play, sign in, and help us improve the app before public release.",
  },
] as const;

type FormStatus = "idle" | "submitting" | "success" | "error";

type FieldErrors = {
  name?: string;
  email?: string;
  note?: string;
};

type AndroidDownloadSectionProps = {
  id?: string;
  showIntro?: boolean;
};

export function AndroidDownloadSection({
  id = "download",
  showIntro = true,
}: AndroidDownloadSectionProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setFieldErrors({});
    setErrorMessage(null);

    try {
      const token = await prepareCsrf();
      const response = await fetch("/api/v1/public/android-internal-test-requests", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { "X-XSRF-TOKEN": token } : {}),
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          note: note.trim() || undefined,
        }),
      });

      if (response.status === 202) {
        setStatus("success");
        setName("");
        setEmail("");
        setNote("");
        return;
      }

      if (response.status === 422) {
        const body = (await response.json()) as {
          error?: {
            message?: string;
            fields?: Record<string, string[]>;
          };
        };
        const fields = body.error?.fields ?? {};
        const next: FieldErrors = {};
        if (fields.name?.[0]) next.name = fields.name[0];
        if (fields.email?.[0]) next.email = fields.email[0];
        if (fields.note?.[0]) next.note = fields.note[0];
        setFieldErrors(next);
        setErrorMessage(body.error?.message ?? "Please check the form and try again.");
        setStatus("error");
        return;
      }

      if (response.status === 429) {
        setErrorMessage("Too many requests. Please try again in a little while.");
        setStatus("error");
        return;
      }

      setErrorMessage("Something went wrong. Please try again, or email support@kaila-app.com.");
      setStatus("error");
    } catch {
      setErrorMessage("Something went wrong. Please try again, or email support@kaila-app.com.");
      setStatus("error");
    }
  }

  return (
    <section className={styles.section} id={id} aria-labelledby={`${id}-title`}>
      <div className={styles.inner}>
        <div className={styles.hero}>
          <div className={styles.intro}>
            {showIntro && <p className={styles.kicker}>ANDROID EARLY ACCESS</p>}
            <p className={styles.badge}>
              <Smartphone aria-hidden="true" />
              Google Play internal testing
            </p>
          </div>
          <h2 className={styles.title} id={`${id}-title`}>
            Request <BrandWordmark className={styles.titleBrand} /> on{" "}
            <em>Android</em>
          </h2>
          <p className={styles.lead}>
            KAILA’s Android app is in early internal testing on Google Play. Tell us who you
            are and which Google account to invite—then watch for a branded email from KAILA.
          </p>
        </div>

        <div className={styles.downloadPanel}>
          {status === "success" ? (
            <div className={styles.successState} role="status">
              <CheckCircle2 aria-hidden="true" />
              <div>
                <h3>Request received</h3>
                <p>
                  We’ll email your Play invite soon—watch for a message from KAILA. Use the same
                  Google account you entered here when you accept the invite.
                </p>
              </div>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setStatus("idle")}
              >
                Submit another request
              </button>
            </div>
          ) : (
            <form className={styles.form} onSubmit={onSubmit} noValidate>
              <p className={styles.formHint}>
                Use the Google account email you will open Google Play with. That is the address
                we invite on Play Console.
              </p>

              <label>
                Full name
                <input
                  name="name"
                  type="text"
                  autoComplete="name"
                  maxLength={120}
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={status === "submitting"}
                  aria-invalid={fieldErrors.name ? true : undefined}
                />
                {fieldErrors.name ? <span className={styles.fieldError}>{fieldErrors.name}</span> : null}
              </label>

              <label>
                Google account email
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  maxLength={254}
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={status === "submitting"}
                  aria-invalid={fieldErrors.email ? true : undefined}
                />
                {fieldErrors.email ? (
                  <span className={styles.fieldError}>{fieldErrors.email}</span>
                ) : null}
              </label>

              <label>
                Note <span className={styles.optional}>(optional)</span>
                <textarea
                  name="note"
                  rows={3}
                  maxLength={1000}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  disabled={status === "submitting"}
                  placeholder="Client or provider? How did you hear about KAILA?"
                  aria-invalid={fieldErrors.note ? true : undefined}
                />
                {fieldErrors.note ? <span className={styles.fieldError}>{fieldErrors.note}</span> : null}
              </label>

              {errorMessage && status === "error" ? (
                <p className={styles.formError} role="alert">
                  {errorMessage}
                </p>
              ) : null}

              <button className={styles.downloadButton} type="submit" disabled={status === "submitting"}>
                {status === "submitting" ? "Sending request…" : "Request access"}
              </button>
            </form>
          )}
        </div>

        <div className={styles.visual}>
          <div className={styles.phoneCard} aria-hidden="true">
            <div className={styles.phoneTop} />
            <div className={styles.phoneScreen}>
              <Image
                className={styles.appIcon}
                src="/brand/kaila-bull-app-icon-v2.png"
                alt="KAILA app icon"
                width={1254}
                height={1254}
                priority={false}
              />
              <BrandWordmark className={styles.phoneWordmark} />
              <span>Nearby help, made simple.</span>
            </div>
          </div>
          <AndroidDownloadQr label="Scan to open the early access page" />
        </div>

        <ol className={styles.steps}>
          {accessSteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.title}>
                <span className={styles.stepNumber} aria-hidden="true">
                  {index + 1}
                </span>
                <span className={styles.stepIcon}>
                  <Icon aria-hidden="true" />
                </span>
                <div className={styles.stepCopy}>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
