"use client";

import { useCallback } from "react";
import { MentionCandidate, mentionToken, ProviderMentionMenu, useProviderMention } from "./community-provider-mention";
import styles from "./community.module.css";

type CommunityCommentMentionFieldProps = {
  value: string;
  onChange: (value: string) => void;
  selectedMention: MentionCandidate | null;
  onSelectedMentionChange: (mention: MentionCandidate | null) => void;
  placeholder: string;
  ariaLabel: string;
  maxLength?: number;
  rows?: number;
  compact?: boolean;
  className?: string;
};

export function CommunityCommentMentionField({
  value,
  onChange,
  selectedMention,
  onSelectedMentionChange,
  placeholder,
  ariaLabel,
  maxLength = 800,
  rows = 1,
  compact = false,
  className,
}: CommunityCommentMentionFieldProps) {
  const handleChange = useCallback((nextValue: string) => {
    onChange(nextValue);
    if (selectedMention && !nextValue.includes(mentionToken(selectedMention.displayName))) {
      onSelectedMentionChange(null);
    }
  }, [onChange, onSelectedMentionChange, selectedMention]);

  const {
    textareaRef,
    mention: activeMention,
    mentionOpen,
    mentionResults,
    mentionStatus,
    mentionHighlightIndex,
    insertMention,
    syncMentionFromCursor,
    handleTextareaKeyDown,
    closeMention,
  } = useProviderMention(value, handleChange, selectedMention);

  function selectMention(candidate: MentionCandidate) {
    insertMention(candidate, activeMention);
    onSelectedMentionChange(candidate);
    closeMention();
  }

  const showMentionMenu = mentionOpen && !selectedMention;

  return (
    <div className={styles.commentMentionWrap}>
      <ProviderMentionMenu
        open={showMentionMenu}
        status={mentionStatus}
        results={mentionResults}
        highlightIndex={mentionHighlightIndex}
        onSelect={selectMention}
        compact
        label="Mention a member"
      />
      <textarea
        ref={textareaRef}
        className={compact ? styles.commentMentionTextarea : className}
        maxLength={maxLength}
        rows={compact ? undefined : rows}
        value={value}
        onChange={(event) => {
          handleChange(event.target.value);
          syncMentionFromCursor();
        }}
        onKeyDown={(event) => handleTextareaKeyDown(event, selectMention)}
        onClick={syncMentionFromCursor}
        onKeyUp={syncMentionFromCursor}
        onSelect={syncMentionFromCursor}
        placeholder={placeholder}
        aria-label={ariaLabel}
        data-compact={compact ? "true" : undefined}
      />
    </div>
  );
}
