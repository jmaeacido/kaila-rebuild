"use client";

import Link from "next/link";
import { ScanFace } from "lucide-react";
import { Button } from "@kaila/ui";
import { ActionModal } from "../components/action-modal";
import { identityGateCopy, type IdentityGateReason } from "../app/identity-verification-gate";
import styles from "./identity-verification-gate.module.css";

type IdentityVerificationGateProps = {
  open: boolean;
  reason: IdentityGateReason;
  onDismiss: () => void;
};

export function IdentityVerificationGate({ open, reason, onDismiss }: IdentityVerificationGateProps) {
  if (!open) return null;
  const copy = identityGateCopy(reason);

  return (
    <ActionModal eyebrow="ACCOUNT SAFETY" title={copy.title} onClose={onDismiss}>
      <div className={styles.content}>
        <span className={styles.icon} aria-hidden="true">
          <ScanFace />
        </span>
        <p>{copy.body}</p>
        <div className={styles.actions}>
          <Link className={`kaila-button kaila-button--primary ${styles.cta}`} href="/identity-verification">
            Verify my identity
          </Link>
          <Button type="button" variant="secondary" onClick={onDismiss}>
            Not now
          </Button>
        </div>
      </div>
    </ActionModal>
  );
}
