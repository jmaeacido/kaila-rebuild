"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  pullDistance,
  pullRefreshMaximum,
  pullRefreshThreshold,
  shouldRefresh,
} from "./pull-to-refresh-gesture";
import { realtimeReconcileName } from "./realtime-provider";
import styles from "./pull-to-refresh.module.css";

type PullState = "idle" | "pulling" | "ready" | "refreshing";

export function PullToRefresh() {
  const startY = useRef<number | null>(null);
  const distanceRef = useRef(0);
  const [distance, setDistance] = useState(0);
  const [state, setState] = useState<PullState>("idle");

  useEffect(() => {
    let settleTimer: number | null = null;

    const reset = () => {
      startY.current = null;
      distanceRef.current = 0;
      setDistance(0);
      setState("idle");
    };

    const onTouchStart = (event: TouchEvent) => {
      if (
        event.touches.length !== 1 ||
        window.scrollY > 0 ||
        document.documentElement.scrollTop > 0
      ) {
        startY.current = null;
        return;
      }
      startY.current = event.touches[0]?.clientY ?? null;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (startY.current === null || event.touches.length !== 1) return;
      const nextDistance = pullDistance(
        startY.current,
        event.touches[0]?.clientY ?? startY.current,
      );
      if (nextDistance <= 0) return;
      if (event.cancelable) event.preventDefault();
      distanceRef.current = nextDistance;
      setDistance(nextDistance);
      setState(shouldRefresh(nextDistance) ? "ready" : "pulling");
    };

    const onTouchEnd = () => {
      if (startY.current === null) return;
      const refresh = shouldRefresh(distanceRef.current);
      startY.current = null;
      if (!refresh) {
        reset();
        return;
      }
      setDistance(pullRefreshThreshold);
      setState("refreshing");
      window.dispatchEvent(new Event(realtimeReconcileName));
      settleTimer = window.setTimeout(reset, 700);
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", reset, { passive: true });

    return () => {
      if (settleTimer !== null) window.clearTimeout(settleTimer);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", reset);
    };
  }, []);

  const label =
    state === "refreshing"
      ? "Refreshing…"
      : state === "ready"
        ? "Release to refresh"
        : "Pull down to refresh";

  return (
    <div
      className={styles.indicator}
      data-visible={state !== "idle"}
      data-refreshing={state === "refreshing"}
      role="status"
      aria-live="polite"
      style={
        {
          "--pull-progress": Math.min(distance / pullRefreshThreshold, 1),
          "--pull-offset": `${Math.min(distance, pullRefreshMaximum)}px`,
        } as React.CSSProperties
      }
    >
      <span>
        <RefreshCw aria-hidden="true" />
        {label}
      </span>
    </div>
  );
}
