"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, Camera, FileCheck2, RefreshCw, ShieldCheck } from "lucide-react";
import { Button, Feedback } from "@kaila/ui";
import { prepareCsrf, type ApiError } from "../auth-client";
import styles from "./verification.module.css";

type Verification = {
  captureAvailable: boolean;
  enforcementEnabled: boolean;
  status: "not_started" | "capturing" | "submitted" | "in_review" | "approved" | "needs_resubmission" | "rejected" | "escalated" | "withdrawn" | "expired";
  identityVerified: boolean;
  decisionReason: string | null;
  submittedAt: string | null;
  verifiedUntil: string | null;
  appealRequestedAt: string | null;
};

const reasonCopy: Record<string, string> = {
  image_unclear: "One or more images were unclear. Take new photos in bright, even light.",
  document_expired: "The ID appears to be expired. Use a valid, unexpired ID.",
  document_unsupported: "That ID type is not currently supported.",
  identity_mismatch: "The submitted details did not match closely enough.",
  age_uncertain: "We could not confirm that the account holder is at least 18.",
  underage: "KAILA is available only to people aged 18 or older.",
  suspected_tampering: "The document needs an additional authenticity review.",
  needs_senior_review: "A senior reviewer needs to check this submission.",
};

export default function IdentityVerificationPage() {
  const [verification, setVerification] = useState<Verification | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "consenting" | "uploading" | "error">("loading");
  const [message, setMessage] = useState("");
  const [consented, setConsented] = useState(false);
  const [idType, setIdType] = useState("philid");
  const [expiresAt, setExpiresAt] = useState("");
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/me/identity-verification", { cache: "no-store" });
      if (!response.ok) throw new Error();
      setVerification(((await response.json()) as { data: Verification }).data);
      setState("ready");
    } catch { setState("error"); }
  }, []);

  useEffect(() => { const initialLoad = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(initialLoad); }, [load]);
  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);

  function choose(setter: (file: File | null) => void) {
    return (event: ChangeEvent<HTMLInputElement>) => setter(event.target.files?.[0] ?? null);
  }

  async function openCamera() {
    setMessage("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream; setCameraOpen(true);
      window.setTimeout(() => { if (videoRef.current) { videoRef.current.srcObject = stream; void videoRef.current.play(); } }, 0);
    } catch { setMessage("KAILA needs camera access to take a fresh selfie. Check your browser permission and try again."); }
  }

  function captureSelfie() {
    const video = videoRef.current; if (!video || video.videoWidth === 0) return;
    const canvas = document.createElement("canvas"); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob((blob) => { if (!blob) return; setSelfie(new File([blob], "live-selfie.jpg", { type: "image/jpeg", lastModified: Date.now() })); streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; setCameraOpen(false); }, "image/jpeg", 0.9);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!idFront || !selfie || !consented) return;
    setState("consenting"); setMessage("");
    try {
      const token = await prepareCsrf();
      const headers = { "Content-Type": "application/json", ...(token ? { "X-XSRF-TOKEN": token } : {}) };
      const consentResponse = await fetch("/api/v1/me/identity-verification/consent", {
        method: "POST", headers, body: JSON.stringify({ noticeVersion: "identity-verification-1.0", privacyPolicyVersion: "1.0", purpose: "identity_verification", trigger: "account_settings", consented: true }),
      });
      const consentBody = (await consentResponse.json()) as ApiError & { data?: { sessionId: string; uploadToken: string } };
      if (!consentResponse.ok || !consentBody.data) throw new Error(consentBody.error?.message || "CONSENT_FAILED");
      const session = consentBody.data;
      setState("uploading");
      const body = new FormData();
      body.append("sessionId", session.sessionId); body.append("uploadToken", session.uploadToken);
      body.append("idType", idType); body.append("issuingCountry", "PH"); body.append("selfieCapturedNow", "1");
      if (expiresAt) body.append("documentExpiresAt", expiresAt);
      body.append("idFront", idFront); if (idBack) body.append("idBack", idBack); body.append("selfie", selfie);
      const uploadResponse = await fetch("/api/v1/me/identity-verification/submit", { method: "POST", headers: token ? { "X-XSRF-TOKEN": token } : {}, body });
      const uploadBody = (await uploadResponse.json()) as ApiError & { data?: Verification };
      if (!uploadResponse.ok || !uploadBody.data) throw new Error(uploadBody.error?.message || "UPLOAD_FAILED");
      setVerification(uploadBody.data);
      setMessage("Your identity check is in review. We’ll notify you when it is ready."); setState("ready");
    } catch (error) { setMessage(error instanceof Error && !error.message.includes("FAILED") ? error.message : "We couldn’t submit your identity check. Review the images and try again."); setState("error"); }
  }

  async function act(path: "appeal" | "consent", method: "POST" | "DELETE") {
    setState("uploading"); setMessage("");
    try {
      const token = await prepareCsrf();
      const response = await fetch(`/api/v1/me/identity-verification/${path}`, { method, headers: token ? { "X-XSRF-TOKEN": token } : {} });
      if (!response.ok) throw new Error();
      setVerification(((await response.json()) as { data: Verification }).data); setState("ready");
    } catch { setMessage("That action is temporarily unavailable. Try again."); setState("error"); }
  }

  if (state === "loading") return <main className={styles.shell} aria-label="Loading identity verification"><div className={styles.skeleton} /><div className={styles.skeleton} /></main>;
  if (!verification) return <main className={styles.shell}><Feedback kind="error" title="We couldn’t load identity verification">Check your connection and try again.</Feedback><Button onClick={() => void load()}>Try again</Button></main>;

  const awaiting = ["submitted", "in_review", "escalated"].includes(verification.status);
  const retry = ["needs_resubmission", "rejected", "withdrawn", "expired"].includes(verification.status);
  return <main className={styles.shell}>
    <header className={styles.header}><Link href="/account" aria-label="Back to account"><ArrowLeft /></Link><div><p>ACCOUNT SAFETY</p><h1>Identity verification</h1></div></header>
    {verification.identityVerified ? <section className={styles.statusCard} data-kind="success"><BadgeCheck /><div><h2>Identity verified</h2><p>Your ID and selfie passed KAILA’s identity checks. This is not a background check or safety guarantee.</p>{verification.verifiedUntil && <small>Valid until {verification.verifiedUntil}</small>}</div></section>
      : awaiting ? <section className={styles.statusCard}><RefreshCw /><div><h2>Your check is in review</h2><p>An authorized reviewer will compare your ID and selfie. We’ll notify you when it is ready.</p></div></section> : null}
    {verification.decisionReason && retry ? <Feedback kind="error" title="We could not complete the check">{reasonCopy[verification.decisionReason] ?? "Review the result and submit new evidence if requested."}</Feedback> : null}
    {!verification.captureAvailable && !verification.identityVerified ? <Feedback kind="info" title="Verification is not available yet">KAILA has not enabled identity-document collection. You can keep browsing in the meantime.</Feedback> : null}
    {verification.captureAvailable && !verification.identityVerified && !awaiting ? <form className={styles.form} onSubmit={submit}>
      <section className={styles.card}><div className={styles.title}><ShieldCheck /><div><h2>Before you start</h2><p>KAILA collects your ID and a new selfie only to verify identity, handle appeals, and protect lawful claims.</p></div></div><ul><li>Only assigned, trained reviewers can view protected evidence.</li><li>Other members see only “Identity verified.”</li><li>Raw evidence is scheduled for deletion under KAILA’s retention policy.</li><li>No facial-recognition automation or AI training is used.</li></ul><Link href="/privacy">Read the full Privacy Policy</Link></section>
      <section className={styles.card}><div className={styles.title}><FileCheck2 /><div><h2>Photograph your ID</h2><p>Use your own valid Philippine government-issued ID. Show every corner and avoid glare.</p></div></div>
        <label>ID type<select value={idType} onChange={(e) => setIdType(e.target.value)}><option value="philid">PhilID</option><option value="passport">Passport</option><option value="drivers_license">Driver’s license</option><option value="umid">UMID</option><option value="postal_id">Postal ID</option><option value="prc_id">PRC ID</option></select></label>
        <label>Expiry date <small>(if shown)</small><input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} /></label>
        <label className={styles.upload}>ID front<input required type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={choose(setIdFront)} /><span>{idFront?.name ?? "Take or choose a clear photo"}</span></label>
        <label className={styles.upload}>ID back <small>(only when needed)</small><input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={choose(setIdBack)} /><span>{idBack?.name ?? "Take or choose a clear photo"}</span></label>
      </section>
      <section className={styles.card}><div className={styles.title}><Camera /><div><h2>Take a new selfie</h2><p>Use the front camera in good light. Keep your face fully visible. Gallery images are not accepted.</p></div></div>
        {cameraOpen ? <div className={styles.camera}><video ref={videoRef} muted playsInline aria-label="Live selfie camera preview" /><Button type="button" onClick={captureSelfie}>Take selfie</Button></div> : <Button type="button" variant="secondary" onClick={() => void openCamera()}><Camera />{selfie ? "Retake selfie" : "Open front camera"}</Button>}
        {selfie && !cameraOpen ? <p className={styles.captured}>Fresh selfie captured</p> : null}
      </section>
      <label className={styles.consent}><input type="checkbox" checked={consented} onChange={(e) => setConsented(e.target.checked)} /><span>I have read the Identity Verification Notice. I freely and specifically consent to KAILA collecting and using my government-issued ID and selfie for identity verification. I understand I can browse without consenting, but verification-dependent actions remain unavailable.</span></label>
      {message && <p role="alert">{message}</p>}<Button type="submit" disabled={!consented || !idFront || !selfie || state === "consenting" || state === "uploading"}>{state === "uploading" ? "Protecting and uploading…" : "I agree — submit for review"}</Button>
    </form> : null}
    {awaiting && <Button variant="secondary" disabled={state === "uploading"} onClick={() => void act("consent", "DELETE")}>Withdraw consent</Button>}
    {verification.status === "rejected" && !verification.appealRequestedAt && <Button variant="secondary" onClick={() => void act("appeal", "POST")}>Request a different reviewer</Button>}
    {verification.appealRequestedAt && <p className={styles.note}>Your appeal is waiting for a different reviewer.</p>}
    {message && awaiting && <p role="status">{message}</p>}
  </main>;
}
