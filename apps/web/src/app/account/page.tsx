"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  BriefcaseBusiness,
  Camera,
  Check,
  ChevronRight,
  ClipboardList,
  Home,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Star,
  UserRound,
} from "lucide-react";
import { Button, Feedback } from "@kaila/ui";
import { ActionModal } from "../../components/action-modal";
import { AttachmentSourceActions } from "../../components/attachment-picker";
import { prepareCsrf } from "../auth-client";
import { AddressHierarchy, type AreaReference } from "../address-hierarchy";
import styles from "./account.module.css";
import { useRealtimeInvalidation } from "../use-realtime-invalidation";

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

  const load = useCallback(async () => {
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
      setDisplayName(profileData.client?.display_name || userData.name);
      setAreaId(
        profileData.client?.area_id
          ? String(profileData.client.area_id)
          : "",
      );
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

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setNotice("");
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
      setNotice("Your profile details are saved.");
      await load();
    } catch {
      setStatus("error");
      setNotice("We couldn’t save your profile. Try again.");
    }
  }

  async function uploadAvatarFile(file: File) {
    setStatus("uploading");
    setAvatarNotice("");
    try {
      const token = await prepareCsrf();
      const body = new FormData();
      body.append("purpose", "avatar");
      body.append("file", file);
      const response = await fetch("/api/v1/me/profile-assets", {
        method: "POST",
        headers: {
          Accept: "application/json",
          ...(token ? { "X-XSRF-TOKEN": token } : {}),
        },
        body,
      });
      if (!response.ok) {
        throw new Error(response.status === 422 ? "invalid-file" : "upload-failed");
      }
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
            onClick={() => setAvatarMenuOpen((open) => !open)}
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
          >
            <div className={styles.avatarModalBody}>
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
                  setAvatarMenuOpen(false);
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

      <form className={styles.card} onSubmit={(event) => void saveProfile(event)}>
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
            onChange={setAreaId}
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

      <nav className={styles.bottomNav} aria-label="Marketplace navigation">
        <Link href="/home"><Home aria-hidden="true" />Home</Link>
        {profile.activeMode === "provider" ? <Link href="/opportunities"><Search aria-hidden="true" />Find work</Link> : <Link href="/home#current-title"><ClipboardList aria-hidden="true" />Jobs</Link>}
        {profile.activeMode === "provider" ? <Link href="/home#current-title"><BriefcaseBusiness aria-hidden="true" />Work</Link> : <Link href="/post-job"><Plus aria-hidden="true" />Post</Link>}
        <Link href="/messages"><MessageCircle aria-hidden="true" />Messages</Link>
        <Link aria-current="page" href="/account"><UserRound aria-hidden="true" />Profile</Link>
      </nav>
    </main>
  );
}
