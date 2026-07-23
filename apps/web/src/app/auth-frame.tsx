import Image from "next/image";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import styles from "./auth.module.css";

export function AuthFrame({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className={styles.page}>
      <aside className={styles.brandPanel}>
        <div>
          <Image
            src="/brand/kaila-wordmark.png"
            alt="KAILA"
            width={1102}
            height={248}
            priority
          />
          <h2>Local work starts with trust.</h2>
          <p>
            One secure account for clients finding help and providers growing
            their local reputation.
          </p>
          <div className={styles.benefits}>
            <span><CheckCircle2 aria-hidden="true" />Post and manage jobs</span>
            <span><CheckCircle2 aria-hidden="true" />Compare offers clearly</span>
            <span><CheckCircle2 aria-hidden="true" />Keep messages in one place</span>
          </div>
        </div>
      </aside>
      <section className={styles.formSide}>
        <div className={styles.card}>
          <header className={styles.cardHeader}>
            <Link href="/" aria-label="Back to KAILA home" prefetch={false}>
              <Image
                src="/brand/kaila-wordmark.png"
                alt="KAILA"
                width={1102}
                height={248}
                priority
              />
            </Link>
            <h1>{title}</h1>
            <p>{description}</p>
          </header>
          {children}
        </div>
      </section>
    </main>
  );
}
