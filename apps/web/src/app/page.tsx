import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <section aria-labelledby="foundation-title" className={styles.card}>
        <p className={styles.eyebrow}>KAILA</p>
        <h1 id="foundation-title" className={styles.title}>
          Platform foundation
        </h1>
        <p className={styles.copy}>
          The secure consumer marketplace foundation is being built.
        </p>
      </section>
    </main>
  );
}
