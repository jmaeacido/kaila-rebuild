import "./styles.css";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("KAILA mobile root element was not found.");
}

app.innerHTML = `
  <main class="recovery-shell">
    <div class="route-accent" aria-hidden="true">
      <span class="route-accent__start"></span>
      <span class="route-accent__line"></span>
      <span class="route-accent__destination"></span>
    </div>

    <section class="recovery-card" aria-labelledby="recovery-title">
      <img class="brand-mark" src="/brand/kaila-bull-app-icon-v2.png" alt="KAILA" />
      <p class="eyebrow">Nearby help, when you need it</p>
      <h1 id="recovery-title">Let’s get you connected</h1>
      <p class="supporting-copy">
        KAILA could not reach the marketplace. Check your connection, then try again.
      </p>
      <p class="connection-status" role="status">
        <span class="connection-status__dot" aria-hidden="true"></span>
        Waiting for a connection
      </p>
      <button class="primary-action" type="button">Try again</button>
    </section>

    <p class="recovery-note">Your account and activity are safe.</p>
  </main>
`;

app.querySelector<HTMLButtonElement>(".primary-action")?.addEventListener("click", () => {
  window.location.reload();
});
