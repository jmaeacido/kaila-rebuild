"use client";

import { useEffect, useRef, useState } from "react";
import { BrandedLoader } from "./branded-loader";

const pendingUiSelector = [
  '[aria-busy="true"]',
  '[aria-label^="Loading "]',
  '[aria-label^="Checking "]',
].join(",");

function waitForImage(image: HTMLImageElement): Promise<void> {
  if (image.complete) return Promise.resolve();

  return new Promise((resolve) => {
    image.addEventListener("load", () => resolve(), { once: true });
    image.addEventListener("error", () => resolve(), { once: true });
  });
}

function afterNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

export function InitialUiGate({ children }: { children: React.ReactNode }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    let active = true;
    let checking = false;

    const checkReadiness = async () => {
      if (!active || checking || content.querySelector(pendingUiSelector)) return;
      checking = true;

      await document.fonts?.ready;
      const eagerImages = Array.from(
        content.querySelectorAll<HTMLImageElement>('img:not([loading="lazy"])'),
      );
      await Promise.all(eagerImages.map(waitForImage));
      await afterNextPaint();

      checking = false;
      if (active && !content.querySelector(pendingUiSelector)) setReady(true);
    };

    const observer = new MutationObserver(() => void checkReadiness());
    observer.observe(content, {
      attributes: true,
      attributeFilter: ["aria-busy", "aria-label", "src"],
      childList: true,
      subtree: true,
    });
    void checkReadiness();

    return () => {
      active = false;
      observer.disconnect();
    };
  }, []);

  return (
    <>
      {!ready && <BrandedLoader label="Getting KAILA ready for you…" />}
      <div
        ref={contentRef}
        className={ready ? "initialUiContent" : "initialUiContent initialUiContentPending"}
        aria-hidden={!ready}
        inert={!ready ? true : undefined}
      >
        {children}
      </div>
    </>
  );
}
