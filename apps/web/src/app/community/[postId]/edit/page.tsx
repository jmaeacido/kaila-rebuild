"use client";

import { FormEvent, useEffect, useState } from "react";
import { ChevronLeft, Save } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button, Feedback } from "@kaila/ui";
import { SelectField } from "../../../../components/select-field";
import { CommunityMedia, CommunityPost, csrfFetch, kindLabels, normalizeCommunityPost } from "../../community-client";
import { CommunityStoryComposer } from "../../community-story-composer";
import { MentionCandidate } from "../../community-provider-mention";
import styles from "../../community.module.css";

export default function EditCommunityPostPage() {
  const { postId } = useParams<{ postId: string }>();
  const router = useRouter();
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [kind, setKind] = useState("local_tip");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [existingMedia, setExistingMedia] = useState<CommunityMedia[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [selectedMention, setSelectedMention] = useState<MentionCandidate | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "error">("loading");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => void fetch(`/api/v1/community/${postId}`, { cache: "no-store", credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const value = normalizeCommunityPost(((await response.json()) as { data: CommunityPost }).data);
        if (!value.canManage) throw new Error();
        setPost(value);
        setKind(value.kind);
        setTitle(value.title);
        setBody(value.body);
        setExistingMedia(value.media);
        setSelectedMention(value.mention ? { ...value.mention, avatarUrl: null } : null);
        setStatus("ready");
      })
      .catch(() => setStatus("error")), 0);
    return () => window.clearTimeout(timer);
  }, [postId]);

  async function removeExistingMedia(mediaId: string) {
    setNotice(null);
    const previous = existingMedia;
    setExistingMedia((items) => items.filter((item) => item.id !== mediaId));
    const response = await csrfFetch(`/api/v1/community-media/${mediaId}`, { method: "DELETE" });
    if (!response.ok) {
      setExistingMedia(previous);
      setNotice("That photo could not be removed. Try again.");
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setStatus("saving");
    setNotice(null);
    const response = await csrfFetch(`/api/v1/community/${postId}`, {
      method: "PATCH",
      body: JSON.stringify({
        kind,
        title,
        body,
        areaId: post?.area?.id ?? null,
        mentionedUserId: selectedMention?.userId ?? null,
        featuredProviderProfileId: selectedMention?.providerProfileId ?? null,
      }),
    });
    if (!response.ok) {
      setStatus("error");
      return;
    }

    try {
      for (const file of files) {
        const payload = new FormData();
        payload.append("file", file);
        const upload = await csrfFetch(`/api/v1/community/${postId}/media`, { method: "POST", body: payload });
        if (!upload.ok) throw new Error();
      }
      router.replace(`/community/${postId}`);
    } catch {
      setStatus("error");
      setNotice("The post was updated, but one or more new photos could not be uploaded.");
    }
  }

  if (status === "loading") {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.skeleton} />
        </div>
      </main>
    );
  }

  if (status === "error" && !post) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <Feedback kind="error" title="Post cannot be edited">
            <Link href="/community">Back to Community</Link>
          </Feedback>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.top}>
          <Link className={styles.back} href={`/community/${postId}`} aria-label="Back to post">
            <ChevronLeft />
          </Link>
          <strong>Edit post</strong>
          <span />
        </div>
        <form className={styles.form} onSubmit={(event) => void save(event)}>
          <label className={styles.field}>
            Post type
            <SelectField
              label="Post type"
              value={kind}
              onChange={setKind}
              options={Object.entries(kindLabels)
                .filter(([value]) => value !== "official_update")
                .map(([value, label]) => ({ value, label }))}
            />
          </label>
          <label className={styles.field}>
            Title
            <input maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className={styles.field}>
            Story
            <CommunityStoryComposer
              body={body}
              onBodyChange={setBody}
              files={files}
              onFilesChange={setFiles}
              existingMedia={existingMedia}
              onRemoveExistingMedia={(mediaId) => void removeExistingMedia(mediaId)}
              selectedMention={selectedMention}
              onSelectedMentionChange={setSelectedMention}
            />
          </label>
          <Button disabled={!title.trim() || !body.trim() || status === "saving"}>
            <Save />
            {status === "saving" ? "Saving…" : "Save changes"}
          </Button>
          {(status === "error" || notice) && (
            <Feedback kind="error" title={notice ?? "Changes were not saved"}>
              {notice ? "You can try uploading again or return to the post." : "Review the fields and try again."}
            </Feedback>
          )}
        </form>
      </div>
    </main>
  );
}
