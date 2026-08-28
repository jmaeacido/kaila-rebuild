"use client";

import Image from "next/image";
import { useTheme } from "../app/theme-provider";
import type { ResolvedTheme } from "../app/theme";
import styles from "./brand-mark.module.css";

type BrandMarkProps = {
  className?: string;
  priority?: boolean;
  /** auto follows resolved theme; onDark is the white/cyan accessibility variant. */
  variant?: "auto" | "ink" | "onDark";
  width?: number;
  height?: number;
  showBull?: boolean;
  /** Bull icon only — for compact headers where the wordmark would clip. */
  compact?: boolean;
};

function markFor(variant: BrandMarkProps["variant"], resolved: ResolvedTheme): string {
  if (variant === "ink") return "/brand/kaila-wordmark.png";
  if (variant === "onDark") return "/brand/kaila-wordmark-on-dark.png";
  return resolved === "dark"
    ? "/brand/kaila-wordmark-on-dark.png"
    : "/brand/kaila-wordmark.png";
}

export function BrandWordmark({
  className,
  priority = false,
  variant = "auto",
  width = 2023,
  height = 526,
}: Pick<BrandMarkProps, "className" | "priority" | "variant" | "width" | "height">) {
  const { resolved } = useTheme();
  return (
    <Image
      className={className}
      src={markFor(variant, resolved)}
      alt="KAILA"
      width={width}
      height={height}
      priority={priority}
    />
  );
}

export function BrandMark({
  className,
  priority = false,
  variant = "auto",
  width = 2023,
  height = 526,
  showBull = false,
  compact = false,
}: BrandMarkProps) {
  const { resolved } = useTheme();
  return (
    <span
      className={`${styles.lockup}${showBull ? ` ${styles.withBull}` : ""}${compact ? ` ${styles.compact}` : ""}${className ? ` ${className}` : ""}`}
    >
      <Image
        className={styles.bull}
        src="/brand/kaila-bull-app-icon-v2.png"
        alt=""
        width={1254}
        height={1254}
        priority={priority}
      />
      <Image
        className={styles.wordmark}
        src={markFor(variant, resolved)}
        alt="KAILA"
        width={width}
        height={height}
        priority={priority}
      />
    </span>
  );
}
