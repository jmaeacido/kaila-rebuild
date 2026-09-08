"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  Briefcase,
  CheckCircle2,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@kaila/ui";
import {
  AdminEmpty,
  AdminPage,
  AdminPageHeader,
  AdminSkeletons,
  AdminSplit,
  AdminStat,
  AdminStats,
  AdminWorkspace,
} from "../../components/admin-page";
import styles from "./page.module.css";

type Analytics = {
  privacy: { minimumCohort: number; suppressed: boolean };
  marketplace: {
    users: number;
    jobs: number;
    completedJobs: number;
    offers: number;
  } | null;
  phaseNine: {
    directConversations: number;
    communityPosts: number;
    assistantInteractions: number;
    calls: number;
  };
};

type Operations = {
  status: string;
  checks: Record<string, boolean>;
  checkedAt: string;
};

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [operations, setOperations] = useState<Operations | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [analyticsResponse, operationsResponse] = await Promise.all([
        fetch("/api/v1/admin/marketplace/analytics", { credentials: "include" }),
        fetch("/api/v1/admin/marketplace/operations-validation", {
          credentials: "include",
        }),
      ]);
      if (!analyticsResponse.ok || !operationsResponse.ok) throw new Error();
      setAnalytics(((await analyticsResponse.json()) as { data: Analytics }).data);
      setOperations(
        ((await operationsResponse.json()) as { data: Operations }).data,
      );
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const checks = operations ? Object.entries(operations.checks) : [];
  const passingCount = checks.filter(([, passing]) => passing).length;

  return (
    <AdminPage>
      <AdminPageHeader
        actions={
          <Button
            disabled={state === "loading"}
            onClick={() => void load()}
            type="button"
            variant="secondary"
          >
            <RefreshCw aria-hidden="true" />
            Refresh
          </Button>
        }
        description="Privacy-safe marketplace totals and operations readiness checks for day-to-day health."
        eyebrow="Operations"
        title="Marketplace health"
      />

      {state === "error" ? (
        <div className={styles.banner} role="alert">
          Marketplace health could not be loaded. Check your connection and try again.
        </div>
      ) : null}

      {state === "loading" ? <AdminSkeletons count={4} label="Loading aggregate health" /> : null}

      {state === "ready" && analytics && operations ? (
        <>
          <AdminStats label="Marketplace metrics">
            {analytics.privacy.suppressed ? (
              <AdminStat
                icon={<BarChart3 aria-hidden="true" />}
                label="Privacy gate"
                tone="warning"
                value={`Need ${analytics.privacy.minimumCohort}+`}
              />
            ) : (
              <>
                <AdminStat
                  icon={<Briefcase aria-hidden="true" />}
                  label="Jobs"
                  value={analytics.marketplace?.jobs ?? 0}
                />
                <AdminStat
                  icon={<CheckCircle2 aria-hidden="true" />}
                  label="Completed"
                  tone="success"
                  value={analytics.marketplace?.completedJobs ?? 0}
                />
                <AdminStat
                  icon={<MessageSquare aria-hidden="true" />}
                  label="Offers"
                  value={analytics.marketplace?.offers ?? 0}
                />
                <AdminStat
                  icon={<Activity aria-hidden="true" />}
                  label="Users"
                  value={analytics.marketplace?.users ?? 0}
                />
              </>
            )}
            <AdminStat
              icon={<ShieldCheck aria-hidden="true" />}
              label="Operations"
              tone={operations.status === "ready" ? "success" : "warning"}
              value={`${passingCount}/${checks.length}`}
            />
          </AdminStats>

          <AdminWorkspace>
            <AdminSplit>
              <section aria-label="Privacy-safe analytics" className={styles.panel}>
                <div className={styles.panelHeader}>
                  <BarChart3 aria-hidden="true" />
                  <h2>Privacy-safe analytics</h2>
                </div>

                {analytics.privacy.suppressed ? (
                  <AdminEmpty
                    description={`Marketplace metrics stay hidden until at least ${analytics.privacy.minimumCohort} users are included in the cohort.`}
                    icon={<BarChart3 aria-hidden="true" />}
                    title="Metrics suppressed"
                  />
                ) : (
                  <p className={styles.modules}>
                    Aggregate marketplace activity is shown above. Totals remain privacy-safe and
                    never expose individual accounts.
                  </p>
                )}

                <div className={styles.modules}>
                  <strong>Optional modules</strong>
                  {analytics.phaseNine.directConversations} conversations ·{" "}
                  {analytics.phaseNine.communityPosts} posts ·{" "}
                  {analytics.phaseNine.assistantInteractions} assistant requests ·{" "}
                  {analytics.phaseNine.calls} calls
                </div>
              </section>

              <section aria-label="Operations validation" className={styles.panel}>
                <div className={styles.panelHeader}>
                  <Activity aria-hidden="true" />
                  <h2>Operations validation</h2>
                </div>

                <p
                  className={
                    operations.status === "ready" ? styles.statusReady : undefined
                  }
                >
                  {operations.status === "ready" ? (
                    <>
                      <ShieldCheck aria-hidden="true" /> Ready
                    </>
                  ) : (
                    "Needs attention"
                  )}
                </p>

                <p className={styles.checkedAt}>
                  Checked {new Date(operations.checkedAt).toLocaleString()}
                </p>

                {checks.length === 0 ? (
                  <AdminEmpty
                    description="No validation checks were returned by the operations endpoint."
                    icon={<Activity aria-hidden="true" />}
                    title="No checks available"
                  />
                ) : (
                  <div className={styles.checklist}>
                    {checks.map(([name, passing]) => (
                      <div className={styles.check} key={name}>
                        <span className={styles.checkName}>{name}</span>
                        <span
                          className={`${styles.badge} ${passing ? styles.badgePass : styles.badgeFail}`}
                        >
                          {passing ? "Pass" : "Attention"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </AdminSplit>
          </AdminWorkspace>
        </>
      ) : null}
    </AdminPage>
  );
}
