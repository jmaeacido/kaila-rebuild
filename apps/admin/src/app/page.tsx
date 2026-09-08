"use client";

import { FormEvent, ReactNode, useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  Eye,
  EyeOff,
  History,
  LogIn,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Tags,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notifyAdminAuthenticated, notifyAdminSignedOut } from "./admin-session-events";
import { useAdminRealtimeRefresh } from "./admin-realtime";
import authStyles from "./auth.module.css";
import styles from "./review.module.css";
import { revokeAdminPushDevice } from "./components/admin-push-runtime";
import { AdminPageHeader, AdminSkeletons } from "../components/admin-page";
import { Button } from "@kaila/ui";

type Provider = {
  id: number;
  displayName: string;
  bio: string;
  yearsExperience: number;
  offersAtShop: boolean;
  shopName: string | null;
  shopAddress: string | null;
  submittedAt: string | null;
  isUpdate: boolean;
  changes: Array<{ field: string; label: string; previous: string; current: string }>;
  user: { id: number; name: string; email: string };
  services: Array<{ id: number; name: string }>;
  serviceAreas: Array<{ id: number; name: string; type: string }>;
};
type ProviderReview = Provider & {
  decision: "approved" | "rejected";
  reviewReason: string | null;
  reviewedAt: string | null;
  reviewedBy: { id: number | null; name: string; email: string | null };
};
type Credential = {
  id: number;
  label: string;
  type: string;
  submittedAt: string | null;
  provider: { id: number; displayName: string; user: { id: number; name: string; email: string } };
  asset: { id: string; originalName: string; mimeType: string; sizeBytes: number; scanStatus: string; previewUrl: string };
};
type CredentialReview = Credential & {
  decision: "approved" | "rejected";
  reviewReason: string | null;
  reviewedAt: string | null;
  reviewedBy: { id: number | null; name: string; email: string | null };
};
type Asset = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  purpose: "avatar" | "portfolio" | "credential";
  createdAt: string | null;
  previewUrl: string;
  uploadedBy: { id: number; name: string; email: string | null };
};
type AssetReview = Asset & {
  decision: "approved" | "rejected";
  reviewReason: string | null;
  reviewedAt: string | null;
  reviewedBy: { id: number | null; name: string; email: string | null };
};
type QueueData = {
  providers: Provider[];
  credentials: Credential[];
  assets: Asset[];
  assetReviews: AssetReview[];
  providerReviews: ProviderReview[];
  credentialReviews: CredentialReview[];
};
type RejectionTarget = {
  kind: "providers" | "credentials" | "assets";
  id: number | string;
  title: string;
  context: string;
  consequence: string;
};
type ViewState = "loading" | "ready" | "signed-out" | "forbidden" | "error";
type QueueResult =
  | { state: "ready"; data: QueueData }
  | { state: "signed-out" | "forbidden" };

function csrfToken(): string | undefined {
  const value = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("XSRF-TOKEN="))
    ?.split("=")[1];

  return value ? decodeURIComponent(value) : undefined;
}

export default function AdminHome() {
  const [queue, setQueue] = useState<QueueData>({
    providers: [],
    credentials: [],
    assets: [],
    assetReviews: [],
    providerReviews: [],
    credentialReviews: [],
  });
  const [state, setState] = useState<ViewState>("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutMessage, setLogoutMessage] = useState("");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewMessage, setReviewMessage] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [rejectionTarget, setRejectionTarget] = useState<RejectionTarget | null>(null);
  const [focusQueue, setFocusQueue] = useState<"files" | "providers" | "credentials">("files");

  const requestQueue = useCallback(async (): Promise<QueueResult> => {
    const response = await fetch("/api/v1/admin/marketplace/review-queue", {
      credentials: "include",
    });

    if (response.status === 401) {
      return { state: "signed-out" };
    }
    if (response.status === 403) {
      return { state: "forbidden" };
    }
    if (!response.ok) {
      throw new Error("Review queue request failed.");
    }

    const body = (await response.json()) as { data: QueueData };
    return { state: "ready", data: body.data };
  }, []);

  const applyQueueResult = useCallback((result: QueueResult) => {
    if (result.state === "ready") {
      setQueue(result.data);
    }
    setState(result.state);
  }, []);

  const load = useCallback(async () => {
    setState("loading");
    try {
      applyQueueResult(await requestQueue());
    } catch {
      setState("error");
    }
  }, [applyQueueResult, requestQueue]);

  useAdminRealtimeRefresh(load);

  useEffect(() => {
    void fetch("/api/v1/auth/session-status", {
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Session status request failed.");
        }

        const body = (await response.json()) as {
          data: { authenticated: boolean };
        };

        if (!body.data.authenticated) {
          setState("signed-out");
          notifyAdminSignedOut();
          return;
        }

        applyQueueResult(await requestQueue());
        notifyAdminAuthenticated();
      })
      .catch(() => setState("error"));
  }, [applyQueueResult, requestQueue]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSigningIn(true);
    setLoginMessage("");

    try {
      await fetch("/api/v1/auth/csrf", { credentials: "include" });
      const token = csrfToken();
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "X-XSRF-TOKEN": token } : {}),
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        setLoginMessage(
          response.status === 422
            ? "The email or password is incorrect."
            : "Sign in is unavailable right now. Please try again.",
        );
        return;
      }

      setPassword("");
      await load();
      notifyAdminAuthenticated();
    } catch {
      setLoginMessage("Sign in is unavailable right now. Please try again.");
    } finally {
      setSigningIn(false);
    }
  }

  async function review(
    kind: "providers" | "credentials" | "assets",
    id: number | string,
    approve: boolean,
    reviewReason?: string,
  ) {
    setReviewingId(String(id));
    setReviewMessage("");
    setReviewError("");
    try {
      await fetch("/api/v1/auth/csrf", { credentials: "include" });
      const token = csrfToken();
      const url =
        kind === "providers"
          ? `/api/v1/admin/marketplace/providers/${id}/status`
          : kind === "credentials"
            ? `/api/v1/admin/marketplace/credentials/${id}/review`
            : `/api/v1/admin/marketplace/assets/${id}/scan`;
      const body =
        kind === "providers"
          ? { status: approve ? "active" : "rejected", ...(approve ? {} : { reviewReason }) }
          : kind === "credentials"
            ? { reviewStatus: approve ? "approved" : "rejected", ...(approve ? {} : { reviewNote: reviewReason }) }
            : {
                scanStatus: approve ? "clean" : "rejected",
                ...(approve ? {} : { reviewReason }),
              };

      const response = await fetch(url, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "X-XSRF-TOKEN": token } : {}),
        },
        body: JSON.stringify(body),
      });

      if (response.status === 401) {
        setState("signed-out");
        notifyAdminSignedOut();
        return;
      }
      if (!response.ok) throw new Error("Review request failed.");

      applyQueueResult(await requestQueue());
      setReviewMessage(
        kind === "assets"
          ? approve
            ? "The file was approved."
            : "The file was rejected."
          : "The review decision was saved.",
      );
    } catch {
      setReviewError("The decision could not be saved. Try again.");
    } finally {
      setReviewingId(null);
    }
  }

  async function signOut() {
    setLoggingOut(true);
    setLogoutMessage("");

    try {
      await revokeAdminPushDevice();
      await fetch("/api/v1/auth/csrf", { credentials: "include" });
      const token = csrfToken();
      const response = await fetch("/api/v1/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: token ? { "X-XSRF-TOKEN": token } : {},
      });

      if (!response.ok && response.status !== 401) {
        throw new Error("Logout request failed.");
      }

      setQueue({ providers: [], credentials: [], assets: [], assetReviews: [], providerReviews: [], credentialReviews: [] });
      setEmail("");
      setPassword("");
      setState("signed-out");
      notifyAdminSignedOut();
    } catch {
      setLogoutMessage("You could not be signed out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  }

  if (state === "signed-out") {
    return (
      <main className={authStyles.authPage}>
        <section className={authStyles.authCard}>
          <div className={authStyles.authIcon}>
            <Image
              src="/brand/kaila-bull-app-icon-v2.png"
              alt=""
              width={533}
              height={556}
              priority
            />
          </div>
          <p className={authStyles.eyebrow}>KAILA ADMINISTRATION</p>
          <h1>Sign in to review</h1>
          <p className={authStyles.supporting}>
            Use an authorized administrator account to continue.
          </p>
          <form className={authStyles.form} onSubmit={(event) => void signIn(event)}>
            <label>
              Email
              <input
                autoComplete="username"
                inputMode="email"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </label>
            <label>
              Password
              <span className={authStyles.passwordControl}>
                <input
                  autoComplete="current-password"
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                />
                <button
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                  tabIndex={-1}
                  type="button"
                >
                  {showPassword ? (
                    <EyeOff aria-hidden="true" />
                  ) : (
                    <Eye aria-hidden="true" />
                  )}
                </button>
              </span>
            </label>
            {loginMessage && (
              <p className={authStyles.formError} role="alert">
                {loginMessage}
              </p>
            )}
            <Link className={authStyles.textLink} href="/forgot-password">
              Forgot your password?
            </Link>
            <Button isLoading={signingIn} type="submit">
              <LogIn aria-hidden="true" />
              {signingIn ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <AdminPageHeader
        actions={
          <>
            <Button disabled={loggingOut} onClick={() => void load()} type="button" variant="secondary">
              <RefreshCw aria-hidden="true" />
              Refresh
            </Button>
            <Button disabled={loggingOut} isLoading={loggingOut} onClick={() => void signOut()} type="button" variant="tertiary">
              <LogOut aria-hidden="true" />
              {loggingOut ? "Signing out…" : "Sign out"}
            </Button>
          </>
        }
        description="Approve or reject files, provider profiles, and credentials waiting on staff review."
        eyebrow="KAILA OPERATIONS"
        title="Marketplace review"
      />
      {logoutMessage && (
        <div className={styles.error} role="alert">
          {logoutMessage}
        </div>
      )}
      {state === "forbidden" && (
        <div className={styles.error} role="alert">
          This account does not have administrator access.
        </div>
      )}
      {state === "error" && (
        <div className={styles.error} role="alert">
          The review queue could not be loaded. Check the API connection and
          try again.
        </div>
      )}
      {state === "loading" && <AdminSkeletons count={4} label="Loading review queue" />}
      {reviewMessage && (
        <div className={styles.success} role="status">
          {reviewMessage}
        </div>
      )}
      {reviewError && (
        <div className={styles.error} role="alert">
          {reviewError}
        </div>
      )}
      {state === "ready" && (
        <>
          <div aria-label="Review queues" className={styles.queueTabs} role="tablist">
            {(
              [
                { id: "files" as const, label: "Files", count: queue.assets.length },
                { id: "providers" as const, label: "Providers", count: queue.providers.length },
                { id: "credentials" as const, label: "Credentials", count: queue.credentials.length },
              ] as const
            ).map((tab) => (
              <button
                aria-controls={`review-panel-${tab.id}`}
                aria-selected={focusQueue === tab.id}
                className={focusQueue === tab.id ? styles.queueTabActive : undefined}
                id={`review-tab-${tab.id}`}
                key={tab.id}
                onClick={() => setFocusQueue(tab.id)}
                role="tab"
                tabIndex={focusQueue === tab.id ? 0 : -1}
                type="button"
              >
                {tab.label}
                <small>{tab.count}</small>
              </button>
            ))}
          </div>
        <div className={styles.columns} data-focus={focusQueue}>
          <div aria-labelledby="review-tab-files" className={styles.focusPane} hidden={focusQueue !== "files"} id="review-panel-files" role="tabpanel">
          <Queue
            empty="No files need review."
            icon={<ShieldCheck />}
            title="File reviews"
          >
            {queue.assets.map((asset) => (
              <article className={styles.assetCard} key={asset.id}>
                <div className={styles.assetPreview}>
                  {asset.mimeType.startsWith("image/") ? (
                    <Image
                      alt={`Preview of ${asset.originalName}`}
                      height={480}
                      src={asset.previewUrl}
                      unoptimized
                      width={640}
                    />
                  ) : (
                    <a href={asset.previewUrl} rel="noreferrer" target="_blank">
                      <Eye aria-hidden="true" />
                      Open file preview
                    </a>
                  )}
                </div>
                <div className={styles.assetHeading}>
                  <span>{purposeLabel(asset.purpose)}</span>
                  <h3>{asset.originalName}</h3>
                </div>
                <dl className={styles.assetDetails}>
                  <div><dt>Uploaded by</dt><dd>{asset.uploadedBy.name}</dd></div>
                  <div><dt>Account</dt><dd>{asset.uploadedBy.email ?? `User #${asset.uploadedBy.id}`}</dd></div>
                  <div><dt>File</dt><dd>{asset.mimeType} · {formatBytes(asset.sizeBytes)}</dd></div>
                  <div><dt>Uploaded</dt><dd>{formatDate(asset.createdAt)}</dd></div>
                </dl>
                <Actions
                  approveLabel="Approve file"
                  busy={reviewingId !== null}
                  onChoose={(approve) =>
                    approve
                      ? void review("assets", asset.id, true)
                      : setRejectionTarget({
                          kind: "assets",
                          id: asset.id,
                          title: asset.originalName,
                          context: `${purposeLabel(asset.purpose)} · ${asset.uploadedBy.name}`,
                          consequence: "It will remain private and won't appear on the user's profile.",
                        })
                  }
                  rejectLabel="Reject file"
                />
              </article>
            ))}
          </Queue>
          <Queue
            empty="No file reviews have been completed yet."
            icon={<History />}
            title="Review history"
          >
            {queue.assetReviews.map((review) => (
              <article className={styles.historyCard} key={review.id}>
                <div className={styles.historyPreview}>
                  {review.mimeType.startsWith("image/") ? (
                    <Image
                      alt={`Reviewed file ${review.originalName}`}
                      height={180}
                      src={review.previewUrl}
                      unoptimized
                      width={240}
                    />
                  ) : (
                    <a href={review.previewUrl} rel="noreferrer" target="_blank">
                      <Eye aria-hidden="true" />
                      Open file
                    </a>
                  )}
                </div>
                <div className={styles.historyContent}>
                  <div className={styles.historyHeading}>
                    <div>
                      <span>{purposeLabel(review.purpose)}</span>
                      <h3>{review.originalName}</h3>
                    </div>
                    <strong data-decision={review.decision}>
                      {review.decision === "approved" ? "Approved" : "Rejected"}
                    </strong>
                  </div>
                  <dl className={styles.assetDetails}>
                    <div><dt>Uploaded by</dt><dd>{review.uploadedBy.name}</dd></div>
                    <div><dt>Reviewed by</dt><dd>{review.reviewedBy.name}</dd></div>
                    <div><dt>Reviewed</dt><dd>{formatDate(review.reviewedAt)}</dd></div>
                  </dl>
                  {review.reviewReason && (
                    <p className={styles.historyReason}>
                      <strong>Reason</strong>
                      {review.reviewReason}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </Queue>
          </div>
          <div aria-labelledby="review-tab-providers" className={styles.focusPane} hidden={focusQueue !== "providers"} id="review-panel-providers" role="tabpanel">
          <Queue
            empty="No provider profiles need review."
            icon={<ShieldCheck />}
            title="Provider profiles"
          >
            {queue.providers.map((provider) => (
              <article className={styles.reviewCard} key={provider.id}>
                <div className={styles.reviewCardHeading}>
                  <div><span>{provider.isUpdate ? "Profile update" : "Provider application"}</span><h3>{provider.displayName}</h3></div>
                  <small>{formatDate(provider.submittedAt)}</small>
                </div>
                {provider.isUpdate && provider.changes.length > 0 && (
                  <section className={styles.profileChanges} aria-label="Changes in this submission">
                    <h4>Changes in this submission</h4>
                    <ul>
                      {provider.changes.map((change) => (
                        <li key={change.field}>
                          <strong>{change.label}</strong>
                          <p><span>Was</span>{change.previous}</p>
                          <p><span>Now</span>{change.current}</p>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                {provider.isUpdate && provider.changes.length === 0 && (
                  <p className={styles.profileChangesEmpty}>No profile fields changed in this resubmission.</p>
                )}
                <p className={styles.reviewBio}>{provider.bio}</p>
                <dl className={styles.assetDetails}>
                  <div><dt>Account</dt><dd>{provider.user.name} · {provider.user.email}</dd></div>
                  <div><dt>Experience</dt><dd>{provider.yearsExperience} years</dd></div>
                  <div><dt>Services</dt><dd>{provider.services.map((item) => item.name).join(", ")}</dd></div>
                  <div><dt>Areas</dt><dd>{provider.serviceAreas.map((item) => item.name).join(", ")}</dd></div>
                  {provider.offersAtShop && <div><dt>Shop</dt><dd>{provider.shopName} · {provider.shopAddress}</dd></div>}
                </dl>
                <Actions
                  approveLabel="Approve profile"
                  busy={reviewingId !== null}
                  onChoose={(approve) => approve
                    ? void review("providers", provider.id, true)
                    : setRejectionTarget({ kind: "providers", id: provider.id, title: provider.displayName, context: `Provider profile · ${provider.user.name}`, consequence: "The provider profile will stay unavailable until the user corrects and resubmits it." })}
                  rejectLabel="Reject profile"
                />
              </article>
            ))}
          </Queue>
          <Queue empty="No provider profile reviews yet." icon={<History />} title="Provider review history">
            {queue.providerReviews.map((review) => (
              <article className={styles.reviewCard} key={review.id}>
                <div className={styles.historyHeading}>
                  <div><span>Provider profile</span><h3>{review.displayName}</h3></div>
                  <strong data-decision={review.decision}>{review.decision === "approved" ? "Approved" : "Rejected"}</strong>
                </div>
                <dl className={styles.assetDetails}>
                  <div><dt>Account</dt><dd>{review.user.name}</dd></div>
                  <div><dt>Reviewed by</dt><dd>{review.reviewedBy.name}</dd></div>
                  <div><dt>Reviewed</dt><dd>{formatDate(review.reviewedAt)}</dd></div>
                </dl>
                {review.reviewReason && <p className={styles.historyReason}><strong>Reason</strong>{review.reviewReason}</p>}
              </article>
            ))}
          </Queue>
          </div>
          <div aria-labelledby="review-tab-credentials" className={styles.focusPane} hidden={focusQueue !== "credentials"} id="review-panel-credentials" role="tabpanel">
          <Queue
            empty="No credentials need review."
            icon={<Tags />}
            title="Credentials"
          >
            {queue.credentials.map((credential) => (
              <article className={styles.credentialCard} key={credential.id}>
                <div className={styles.assetPreview}>
                  {credential.asset.mimeType.startsWith("image/") ? <Image alt={`Preview of ${credential.label}`} height={480} src={credential.asset.previewUrl} unoptimized width={640} /> : <a href={credential.asset.previewUrl} rel="noreferrer" target="_blank"><Eye aria-hidden="true" />Open credential</a>}
                </div>
                <div className={styles.reviewCardHeading}><div><span>{credential.type}</span><h3>{credential.label}</h3></div><small>{formatDate(credential.submittedAt)}</small></div>
                <dl className={styles.assetDetails}>
                  <div><dt>Provider</dt><dd>{credential.provider.displayName}</dd></div>
                  <div><dt>Account</dt><dd>{credential.provider.user.name} · {credential.provider.user.email}</dd></div>
                  <div><dt>File</dt><dd>{credential.asset.mimeType} · {formatBytes(credential.asset.sizeBytes)}</dd></div>
                  <div><dt>File review</dt><dd>{credential.asset.scanStatus === "clean" ? "Approved" : "Pending or rejected"}</dd></div>
                </dl>
                <Actions
                  approveLabel="Approve credential"
                  busy={reviewingId !== null}
                  onChoose={(approve) => approve
                    ? void review("credentials", credential.id, true)
                    : setRejectionTarget({ kind: "credentials", id: credential.id, title: credential.label, context: `Credential · ${credential.provider.displayName}`, consequence: "The credential will not count toward verification. The provider can submit a corrected document." })}
                  rejectLabel="Reject credential"
                />
              </article>
            ))}
          </Queue>
          <Queue empty="No credential reviews yet." icon={<History />} title="Credential review history">
            {queue.credentialReviews.map((review) => (
              <article className={styles.historyCard} key={review.id}>
                <div className={styles.historyPreview}>{review.asset.mimeType.startsWith("image/") ? <Image alt={`Reviewed credential ${review.label}`} height={180} src={review.asset.previewUrl} unoptimized width={240} /> : <a href={review.asset.previewUrl} rel="noreferrer" target="_blank">Open file</a>}</div>
                <div className={styles.historyContent}>
                  <div className={styles.historyHeading}><div><span>{review.type}</span><h3>{review.label}</h3></div><strong data-decision={review.decision}>{review.decision === "approved" ? "Approved" : "Rejected"}</strong></div>
                  <dl className={styles.assetDetails}><div><dt>Provider</dt><dd>{review.provider.displayName}</dd></div><div><dt>Reviewed by</dt><dd>{review.reviewedBy.name}</dd></div><div><dt>Reviewed</dt><dd>{formatDate(review.reviewedAt)}</dd></div></dl>
                  {review.reviewReason && <p className={styles.historyReason}><strong>Reason</strong>{review.reviewReason}</p>}
                </div>
              </article>
            ))}
          </Queue>
          </div>
        </div>
        </>
      )}
      <ReviewRejectionDialog
        busy={rejectionTarget !== null && String(rejectionTarget.id) === reviewingId}
        key={rejectionTarget ? `${rejectionTarget.kind}-${rejectionTarget.id}` : "closed"}
        onCancel={() => setRejectionTarget(null)}
        onConfirm={(reason) => {
          if (!rejectionTarget) return;
          void review(rejectionTarget.kind, rejectionTarget.id, false, reason).finally(() =>
            setRejectionTarget(null),
          );
        }}
        target={rejectionTarget}
      />
    </main>
  );
}

function Queue({
  title,
  icon,
  empty,
  children,
}: {
  title: string;
  icon: ReactNode;
  empty: string;
  children: ReactNode;
}) {
  const count = Array.isArray(children) ? children.length : 0;
  const history = title.toLowerCase().includes("history");
  const heading = (
    <h2>
      {icon}
      <span>{title}</span>
      <small className={styles.queueCount}>{count}</small>
    </h2>
  );
  const emptyState = (
    <div className={styles.emptyState}>
      <span aria-hidden="true">{icon}</span>
      <p>{empty}</p>
    </div>
  );

  if (history) {
    return (
      <details className={`${styles.queueSection} ${styles.historyQueue}`}>
        <summary>{heading}</summary>
        <div className={styles.queueContent}>
          {count === 0 ? emptyState : children}
        </div>
      </details>
    );
  }

  return (
    <section className={styles.queueSection}>
      {heading}
      {count === 0 ? (
        emptyState
      ) : (
        children
      )}
    </section>
  );
}

function Actions({
  onChoose,
  approveLabel = "Approve",
  rejectLabel = "Reject",
  busy = false,
}: {
  onChoose: (approve: boolean) => void;
  approveLabel?: string;
  rejectLabel?: string;
  busy?: boolean;
}) {
  return (
    <div className={styles.actions}>
      <button
        className={styles.approve}
        disabled={busy}
        onClick={() => onChoose(true)}
        type="button"
      >
        <Check aria-hidden="true" />
        {busy ? "Saving…" : approveLabel}
      </button>
      <button
        className={styles.reject}
        disabled={busy}
        onClick={() => onChoose(false)}
        type="button"
      >
        <X aria-hidden="true" />
        {rejectLabel}
      </button>
    </div>
  );
}

function ReviewRejectionDialog({
  target,
  busy,
  onCancel,
  onConfirm,
}: {
  target: RejectionTarget | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (target && dialog && !dialog.open) dialog.showModal();
    if (!target && dialog?.open) dialog.close();
  }, [target]);

  return (
    <dialog
      aria-labelledby="reject-file-title"
      aria-describedby="reject-file-description"
      className={styles.confirmDialog}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
      ref={dialogRef}
    >
      <div className={styles.confirmDialogContent}>
        <div className={styles.confirmDialogIcon}>
          <AlertTriangle aria-hidden="true" />
        </div>
        <div className={styles.confirmDialogCopy}>
          <p>KAILA REVIEW</p>
          <h2 id="reject-file-title">Reject this submission?</h2>
          <p id="reject-file-description">
            {target?.consequence}
          </p>
        </div>
        {target && (
          <div className={styles.confirmFile}>
            <strong>{target.title}</strong>
            <span>{target.context}</span>
          </div>
        )}
        <label className={styles.confirmReason} htmlFor="reject-file-reason">
          Reason for rejection
          <textarea
            autoFocus
            disabled={busy}
            id="reject-file-reason"
            maxLength={500}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Explain what needs to be corrected before submitting again."
            required
            value={reason}
          />
          <span>{reason.length}/500 · Minimum 10 characters</span>
        </label>
        <div className={styles.confirmActions}>
          <button disabled={busy} onClick={onCancel} type="button">
            Keep file
          </button>
          <button
            className={styles.confirmReject}
            disabled={busy || reason.trim().length < 10}
            onClick={() => onConfirm(reason.trim())}
            type="button"
          >
            <X aria-hidden="true" />
            {busy ? "Rejecting…" : "Reject file"}
          </button>
        </div>
      </div>
    </dialog>
  );
}

function purposeLabel(purpose: Asset["purpose"]): string {
  return purpose === "avatar"
    ? "Profile picture"
    : purpose === "portfolio"
      ? "Portfolio image"
      : "Credential";
}

function formatBytes(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function formatDate(value: string | null): string {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
