import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const root = path.resolve(import.meta.dirname, "../..");
const out = path.join(root, "output/marketing/cebuano-reel");
const require = createRequire(path.join(root, "apps/web/package.json"));
const QRCode = require("qrcode");
await fs.mkdir(out, { recursive: true });
const links = [
  { url: "https://kaila-app.com/post-job", title: "POST OG TRABAHO", subtitle: "Naay kinahanglan ipatrabaho?", file: "post-job-qr.png" },
  { url: "https://kaila-app.com/download", title: "DOWNLOAD SA ANDROID", subtitle: "Gamita ang KAILA app.", file: "android-qr.png" },
];
for (const item of links) {
  const options = { width: 600, margin: 4, errorCorrectionLevel: "H", color: { dark: "#1463FF", light: "#FFFFFF" } };
  await QRCode.toFile(path.join(out, item.file), item.url, options);
  item.qr = await QRCode.toDataURL(item.url, options);
}
const logo = `data:image/png;base64,${await fs.readFile(path.join(root, "apps/web/public/brand/kaila-wordmark-on-dark.png"), "base64")}`;
const appIcon = `data:image/png;base64,${await fs.readFile(path.join(root, "apps/web/public/brand/kaila-bull-app-icon-v2.png"), "base64")}`;
const html = `<!doctype html><html lang="ceb"><meta charset="utf-8"><title>KAILA links and QR codes</title><style>
:root{--primary:#1463ff;--cyan:#27b7ff;--ink:#0a1220;--secondary:#667085;--surface:#fff;--background:#f7f9fc;--radius:32px;--space:48px}*{box-sizing:border-box}body{margin:0;width:1200px;height:1080px;font-family:Inter,system-ui,sans-serif;background:var(--background);color:var(--ink)}header{height:336px;padding:64px var(--space);background:linear-gradient(120deg,var(--primary),var(--cyan));color:var(--surface)}header img{width:240px;display:block;margin-bottom:40px}h1{font-size:52px;line-height:1.1;margin:0;font-weight:700}main{padding:var(--space);display:flex;gap:32px}.card{background:var(--surface);border-radius:var(--radius);padding:32px 24px;width:536px;text-align:center}h2{font-size:28px;margin:0 0 12px;font-weight:700;color:var(--primary)}p{font-size:24px;margin:0;color:var(--secondary)}.qr-wrap{position:relative;width:408px;height:408px;margin:16px auto 0}.qr{display:block;width:408px;height:408px}.qr-mark{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:80px;height:80px;padding:8px;background:var(--surface);border-radius:16px}.qr-mark img{display:block;width:100%;height:100%}.url{font-size:26px;font-weight:600;color:var(--ink)}footer{text-align:center;font-size:24px;color:var(--secondary)}
</style><header><img src="${logo}" alt="KAILA"><h1>Nindot kung naa kay Kaila.</h1></header><main>${links.map(item => `<section class="card"><h2>${item.title}</h2><p>${item.subtitle}</p><div class="qr-wrap"><img class="qr" src="${item.qr}" alt="QR code: ${item.url}"><div class="qr-mark"><img src="${appIcon}" alt="KAILA"></div></div><p class="url">${item.url.replace("https://", "")}</p></section>`).join("")}</main><footer>I-scan ang QR code o i-tap ang link sa comment.</footer></html>`;
await fs.writeFile(path.join(out, "comment-qr.html"), html);
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 1080 } });
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(out, "kaila-comment-qr.png") });
  await page.screenshot({ path: path.join(out, "kaila-comment-qr-branded.png") });
  for (let i = 0; i < links.length; i++) {
    await page.locator(".qr-wrap").nth(i).screenshot({ path: path.join(out, links[i].file) });
  }
} finally { await browser.close(); }
await fs.writeFile(path.join(out, "reel-comment.txt"), "Naay kinahanglan ipatrabaho? Ilaila ang KAILA! 🤝\n\n🔧 Post og trabaho:\nhttps://kaila-app.com/post-job\n\n📱 Download sa Android:\nhttps://kaila-app.com/download\n\nI-tap ang link o i-scan ang QR code sa hulagway.\n\n#KAILA #SerbisyoDuolNimo #SupportLocal\n");
console.log(path.join(out, "kaila-comment-qr.png"));
