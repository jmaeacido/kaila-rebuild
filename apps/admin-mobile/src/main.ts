import "./styles.css";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("KAILA Admin mobile root element was not found.");
}

app.innerHTML = `
  <main class="recovery-shell">
    <section class="recovery-card" aria-labelledby="recovery-title">
      <img class="brand-mark" src="/brand/kaila-bull-app-icon-v2.png" alt="KAILA" />
      <p class="eyebrow">KAILA Admin</p>
      <h1 id="recovery-title">Can’t reach admin tools</h1>
      <p class="supporting-copy">
        Check your internet connection, then try loading the secure admin site again.
      </p>
      <p class="connection-status" role="status">
        <span class="connection-status__dot" aria-hidden="true"></span>
        Connection unavailable
      </p>
      <button class="primary-action" type="button">Try again</button>
    </section>
  </main>
`;

app.querySelector<HTMLButtonElement>(".primary-action")?.addEventListener("click", () => {
  window.location.reload();
});
