"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, Camera, FileCheck2, Images, RefreshCw, Repeat2, ShieldCheck, X } from "lucide-react";
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

const idTypes = [
  ["philid", "PhilID / ePhilID"], ["passport", "Philippine passport"],
  ["drivers_license", "Driver’s license"], ["umid", "UMID"], ["postal_id", "Postal ID"],
  ["prc_id", "PRC ID"], ["sss_id", "SSS ID"], ["gsis_id", "GSIS eCard"],
  ["philhealth_id", "PhilHealth ID"], ["voters_id", "Voter’s ID / certification"],
  ["senior_citizen_id", "Senior Citizen ID"], ["pwd_id", "PWD ID"], ["ofw_id", "OFW ID"],
  ["seamans_book", "Seaman’s Book"],
] as const;

type CameraTarget = "idFront" | "idBack" | "selfie";

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
  const [cameraTarget, setCameraTarget] = useState<CameraTarget | null>(null);
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("user");
  const [cameraStatus, setCameraStatus] = useState<"idle" | "starting" | "ready">("idle");
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

  const closeCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraTarget(null);
    setCameraStatus("idle");
  }, []);

  useEffect(() => {
    if (!cameraTarget) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeCamera();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [cameraTarget, closeCamera]);

  function choose(setter: (file: File | null) => void) {
    return (event: ChangeEvent<HTMLInputElement>) => setter(event.target.files?.[0] ?? null);
  }

  async function openCamera(target: CameraTarget, facing: "user" | "environment" = target === "selfie" ? "user" : "environment") {
    setMessage(""); closeCamera();
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage("Live camera capture is not supported in this browser. Use an updated browser or another device."); return;
    }
    setCameraTarget(target); setCameraFacing(facing); setCameraStatus("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
      streamRef.current = stream;
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
      const video = videoRef.current;
      if (!video) throw new Error("CAMERA_PREVIEW_UNAVAILABLE");
      video.srcObject = stream; await video.play();
    } catch (error) {
      closeCamera();
      const name = error instanceof DOMException ? error.name : "";
      setMessage(name === "NotAllowedError" ? "Camera access is blocked. Allow camera permission in your browser’s site settings, then try again." : name === "NotFoundError" ? "No working camera was found on this device." : "The camera could not start. Close other apps using it, check browser permission, and try again.");
    }
  }

  function capturePhoto() {
    const video = videoRef.current; if (!video || video.videoWidth === 0) return;
    const canvas = document.createElement("canvas"); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    // Save the unmirrored sensor frame; only the live preview is flipped for front camera.
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob || !cameraTarget) return;
      const names: Record<CameraTarget, string> = { idFront: "id-front.jpg", idBack: "id-back.jpg", selfie: "live-selfie.jpg" };
      const file = new File([blob], names[cameraTarget], { type: "image/jpeg", lastModified: Date.now() });
      if (cameraTarget === "idFront") setIdFront(file); else if (cameraTarget === "idBack") setIdBack(file); else setSelfie(file);
      closeCamera();
    }, "image/jpeg", 0.9);
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
        <label>ID type<select value={idType} onChange={(e) => setIdType(e.target.value)}>{idTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Expiry date <small>(if shown)</small><input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} /></label>
        <div className={styles.upload}><strong>ID front</strong><span>{idFront?.name ?? "No photo selected"}</span><div className={styles.uploadActions}><Button type="button" variant="secondary" onClick={() => void openCamera("idFront")}><Camera />Take photo</Button><label><Images />Choose photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={choose(setIdFront)} /></label></div></div>
        <div className={styles.upload}><strong>ID back <small>(only when needed)</small></strong><span>{idBack?.name ?? "No photo selected"}</span><div className={styles.uploadActions}><Button type="button" variant="secondary" onClick={() => void openCamera("idBack")}><Camera />Take photo</Button><label><Images />Choose photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={choose(setIdBack)} /></label></div></div>
      </section>
      <section className={styles.card}><div className={styles.title}><Camera /><div><h2>Take a new selfie</h2><p>Use the front camera in good light. Keep your face fully visible. Gallery images are not accepted.</p></div></div>
        <Button type="button" variant="secondary" onClick={() => void openCamera("selfie")}><Camera />{selfie ? "Retake selfie" : "Open front camera"}</Button>
        {selfie ? <p className={styles.captured}>Fresh selfie captured</p> : null}
      </section>
      <label className={styles.consent}><input type="checkbox" checked={consented} onChange={(e) => setConsented(e.target.checked)} /><span>I have read the Identity Verification Notice. I freely and specifically consent to KAILA collecting and using my government-issued ID and selfie for identity verification. I understand I can browse without consenting, but verification-dependent actions remain unavailable.</span></label>
      {message && <p role="alert">{message}</p>}<Button type="submit" disabled={!consented || !idFront || !selfie || state === "consenting" || state === "uploading"}>{state === "uploading" ? "Protecting and uploading…" : "I agree — submit for review"}</Button>
    </form> : null}
    {awaiting && <Button variant="secondary" disabled={state === "uploading"} onClick={() => void act("consent", "DELETE")}>Withdraw consent</Button>}
    {verification.status === "rejected" && !verification.appealRequestedAt && <Button variant="secondary" onClick={() => void act("appeal", "POST")}>Request a different reviewer</Button>}
    {verification.appealRequestedAt && <p className={styles.note}>Your appeal is waiting for a different reviewer.</p>}
    {message && awaiting && <p role="status">{message}</p>}
    {cameraTarget && typeof document !== "undefined" ? createPortal(
      <div
        className={styles.cameraBackdrop}
        role="presentation"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeCamera();
        }}
      >
        <section
          className={styles.camera}
          role="dialog"
          aria-modal="true"
          aria-label={cameraTarget === "selfie" ? "Selfie camera" : "ID camera"}
        >
          <div className={styles.cameraHeader}>
            <strong>{cameraTarget === "selfie" ? "Center your face" : "Fit the whole ID inside the frame"}</strong>
            <button type="button" onClick={closeCamera} aria-label="Close camera"><X /></button>
          </div>
          <div className={styles.preview}>
            <video
              ref={videoRef}
              muted
              playsInline
              data-mirrored={cameraTarget === "selfie" && cameraFacing === "user" ? "true" : undefined}
              onLoadedMetadata={(event) => { void event.currentTarget.play(); }}
              onCanPlay={() => setCameraStatus("ready")}
              aria-label="Live camera preview"
            />
            {cameraStatus !== "ready" ? <p>Starting camera…</p> : null}
          </div>
          <div className={styles.cameraActions}>
            <Button type="button" variant="secondary" onClick={() => void openCamera(cameraTarget, cameraFacing === "user" ? "environment" : "user")}><Repeat2 />Switch camera</Button>
            <Button type="button" disabled={cameraStatus !== "ready"} onClick={capturePhoto}>{cameraTarget === "selfie" ? "Take selfie" : "Take photo"}</Button>
          </div>
        </section>
      </div>,
      document.body,
    ) : null}
  </main>;
}
