import { BadgeCheck } from "lucide-react";
import styles from "./identity-verified-badge.module.css";

type IdentityVerifiedBadgeProps = {
  /** Icon-only mark with tooltip. Use for tight layouts next to avatars or names. */
  compact?: boolean;
  className?: string;
};

/** Public/privacy-safe badge. Only render when identity is actually approved. */
export function IdentityVerifiedBadge({ compact = false, className }: IdentityVerifiedBadgeProps) {
  return (
    <span
      className={`${styles.badge}${compact ? ` ${styles.compact}` : ""}${className ? ` ${className}` : ""}`}
      title="Identity verified"
      aria-label="Identity verified"
    >
      <BadgeCheck aria-hidden="true" />
      {!compact ? <span aria-hidden="true">Identity verified</span> : null}
    </span>
  );
}
