"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { useTheme } from "../app/theme-provider";
import { ANDROID_DOWNLOAD_PAGE_URL } from "../app/android-download";
import styles from "./android-download-qr.module.css";

type AndroidDownloadQrProps = {
  label: string;
};

function qrColors(): { dark: string; light: string } {
  if (typeof document === "undefined") {
    return { dark: "#1463ff", light: "#ffffff" };
  }

  const style = getComputedStyle(document.documentElement);
  const primary = style.getPropertyValue("--color-primary").trim();

  return {
    dark: primary || "#1463ff",
    light: "#ffffff",
  };
}

export function AndroidDownloadQr({ label }: AndroidDownloadQrProps) {
  const { resolved } = useTheme();
  const downloadUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return ANDROID_DOWNLOAD_PAGE_URL;
    }
    return `${window.location.origin}/download`;
  }, []);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const colors = qrColors();

    void QRCode.toDataURL(downloadUrl, {
      width: 240,
      margin: 2,
      errorCorrectionLevel: "H",
      color: colors,
    }).then((dataUrl) => {
      if (active) {
        setSrc(dataUrl);
      }
    });

    return () => {
      active = false;
    };
  }, [downloadUrl, resolved]);

  return (
    <div className={styles.qrCard} aria-label={label}>
      <div className={styles.qrFrame}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URL from qrcode
          <img alt="" className={styles.qrImage} height={240} src={src} width={240} />
        ) : (
          <span className={styles.qrPlaceholder} aria-hidden="true" />
        )}
        <span className={styles.qrLogo} aria-hidden="true">
          <Image
            src="/brand/kaila-bull-app-icon-v2.png"
            alt=""
            width={1254}
            height={1254}
          />
        </span>
      </div>
      <p className={styles.qrLabel}>{label}</p>
      <p className={styles.qrBrand}>KAILA</p>
    </div>
  );
}
