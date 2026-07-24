"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
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
  UserRound,
} from "lucide-react";
import { Button, Feedback } from "@kaila/ui";
import { prepareCsrf } from "../auth-client";
import styles from "./account.module.css";

type Reference = { id: number; name: string };
type User = {
  name: string;
  email: string;
  activeMode: "client" | "provider" | null;
  providerEligible: boolean;
  avatarUrl: string | null;
};
type Profile = {
  activeMode: "client" | "provider" | null;
  client: { display_name: string; area_id: number | null } | null;
  provider: { display_name: string; status: string } | null;
};

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [areas, setAreas] = useState<Reference[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [areaId, setAreaId] = useState("");
  const [status, setStatus] = useState<
    "loading" | "ready" | "saving" | "uploading" | "error"
  >("loading");
  const [notice, setNotice] = useState("");

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
          data: { areas: Reference[] };
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

  async function uploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setStatus("uploading");
    setNotice("");
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
      if (!response.ok) throw new Error();
      setNotice(
        "Profile picture uploaded. It will appear after the safety scan.",
      );
      setStatus("ready");
    } catch {
      setStatus("error");
      setNotice("We couldn’t upload that picture. Use JPG, PNG, or WebP.");
    } finally {
      event.target.value = "";
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
          <label>
            <Camera aria-hidden="true" />
            <span className={styles.visuallyHidden}>Change profile picture</span>
            <input
              accept="image/jpeg,image/png,image/webp"
              disabled={status === "uploading"}
              onChange={(event) => void uploadAvatar(event)}
              type="file"
            />
          </label>
        </div>
        <div>
          <h2 id="identity-title">{user.name}</h2>
          <p>{user.email}</p>
          <span className={styles.safetyNote}>
            <ShieldCheck aria-hidden="true" />
            Pictures are checked before they appear
          </span>
        </div>
      </section>

      {notice && (
        <Feedback
          kind={status === "error" ? "error" : "success"}
          title={status === "error" ? "Action needed" : "Account updated"}
        >
          {notice}
        </Feedback>
      )}

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
        <label>
          <span>
            <MapPin aria-hidden="true" />
            Home area
          </span>
          <select
            onChange={(event) => setAreaId(event.target.value)}
            value={areaId}
          >
            <option value="">Choose an area</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </label>
        <Button isLoading={status === "saving"} type="submit">
          Save profile
        </Button>
      </form>

      <section className={styles.links} aria-label="Account destinations">
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
    </main>
  );
}
