import { Check, Circle } from "lucide-react";
import styles from "./lifecycle-timeline.module.css";

const stages = [
  { key: "posted", label: "Posted" },
  { key: "offers_received", label: "Offers" },
  { key: "provider_selected", label: "Selected" },
  { key: "provider_traveling", label: "Traveling" },
  { key: "working", label: "Working" },
  { key: "completed", label: "Completed" },
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

  return (
    <ol className={styles.timeline} aria-label="Job progress">
      {stages.map((stage, index) => {
        const complete = index < current || status === "rated_closed";
        const active = index === current && status !== "rated_closed";
        return (
          <li
            className={active ? styles.active : complete ? styles.complete : ""}
            key={stage.key}
            aria-current={active ? "step" : undefined}
          >
            <span className={styles.marker}>
              {complete ? <Check aria-hidden="true" /> : <Circle aria-hidden="true" />}
            </span>
            <span>{stage.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
