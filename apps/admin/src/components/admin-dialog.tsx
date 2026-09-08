"use client";

import { FormEvent, ReactNode, useEffect, useId, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@kaila/ui";
import styles from "./admin-dialog.module.css";

type AdminDialogProps = {
  open: boolean;
  title: string;
  description: string;
  eyebrow?: string;
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  confirmVariant?: "primary" | "danger";
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

export function AdminDialog({
  open,
  title,
  description,
  eyebrow = "Confirm",
  children,
  confirmLabel,
  cancelLabel = "Cancel",
  confirmVariant = "primary",
  busy = false,
  onClose,
  onConfirm,
}: AdminDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      aria-labelledby={titleId}
      className={styles.dialog}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClose={() => {
        if (open) onClose();
      }}
      ref={dialogRef}
    >
      <form
        className={styles.content}
        method="dialog"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          void onConfirm();
        }}
      >
        <span aria-hidden="true" className={styles.icon} data-tone={confirmVariant}>
          <AlertTriangle />
        </span>
        <div className={styles.copy}>
          <p>{eyebrow}</p>
          <h2 id={titleId}>{title}</h2>
          <p>{description}</p>
        </div>
        {children}
        <div className={styles.actions}>
          <Button disabled={busy} onClick={onClose} type="button" variant="secondary">
            {cancelLabel}
          </Button>
          <Button
            className={confirmVariant === "danger" ? styles.dangerConfirm : undefined}
            isLoading={busy}
            type="submit"
            variant={confirmVariant === "danger" ? "danger" : "primary"}
          >
            {confirmLabel}
          </Button>
        </div>
      </form>
    </dialog>
  );
}

type ReasonDialogProps = {
  open: boolean;
  title: string;
  description: string;
  eyebrow?: string;
  reason: string;
  onReasonChange: (value: string) => void;
  reasonLabel?: string;
  minLength?: number;
  confirmLabel: string;
  cancelLabel?: string;
  confirmVariant?: "primary" | "danger";
  busy?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
};

export function AdminReasonDialog({
  open,
  title,
  description,
  eyebrow = "Required reason",
  reason,
  onReasonChange,
  reasonLabel = "Reason",
  minLength = 10,
  confirmLabel,
  cancelLabel = "Cancel",
  confirmVariant = "primary",
  busy = false,
  onClose,
  onConfirm,
}: ReasonDialogProps) {
  const trimmed = reason.trim();
  const valid = trimmed.length >= minLength;

  return (
    <AdminDialog
      busy={busy}
      cancelLabel={cancelLabel}
      confirmLabel={confirmLabel}
      confirmVariant={confirmVariant}
      description={description}
      eyebrow={eyebrow}
      onClose={onClose}
      onConfirm={() => {
        if (!valid) return;
        return onConfirm(trimmed);
      }}
      open={open}
      title={title}
    >
      <label className={styles.reason}>
        {reasonLabel}
        <textarea
          onChange={(event) => onReasonChange(event.target.value)}
          placeholder={`At least ${minLength} characters`}
          required
          value={reason}
        />
        <span>
          {trimmed.length}/{minLength} minimum
        </span>
      </label>
    </AdminDialog>
  );
}
