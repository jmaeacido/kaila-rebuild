"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Construction, FileCheck2, HeartHandshake, Scale, ShieldAlert, UserRoundX, Users } from "lucide-react";
import styles from "./admin-shell-nav.module.css";
import { ThemeWordmark } from "./theme-wordmark";

const authPaths = new Set(["/forgot-password", "/reset-password"]);
const destinations = [
  { href: "/", label: "Review", icon: FileCheck2 },
  { href: "/users", label: "People", icon: Users },
  { href: "/maintenance", label: "Maintenance", icon: Construction },
  { href: "/support", label: "Support", icon: HeartHandshake },
  { href: "/cases", label: "Disputes", icon: Scale },
  { href: "/reports", label: "Safety", icon: ShieldAlert },
  { href: "/account-deletions", label: "Deletions", icon: UserRoundX },
  { href: "/analytics", label: "Insights", icon: BarChart3 },
];

export function AdminShellNav() {
  const pathname = usePathname();
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    if (authPaths.has(pathname)) return;
    let active = true;
    void fetch("/api/v1/auth/session-status", { credentials: "include", cache: "no-store" })
      .then(async response => {
        if (!response.ok) return false;
        return ((await response.json()) as { data: { authenticated: boolean } }).data.authenticated;
      })
      .then(value => { if (active) setAuthenticated(value); })
      .catch(() => { if (active) setAuthenticated(false); });
    return () => { active = false; };
  }, [pathname]);

  if (!authenticated || authPaths.has(pathname)) return null;

  return <header className={styles.shell}>
    <div className={styles.bar}>
      <Link className={styles.brand} href="/" aria-label="KAILA administration home">
        <ThemeWordmark priority />
        <span>Operations</span>
      </Link>
      <nav aria-label="Administration">
        {destinations.map(({ href, label, icon: Icon }) => {
          const current = pathname === href;
          return <Link aria-current={current ? "page" : undefined} href={href} key={href}><Icon aria-hidden="true"/><span>{label}</span></Link>;
        })}
      </nav>
    </div>
  </header>;
}
