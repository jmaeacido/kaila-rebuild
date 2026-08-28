"use client";

import { FormEvent, useEffect, useState } from "react";
import { HeartHandshake, MapPin } from "lucide-react";
import { Button, Feedback } from "@kaila/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SelectField } from "../../../components/select-field";
import {
  AddressHierarchy,
  type AreaReference,
} from "../../address-hierarchy";
import styles from "../../phase-nine.module.css";

async function areaPathLabelFromApi(areaId: string, areas: AreaReference[]): Promise<string | null> {
  const response = await fetch(`/api/v1/marketplace/areas/${encodeURIComponent(areaId)}`, {
    cache: "no-store",
  });
  if (!response.ok) return null;
  const barangay = (
    (await response.json()) as {
      data: AreaReference & { parent?: AreaReference | null };
    }
  ).data;
  const city = barangay.parent ?? areas.find((area) => area.id === barangay.parent_id) ?? null;
  const parent = city ? areas.find((area) => area.id === city.parent_id) : null;
  const province = parent?.type === "province" ? parent.name : "Independent City";
  return [province, city?.name, barangay.name].filter(Boolean).join(", ");
}

export default function ShareCommunityPostPage() {
  const router = useRouter();
  const [kind, setKind] = useState("local_tip");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [areas, setAreas] = useState<AreaReference[]>([]);
  const [areaId, setAreaId] = useState("");
  const [state, setState] = useState<"ready" | "loading" | "error">("ready");

  useEffect(() => {
    void fetch("/api/v1/marketplace/reference-data", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<{ data: { areas: AreaReference[] } }>;
      })
      .then((result) => setAreas(result.data.areas))
      .catch(() => setState("error"));
  }, []);

  async function publish(event: FormEvent) {
    event.preventDefault();
    setState("loading");
    try {
      await fetch("/api/v1/auth/csrf", { credentials: "include" });
      const token = document.cookie
        .split("; ")
        .find((value) => value.startsWith("XSRF-TOKEN="))
        ?.split("=")[1];
      const response = await fetch("/api/v1/community", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "X-XSRF-TOKEN": decodeURIComponent(token) } : {}),
        },
        body: JSON.stringify({
          kind,
          title,
          body,
          areaLabel: areaId ? await areaPathLabelFromApi(areaId, areas) : null,
        }),
      });
      if (!response.ok) throw new Error();
      router.push("/community");
    } catch {
      setState("error");
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/community">Back to community</Link>
        <p className={styles.eyebrow}>Share with care</p>
        <h1>Share a useful local story</h1>
        <p>Never post a client’s address, private messages, or identifying job details.</p>
      </header>
      <section className={styles.card}>
        <form className={styles.form} onSubmit={(event) => void publish(event)}>
          <label>
            Post type
            <SelectField label="Post type" value={kind} onChange={setKind} options={[{value:"local_tip",label:"Local tip"},{value:"work_story",label:"Work story"},{value:"service_question",label:"Service question"}]} />
          </label>
          <label>
            Title
            <input maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label>
            Story
            <textarea maxLength={3000} value={body} onChange={(event) => setBody(event.target.value)} />
          </label>
          <fieldset>
            <legend>
              <MapPin aria-hidden="true" /> Area
            </legend>
            <AddressHierarchy areas={areas} value={areaId} onChange={setAreaId} optional />
          </fieldset>
          <Button disabled={title.trim().length === 0 || body.trim().length === 0 || state === "loading"}>
            <HeartHandshake aria-hidden="true" />
            {state === "loading" ? "Publishing…" : "Publish story"}
          </Button>
        </form>
      </section>
      {state === "error" && (
        <Feedback kind="error" title="Story was not published">
          Sign in, review the fields, and try again.
        </Feedback>
      )}
    </main>
  );
}
