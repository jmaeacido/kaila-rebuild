"use client";

import { ChangeEvent, useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, X } from "lucide-react";
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
  maxLength?: number;
  placeholder?: string;
};

export function CommunityStoryComposer({
  body,
  onBodyChange,
  files,
  onFilesChange,
  maxLength = 3000,
  placeholder = "Add up to five hashtags at the end, like #Plumbing #LeakFix",
}: CommunityStoryComposerProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<MediaPreview[]>([]);
  const canAddMore = files.length < 4;

  useEffect(() => {
    const next = files.map((file) => ({ file, url: URL.createObjectURL(file) }));
    setPreviews(next);

    return () => {
      next.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [files]);

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
        maxLength={maxLength}
        value={body}
        onChange={(event) => onBodyChange(event.target.value)}
        placeholder={placeholder}
        aria-label="Story"
      />
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
