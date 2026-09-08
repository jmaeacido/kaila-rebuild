/**
 * Generate a KAILA-branded provider registration QR.
 * Pattern matches apps/web AndroidDownloadQr + marketing registration QR kit.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const root = path.resolve(import.meta.dirname, "../..");
const outDir = path.join(
  root,
  "output/marketing/gadget-repair-recruitment",
);
const require = createRequire(path.join(root, "apps/web/package.json"));
const QRCode = require("qrcode");

const REGISTER_URL =
  "https://kaila-app.com/register?role=provider&next=%2Fprovider-profile";

const options = {
  width: 800,
  margin: 3,
  errorCorrectionLevel: "H",
  color: { dark: "#1463FF", light: "#FFFFFF" },
};

await fs.mkdir(outDir, { recursive: true });

const qrDataUrl = await QRCode.toDataURL(REGISTER_URL, options);
const appIcon = `data:image/png;base64,${await fs.readFile(
  path.join(root, "apps/web/public/brand/kaila-bull-app-icon-v2.png"),
  "base64",
)}`;
const wordmark = `data:image/png;base64,${await fs.readFile(
  path.join(root, "apps/web/public/brand/kaila-wordmark.png"),
  "base64",
)}`;

const html = `<!doctype html>
<html lang="en">
<meta charset="utf-8" />
<title>KAILA provider registration QR</title>
<style>
  :root {
    --primary: #1463ff;
    --cyan: #27b7ff;
    --ink: #0a1220;
    --secondary: #667085;
    --surface: #ffffff;
    --background: #f3f7ff;
    --radius: 36px;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: Inter, system-ui, sans-serif;
    background: var(--background);
    color: var(--ink);
  }
  .stage {
    width: 900px;
    padding: 48px;
    display: flex;
    flex-direction: column;
    gap: 32px;
    align-items: center;
  }
  .card {
    width: 804px;
    background: var(--surface);
    border-radius: var(--radius);
    box-shadow: 0 0 0 6px rgba(39, 183, 255, 0.18);
    padding: 48px 48px 40px;
    text-align: center;
  }
  .wordmark {
    height: 48px;
    width: auto;
    display: block;
    margin: 0 auto 28px;
  }
  .qr-wrap {
    position: relative;
    width: 640px;
    height: 640px;
    margin: 0 auto;
  }
  .qr {
    display: block;
    width: 640px;
    height: 640px;
  }
  .qr-mark {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 118px;
    height: 118px;
    padding: 10px;
    background: var(--surface);
    border-radius: 24px;
    box-shadow: 0 0 0 4px #ffffff;
  }
  .qr-mark img {
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 16px;
  }
  h1 {
    margin: 28px 0 8px;
    font-size: 42px;
    line-height: 1.1;
    font-weight: 800;
    letter-spacing: 0.02em;
    color: var(--primary);
  }
  .url {
    margin: 0;
    font-size: 22px;
    font-weight: 600;
    color: var(--ink);
    word-break: break-all;
  }
  .hint {
    margin: 10px 0 0;
    font-size: 18px;
    color: var(--secondary);
  }
  .qr-only {
    width: 720px;
    height: 720px;
    background: var(--surface);
    border-radius: 28px;
    display: grid;
    place-items: center;
  }
  .qr-only .qr-wrap {
    width: 640px;
    height: 640px;
  }
</style>
<body>
  <div class="stage">
    <section class="card" id="card">
      <img class="wordmark" src="${wordmark}" alt="KAILA" />
      <div class="qr-wrap" id="qr-branded">
        <img class="qr" src="${qrDataUrl}" alt="KAILA provider registration QR" />
        <div class="qr-mark"><img src="${appIcon}" alt="KAILA Bull" /></div>
      </div>
      <h1>REGISTER NOW</h1>
      <p class="url">kaila-app.com/register?role=provider</p>
      <p class="hint">I-scan aron magrehistro isip Service Provider</p>
    </section>
    <section class="qr-only" id="qr-square">
      <div class="qr-wrap">
        <img class="qr" src="${qrDataUrl}" alt="KAILA provider registration QR" />
        <div class="qr-mark"><img src="${appIcon}" alt="KAILA Bull" /></div>
      </div>
    </section>
  </div>
</body>
</html>`;

const htmlPath = path.join(outDir, "provider-registration-qr.html");
await fs.writeFile(htmlPath, html);

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});

const cardPath = path.join(outDir, "kaila-provider-registration-qr-card-v1.png");
const squarePath = path.join(outDir, "kaila-provider-registration-qr-v1.png");
const plainPath = path.join(outDir, "kaila-provider-registration-qr-modules-v1.png");

try {
  const page = await browser.newPage({
    viewport: { width: 996, height: 1600 },
    deviceScaleFactor: 2,
  });
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.locator("#card").screenshot({ path: cardPath });
  await page.locator("#qr-square").screenshot({ path: squarePath });
  await QRCode.toFile(plainPath, REGISTER_URL, options);
} finally {
  await browser.close();
}

console.log("url", REGISTER_URL);
console.log("card", cardPath);
console.log("square", squarePath);
console.log("modules", plainPath);
