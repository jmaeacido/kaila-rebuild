import Image from "next/image";
import styles from "./community.module.css";

type CommunityMemberAvatarProps = {
  name: string;
  avatarUrl: string | null;
  size?: "md" | "sm";
};

export function CommunityMemberAvatar({ name, avatarUrl, size = "md" }: CommunityMemberAvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const className = size === "sm" ? `${styles.memberAvatar} ${styles.memberAvatarSm}` : styles.memberAvatar;

  if (avatarUrl) {
    return (
      <span className={className}>
        <Image unoptimized src={avatarUrl} alt="" width={size === "sm" ? 28 : 36} height={size === "sm" ? 28 : 36} />
      </span>
    );
  }

  return (
    <span className={className} aria-hidden="true">
      {initial}
    </span>
  );
}
