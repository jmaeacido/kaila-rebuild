"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  BriefcaseBusiness,
  Camera,
  Check,
  ChevronRight,
  MapPin,
  Settings,
  ShieldCheck,
  Star,
  UserRound,
} from "lucide-react";
import { Button, Feedback } from "@kaila/ui";
import { ActionModal } from "../../components/action-modal";
import { AttachmentSourceActions } from "../../components/attachment-picker";
import { MarketplaceNavigation } from "../../components/marketplace-navigation";
import { prepareCsrf } from "../auth-client";
import { AddressHierarchy, type AreaReference } from "../address-hierarchy";
import styles from "./account.module.css";
import { useRealtimeInvalidation } from "../use-realtime-invalidation";
import { profilePictureReviewEvent, type NotificationRecord } from "../notification-route";
import { areaProfileChangedEvent } from "../../components/area-mismatch-banner";

type User = {
  name: string;
  email: string;
  activeMode: "client" | "provider" | null;
  providerEligible: boolean;
  avatarUrl: string | null;
  reputation: { averageRating: number | null; reviewCount: number };
};
type Profile = {
  activeMode: "client" | "provider" | null;
  client: { display_name: string; area_id: number | null } | null;
  provider: { display_name: string; status: string } | null;
};

export default function AccountPage() {
  const clientFormIsDirty = useRef(false);
  const loadSequence = useRef(0);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [areas, setAreas] = useState<AreaReference[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [areaId, setAreaId] = useState("");
  const [status, setStatus] = useState<
    "loading" | "ready" | "saving" | "uploading" | "error"
  >("loading");
  const [notice, setNotice] = useState("");
  const [avatarNotice, setAvatarNotice] = useState("");
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [avatarReviewOutcome, setAvatarReviewOutcome] = useState<"approved" | "rejected" | null>(null);
  const [avatarReviewReason, setAvatarReviewReason] = useState<string | null>(null);

  const markClientFormDirty = useCallback(() => {
    clientFormIsDirty.current = true;
    loadSequence.current += 1;
  }, []);

  const load = useCallback(async () => {
    const sequence = ++loadSequence.current;
    setStatus("loading");
    try {
      const [userResponse, profileResponse, referenceResponse] =
        await Promise.all([
          fetch("/api/v1/me", { cache: "no-store" }),
          fetch("/api/v1/me/marketplace-profile", { cache: "no-store" }),
          fetch("/api/v1/marketplace/reference-data"),
        ]);
      if (!userResponse.ok || !profileResponse.ok || !referenceResponse.ok) {
        throw new Error();
      }
      const userData = ((await userResponse.json()) as { data: User }).data;
      const profileData = (
        (await profileResponse.json()) as { data: Profile }
      ).data;
      const referenceData = (
        (await referenceResponse.json()) as {
          data: { areas: AreaReference[] };
        }
      ).data;
      setUser(userData);
      setProfile(profileData);
      setAreas(referenceData.areas);
      if (!clientFormIsDirty.current && sequence === loadSequence.current) {
        setDisplayName(profileData.client?.display_name || userData.name);
        setAreaId(
          profileData.client?.area_id
            ? String(profileData.client.area_id)
            : "",
        );
      }
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);
  useRealtimeInvalidation(() => void load(), (event) => ["profile.updated", "profile.media.updated"].includes(event.type));

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [load]);

  useEffect(
    () => () => {
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    },
    [avatarPreviewUrl],
  );

  useEffect(() => {
    let active = true;
    const openReview = (reviewStatus?: unknown, reviewReason?: unknown) => {
      setAvatarReviewOutcome(reviewStatus === "approved" ? "approved" : "rejected");
      setAvatarReviewReason(typeof reviewReason === "string" && reviewReason.trim() ? reviewReason.trim() : null);
      setAvatarMenuOpen(true);
    };
    const params = new URLSearchParams(window.location.search);
    if (params.get("profilePicture") === "review") {
      openReview(params.get("reviewStatus"));
      const notificationId = params.get("notificationId");
      if (notificationId) {
        void fetch("/api/v1/notifications", { credentials: "include", headers: { Accept: "application/json" }, cache: "no-store" })
          .then(async (response) => {
            if (!response.ok) return;
            const item = ((await response.json()) as { data: NotificationRecord[] }).data.find((notification) => notification.id === notificationId);
            if (active && item) openReview(item.data.reviewStatus, item.data.reviewReason);
          })
          .catch(() => undefined);
      }
    }
    const handleReview = (event: Event) => {
      const detail = (event as CustomEvent<{ reviewStatus?: unknown; reviewReason?: unknown }>).detail;
      openReview(detail?.reviewStatus, detail?.reviewReason);
    };
    window.addEventListener(profilePictureReviewEvent, handleReview);
    return () => {
      active = false;
      window.removeEventListener(profilePictureReviewEvent, handleReview);
    };
  }, []);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setNotice("");
    loadSequence.current += 1;
    try {
      const response = await fetch("/api/v1/me/client-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          areaId: areaId ? Number(areaId) : null,
        }),
      });
      if (!response.ok) throw new Error();
      window.dispatchEvent(new Event(areaProfileChangedEvent));
      setNotice("Your profile details are saved.");
      clientFormIsDirty.current = false;
      await load();
    } catch {
      setStatus("error");
      setNotice("We couldn’t save your profile. Try again.");
    }
  }

  async function uploadAvatarFile(file: File) {
    setAvatarPreviewUrl(URL.createObjectURL(file));
    setUploadProgress(0);
    setStatus("uploading");
    setAvatarNotice("");
    try {
      const token = await prepareCsrf();
      const body = new FormData();
      body.append("purpose", "avatar");
      body.append("file", file);
      const responseStatus = await new Promise<number>((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open("POST", "/api/v1/me/profile-assets");
        request.setRequestHeader("Accept", "application/json");
        if (token) request.setRequestHeader("X-XSRF-TOKEN", token);
        request.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
          }
        });
        request.addEventListener("load", () => resolve(request.status));
        request.addEventListener("error", () => reject(new Error("upload-failed")));
        request.addEventListener("abort", () => reject(new Error("upload-failed")));
        request.send(body);
      });
      if (responseStatus < 200 || responseStatus >= 300) {
        throw new Error(responseStatus === 422 ? "invalid-file" : "upload-failed");
      }
      setUploadProgress(100);
      setAvatarNotice("Uploaded. Your picture will appear after review.");
      setStatus("ready");
    } catch (error) {
      setStatus("error");
      setAvatarNotice(
        error instanceof Error && error.message === "invalid-file"
          ? "That picture isn't supported. Use JPG, PNG, or WebP up to 10 MB."
          : "We couldn't upload your picture right now. Try again.",
      );
    }
  }

  async function switchMode(activeMode: "client" | "provider") {
    if (activeMode === "provider" && !user?.providerEligible) return;
    setStatus("saving");
    try {
      const response = await fetch("/api/v1/me/active-mode", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeMode }),
      });
      if (!response.ok) throw new Error();
      await load();
      setNotice(
        activeMode === "provider"
          ? "Provider mode is active."
          : "Client mode is active.",
      );
    } catch {
      setStatus("error");
      setNotice("We couldn’t switch modes. Try again.");
    }
  }

  if (status === "loading" && !user) {
    return (
      <main className={styles.shell} aria-label="Loading account">
        <div className={styles.profileSkeleton} />
        <div className={styles.cardSkeleton} />
      </main>
    );
  }

  if (!user || !profile) {
    return (
      <main className={styles.shell}>
        <Feedback kind="error" title="We couldn’t load your account">
          Check your connection and try again.
        </Feedback>
        <Button onClick={() => void load()}>Try again</Button>
      </main>
    );
  }

  return (
    <main className={styles.shell}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>YOUR KAILA ACCOUNT</p>
          <h1>Profile and account</h1>
          <p>Keep your identity, location, and marketplace mode up to date.</p>
        </div>
        <Link href="/settings">
          <Settings aria-hidden="true" />
          Settings
        </Link>
      </header>

      <section className={styles.identityCard} aria-labelledby="identity-title">
        <div className={styles.avatar}>
          <span aria-hidden="true">{user.name.charAt(0).toUpperCase()}</span>
          {user.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt=""
              width={112}
              height={112}
              unoptimized
            />
          ) : null}
          <button
            aria-expanded={avatarMenuOpen}
            aria-label="Change profile picture"
            className={styles.avatarTrigger}
            disabled={status === "uploading"}
            onClick={() => {
              setAvatarReviewOutcome(null);
              setAvatarReviewReason(null);
              setAvatarMenuOpen((open) => !open);
            }}
            type="button"
          >
            <Camera aria-hidden="true" />
          </button>
        </div>
        <div>
          <h2 id="identity-title">{user.name}</h2>
          <p>{user.email}</p>
          <span className={styles.safetyNote}>
            <ShieldCheck aria-hidden="true" />
            Pictures are reviewed before they appear
          </span>
          {avatarNotice && (
            <p
              className={styles.avatarNotice}
              data-kind={status === "error" ? "error" : "success"}
              role={status === "error" ? "alert" : "status"}
            >
              {avatarNotice}
            </p>
          )}
        </div>
        {avatarMenuOpen && (
          <ActionModal
            eyebrow="Profile picture"
            title="Choose a photo"
            onClose={() => setAvatarMenuOpen(false)}
            wide
          >
            <div className={styles.avatarModalBody}>
              {avatarReviewOutcome && (
                <div className={styles.reviewOutcome} data-kind={avatarReviewOutcome} role="status">
                  {avatarReviewOutcome === "approved" ? <Check aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
                  <div>
                    <strong>{avatarReviewOutcome === "approved" ? "Profile picture approved" : "Profile picture not approved"}</strong>
                    {avatarReviewOutcome === "approved" ? (
                      <p>Your approved picture is now available on KAILA.</p>
                    ) : (
                      <>
                        <div className={styles.reviewReason}>
                          <strong>Reason</strong>
                          <p>{avatarReviewReason || "The reviewer did not provide a reason."}</p>
                        </div>
                        <p>Choose another clear photo to submit for review.</p>
                      </>
                    )}
                  </div>
                </div>
              )}
              <div className={styles.avatarPreview}>
                {avatarPreviewUrl || user.avatarUrl ? (
                  <Image
                    src={avatarPreviewUrl || user.avatarUrl || ""}
                    alt="Profile picture preview"
                    width={160}
                    height={160}
                    unoptimized
                  />
                ) : (
                  <span aria-hidden="true">{user.name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              {status === "uploading" && (
                <div className={styles.uploadStatus} role="status">
                  <div><strong>Uploading photo</strong><span>{uploadProgress}%</span></div>
                  <progress aria-label="Photo upload progress" max="100" value={uploadProgress} />
                </div>
              )}
              {avatarPreviewUrl && status === "ready" && avatarNotice && (
                <div className={styles.reviewStatus} role="status">
                  <ShieldCheck aria-hidden="true" />
                  <div><strong>Waiting for review</strong><p>Your current profile picture stays visible until this photo is approved.</p></div>
                </div>
              )}
              {avatarPreviewUrl && status === "error" && avatarNotice && (
                <p className={styles.uploadError} role="alert">{avatarNotice}</p>
              )}
            <AttachmentSourceActions
              kinds={["image"]}
              facingMode="user"
              compact
              compactColumns={2}
              className={styles.avatarSourceActions}
              disabled={status === "uploading"}
              onFiles={(files) => {
                const next = files[0];
                if (next) {
                  void uploadAvatarFile(next);
                }
              }}
            />
              <p>Choose a clear photo of yourself. JPG, PNG, and WebP files up to 10 MB are supported.</p>
              <span className={styles.safetyNote}>
                <ShieldCheck aria-hidden="true" />
                Pictures are reviewed before they appear
              </span>
            </div>
          </ActionModal>
        )}
      </section>

      {notice && (
        <Feedback
          kind={status === "error" ? "error" : "success"}
          title={status === "error" ? "Action needed" : "Account updated"}
        >
          {notice}
        </Feedback>
      )}

      <div className={styles.accountGrid}>
      <div className={styles.primaryColumn}>
      <section className={styles.card} aria-labelledby="mode-title">
        <p className={styles.eyebrow}>MARKETPLACE MODE</p>
        <h2 id="mode-title">How are you using KAILA?</h2>
        <div className={styles.modeGrid}>
          <button
            aria-pressed={profile.activeMode !== "provider"}
            className={profile.activeMode !== "provider" ? styles.active : ""}
            disabled={status === "saving"}
            onClick={() => void switchMode("client")}
            type="button"
          >
            <UserRound aria-hidden="true" />
            <span>
              <strong>Client</strong>
              <small>I need local help</small>
            </span>
            {profile.activeMode !== "provider" && <Check aria-hidden="true" />}
          </button>
          <button
            aria-pressed={profile.activeMode === "provider"}
            className={profile.activeMode === "provider" ? styles.active : ""}
            disabled={!user.providerEligible || status === "saving"}
            onClick={() => void switchMode("provider")}
            type="button"
          >
            <BriefcaseBusiness aria-hidden="true" />
            <span>
              <strong>Provider</strong>
              <small>
                {user.providerEligible
                  ? "I’m looking for work"
                  : "Profile approval required"}
              </small>
            </span>
            {profile.activeMode === "provider" && <Check aria-hidden="true" />}
          </button>
        </div>
        {!user.providerEligible && (
          <Link className={styles.providerLink} href="/provider-profile">
            Set up or review your provider profile
            <ChevronRight aria-hidden="true" />
          </Link>
        )}
      </section>

      <form
        className={styles.card}
        onInput={markClientFormDirty}
        onSubmit={(event) => void saveProfile(event)}
      >
        <p className={styles.eyebrow}>CLIENT PROFILE</p>
        <h2>How providers know you</h2>
        <label>
          Display name
          <input
            maxLength={100}
            onChange={(event) => setDisplayName(event.target.value)}
            required
            value={displayName}
          />
        </label>
        <div className={styles.homeArea}>
          <span>
            <MapPin aria-hidden="true" />
            Home area
          </span>
          <AddressHierarchy
            areas={areas}
            value={areaId}
            onChange={(value) => {
              markClientFormDirty();
              setAreaId(value);
            }}
            optional
          />
        </div>
        <Button isLoading={status === "saving"} type="submit">
          Save profile
        </Button>
      </form>
      </div>

      <aside className={styles.secondaryColumn} aria-label="Account overview and destinations">
      <section className={styles.reputationCard} aria-labelledby="reputation-title">
        <span className={styles.reputationIcon}><Star aria-hidden="true" /></span>
        <div>
          <p className={styles.eyebrow}>YOUR REPUTATION</p>
          <h2 id="reputation-title">
            {user.reputation.averageRating === null
              ? "New to KAILA"
              : `${user.reputation.averageRating.toFixed(1)} overall rating`}
          </h2>
          <p>
            {user.reputation.reviewCount === 0
              ? "Your rating will appear after a completed job review is published."
              : `Based on ${user.reputation.reviewCount} published review${user.reputation.reviewCount === 1 ? "" : "s"} from your completed jobs.`}
          </p>
        </div>
      </section>

      <section className={styles.links} aria-label="Account destinations">
        <Link href="/support">
          <span className={styles.supportIcon}><Image src="/support/support-icon.png" alt="" width={48} height={48} /></span>
          <div><strong>Support</strong><small>Ask a question or follow your requests</small></div>
          <ChevronRight aria-hidden="true" />
        </Link>
        <Link href="/safety">
          <span><ShieldCheck aria-hidden="true" /></span>
          <div><strong>Trust and safety</strong><small>Report a concern and track its outcome</small></div>
          <ChevronRight aria-hidden="true" />
        </Link>
        <Link href="/settings">
          <span>
            <Bell aria-hidden="true" />
          </span>
          <div>
            <strong>Notifications and security</strong>
            <small>Quiet hours, messages, and signed-in devices</small>
          </div>
          <ChevronRight aria-hidden="true" />
        </Link>
        <Link href="/provider-profile">
          <span>
            <BriefcaseBusiness aria-hidden="true" />
          </span>
          <div>
            <strong>Provider profile</strong>
            <small>Services, coverage, experience, and availability</small>
          </div>
          <ChevronRight aria-hidden="true" />
        </Link>
      </section>
      </aside>
      </div>

      <MarketplaceNavigation active="profile" />
    </main>
  );
}
