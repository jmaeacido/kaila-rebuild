import styles from "./operations-header.module.css";

export function OperationsHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: React.ReactNode }) {
  return <section className={styles.pageHeader}><div className={styles.intro}><p>{eyebrow}</p><h1>{title}</h1><span>{description}</span></div>{actions && <div className={styles.actions}>{actions}</div>}</section>;
}
