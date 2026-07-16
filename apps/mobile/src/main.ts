import "./styles.css";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <section class="shell">
    <div class="mark" aria-hidden="true">K</div>
    <h1>KAILA</h1>
    <p>This build is ready to connect to KAILA.</p>
    <button type="button" onclick="location.reload()">Try again</button>
  </section>
`;
