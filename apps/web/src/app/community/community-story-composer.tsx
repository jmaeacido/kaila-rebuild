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
  selectedMention,
  onSelectedMentionChange,
  maxLength = 3000,
  placeholder = "Type @ to mention someone, or add up to five hashtags at the end",
}: CommunityStoryComposerProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const canAddMore = files.length < 4;

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
    onFilesChange([...files, ...selected].slice(0, 4));
    event.target.value = "";
  }

  function remove(index: number) {
    onFilesChange(files.filter((_, itemIndex) => itemIndex !== index));
  }

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
      {previews.length > 0 && (
        <ul className={styles.composerPreviewStrip} aria-label="Selected images">
          {previews.map((preview, index) => (
            <li key={preview.url}>
              <Image unoptimized src={preview.url} alt={preview.file.name} width={88} height={88} className={styles.composerPreviewAsset} />
              <button type="button" data-flat-button className={styles.mediaPreviewRemove} onClick={() => remove(index)} aria-label={`Remove ${preview.file.name}`}>
                <X aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
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
