"use client";

import { FormEvent, useEffect, useState } from "react";
import { ChevronLeft, HeartHandshake } from "lucide-react";
import { Button, Feedback } from "@kaila/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SelectField } from "../../../components/select-field";
import formStyles from "../../phase-nine.module.css";
import { CommunityStoryComposer } from "../community-story-composer";
import { csrfFetch } from "../community-client";
import styles from "../community.module.css";

export default function ShareCommunityPostPage() {
  const router = useRouter();
  const [kind, setKind] = useState("local_tip");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [canPostOfficial, setCanPostOfficial] = useState(false);
  const [state, setState] = useState<"ready" | "loading" | "error">("ready");

  useEffect(() => {
    void fetch("/api/v1/me", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<{ data: { staffRole: string | null } }> : null)
      .then((result) => setCanPostOfficial(Boolean(result?.data.staffRole)))
      .catch(() => setCanPostOfficial(false));
  }, []);

  async function publish(event: FormEvent) {
    event.preventDefault();
    setState("loading");
    try {
      const response = await csrfFetch("/api/v1/community", {
        method: "POST",
        body: JSON.stringify({
          kind,
          title,
          body,
          areaId: null,
          official: kind === "official_update",
        }),
      });
      if (!response.ok) throw new Error();
      const post = (await response.json()) as { data: { id: string } };
      for (const file of files) {
        const payload = new FormData();
        payload.append("file", file);
        const upload = await csrfFetch(`/api/v1/community/${post.data.id}/media`, { method: "POST", body: payload });
        if (!upload.ok) throw new Error();
      }
      router.push("/community");
    } catch {
      setState("error");
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.top}>
          <Link className={styles.back} href="/community" aria-label="Back to community">
            <ChevronLeft aria-hidden="true" />
          </Link>
          <strong>Share story</strong>
          <span aria-hidden="true" />
        </div>
        <header className={styles.intro}>
          <span className={styles.eyebrow}>Share with care</span>
          <h1>Share a useful local story</h1>
          <p>Never post a client’s address, private messages, or identifying job details.</p>
        </header>
        <section className={formStyles.card}>
          <form className={formStyles.form} onSubmit={(event) => void publish(event)}>
            <label>
              Post type
              <SelectField label="Post type" value={kind} onChange={setKind} options={[{ value: "local_tip", label: "Local tip" }, { value: "work_story", label: "Work showcase" }, { value: "service_question", label: "Service question" }, ...(canPostOfficial ? [{ value: "official_update", label: "Official KAILA update" }] : [])]} />
            </label>
            <label>
              Title
              <input maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label>
              Story
              <CommunityStoryComposer body={body} onBodyChange={setBody} files={files} onFilesChange={setFiles} />
            </label>
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
      </div>
    </main>
  );
}
