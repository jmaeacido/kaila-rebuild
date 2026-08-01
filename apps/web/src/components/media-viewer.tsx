"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";
import styles from "./media-viewer.module.css";

export type ViewableMedia = { id: string; name: string; mimeType: string; url: string };

export function MediaViewer({ assets, initialIndex, onClose }: { assets: ViewableMedia[]; initialIndex: number; onClose: () => void }) {
  const [index, setIndex] = useState(initialIndex);
  const [zoomed, setZoomed] = useState(false);
  const close = useCallback(() => { setZoomed(false); onClose(); }, [onClose]);
  const move = useCallback((direction: number) => { setZoomed(false); setIndex((current) => (current + direction + assets.length) % assets.length); }, [assets.length]);

  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft" && assets.length > 1) move(-1);
      if (event.key === "ArrowRight" && assets.length > 1) move(1);
    };
    document.addEventListener("keydown", keyboard);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", keyboard); };
  }, [assets.length, close, move]);

  const asset = assets[index];
  if (!asset) return null;
  return <div className={styles.viewer} role="dialog" aria-modal="true" aria-labelledby="shared-media-title" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
    <section className={styles.panel}>
      <header><div><h2 id="shared-media-title">{asset.name}</h2><p>{index + 1} of {assets.length}</p></div><button autoFocus type="button" onClick={close} aria-label="Close media viewer"><X /></button></header>
      <div className={styles.stage}>
        {assets.length > 1 && <button className={styles.previous} type="button" onClick={() => move(-1)} aria-label="Previous attachment"><ChevronLeft /></button>}
        {asset.mimeType.startsWith("image/") ? <Image className={zoomed ? styles.zoomed : ""} src={asset.url} alt={asset.name} fill sizes="100vw" unoptimized onClick={() => setZoomed((current) => !current)} /> : <video key={asset.id} src={asset.url} controls autoPlay playsInline preload="metadata" aria-label={asset.name} />}
        {assets.length > 1 && <button className={styles.next} type="button" onClick={() => move(1)} aria-label="Next attachment"><ChevronRight /></button>}
      </div>
      <footer>{asset.mimeType.startsWith("image/") && <><button type="button" onClick={() => setZoomed((current) => !current)}>{zoomed ? <ZoomOut /> : <ZoomIn />}{zoomed ? "Zoom out" : "Zoom in"}</button><button type="button" disabled={!zoomed} onClick={() => setZoomed(false)}><RotateCcw />Reset</button></>}<span>Use arrow keys to browse · Esc to close</span></footer>
    </section>
  </div>;
}
