import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const root = path.resolve(import.meta.dirname, "../..");
const requireFromWeb = createRequire(path.join(root, "apps/web/package.json"));
const QRCode = requireFromWeb("qrcode");
const campaignTarget = process.argv[2]?.trim() || "Gingoog";
const isGeneric = campaignTarget.toLowerCase() === "generic";
const cityName = isGeneric ? "" : campaignTarget;
const citySlug = isGeneric
  ? "generic"
  : cityName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const eyebrowText = isGeneric ? "Calling all service providers" : `Calling ${cityName} service providers`;
const headlineLead = isGeneric ? "KAILA ANG" : "KAILA KA SA";
const headlineAccent = isGeneric ? "SKILLS MO!" : `${cityName.toUpperCase()}!`;
const supportingCopy = isGeneric
  ? "Connect with local clients and build your professional presence with KAILA."
  : "Turn what you do best into local opportunities with KAILA.";
const generatedArt = citySlug === "butuan"
  ? path.join(root, "output/marketing/assets/butuan-landmarks-v1.png")
  : "C:/Users/jacid/.codex/generated_images/01a04b2f-1390-7001-963a-0b0c06974541/exec-c8e705e8-1aae-4674-89c4-d65a9e63a6ae.png";
const logoPath = path.join(root, "apps/web/public/brand/kaila-wordmark-on-dark.png");
const appIconPath = path.join(root, "apps/web/public/brand/kaila-bull-app-icon-v2.png");
const outputDir = path.join(root, "output/marketing");
const outputVersion = citySlug === "butuan" ? "v4" : citySlug === "generic" ? "v1" : "v3";
const outputFilename = isGeneric
  ? `kaila-provider-recruitment-generic-${outputVersion}.png`
  : `kaila-${citySlug}-provider-recruitment-${outputVersion}.png`;
const outputPath = path.join(outputDir, outputFilename);
const registrationUrl = "https://kaila-app.com/register?role=provider&next=%2Fprovider-profile";
const androidDownloadUrl = "https://kaila-app.com/download";

const asDataUrl = async (file, mime) =>
  `data:${mime};base64,${(await fs.readFile(file)).toString("base64")}`;

await fs.mkdir(outputDir, { recursive: true });

const qrOptions = {
  errorCorrectionLevel: "H",
  margin: 2,
  width: 300,
  color: { dark: "#0F4BCE", light: "#FFFFFF" },
};

const [artUrl, logoUrl, appIconUrl, registrationQrUrl, downloadQrUrl] = await Promise.all([
  asDataUrl(generatedArt, "image/png"),
  asDataUrl(logoPath, "image/png"),
  asDataUrl(appIconPath, "image/png"),
  QRCode.toDataURL(registrationUrl, qrOptions),
  QRCode.toDataURL(androidDownloadUrl, qrOptions),
]);

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{margin:0;width:1080px;height:1350px;overflow:hidden;font-family:Inter,"Segoe UI",Arial,sans-serif;background:#0b49e8;color:#0a1220}
.poster{position:relative;width:1080px;height:1350px;overflow:hidden;background:#f7f9fc}
.hero{position:absolute;inset:0 0 auto;height:565px;overflow:hidden;background:linear-gradient(135deg,#0b3fda 0%,#1463ff 54%,#27b7ff 100%)}
.hero:after{content:"";position:absolute;left:-7%;right:-7%;bottom:-120px;height:220px;border-radius:50%;background:#f7f9fc}
.route{position:absolute;left:-60px;top:65px;width:1180px;height:420px;opacity:.22}
.logo{position:absolute;left:62px;top:46px;width:230px;height:auto;z-index:3}
.mascot-wrap{position:absolute;right:42px;top:35px;width:300px;height:300px;z-index:2;transform:rotate(3deg);border:9px solid rgba(255,255,255,.92);border-radius:54px;box-shadow:0 24px 54px rgba(0,28,106,.35);overflow:hidden;background:#1463ff}
.mascot{width:100%;height:100%;object-fit:cover}.spark{position:absolute;background:white;border-radius:999px;z-index:3}.spark.a{width:16px;height:72px;right:370px;top:78px;transform:rotate(38deg);opacity:.75}.spark.b{width:14px;height:52px;right:49px;top:346px;transform:rotate(55deg);opacity:.6}
.copy{position:absolute;left:62px;top:142px;width:690px;color:white;z-index:3}.eyebrow{display:inline-flex;align-items:center;gap:10px;padding:11px 17px;border:1px solid rgba(255,255,255,.38);border-radius:999px;background:rgba(10,18,32,.2);font-size:19px;line-height:1;font-weight:800;letter-spacing:.8px;text-transform:uppercase}.pin{width:13px;height:13px;border-radius:50% 50% 50% 0;background:#65d5ff;transform:rotate(-45deg);display:inline-block}
h1{margin:22px 0 10px;width:690px;font-size:76px;line-height:.92;letter-spacing:-3.8px;font-weight:850;text-shadow:0 5px 18px rgba(0,32,118,.25)}h1 span{color:#73dcff}.sub{margin:0;width:650px;font-size:26px;line-height:1.28;font-weight:650;color:#eff9ff}
.visual{position:absolute;left:0;right:0;top:475px;height:500px;overflow:hidden}.art{width:100%;height:100%;object-fit:cover;object-position:center 66%;filter:saturate(1.08)}.visual:before{content:"";position:absolute;inset:0;z-index:1;background:linear-gradient(180deg,#f7f9fc 0%,rgba(247,249,252,0) 22%,rgba(10,55,176,.04) 80%,#eaf3ff 100%)}
.benefits{position:absolute;left:58px;top:548px;z-index:4;display:flex;gap:12px;flex-wrap:wrap}.benefit{display:flex;align-items:center;gap:8px;padding:12px 17px;background:rgba(255,255,255,.96);border:2px solid #d9e8ff;border-radius:999px;color:#173462;font-size:18px;font-weight:800;box-shadow:0 8px 22px rgba(10,44,120,.13)}.check{display:inline-grid;place-items:center;width:23px;height:23px;border-radius:50%;background:#16a36a;color:#fff;font-size:15px}
.action-band{position:absolute;left:58px;right:58px;top:825px;height:118px;z-index:5;padding:20px 28px;border-radius:28px;background:linear-gradient(105deg,#0a1220 0%,#123c82 63%,#1463ff 100%);box-shadow:0 18px 44px rgba(10,18,32,.25);color:#fff;display:flex;align-items:center;justify-content:space-between;gap:25px}.action-band strong{font-size:32px;line-height:1.03;letter-spacing:-.6px}.action-band p{margin:0;max-width:520px;font-size:20px;line-height:1.24;font-weight:650}.android-badge{display:inline-flex;margin-bottom:7px;padding:7px 12px;border-radius:999px;background:#27b7ff;color:#071a38;font-size:15px;font-weight:850;letter-spacing:.55px}
.qr-zone{position:absolute;left:0;right:0;bottom:0;height:445px;padding:90px 58px 34px;background:linear-gradient(180deg,#eaf3ff,#dcecff)}.qr-zone:before{content:"";position:absolute;left:0;right:0;top:55px;border-top:5px dashed rgba(20,99,255,.18)}.route-dot{position:absolute;top:45px;width:23px;height:23px;border:6px solid #fff;border-radius:50%;background:#1463ff;box-shadow:0 3px 12px rgba(20,99,255,.3)}.route-dot.one{left:26%}.route-dot.two{right:26%;background:#27b7ff}
.qr-row{position:relative;height:320px;display:flex;gap:24px}.qr{position:relative;flex:1;padding:17px 22px;border-radius:30px;background:#fff;box-shadow:0 18px 42px rgba(12,45,100,.16);text-align:center;border:2px solid rgba(20,99,255,.13)}.qr:first-child{transform:rotate(-.7deg)}.qr:last-child{transform:rotate(.7deg)}
.qr-tag{position:absolute;left:18px;top:18px;padding:7px 11px;border-radius:999px;background:#e8f1ff;color:#0f4bce;font-size:13px;font-weight:850;letter-spacing:.4px}.qr-code{position:relative;width:212px;height:212px;margin:-4px auto 2px}.qr-code>img:first-child{display:block;width:212px;height:212px}.qr-mark{position:absolute;left:50%;top:50%;width:50px;height:50px;transform:translate(-50%,-50%);padding:5px;border-radius:14px;background:#fff;box-shadow:0 0 0 4px #fff}.qr strong{display:block;color:#1463ff;font-size:22px;line-height:1.05}.qr small{display:block;margin-top:5px;color:#344054;font-size:14px;font-weight:750}
</style></head><body><main class="poster">
<header class="hero"><svg class="route" viewBox="0 0 1180 420" fill="none"><path d="M0 310 C220 40 400 390 620 145 S970 250 1180 40" stroke="white" stroke-width="6" stroke-linecap="round" stroke-dasharray="14 20"/><circle cx="175" cy="165" r="12" fill="white"/><circle cx="620" cy="145" r="12" fill="white"/></svg><span class="spark a"></span><span class="spark b"></span></header>
<img class="logo" src="${logoUrl}" alt="KAILA"><div class="mascot-wrap"><img class="mascot" src="${appIconUrl}" alt="KAILA bull mascot"></div>
<section class="copy"><div class="eyebrow"><i class="pin"></i> ${eyebrowText}</div><h1>${headlineLead}<br><span>${headlineAccent}</span></h1><p class="sub">${supportingCopy}</p></section>
<div class="visual"><img class="art" src="${artUrl}" alt="Vector illustration of local service tools"></div>
<div class="benefits"><span class="benefit"><i class="check">✓</i> Get discovered nearby</span><span class="benefit"><i class="check">✓</i> Showcase your work</span><span class="benefit"><i class="check">✓</i> Build your reputation</span></div>
<section class="action-band"><strong>JOIN AS A<br>SERVICE PROVIDER</strong><p><span class="android-badge">ANDROID APP AVAILABLE NOW</span><br>Register online or download the KAILA app today.</p></section>
<section class="qr-zone"><i class="route-dot one"></i><i class="route-dot two"></i><div class="qr-row">
  <article class="qr"><span class="qr-tag">START HERE</span><div class="qr-code"><img src="${registrationQrUrl}" alt="Provider registration QR code"><img class="qr-mark" src="${appIconUrl}" alt=""></div><strong>REGISTER NOW</strong><small>kaila-app.com/register</small></article>
  <article class="qr"><span class="qr-tag">ANDROID</span><div class="qr-code"><img src="${downloadQrUrl}" alt="Android download QR code"><img class="qr-mark" src="${appIconUrl}" alt=""></div><strong>DOWNLOAD THE APP</strong><small>kaila-app.com/download</small></article>
</div></section>
</main></body></html>`;

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});

try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: outputPath, type: "png" });
} finally {
  await browser.close();
}

console.log(outputPath);
