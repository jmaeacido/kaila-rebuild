"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import styles from "./android-download-qr.module.css";

type AndroidDownloadQrProps = {
  url: string;
  label: string;
};

export function AndroidDownloadQr({ url, label }: AndroidDownloadQrProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void QRCode.toDataURL(url, {
      width: 220,
      margin: 1,
      color: {
        dark: "#0b1f44",
        light: "#ffffff",
      },
    }).then((dataUrl) => {
      if (active) {
        setSrc(dataUrl);
      }
    });

    return () => {
      active = false;
    };
  }, [url]);

  return (
    <div className={styles.qrCard} aria-label={label}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- data URL from qrcode
        <img alt="" className={styles.qrImage} height={220} src={src} width={220} />
      ) : (
        <span className={styles.qrPlaceholder} aria-hidden="true" />
      )}
      <p>{label}</p>
    </div>
  );
}
