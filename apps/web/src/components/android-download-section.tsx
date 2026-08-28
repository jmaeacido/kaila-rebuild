import Image from "next/image";
import {
  Download,
  LogIn,
  ScanLine,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import {
  ANDROID_APK_DOWNLOAD_URL,
  ANDROID_APK_PATH,
  ANDROID_DOWNLOAD,
} from "../app/android-download";
import { BrandWordmark } from "./brand-mark";
import { AndroidDownloadQr } from "./android-download-qr";
import styles from "./android-download-section.module.css";

const installSteps = [
  {
    icon: ScanLine,
    title: "Scan or tap download",
    description: "Open this page on your phone or scan the QR code to get the APK.",
  },
  {
    icon: ShieldCheck,
    title: "Allow the install",
    description:
      "If Android asks, allow installs from your browser when prompted.",
  },
  {
    icon: LogIn,
    title: "Open KAILA",
    description: "Sign in, post a job, or build your provider profile from the same app.",
  },
] as const;

type AndroidDownloadSectionProps = {
  id?: string;
  showIntro?: boolean;
};

export function AndroidDownloadSection({
  id = "download",
  showIntro = true,
}: AndroidDownloadSectionProps) {
  return (
    <section
      className={styles.section}
      id={id}
      aria-labelledby={`${id}-title`}
    >
      <div className={styles.inner}>
        <div className={styles.hero}>
          <div className={styles.intro}>
            {showIntro && <p className={styles.kicker}>ANDROID APP</p>}
            <p className={styles.badge}>
              <Smartphone aria-hidden="true" />
              Currently available for Android
            </p>
          </div>
          <h2 className={styles.title} id={`${id}-title`}>
            Get <BrandWordmark className={styles.titleBrand} /> on your{" "}
            <em>Android</em> phone
          </h2>
          <p className={styles.lead}>
            Install the KAILA app to post jobs, chat with providers, follow work
            in real time, and get notified when something needs your attention.
          </p>
        </div>

        <div className={styles.downloadPanel}>
          <div className={styles.meta}>
            <span>Version {ANDROID_DOWNLOAD.versionName}</span>
            <span>{ANDROID_DOWNLOAD.minAndroid}</span>
          </div>
          <a
            className={styles.downloadButton}
            href={ANDROID_APK_PATH}
            download={ANDROID_DOWNLOAD.fileName}
          >
            <Download aria-hidden="true" />
            Download APK
          </a>
          <p className={styles.directLink}>
            Direct link:{" "}
            <a href={ANDROID_APK_DOWNLOAD_URL}>{ANDROID_APK_DOWNLOAD_URL}</a>
          </p>
        </div>

        <div className={styles.visual}>
          <div className={styles.phoneCard} aria-hidden="true">
            <div className={styles.phoneTop} />
            <div className={styles.phoneScreen}>
              <Image
                className={styles.appIcon}
                src="/brand/kaila-bull-app-icon-v2.png"
                alt=""
                width={1254}
                height={1254}
                priority={false}
              />
              <BrandWordmark className={styles.phoneWordmark} />
              <span>Nearby help, made simple.</span>
            </div>
          </div>
          <AndroidDownloadQr label="Scan to open the download page" />
        </div>

        <ol className={styles.steps}>
          {installSteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.title}>
                <span className={styles.stepNumber} aria-hidden="true">
                  {index + 1}
                </span>
                <span className={styles.stepIcon}>
                  <Icon aria-hidden="true" />
                </span>
                <div className={styles.stepCopy}>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
