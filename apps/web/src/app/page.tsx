import styles from "./page.module.css";
import { Button, Card, Feedback, TextField } from "@kaila/ui";

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
        <Card title="Accessible component foundation">
          <TextField id="service" label="What service do you need?" hint="Describe the task in a few words." />
          <Button type="button">Continue</Button>
        </Card>
        <Feedback title="Foundation ready">Loading, empty, success, and error states share accessible semantics.</Feedback>
      </section>
    </main>
  );
}
