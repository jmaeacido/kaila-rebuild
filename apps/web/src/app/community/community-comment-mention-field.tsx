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

  const mention = useProviderMention(value, handleChange, selectedMention);

  function selectMention(candidate: MentionCandidate) {
    mention.insertMention(candidate, mention.mention);
    onSelectedMentionChange(candidate);
    mention.closeMention();
  }

  const showMentionMenu = mention.mentionOpen && !selectedMention;

  return (
    <div className={styles.commentMentionWrap}>
      <ProviderMentionMenu
        open={showMentionMenu}
        status={mention.mentionStatus}
        results={mention.mentionResults}
        highlightIndex={mention.mentionHighlightIndex}
        onSelect={selectMention}
        compact
        label="Mention a member"
      />
      <textarea
        ref={mention.textareaRef}
        className={compact ? styles.commentMentionTextarea : className}
        maxLength={maxLength}
        rows={compact ? undefined : rows}
        value={value}
        onChange={(event) => {
          handleChange(event.target.value);
          mention.syncMentionFromCursor();
        }}
        onKeyDown={(event) => mention.handleTextareaKeyDown(event, selectMention)}
        onClick={mention.syncMentionFromCursor}
        onKeyUp={mention.syncMentionFromCursor}
        onSelect={mention.syncMentionFromCursor}
        placeholder={placeholder}
        aria-label={ariaLabel}
        data-compact={compact ? "true" : undefined}
      />
    </div>
  );
}
