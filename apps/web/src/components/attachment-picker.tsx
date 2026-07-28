"use client";

import { ChangeEvent, useRef, useState } from "react";
import { FileImage, Paperclip, X } from "lucide-react";
import styles from "./attachment-picker.module.css";

const maxFiles = 5;
const maxBytes = 10 * 1024 * 1024;
const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export function AttachmentPicker({
  name = "evidence",
  label = "Add photos or PDFs",
  hint = "Up to 5 files, 10 MB each.",
}: {
  name?: string;
  label?: string;
  hint?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");

  function commit(next: File[]) {
    const transfer = new DataTransfer();
    next.forEach((file) => transfer.items.add(file));
    if (input.current) input.current.files = transfer.files;
    setFiles(next);
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
      setError(`${invalid.name} must be a JPG, PNG, WebP, or PDF no larger than 10 MB.`);
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
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={select}
        />
      </label>
      <p className={styles.hint}>{hint}</p>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {files.length > 0 && (
        <ul className={styles.files} aria-label="Selected attachments">
          {files.map((file, index) => (
            <li key={`${file.name}-${file.lastModified}`}>
              <FileImage aria-hidden="true" />
              <span><strong>{file.name}</strong><small>{formatBytes(file.size)}</small></span>
              <button type="button" onClick={() => commit(files.filter((_, item) => item !== index))} aria-label={`Remove ${file.name}`}>
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
