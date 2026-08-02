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
import { BrandMark } from "./brand-mark";
import styles from "./status-page.module.css";

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
  secondaryHref?: string;
  secondaryLabel?: string;
};

const STATUS_COPY: Record<StatusCode, StatusCopy> = {
  400: {
    title: "That request did not look right",
    body: "KAILA could not understand what was sent. Check the details and try again.",
    badge: "400 Bad request",
    icon: AlertTriangle,
    primaryHref: "/",
    primaryLabel: "Back home",
  },
  401: {
    title: "Sign in to continue",
    body: "This part of KAILA needs your account. Sign in and we will take you back.",
    badge: "401 Unauthorized",
    icon: Lock,
    primaryHref: "/login",
    primaryLabel: "Sign in",
    secondaryHref: "/",
    secondaryLabel: "Back home",
  },
  403: {
    title: "You do not have access",
    body: "This screen is reserved for another account role. Return home or switch accounts.",
    badge: "403 Forbidden",
    icon: Ban,
    primaryHref: "/",
    primaryLabel: "Back home",
  },
  404: {
    title: "We could not find that page",
    body: "The link may be outdated, or the page moved. Head home to keep finding local help.",
    badge: "404 Not found",
    icon: SearchX,
    primaryHref: "/",
    primaryLabel: "Back home",
  },
  408: {
    title: "That took too long",
    body: "KAILA stopped waiting on a slow connection. Try again when your network is steadier.",
    badge: "408 Timeout",
    icon: Clock,
    primaryHref: "/",
    primaryLabel: "Try again",
  },
  429: {
    title: "Slow down for a moment",
    body: "Too many requests arrived at once. Wait a few seconds, then continue.",
    badge: "429 Too many requests",
    icon: ShieldAlert,
    primaryHref: "/",
    primaryLabel: "Back home",
  },
  500: {
    title: "Something went wrong on our side",
    body: "KAILA hit an unexpected problem. Refresh the page or come back shortly.",
    badge: "500 Server error",
    icon: ServerCrash,
    primaryHref: "/",
    primaryLabel: "Back home",
  },
  502: {
    title: "KAILA is briefly unreachable",
    body: "A gateway in front of the app failed. We are working to restore service.",
    badge: "502 Bad gateway",
    icon: WifiOff,
    primaryHref: "/",
    primaryLabel: "Try again",
  },
  503: {
    title: "KAILA is under maintenance",
    body: "We are improving the marketplace. Please check back soon — your jobs and messages will be waiting.",
    badge: "503 Unavailable",
    icon: Construction,
    primaryHref: "/maintenance",
    primaryLabel: "Maintenance status",
  },
  504: {
    title: "The server took too long",
    body: "A gateway timed out before KAILA could finish. Try again in a moment.",
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
  retryHref,
}: {
  code: StatusCode;
  message?: string;
  retryHref?: string;
}) {
  const copy = STATUS_COPY[code];
  const Icon = copy.icon;
  const primaryHref = retryHref ?? copy.primaryHref;

  return (
    <main className={styles.page}>
      <div className={styles.panel}>
        <BrandMark className={styles.brand} priority variant="auto" />
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
          <Link className={styles.primary} href={primaryHref}>
            {code === 503 || code === 502 || code === 504 || code === 408 || code === 500 ? (
              <RefreshCw aria-hidden="true" />
            ) : (
              <Home aria-hidden="true" />
            )}
            {copy.primaryLabel}
          </Link>
          {copy.secondaryHref ? (
            <Link className={styles.secondary} href={copy.secondaryHref}>
              {copy.secondaryLabel}
            </Link>
          ) : null}
        </div>
        <p className={styles.hint}>Local services near you — KAILA</p>
      </div>
    </main>
  );
}
