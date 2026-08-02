"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Ban,
  Clock,
  Construction,
  Home,
  Lock,
  RefreshCw,
  SearchX,
  ServerCrash,
  ShieldAlert,
  WifiOff,
} from "lucide-react";
import styles from "./status-page.module.css";
import { ThemeWordmark } from "../app/components/theme-wordmark";

export type StatusCode =
  | 400
  | 401
  | 403
  | 404
  | 408
  | 429
  | 500
  | 502
  | 503
  | 504;

type StatusCopy = {
  title: string;
  body: string;
  badge: string;
  icon: typeof Home;
  primaryHref: string;
  primaryLabel: string;
};

const STATUS_COPY: Record<StatusCode, StatusCopy> = {
  400: {
    title: "That request did not look right",
    body: "Operations could not process this request. Check the payload and try again.",
    badge: "400 Bad request",
    icon: AlertTriangle,
    primaryHref: "/",
    primaryLabel: "Back to review",
  },
  401: {
    title: "Sign in required",
    body: "KAILA operations needs an authenticated staff session.",
    badge: "401 Unauthorized",
    icon: Lock,
    primaryHref: "/login",
    primaryLabel: "Sign in",
  },
  403: {
    title: "Access denied",
    body: "Your staff role cannot open this operations screen.",
    badge: "403 Forbidden",
    icon: Ban,
    primaryHref: "/",
    primaryLabel: "Back to review",
  },
  404: {
    title: "Page not found",
    body: "This operations route does not exist or was moved.",
    badge: "404 Not found",
    icon: SearchX,
    primaryHref: "/",
    primaryLabel: "Back to review",
  },
  408: {
    title: "Request timed out",
    body: "The operations console stopped waiting on a slow response.",
    badge: "408 Timeout",
    icon: Clock,
    primaryHref: "/",
    primaryLabel: "Try again",
  },
  429: {
    title: "Too many requests",
    body: "Slow down briefly, then continue with your review work.",
    badge: "429 Rate limited",
    icon: ShieldAlert,
    primaryHref: "/",
    primaryLabel: "Back to review",
  },
  500: {
    title: "Operations hit an error",
    body: "Something failed on our side. Refresh or retry in a moment.",
    badge: "500 Server error",
    icon: ServerCrash,
    primaryHref: "/",
    primaryLabel: "Back to review",
  },
  502: {
    title: "Gateway unavailable",
    body: "A fronting gateway failed. Marketplace operations will resume shortly.",
    badge: "502 Bad gateway",
    icon: WifiOff,
    primaryHref: "/",
    primaryLabel: "Try again",
  },
  503: {
    title: "Maintenance in progress",
    body: "Consumer traffic is paused. Staff with maintenance access can still manage the window.",
    badge: "503 Unavailable",
    icon: Construction,
    primaryHref: "/maintenance",
    primaryLabel: "Maintenance control",
  },
  504: {
    title: "Gateway timed out",
    body: "The upstream did not finish in time. Retry shortly.",
    badge: "504 Gateway timeout",
    icon: Clock,
    primaryHref: "/",
    primaryLabel: "Try again",
  },
};

export function isStatusCode(value: number): value is StatusCode {
  return value in STATUS_COPY;
}

export function StatusPage({
  code,
  message,
}: {
  code: StatusCode;
  message?: string;
}) {
  const copy = STATUS_COPY[code];
  const Icon = copy.icon;

  return (
    <main className={styles.page}>
      <div className={styles.panel}>
        <ThemeWordmark className={styles.brand} priority />
        <span className={styles.badge}>
          <Icon aria-hidden="true" />
          {copy.badge}
        </span>
        <span className={styles.iconWrap} aria-hidden="true">
          <Icon />
        </span>
        <h1 className={styles.title}>{copy.title}</h1>
        <p className={styles.body}>{message?.trim() || copy.body}</p>
        <div className={styles.actions}>
          <Link className={styles.primary} href={copy.primaryHref}>
            {code === 503 || code === 502 || code === 504 || code === 408 || code === 500 ? (
              <RefreshCw aria-hidden="true" />
            ) : (
              <Home aria-hidden="true" />
            )}
            {copy.primaryLabel}
          </Link>
        </div>
        <p className={styles.hint}>KAILA Operations</p>
      </div>
    </main>
  );
}
