"use client";

import { FormEvent, useCallback, useState } from "react";
import Link from "next/link";
import { MessageCircle, Send } from "lucide-react";
import { CommunityMemberAvatar } from "./community-member-avatar";
import { CommunityCommentMentionField } from "./community-comment-mention-field";
import { CommunityLinkedMentionText } from "./community-linked-provider-text";
import { MentionCandidate } from "./community-provider-mention";
import { CommunityComment, csrfFetch } from "./community-client";
import styles from "./community.module.css";

function formatCommentTime(value: string): string {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function toMentionCandidate(mention: CommunityComment["mention"]): MentionCandidate | null {
  return mention ? { ...mention, avatarUrl: null } : null;
}

type CommunityCommentComposerProps = {
  postId: string;
  reload: () => Promise<void>;
  placeholder: string;
  submitLabel: string;
  compact?: boolean;
};

export function CommunityCommentComposer({ postId, reload, placeholder, submitLabel, compact = false }: CommunityCommentComposerProps) {
  const [body, setBody] = useState("");
  const [selectedMention, setSelectedMention] = useState<MentionCandidate | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    const response = await csrfFetch(`/api/v1/community/${postId}/comments`, {
      method: "POST",
      body: JSON.stringify({
        body: trimmed,
        mentionedUserId: selectedMention?.userId ?? null,
        featuredProviderProfileId: selectedMention?.providerProfileId ?? null,
      }),
    });
    setSubmitting(false);
    if (response.ok) {
      setBody("");
      setSelectedMention(null);
      await reload();
    }
  }

  return (
    <form className={compact ? `${styles.commentComposer} ${styles.commentComposerCompact}` : styles.commentComposer} onSubmit={(event) => void handleSubmit(event)}>
      <CommunityCommentMentionField
        value={body}
        onChange={setBody}
        selectedMention={selectedMention}
        onSelectedMentionChange={setSelectedMention}
        placeholder={placeholder}
        ariaLabel={placeholder}
        compact={compact}
      />
      <button type="submit" className={styles.commentComposerSend} data-flat-button disabled={!body.trim() || submitting} aria-label={submitLabel}>
        <Send aria-hidden="true" />
      </button>
    </form>
  );
}

type CommentItemProps = {
  comment: CommunityComment;
  postId: string;
  reload: () => Promise<void>;
  nested?: boolean;
};

function CommentItem({ comment, postId, reload, nested = false }: CommentItemProps) {
  const [replying, setReplying] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [replyMention, setReplyMention] = useState<MentionCandidate | null>(null);
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);
  const [editMention, setEditMention] = useState<MentionCandidate | null>(toMentionCandidate(comment.mention));
  const [editSubmitting, setEditSubmitting] = useState(false);

  const resetEdit = useCallback(() => {
    setEditing(false);
    setEditBody(comment.body);
    setEditMention(toMentionCandidate(comment.mention));
  }, [comment.body, comment.mention]);

  async function submitReply(event: FormEvent) {
    event.preventDefault();
    const trimmed = replyBody.trim();
    if (!trimmed || replySubmitting) return;
    setReplySubmitting(true);
    const response = await csrfFetch(`/api/v1/community/${postId}/comments/${comment.id}/replies`, {
      method: "POST",
      body: JSON.stringify({
        body: trimmed,
        mentionedUserId: replyMention?.userId ?? null,
        featuredProviderProfileId: replyMention?.providerProfileId ?? null,
      }),
    });
    setReplySubmitting(false);
    if (response.ok) {
      setReplyBody("");
      setReplyMention(null);
      setReplying(false);
      await reload();
    }
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    const trimmed = editBody.trim();
    if (!trimmed || editSubmitting) return;
    setEditSubmitting(true);
    const response = await csrfFetch(`/api/v1/community-comments/${comment.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        body: trimmed,
        mentionedUserId: editMention?.userId ?? null,
        featuredProviderProfileId: editMention?.providerProfileId ?? null,
      }),
    });
    setEditSubmitting(false);
    if (response.ok) {
      setEditing(false);
      await reload();
    }
  }

  async function remove(asHide: boolean) {
    const message = asHide ? "Hide this comment from your post?" : "Delete this comment?";
    if (!confirm(message)) return;
    const response = await csrfFetch(`/api/v1/community-comments/${comment.id}`, { method: "DELETE" });
    if (response.ok) await reload();
  }

  const showActions = comment.canEdit || comment.canDelete || comment.canHide || !nested;

  return (
    <article className={nested ? styles.commentReply : styles.commentThread}>
      <div className={styles.commentRow}>
        <CommunityMemberAvatar name={comment.author.name} avatarUrl={comment.author.avatarUrl} size={nested ? "sm" : "md"} />
        <div className={styles.commentBody}>
          <div className={styles.commentMeta}>
            <strong>{comment.author.name}</strong>
            <time className={styles.commentTime} dateTime={comment.createdAt}>
              {formatCommentTime(comment.createdAt)}
            </time>
          </div>
          {editing ? (
            <form className={styles.commentEditForm} onSubmit={(event) => void saveEdit(event)}>
              <CommunityCommentMentionField
                value={editBody}
                onChange={setEditBody}
                selectedMention={editMention}
                onSelectedMentionChange={setEditMention}
                placeholder="Edit comment"
                ariaLabel="Edit comment"
                rows={3}
              />
              <div className={styles.commentEditActions}>
                <button type="button" className={styles.commentAction} data-flat-button onClick={resetEdit}>
                  Cancel
                </button>
                <button type="submit" className={styles.commentEditSave} data-flat-button disabled={!editBody.trim() || editSubmitting}>
                  Save
                </button>
              </div>
            </form>
          ) : (
            <p className={styles.commentText}>
              <CommunityLinkedMentionText text={comment.body} mention={comment.mention} />
            </p>
          )}
          {showActions && !editing && (
            <div className={styles.commentActions}>
              {!nested && (
                <button type="button" className={styles.commentAction} data-flat-button onClick={() => setReplying((open) => !open)}>
                  Reply
                </button>
              )}
              {comment.canEdit && (
                <button type="button" className={styles.commentAction} data-flat-button onClick={() => { setEditBody(comment.body); setEditMention(toMentionCandidate(comment.mention)); setEditing(true); }}>
                  Edit
                </button>
              )}
              {comment.canDelete && (
                <button type="button" className={`${styles.commentAction} ${styles.commentActionDanger}`} data-flat-button onClick={() => void remove(false)}>
                  Delete
                </button>
              )}
              {comment.canHide && (
                <button type="button" className={`${styles.commentAction} ${styles.commentActionDanger}`} data-flat-button onClick={() => void remove(true)}>
                  Hide
                </button>
              )}
              <Link className={styles.commentAction} href={`/safety?targetType=community_comment&targetId=${comment.id}`}>
                Report
              </Link>
            </div>
          )}
          {replying && (
            <form className={styles.replyComposer} onSubmit={(event) => void submitReply(event)}>
              <CommunityCommentMentionField
                value={replyBody}
                onChange={setReplyBody}
                selectedMention={replyMention}
                onSelectedMentionChange={setReplyMention}
                placeholder="Write a reply"
                ariaLabel="Write a reply"
                compact
              />
              <button type="submit" className={styles.commentComposerSend} data-flat-button disabled={!replyBody.trim() || replySubmitting} aria-label="Send reply">
                <Send aria-hidden="true" />
              </button>
            </form>
          )}
        </div>
      </div>
      {comment.replies.length > 0 && (
        <div className={styles.replyList}>
          {comment.replies.map((reply) => (
            <CommentItem comment={reply} postId={postId} reload={reload} nested key={reply.id} />
          ))}
        </div>
      )}
    </article>
  );
}

type CommunityCommentsListProps = {
  postId: string;
  comments: CommunityComment[];
  reload: () => Promise<void>;
  variant?: "default" | "viewer";
};

export function CommunityCommentsList({ postId, comments, reload, variant = "default" }: CommunityCommentsListProps) {
  if (comments.length === 0) {
    return (
      <div className={variant === "viewer" ? styles.emptyViewer : styles.empty}>
        <MessageCircle />
        <h2>No comments yet.</h2>
        <p>Be the first to comment.</p>
      </div>
    );
  }

  return (
    <div className={variant === "viewer" ? styles.commentsViewer : styles.comments}>
      {comments.map((comment) => (
        <CommentItem comment={comment} postId={postId} reload={reload} key={comment.id} />
      ))}
    </div>
  );
}

type CommunityCommentsProps = {
  postId: string;
  comments: CommunityComment[];
  reload: () => Promise<void>;
};

export function CommunityComments({ postId, comments, reload }: CommunityCommentsProps) {
  return (
    <section className={styles.commentSection} aria-label="Comments">
      <CommunityCommentComposer postId={postId} reload={reload} placeholder="Write a helpful comment" submitLabel="Send comment" />
      <CommunityCommentsList postId={postId} comments={comments} reload={reload} />
    </section>
  );
}
