"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import styles from "./kaila-branded-qr.module.css";

type KailaBrandedQrProps = {
  value: string;
  label: string;
  size?: number;
};

const KAILA_BLUE = "#1463FF";

export function KailaBrandedQr({ value, label, size = 220 }: KailaBrandedQrProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(value, {
      width: size * 2,
      margin: 2,
      errorCorrectionLevel: "H",
      color: { dark: KAILA_BLUE, light: "#FFFFFF" },
    }).then((dataUrl) => {
      if (active) setSrc(dataUrl);
    });
    return () => {
      active = false;
    };
  }, [value, size]);

  return (
    <figure className={styles.card} aria-label={label}>
      <div className={styles.frame} style={{ width: size, height: size }}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URL from qrcode
          <img alt="" className={styles.image} height={size} src={src} width={size} />
        ) : (
          <span className={styles.placeholder} aria-hidden="true" />
        )}
        <span className={styles.logo} aria-hidden="true">
          <Image
            src="/brand/kaila-bull-app-icon-v2.png"
            alt=""
            width={96}
            height={96}
            priority
          />
        </span>
      </div>
      <figcaption className={styles.caption}>
        <Image
          className={styles.wordmark}
          src="/brand/kaila-wordmark.png"
          alt="KAILA"
          width={160}
          height={32}
        />
        <span>{label}</span>
      </figcaption>
    </figure>
  );
}
