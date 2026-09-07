"use client";

import { useEffect, useRef } from "react";
import { Check, Circle } from "lucide-react";
import styles from "./lifecycle-timeline.module.css";

const stages = [
  { key: "posted", label: "Posted" },
  { key: "offers_received", label: "Offers" },
  { key: "provider_selected", label: "Hired" },
  { key: "provider_traveling", label: "Travel" },
  { key: "working", label: "Work" },
  { key: "completed", label: "Done" },
  { key: "rated_closed", label: "Rated" },
] as const;

const stageIndex: Record<string, number> = {
  posted: 0,
  offers_received: 1,
  provider_selected: 2,
  provider_traveling: 3,
  working: 4,
  completion_submitted: 5,
  revision_requested: 4,
  disputed: 5,
  completed: 5,
  rated_closed: 6,
};

export function LifecycleTimeline({ status }: { status: string }) {
  const current = stageIndex[status] ?? 0;
  const activeRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [current]);

  return (
    <ol className={styles.timeline} aria-label="Job progress">
      {stages.map((stage, index) => {
        const complete = index < current || status === "rated_closed";
        const active = index === current && status !== "rated_closed";
        return (
          <li
            className={active ? styles.active : complete ? styles.complete : ""}
            key={stage.key}
            ref={active ? activeRef : undefined}
            aria-current={active ? "step" : undefined}
          >
            <span className={styles.marker}>
              {complete ? <Check aria-hidden="true" /> : <Circle aria-hidden="true" />}
            </span>
            <span className={styles.label}>{stage.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
