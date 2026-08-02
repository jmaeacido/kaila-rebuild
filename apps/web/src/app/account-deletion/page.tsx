"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Check, ExternalLink, LockKeyhole, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { prepareCsrf } from "../auth-client";
import styles from "./account-deletion.module.css";

type Blocker = { code: string; title: string; message: string; href: string };
type Preview = {
  eligible: boolean;
  blockers: Blocker[];
  confirmationPhrase: string;
  requiresPassword: boolean;
  authProvider: string | null;
  email: string;
};
type State = "loading" | "ready" | "signed-out" | "submitting" | "error" | "deleted";
type PasswordCheck = "idle" | "checking" | "valid" | "invalid" | "error";

export default function AccountDeletionPage() {
  const router = useRouter();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [state, setState] = useState<State>("loading");
  const [password, setPassword] = useState("");
  const [emailConfirmation, setEmailConfirmation] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [message, setMessage] = useState("");
  const [passwordCheck, setPasswordCheck] = useState<PasswordCheck>("idle");
  const [emailValid, setEmailValid] = useState(false);
  const passwordRef = useRef(password);

  const load = useCallback(async () => {
    setState("loading"); setMessage("");
    try {
      const response = await fetch("/api/v1/me/account-deletion", { credentials: "include", cache: "no-store" });
      if (response.status === 401) { setState("signed-out"); return; }
      if (!response.ok) throw new Error();
      setPreview(((await response.json()) as { data: Preview }).data);
      setState("ready");
    } catch { setState("error"); setMessage("We couldn’t check your account right now. Try again."); }
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  useEffect(() => {
    if (!preview || preview.requiresPassword) return;
    const matched = emailConfirmation.trim().toLowerCase() === preview.email.trim().toLowerCase();
    const timer = window.setTimeout(() => setEmailValid(matched), 0);
    return () => window.clearTimeout(timer);
  }, [emailConfirmation, preview]);

  useEffect(() => {
    if (!preview?.requiresPassword) return;
    passwordRef.current = password;
    if (password.length < 8) {
      const reset = window.setTimeout(() => setPasswordCheck("idle"), 0);
      return () => window.clearTimeout(reset);
    }

    const timer = window.setTimeout(() => {
      void (async () => {
        const candidate = password;
        setPasswordCheck("checking");
        try {
          const token = await prepareCsrf();
          const response = await fetch("/api/v1/me/account-deletion/verify-password", {
            method: "POST",
            credentials: "include",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              ...(token ? { "X-XSRF-TOKEN": token } : {}),
            },
            body: JSON.stringify({ currentPassword: candidate }),
          });
          if (passwordRef.current !== candidate) return;
          if (!response.ok) {
            setPasswordCheck("error");
            return;
          }
          const body = (await response.json()) as { data: { valid: boolean } };
          if (passwordRef.current !== candidate) return;
          setPasswordCheck(body.data.valid ? "valid" : "invalid");
        } catch {
          if (passwordRef.current === candidate) setPasswordCheck("error");
        }
      })();
    }, 400);

    return () => window.clearTimeout(timer);
  }, [password, preview]);

  const identityReady = preview?.requiresPassword ? passwordCheck === "valid" : emailValid;
  const canDelete = Boolean(
    preview?.eligible
    && identityReady
    && confirmation === preview.confirmationPhrase
    && acknowledged,
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!preview?.eligible || !canDelete) return;
    setState("submitting"); setMessage("");
    try {
      const token = await prepareCsrf();
      const response = await fetch("/api/v1/me/account", {
        method: "DELETE", credentials: "include",
        headers: { "Content-Type": "application/json", ...(token ? { "X-XSRF-TOKEN": token } : {}) },
        body: JSON.stringify(preview.requiresPassword
          ? { currentPassword: password, confirmation }
          : { emailConfirmation: emailConfirmation.trim(), confirmation }),
      });
      const body = (await response.json()) as { error?: { message: string }; data?: { blockers?: Blocker[] } };
      if (response.status === 409 && body.data?.blockers) {
        setPreview({ ...preview, eligible: false, blockers: body.data.blockers });
        setState("ready"); setMessage("Your account changed while we were checking. Resolve these items first."); return;
      }
      if (!response.ok) {
        if (body.error?.message?.toLowerCase().includes("password")) setPasswordCheck("invalid");
        if (body.error?.message?.toLowerCase().includes("email")) setEmailValid(false);
        setState("ready"); setMessage(body.error?.message || "We couldn’t delete your account. Try again."); return;
      }
      setPassword(""); setEmailConfirmation(""); setConfirmation(""); setAcknowledged(false); setPasswordCheck("idle"); setEmailValid(false); setState("deleted");
      window.setTimeout(() => { router.replace("/login?deleted=1"); router.refresh(); }, 1800);
    } catch { setState("ready"); setMessage("The request didn’t finish. Your account has not been changed. Try again."); }
  }

  if (state === "loading") return <main className={styles.shell} aria-label="Checking account deletion eligibility"><div className={styles.skeleton}/><div className={styles.skeleton}/></main>;
  if (state === "signed-out") return <main className={styles.shell}><section className={styles.hero}><span className={styles.heroIcon}><LockKeyhole/></span><p className={styles.eyebrow}>ACCOUNT CONTROL</p><h1>Sign in to delete your account</h1><p>For your safety, deletion can only start from the account you control.</p><Link className={styles.primaryLink} href="/login?next=%2Faccount-deletion">Sign in securely</Link><Link href="/privacy">Read our privacy policy</Link></section></main>;
  if (state === "deleted") return <main className={styles.shell}><section className={styles.success} aria-live="polite"><span><Check/></span><h1>Your account has been deleted</h1><p>Your profile is no longer available and every device has been signed out. We’re taking you to sign in.</p></section></main>;
  if (!preview) return <main className={styles.shell}><section className={styles.error} role="alert"><AlertTriangle/><div><h1>We couldn’t load this page</h1><p>{message}</p><button onClick={() => void load()}><RefreshCw/>Try again</button></div></section></main>;

  const providerLabel = preview.authProvider === "google" ? "Google" : (preview.authProvider || "social");

  return <main className={styles.shell}>
    <header className={styles.header}><div><p className={styles.eyebrow}>PRIVACY AND ACCOUNT</p><h1>Delete your account</h1><p>This permanently closes your KAILA account. Take a moment to review what happens.</p></div><Link href="/settings"><ArrowLeft/>Settings</Link></header>
    <section className={styles.consequence}><span><Trash2/></span><div><h2>Your public identity will be removed</h2><p>Your name, contact details, profile, credentials, pictures, notification data, and sign-in access are removed. Job, message, rating, safety, dispute, and audit history may remain under “Deleted KAILA member” when needed to protect everyone involved.</p></div></section>
    {message && <div className={styles.notice} role="alert"><AlertTriangle/><p>{message}</p></div>}
    {!preview.eligible ? <section className={styles.card}><p className={styles.eyebrow}>ACTION NEEDED</p><h2>Deletion isn’t available yet</h2><p className={styles.muted}>Complete these items, then check again. Your account has not been changed.</p><div className={styles.blockers}>{preview.blockers.map(blocker => <article key={blocker.code}><span><ShieldCheck/></span><div><h3>{blocker.title}</h3><p>{blocker.message}</p></div><Link href={blocker.href}>Resolve <ExternalLink/></Link></article>)}</div><button className={styles.secondary} onClick={() => void load()}><RefreshCw/>Check again</button></section> :
    <form className={styles.card} onSubmit={(event) => void submit(event)}>
      <p className={styles.eyebrow}>FINAL CONFIRMATION</p>
      <h2>Confirm it’s really you</h2>
      <p className={styles.muted}>This can’t be undone. You’ll be signed out on every device.</p>
      {preview.requiresPassword ? (
        <>
          <label>
            Current password
            <input
              autoComplete="current-password"
              aria-invalid={passwordCheck === "invalid" || undefined}
              aria-describedby={passwordCheck === "invalid" || passwordCheck === "checking" ? "account-deletion-password-status" : undefined}
              className={passwordCheck === "invalid" ? styles.invalid : passwordCheck === "valid" ? styles.valid : undefined}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          {passwordCheck === "checking" ? <p className={styles.hint} id="account-deletion-password-status">Checking password…</p> : null}
          {passwordCheck === "invalid" ? <p className={styles.fieldError} id="account-deletion-password-status" role="alert">Your password is incorrect.</p> : null}
          {passwordCheck === "error" ? <p className={styles.fieldError} role="alert">We couldn’t verify your password. Try again.</p> : null}
        </>
      ) : (
        <>
          <p className={styles.muted}>
            This account signs in with {providerLabel}, so KAILA has no password for you to enter.
            Type your {providerLabel} email to confirm.
          </p>
          <label>
            {providerLabel} account email
            <input
              autoComplete="email"
              aria-invalid={emailConfirmation.length > 0 && !emailValid ? true : undefined}
              className={emailConfirmation.length > 0 && !emailValid ? styles.invalid : emailValid ? styles.valid : undefined}
              inputMode="email"
              onChange={(event) => setEmailConfirmation(event.target.value)}
              placeholder="name@example.com"
              required
              type="email"
              value={emailConfirmation}
            />
          </label>
          {emailConfirmation.length > 0 && !emailValid ? (
            <p className={styles.fieldError} role="alert">Enter the email address for this account exactly.</p>
          ) : null}
        </>
      )}
      <label>
        Type <strong>{preview.confirmationPhrase}</strong> to confirm
        <input autoComplete="off" onChange={(event) => setConfirmation(event.target.value)} required value={confirmation} />
      </label>
      <label className={styles.check}>
        <input checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} required type="checkbox" />
        <span>I understand that this account and its public profile cannot be restored.</span>
      </label>
      <button className={styles.danger} disabled={state === "submitting" || !canDelete} aria-disabled={state === "submitting" || !canDelete}>
        {state === "submitting" ? <RefreshCw className={styles.spinner} /> : <Trash2 />}
        {state === "submitting" ? "Deleting account…" : "Permanently delete account"}
      </button>
    </form>}
  </main>;
}
