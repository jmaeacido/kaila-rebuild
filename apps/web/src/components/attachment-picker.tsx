"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { ImageIcon, Paperclip, X } from "lucide-react";
import Image from "next/image";
import mediaStyles from "./attachment-media.module.css";
import styles from "./attachment-picker.module.css";

const maxFiles = 5;
const maxBytes = 10 * 1024 * 1024;
const acceptedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

type SelectedAttachment = {
  file: File;
  previewUrl: string | null;
};

export function AttachmentPicker({
  name = "evidence",
  label = "Add photos or videos",
  hint = "Up to 5 files, 10 MB each.",
}: {
  name?: string;
  label?: string;
  hint?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const attachmentsRef = useRef<SelectedAttachment[]>([]);
  const [attachments, setAttachments] = useState<SelectedAttachment[]>([]);
  const [error, setError] = useState("");

  useEffect(
    () => () => {
      attachmentsRef.current.forEach(({ previewUrl }) => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
      });
    },
    [],
  );

  function commit(next: File[]) {
    const transfer = new DataTransfer();
    next.forEach((file) => transfer.items.add(file));
    if (input.current) input.current.files = transfer.files;

    attachmentsRef.current.forEach(({ previewUrl }) => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    });
    const selected = next.map((file) => ({
      file,
      previewUrl:
        file.type.startsWith("image/") || file.type.startsWith("video/")
          ? URL.createObjectURL(file)
          : null,
    }));
    attachmentsRef.current = selected;
    setAttachments(selected);
  }

  function select(event: ChangeEvent<HTMLInputElement>) {
    const next = Array.from(event.target.files ?? []);
    if (next.length > maxFiles) {
      setError(`Choose no more than ${maxFiles} files.`);
      commit(next.slice(0, maxFiles));
      return;
    }
    const invalid = next.find((file) => !acceptedTypes.has(file.type) || file.size > maxBytes);
    if (invalid) {
      setError(`${invalid.name} must be a JPG, PNG, WebP, MP4, WebM, or MOV no larger than 10 MB.`);
      commit(next.filter((file) => acceptedTypes.has(file.type) && file.size <= maxBytes));
      return;
    }
    setError("");
    commit(next);
  }

  return (
    <div className={styles.picker}>
      <label className={styles.control}>
        <Paperclip aria-hidden="true" />
        <span>{label}</span>
        <input
          ref={input}
          name={name}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
          onChange={select}
        />
      </label>
      <p className={styles.hint}>{hint}</p>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {attachments.length > 0 && (
        <ul className={styles.files} aria-label="Selected attachments">
          {attachments.map(({ file, previewUrl }, index) => (
            <li key={`${file.name}-${file.size}-${file.lastModified}`}>
              <div className={styles.preview}>
                {previewUrl && file.type.startsWith("image/") ? (
                  <Image
                    src={previewUrl}
                    alt={`Preview of ${file.name}`}
                    fill
                    sizes="(max-width: 479px) 50vw, 160px"
                    unoptimized
                  />
                ) : previewUrl ? (
                  <video
                    className={mediaStyles.video}
                    src={previewUrl}
                    aria-label={`Preview of ${file.name}`}
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <ImageIcon aria-hidden="true" />
                )}
              </div>
              <span className={styles.details}>
                <strong>{file.name}</strong>
                <small>{formatBytes(file.size)}</small>
              </span>
              <button
                className={styles.remove}
                type="button"
                onClick={() =>
                  commit(attachments.filter((_, item) => item !== index).map(({ file }) => file))
                }
                aria-label={`Remove ${file.name}`}
              >
                <X aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function attachmentFiles(form: FormData, name = "evidence"): File[] {
  return form.getAll(name).filter((value): value is File => value instanceof File && value.size > 0);
}

function formatBytes(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
