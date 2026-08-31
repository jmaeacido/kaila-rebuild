"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BriefcaseBusiness,
  ClipboardList,
  Home,
  MessageCircle,
  Search,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useMarketplaceMode } from "../app/use-marketplace-mode";
import styles from "./marketplace-navigation.module.css";

export type MarketplaceNavActive =
  | "home"
  | "opportunities"
  | "jobs"
  | "work"
  | "community"
  | "messages"
  | "profile";

type MarketplaceNavigationProps = {
  active?: MarketplaceNavActive;
  variant?: "bottom" | "desktop";
};

function detectActive(pathname: string, hash: string, isProvider: boolean): MarketplaceNavActive | undefined {
  if (pathname.startsWith("/community")) return "community";
  if (pathname.startsWith("/messages")) return "messages";
  if (
    pathname.startsWith("/account")
    || pathname.startsWith("/settings")
    || pathname.startsWith("/provider-profile")
  ) {
    return "profile";
  }
  if (pathname.startsWith("/opportunities")) return "opportunities";
  if (pathname.startsWith("/post-job")) return isProvider ? "work" : "jobs";
  if (pathname.startsWith("/home")) {
    if (hash === "#current-title") return isProvider ? "work" : "jobs";
    return isProvider ? undefined : "home";
  }

  return undefined;
}

function currentAttr(active: MarketplaceNavActive | undefined, item: MarketplaceNavActive) {
  return active === item ? "page" : undefined;
}

export function MarketplaceNavigation({ active, variant = "bottom" }: MarketplaceNavigationProps) {
  const pathname = usePathname();
  const { isProvider, ready } = useMarketplaceMode();
  const [hash, setHash] = useState("");

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [pathname]);

  const resolvedActive = active ?? detectActive(pathname, hash, isProvider);
  const className = variant === "desktop" ? styles.desktopNav : styles.bottomNav;

  if (!ready) {
    return variant === "desktop" ? null : <nav className={className} aria-label="Marketplace navigation" aria-hidden="true" />;
  }

  return (
    <nav className={className} aria-label="Marketplace navigation">
      {isProvider ? (
        <Link href="/opportunities" aria-current={currentAttr(resolvedActive, "opportunities")}>
          <Search aria-hidden="true" />
          Find work
        </Link>
      ) : (
        <Link href="/home" aria-current={currentAttr(resolvedActive, "home")}>
          <Home aria-hidden="true" />
          Home
        </Link>
      )}
      {isProvider ? (
        <Link href="/home#current-title" aria-current={currentAttr(resolvedActive, "work")}>
          <BriefcaseBusiness aria-hidden="true" />
          Work
        </Link>
      ) : (
        <Link href="/home#current-title" aria-current={currentAttr(resolvedActive, "jobs")}>
          <ClipboardList aria-hidden="true" />
          Jobs
        </Link>
      )}
      <Link href="/community" aria-current={currentAttr(resolvedActive, "community")}>
        <UsersRound aria-hidden="true" />
        Community
      </Link>
      <Link href="/messages" aria-current={currentAttr(resolvedActive, "messages")}>
        <MessageCircle aria-hidden="true" />
        Messages
      </Link>
      <Link href="/account" aria-current={currentAttr(resolvedActive, "profile")}>
        <UserRound aria-hidden="true" />
        Profile
      </Link>
    </nav>
  );
}

export function MarketplaceDesktopNav() {
  return <MarketplaceNavigation variant="desktop" />;
}
