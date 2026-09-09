import Image from "next/image";
import { UserRound } from "lucide-react";
import styles from "./community.module.css";

type CommunityAuthorAvatarProps = {
  official: boolean;
  name?: string;
  avatarUrl?: string | null;
};

export function CommunityAuthorAvatar({ official, name, avatarUrl }: CommunityAuthorAvatarProps) {
  if (official) {
    return (
      <span className={`${styles.avatar} ${styles.avatarOfficial}`}>
        <Image
          src="/brand/kaila-bull-app-icon-v2.png"
          alt=""
          width={44}
          height={44}
        />
      </span>
    );
  }

  if (avatarUrl) {
    return (
      <span className={styles.avatar}>
        <Image unoptimized src={avatarUrl} alt="" width={44} height={44} />
      </span>
    );
  }

  const initial = name?.trim().charAt(0).toUpperCase();
  if (initial) {
    return (
      <span className={styles.avatar} aria-hidden="true">
        {initial}
      </span>
    );
  }

  return (
    <span className={styles.avatar} aria-hidden="true">
      <UserRound />
    </span>
  );
}
