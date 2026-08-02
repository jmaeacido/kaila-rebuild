"use client";

import { ChangeEvent, useEffect, useId, useRef, useState } from "react";
import { Camera, FolderOpen, ImageIcon, Paperclip, Video, X } from "lucide-react";
import Image from "next/image";
import { captureNativeMedia, nativeMediaCaptureAvailable } from "@kaila/mobile/media-capture";
import mediaStyles from "./attachment-media.module.css";
import styles from "./attachment-picker.module.css";

const defaultMaxFiles = 5;
const maxBytes = 10 * 1024 * 1024;

export type AttachmentKind = "image" | "video" | "pdf";

const mimeByKind: Record<AttachmentKind, string[]> = {
  image: ["image/jpeg", "image/png", "image/webp"],
  video: ["video/mp4", "video/webm", "video/quicktime"],
  pdf: ["application/pdf"],
};

type SelectedAttachment = {
  file: File;
  previewUrl: string | null;
};

function acceptFor(kinds: AttachmentKind[]): string {
  return kinds.flatMap((kind) => mimeByKind[kind]).join(",");
}

function allowedTypes(kinds: AttachmentKind[]): Set<string> {
  return new Set(kinds.flatMap((kind) => mimeByKind[kind]));
}

function typeLabel(kinds: AttachmentKind[]): string {
  const labels: string[] = [];
  if (kinds.includes("image")) labels.push("JPG", "PNG", "WebP");
  if (kinds.includes("video")) labels.push("MP4", "WebM", "MOV");
  if (kinds.includes("pdf")) labels.push("PDF");
  return labels.join(", ");
}

export function AttachmentSourceActions({
  kinds = ["image", "video"],
  disabled = false,
  facingMode = "environment",
  onFiles,
  compact = false,
}: {
  kinds?: AttachmentKind[];
  disabled?: boolean;
  facingMode?: "user" | "environment";
  onFiles: (files: File[]) => void;
  compact?: boolean;
}) {
  const photoInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const libraryInput = useRef<HTMLInputElement>(null);
  const allowImage = kinds.includes("image");
  const allowVideo = kinds.includes("video");
  const accept = acceptFor(kinds);
  const allowed = allowedTypes(kinds);

  function take(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).filter(
      (file) => allowed.has(file.type) && file.size <= maxBytes && file.size > 0,
    );
    event.target.value = "";
    if (files.length) onFiles(files);
  }

  async function capture(kind: "photo" | "video") {
    if (!nativeMediaCaptureAvailable()) {
      (kind === "photo" ? photoInput : videoInput).current?.click();
      return;
    }
    try {
      const file = await captureNativeMedia(kind);
      if (file && allowed.has(file.type) && file.size > 0 && file.size <= maxBytes) onFiles([file]);
    } catch (error) {
      const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
      if (code !== "CAPTURE_CANCELLED") {
        // Older installed builds do not have the native bridge yet; retain direct HTML capture.
        (kind === "photo" ? photoInput : videoInput).current?.click();
      }
    }
  }

  return (
    <div className={compact ? styles.actionsCompact : styles.actions} role="group" aria-label="Add media">
      {allowImage && (
        <button type="button" className={styles.action} disabled={disabled} onClick={() => void capture("photo")}>
          <Camera aria-hidden="true" />
          <span>Take photo</span>
        </button>
      )}
      {allowVideo && (
        <button type="button" className={styles.action} disabled={disabled} onClick={() => void capture("video")}>
          <Video aria-hidden="true" />
          <span>Record video</span>
        </button>
      )}
      <button type="button" className={styles.action} disabled={disabled} onClick={() => libraryInput.current?.click()}>
        {compact ? <Paperclip aria-hidden="true" /> : <FolderOpen aria-hidden="true" />}
        <span>{compact ? "Files" : "Choose files"}</span>
      </button>
      {allowImage && (
        <input
          ref={photoInput}
          className={styles.hiddenInput}
          type="file"
          accept="image/*"
          capture={facingMode}
          disabled={disabled}
          onChange={take}
        />
      )}
      {allowVideo && (
        <input
          ref={videoInput}
          className={styles.hiddenInput}
          type="file"
          accept="video/*"
          capture={facingMode}
          disabled={disabled}
          onChange={take}
        />
      )}
      <input
        ref={libraryInput}
        className={styles.hiddenInput}
        type="file"
        accept={accept}
        multiple={!compact}
        disabled={disabled}
        onChange={take}
      />
    </div>
  );
}

export function AttachmentPicker({
  name = "evidence",
  label = "Add photos or videos",
  hint,
  maxFiles = defaultMaxFiles,
  kinds = ["image", "video"],
  facingMode = "environment",
}: {
  name?: string;
  label?: string;
  hint?: string;
  maxFiles?: number;
  kinds?: AttachmentKind[];
  facingMode?: "user" | "environment";
}) {
  const formInputId = useId();
  const formInput = useRef<HTMLInputElement>(null);
  const attachmentsRef = useRef<SelectedAttachment[]>([]);
  const [attachments, setAttachments] = useState<SelectedAttachment[]>([]);
  const [error, setError] = useState("");
  const allowed = allowedTypes(kinds);
  const resolvedHint = hint ?? `Up to ${maxFiles} files, 10 MB each. Use the camera or choose from your gallery.`;

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
    if (formInput.current) formInput.current.files = transfer.files;

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

  function addFiles(incoming: File[]) {
    if (!incoming.length) {
      setError(`Choose a ${typeLabel(kinds)} file no larger than 10 MB.`);
      return;
    }
    const existing = attachmentsRef.current.map(({ file }) => file);
    const room = Math.max(0, maxFiles - existing.length);
    if (room === 0) {
      setError(`You already selected ${maxFiles} files.`);
      return;
    }
    const valid = incoming.filter((file) => allowed.has(file.type) && file.size <= maxBytes);
    const invalid = incoming.find((file) => !allowed.has(file.type) || file.size > maxBytes);
    if (invalid) {
      setError(`${invalid.name} must be a ${typeLabel(kinds)} file no larger than 10 MB.`);
    } else {
      setError("");
    }
    const next = [...existing, ...valid].slice(0, maxFiles);
    if (existing.length + valid.length > maxFiles) {
      setError(`Choose no more than ${maxFiles} files.`);
    }
    commit(next);
  }

  return (
    <div className={styles.picker}>
      <p className={styles.label}>{label}</p>
      <AttachmentSourceActions
        kinds={kinds}
        facingMode={facingMode}
        disabled={maxFiles === 0 || attachments.length >= maxFiles}
        onFiles={addFiles}
      />
      <input
        id={formInputId}
        ref={formInput}
        className={styles.hiddenInput}
        name={name}
        type="file"
        multiple
        accept={acceptFor(kinds)}
        tabIndex={-1}
        aria-hidden="true"
        onChange={() => undefined}
      />
      <p className={styles.hint}>{resolvedHint}</p>
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
                  commit(attachments.filter((_, item) => item !== index).map(({ file: current }) => current))
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
