import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const root = path.resolve(import.meta.dirname, "../..");
const requireFromWeb = createRequire(path.join(root, "apps/web/package.json"));
const QRCode = requireFromWeb("qrcode");
const outputDir = path.join(root, "output/marketing/facebook");
const outputPath = path.join(outputDir, "kaila-nearby-help-facebook-post-v1.png");
const illustrationPath = path.join(outputDir, "assets/kaila-nearby-help-illustration-v1.png");
const logoPath = path.join(root, "apps/web/public/brand/kaila-wordmark-on-dark.png");
const mascotPath = path.join(root, "apps/web/public/brand/kaila-bull-app-icon-v2.png");
const postJobUrl = "https://kaila-app.com/post-job";

const asDataUrl = async (file) =>
  `data:image/png;base64,${(await fs.readFile(file)).toString("base64")}`;

await fs.mkdir(outputDir, { recursive: true });
const [illustrationUrl, logoUrl, mascotUrl, qrUrl] = await Promise.all([
  asDataUrl(illustrationPath),
  asDataUrl(logoPath),
  asDataUrl(mascotPath),
  QRCode.toDataURL(postJobUrl, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 320,
    color: { dark: "#0F4BCE", light: "#FFFFFF" },
  }),
]);

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{margin:0;width:1080px;height:1350px;overflow:hidden;font-family:Inter,"Segoe UI",Arial,sans-serif;background:#f7f9fc;color:#0a1220}
.poster{position:relative;width:1080px;height:1350px;overflow:hidden;background:#f7f9fc}
.hero{position:absolute;inset:0 0 auto;height:570px;padding:50px 62px;color:#fff;background:linear-gradient(135deg,#0f4bff 0%,#1463ff 54%,#3cc8ff 100%);overflow:hidden}
.route{position:absolute;inset:0;width:100%;height:100%;opacity:.2}.logo{position:relative;width:228px;z-index:2}.eyebrow{position:relative;display:inline-block;margin-top:43px;padding:10px 17px;border:1px solid rgba(255,255,255,.45);border-radius:999px;background:rgba(10,18,32,.18);font-size:18px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;z-index:2}
h1{position:relative;margin:20px 0 12px;width:790px;font-size:77px;line-height:.94;letter-spacing:-3.7px;z-index:2}h1 span{color:#89e0ff}.lead{position:relative;margin:0;width:690px;font-size:26px;line-height:1.28;font-weight:600;color:#eefaff;z-index:2}
.mascot{position:absolute;right:48px;top:44px;width:204px;height:204px;border:8px solid rgba(255,255,255,.92);border-radius:44px;box-shadow:0 20px 48px rgba(10,18,32,.25);transform:rotate(3deg);z-index:3}
.visual{position:absolute;left:0;right:0;top:505px;height:610px;overflow:hidden}.visual img{width:100%;height:100%;object-fit:cover;object-position:center 61%}.visual:before{content:"";position:absolute;inset:0;z-index:1;background:linear-gradient(180deg,#f7f9fc 0%,rgba(247,249,252,0) 16%,rgba(247,249,252,0) 72%,#eaf3ff 100%)}
.trust{position:absolute;left:58px;right:58px;top:545px;display:flex;gap:12px;z-index:4}.pill{padding:12px 18px;border:2px solid #d9e8ff;border-radius:999px;background:rgba(255,255,255,.96);box-shadow:0 8px 22px rgba(10,44,120,.12);color:#173462;font-size:18px;font-weight:800}.pill i{display:inline-grid;place-items:center;width:23px;height:23px;margin-right:7px;border-radius:50%;background:#16a36a;color:white;font-style:normal;font-size:15px}
.cta{position:absolute;left:56px;right:56px;bottom:48px;height:252px;padding:29px 31px;border-radius:30px;background:linear-gradient(110deg,#0a1220 0%,#123c82 58%,#1463ff 100%);box-shadow:0 20px 48px rgba(10,18,32,.24);color:#fff;display:flex;align-items:center;gap:28px;z-index:5}.cta-copy{flex:1}.cta-badge{display:inline-block;padding:7px 12px;border-radius:999px;background:#27b7ff;color:#071a38;font-size:14px;font-weight:900;letter-spacing:.6px}.cta h2{margin:12px 0 7px;font-size:38px;line-height:1;letter-spacing:-.9px}.cta p{margin:0;font-size:20px;line-height:1.3;color:#eaf5ff;font-weight:600}.qr-card{width:190px;height:196px;padding:12px;border-radius:22px;background:#fff;text-align:center}.qr-wrap{position:relative;width:146px;height:146px;margin:0 auto}.qr-wrap>img:first-child{width:146px;height:146px}.qr-mark{position:absolute;left:50%;top:50%;width:38px;height:38px;transform:translate(-50%,-50%);padding:4px;border-radius:10px;background:#fff;box-shadow:0 0 0 4px #fff}.qr-card strong{display:block;margin-top:2px;color:#1463ff;font-size:15px;line-height:1}
</style></head><body><main class="poster">
<header class="hero"><svg class="route" viewBox="0 0 1080 570" fill="none"><path d="M-40 450 C150 270 320 500 505 300 S820 390 1120 125" stroke="white" stroke-width="6" stroke-linecap="round" stroke-dasharray="14 20"/><circle cx="505" cy="300" r="11" fill="white"/></svg><img class="logo" src="${logoUrl}" alt="KAILA"><span class="eyebrow">LOCAL HELP, MADE SIMPLE</span><h1>MAY KAILANGAN<br><span>IPAAYOS?</span></h1><p class="lead">Find skilled service providers near you—without the endless searching.</p><img class="mascot" src="${mascotUrl}" alt="KAILA mascot"></header>
<section class="visual"><img src="${illustrationUrl}" alt="Local service providers helping a homeowner"></section>
<div class="trust"><span class="pill"><i>✓</i> Nearby providers</span><span class="pill"><i>✓</i> Compare offers</span><span class="pill"><i>✓</i> Hire with confidence</span></div>
<section class="cta"><div class="cta-copy"><span class="cta-badge">GET STARTED IN MINUTES</span><h2>POST YOUR JOB ON KAILA</h2><p>Describe what you need, receive offers, and choose the provider that works for you.</p></div><div class="qr-card"><div class="qr-wrap"><img src="${qrUrl}" alt="Post a job QR code"><img class="qr-mark" src="${mascotUrl}" alt=""></div><strong>SCAN TO POST</strong></div></section>
</main></body></html>`;

const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: outputPath, type: "png" });
} finally {
  await browser.close();
}

console.log(outputPath);
