"use client";

import Image from "next/image";
import { useTheme } from "../app/theme-provider";
import type { ResolvedTheme } from "../app/theme";

type BrandMarkProps = {
  className?: string;
  priority?: boolean;
  /** auto follows resolved theme; onDark is the white/cyan accessibility variant. */
  variant?: "auto" | "ink" | "onDark";
  width?: number;
  height?: number;
};

function markFor(variant: BrandMarkProps["variant"], resolved: ResolvedTheme): string {
  if (variant === "ink") return "/brand/kaila-wordmark-bull-v1.png";
  if (variant === "onDark") return "/brand/kaila-wordmark-bull-v1-on-dark.png";
  return resolved === "dark"
    ? "/brand/kaila-wordmark-bull-v1-on-dark.png"
    : "/brand/kaila-wordmark-bull-v1.png";
}

export function BrandMark({
  className,
  priority = false,
  variant = "auto",
  width = 2023,
  height = 526,
}: BrandMarkProps) {
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
