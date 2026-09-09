"use client";

import { ChangeEvent, useEffect, useId, useMemo, useRef } from "react";
import Image from "next/image";
import { ImagePlus, X } from "lucide-react";
import {
  clearMentionToken,
  FeatureProviderButton,
  mentionToken,
  MentionCandidate,
  MentionChip,
  ProviderMentionMenu,
  useProviderMention,
} from "./community-provider-mention";
import { CommunityMedia } from "./community-client";
import styles from "./community.module.css";

type MediaPreview = {
  file: File;
  url: string;
};

type CommunityStoryComposerProps = {
  body: string;
  onBodyChange: (body: string) => void;
  files: File[];
  onFilesChange: (files: File[]) => void;
  existingMedia?: CommunityMedia[];
  onRemoveExistingMedia?: (mediaId: string) => void;
  selectedMention: MentionCandidate | null;
  onSelectedMentionChange: (mention: MentionCandidate | null) => void;
  maxLength?: number;
  placeholder?: string;
};

export function CommunityStoryComposer({
  body,
  onBodyChange,
  files,
  onFilesChange,
  existingMedia = [],
  onRemoveExistingMedia,
  selectedMention,
  onSelectedMentionChange,
  maxLength = 3000,
  placeholder = "Type @ to mention someone, or add up to five hashtags at the end",
}: CommunityStoryComposerProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const canAddMore = existingMedia.length + files.length < 4;

  const {
    textareaRef,
    mention: activeMention,
    mentionOpen,
    mentionResults,
    mentionStatus,
    mentionHighlightIndex,
    insertMention,
    openMentionAtCursor,
    syncMentionFromCursor,
    handleTextareaKeyDown,
    closeMention,
  } = useProviderMention(body, onBodyChange, selectedMention);

  function handleBodyChange(value: string) {
    onBodyChange(value);
    if (selectedMention && !value.includes(mentionToken(selectedMention.displayName))) {
      onSelectedMentionChange(null);
    }
  }

  function selectMention(candidate: MentionCandidate) {
    insertMention(candidate, activeMention);
    onSelectedMentionChange(candidate);
    closeMention();
  }

  function clearMention() {
    if (selectedMention) {
      onBodyChange(clearMentionToken(body, selectedMention));
    }
    onSelectedMentionChange(null);
    closeMention();
  }

  const previews = useMemo<MediaPreview[]>(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files],
  );

  useEffect(() => {
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [previews]);

  function pick(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith("image/"));
    const remaining = Math.max(0, 4 - existingMedia.length - files.length);
    onFilesChange([...files, ...selected].slice(0, files.length + remaining));
    event.target.value = "";
  }

  function remove(index: number) {
    onFilesChange(files.filter((_, itemIndex) => itemIndex !== index));
  }

  const hasAttachments = existingMedia.length > 0 || previews.length > 0;

  return (
    <div className={styles.storyComposer}>
      <textarea
        ref={textareaRef}
        maxLength={maxLength}
        value={body}
        onChange={(event) => {
          handleBodyChange(event.target.value);
          syncMentionFromCursor();
        }}
        onKeyDown={(event) => handleTextareaKeyDown(event, selectMention)}
        onClick={syncMentionFromCursor}
        onKeyUp={syncMentionFromCursor}
        onSelect={syncMentionFromCursor}
        placeholder={placeholder}
        aria-label="Story"
      />
      <ProviderMentionMenu
        open={mentionOpen && !selectedMention}
        status={mentionStatus}
        results={mentionResults}
        highlightIndex={mentionHighlightIndex}
        onSelect={selectMention}
      />
      {selectedMention ? <MentionChip mention={selectedMention} onClear={clearMention} /> : null}
      {hasAttachments ? (
        <ul className={styles.composerPreviewStrip} aria-label="Selected images">
          {existingMedia.map((item) => (
            <li key={item.id}>
              {item.url ? (
                <Image unoptimized src={item.url} alt={item.originalName} width={88} height={88} className={styles.composerPreviewAsset} />
              ) : (
                <span className={styles.composerPreviewPending}>
                  {item.scanStatus === "failed" ? "Scan failed" : "Scanning…"}
                </span>
              )}
              {onRemoveExistingMedia ? (
                <button
                  type="button"
                  data-flat-button
                  className={styles.mediaPreviewRemove}
                  onClick={() => onRemoveExistingMedia(item.id)}
                  aria-label={`Remove ${item.originalName}`}
                >
                  <X aria-hidden="true" />
                </button>
              ) : null}
            </li>
          ))}
          {previews.map((preview, index) => (
            <li key={preview.url}>
              <Image unoptimized src={preview.url} alt={preview.file.name} width={88} height={88} className={styles.composerPreviewAsset} />
              <button type="button" data-flat-button className={styles.mediaPreviewRemove} onClick={() => remove(index)} aria-label={`Remove ${preview.file.name}`}>
                <X aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className={styles.storyComposerToolbar}>
        <input ref={inputRef} className={styles.hiddenFileInput} id={inputId} type="file" accept="image/*" multiple onChange={pick} />
        <FeatureProviderButton onClick={openMentionAtCursor} />
        <button
          type="button"
          data-flat-button
          className={styles.attachPhotos}
          disabled={!canAddMore}
          aria-label={canAddMore ? "Add photos" : "Photo limit reached"}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
