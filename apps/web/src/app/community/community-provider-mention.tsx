"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AtSign, X } from "lucide-react";
import type { CommunityMention } from "./community-client";
import styles from "./community.module.css";

export type MentionCandidate = CommunityMention & {
  avatarUrl: string | null;
};

/** @deprecated Use MentionCandidate */
export type MentionProvider = MentionCandidate;

type MentionState = {
  start: number;
  query: string;
};

export function mentionToken(displayName: string): string {
  return `@${displayName}`;
}

export function findActiveMention(body: string, cursor: number, selectedMention: MentionCandidate | null = null): MentionState | null {
  const beforeCursor = body.slice(0, cursor);
  const atIndex = beforeCursor.lastIndexOf("@");
  if (atIndex === -1) {
    return null;
  }

  const prefix = beforeCursor.slice(0, atIndex);
  if (prefix.length > 0 && !/\s$/.test(prefix)) {
    return null;
  }

  const query = beforeCursor.slice(atIndex + 1);
  if (query.includes("\n") || query.endsWith(" ")) {
    return null;
  }

  if (selectedMention) {
    const token = mentionToken(selectedMention.displayName);
    const tokenIndex = body.indexOf(token);
    if (tokenIndex !== -1 && atIndex === tokenIndex && cursor > atIndex) {
      return null;
    }
  }

  return { start: atIndex, query };
}

async function searchMentionCandidates(query: string): Promise<MentionCandidate[]> {
  const params = new URLSearchParams();
  if (query.trim()) {
    params.set("query", query.trim());
  }

  const response = await fetch(`/api/v1/community/mention-candidates?${params}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("search failed");
  }

  const payload = (await response.json()) as { data: MentionCandidate[] };

  return payload.data.slice(0, 6);
}

export function useProviderMention(
  body: string,
  onBodyChange: (body: string) => void,
  selectedMention: MentionCandidate | null = null,
) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [mention, setMention] = useState<MentionState | null>(null);
  const [results, setResults] = useState<MentionCandidate[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const requestRef = useRef(0);

  const closeMention = useCallback(() => {
    setMention(null);
    setResults([]);
    setStatus("idle");
    setHighlightIndex(0);
  }, []);

  const syncMentionFromCursor = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const active = findActiveMention(body, textarea.selectionStart, selectedMention);
    setMention(active);
    if (!active) {
      setResults([]);
      setStatus("idle");
    }
  }, [body, selectedMention]);

  useEffect(() => {
    if (!mention) {
      return;
    }

    const requestId = ++requestRef.current;
    const timer = window.setTimeout(() => {
      setStatus("loading");
      void searchMentionCandidates(mention.query)
        .then((providers) => {
          if (requestRef.current !== requestId) {
            return;
          }
          setResults(providers);
          setHighlightIndex(0);
          setStatus("idle");
        })
        .catch(() => {
          if (requestRef.current !== requestId) {
            return;
          }
          setResults([]);
          setStatus("error");
        });
    }, 180);

    return () => window.clearTimeout(timer);
  }, [mention]);

  const insertMention = useCallback((candidate: MentionCandidate, mentionState: MentionState | null) => {
    const textarea = textareaRef.current;
    const token = mentionToken(candidate.displayName);

    if (mentionState && textarea) {
      const nextBody = `${body.slice(0, mentionState.start)}${token} ${body.slice(textarea.selectionStart)}`;
      onBodyChange(nextBody);
      const cursor = mentionState.start + token.length + 1;
      window.requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(cursor, cursor);
      });
    } else if (!body.includes(token)) {
      const spacer = body.length > 0 && !/\s$/.test(body) ? " " : "";
      onBodyChange(`${body}${spacer}${token} `);
      window.requestAnimationFrame(() => textarea?.focus());
    }

    closeMention();
    return candidate;
  }, [body, closeMention, onBodyChange]);

  const openMentionAtCursor = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const cursor = textarea.selectionStart;
    onBodyChange(`${body.slice(0, cursor)}@${body.slice(cursor)}`);
    window.requestAnimationFrame(() => {
      textarea.focus();
      const nextCursor = cursor + 1;
      textarea.setSelectionRange(nextCursor, nextCursor);
      setMention({ start: cursor, query: "" });
    });
  }, [body, onBodyChange]);

  const handleTextareaKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>, onSelect: (candidate: MentionCandidate) => void) => {
    if (!mention || results.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightIndex((current) => (current + 1) % results.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightIndex((current) => (current - 1 + results.length) % results.length);
      return;
    }

    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      const selected = results[highlightIndex];
      if (selected) {
        onSelect(selected);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeMention();
    }
  }, [closeMention, highlightIndex, mention, results]);

  return {
    textareaRef,
    mentionOpen: mention !== null,
    mention,
    mentionResults: results,
    mentionStatus: status,
    mentionHighlightIndex: highlightIndex,
    insertMention,
    openMentionAtCursor,
    syncMentionFromCursor,
    handleTextareaKeyDown,
    closeMention,
  };
}

type ProviderMentionMenuProps = {
  open: boolean;
  status: "idle" | "loading" | "error";
  results: MentionCandidate[];
  highlightIndex: number;
  onSelect: (candidate: MentionCandidate) => void;
  compact?: boolean;
  label?: string;
  optionHint?: string;
};

export function ProviderMentionMenu({
  open,
  status,
  results,
  highlightIndex,
  onSelect,
  compact = false,
  label = "Mention a member",
  optionHint,
}: ProviderMentionMenuProps) {
  if (!open) {
    return null;
  }

  return (
    <div className={compact ? `${styles.mentionMenu} ${styles.mentionMenuCompact}` : styles.mentionMenu} role="listbox" aria-label={label}>
      {status === "loading" ? <p className={styles.mentionStatus}>Searching providers…</p> : null}
      {status === "error" ? <p className={styles.mentionStatus}>Could not load providers.</p> : null}
      {status === "idle" && results.length === 0 ? <p className={styles.mentionStatus}>No matching members.</p> : null}
      {results.map((candidate, index) => (
        <button
          key={`${candidate.kind}-${candidate.userId}`}
          type="button"
          role="option"
          aria-selected={index === highlightIndex}
          className={`${styles.mentionOption} ${index === highlightIndex ? styles.mentionOptionActive : ""}`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onSelect(candidate)}
        >
          <span className={styles.mentionAvatar}>
            {candidate.avatarUrl ? (
              <Image unoptimized src={candidate.avatarUrl} alt="" width={32} height={32} />
            ) : (
              candidate.displayName.slice(0, 1)
            )}
          </span>
          <span className={styles.mentionCopy}>
            <strong>{candidate.displayName}</strong>
            <small>{optionHint ?? (candidate.kind === "provider" ? "Mention this provider" : "Mention this client")}</small>
          </span>
        </button>
      ))}
    </div>
  );
}

type MentionChipProps = {
  mention: MentionCandidate;
  onClear: () => void;
};

export function MentionChip({ mention, onClear }: MentionChipProps) {
  return (
    <div className={styles.featuredProviderChip}>
      <span>Mentioning {mention.displayName}</span>
      <button type="button" data-flat-button className={styles.featuredProviderChipRemove} onClick={onClear} aria-label={`Remove ${mention.displayName}`}>
        <X aria-hidden="true" />
      </button>
    </div>
  );
}

/** @deprecated Use MentionChip */
export function FeaturedProviderChip({ provider, onClear }: { provider: MentionCandidate; onClear: () => void }) {
  return <MentionChip mention={provider} onClear={onClear} />;
}

export function FeatureProviderButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" data-flat-button className={styles.attachPhotos} aria-label="Mention someone" onClick={onClick}>
      <AtSign aria-hidden="true" />
    </button>
  );
}

export function clearMentionToken(body: string, mention: MentionCandidate): string {
  return body.replace(mentionToken(mention.displayName), "").replace(/ {2,}/g, " ").trimStart();
}

/** @deprecated Use clearMentionToken */
export function clearProviderMention(body: string, provider: MentionCandidate): string {
  return clearMentionToken(body, provider);
}
