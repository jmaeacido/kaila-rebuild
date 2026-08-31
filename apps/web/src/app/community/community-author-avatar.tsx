import Image from "next/image";
import { UserRound } from "lucide-react";
import styles from "./community.module.css";

type CommunityAuthorAvatarProps = {
  official: boolean;
};

export function CommunityAuthorAvatar({ official }: CommunityAuthorAvatarProps) {
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

  return (
    <span className={styles.avatar} aria-hidden="true">
      <UserRound />
    </span>
  );
}
