import styles from "./page.module.css";

export default function AdminHome() {
  return (
    <main className={styles.page}>
      <section
        aria-labelledby="admin-foundation-title"
        className={styles.card}
      >
        <p className={styles.eyebrow}>KAILA ADMINISTRATION</p>
        <h1 id="admin-foundation-title" className={styles.title}>
          Separate administration boundary
        </h1>
        <p className={styles.copy}>
          Administrative capabilities remain isolated from the consumer product.
        </p>
      </section>
    </main>
  );
}
