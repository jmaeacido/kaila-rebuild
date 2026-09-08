import type { ReactNode } from "react";
import styles from "./admin-page.module.css";

export function AdminPage({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <main className={`${styles.page} ${className}`.trim()}>{children}</main>;
}

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <section className={styles.header}>
      <div className={styles.intro}>
        <p>{eyebrow}</p>
        <h1>{title}</h1>
        {description ? <span>{description}</span> : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </section>
  );
}

export function AdminStats({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <section aria-label={label} className={styles.stats}>
      {children}
    </section>
  );
}

export function AdminStat({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  return (
    <article className={styles.stat} data-tone={tone}>
      <span aria-hidden="true">{icon}</span>
      <div>
        <strong>{value}</strong>
        <p>{label}</p>
      </div>
    </article>
  );
}

export function AdminEmpty({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className={styles.empty}>
      <span aria-hidden="true">{icon}</span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function AdminSkeletons({ count = 3, label = "Loading" }: { count?: number; label?: string }) {
  return (
    <div aria-label={label} className={styles.skeletons} role="status">
      {Array.from({ length: count }, (_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}

export function AdminWorkspace({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`${styles.workspace} ${className}`.trim()}>{children}</section>;
}

export function AdminSplit({ children }: { children: ReactNode }) {
  return <div className={styles.split}>{children}</div>;
}
