import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const root = path.resolve(import.meta.dirname, "../..");
const requireFromWeb = createRequire(path.join(root, "apps/web/package.json"));
const QRCode = requireFromWeb("qrcode");
const outDir = path.join(root, "output/marketing/facebook");
const outPath = path.join(outDir, "kaila-provider-opportunity-facebook-post-v1.png");
const artPath = path.join(outDir, "assets/kaila-provider-opportunity-illustration-v1.png");
const logoPath = path.join(root, "apps/web/public/brand/kaila-wordmark-on-dark.png");
const mascotPath = path.join(root, "apps/web/public/brand/kaila-bull-app-icon-v2.png");
const registerUrl = "https://kaila-app.com/register?role=provider&next=%2Fprovider-profile";
const asDataUrl = async (file) => `data:image/png;base64,${(await fs.readFile(file)).toString("base64")}`;

await fs.mkdir(outDir, { recursive: true });
const [art, logo, mascot, qr] = await Promise.all([
  asDataUrl(artPath), asDataUrl(logoPath), asDataUrl(mascotPath),
  QRCode.toDataURL(registerUrl, { errorCorrectionLevel: "H", margin: 2, width: 320, color: { dark: "#0F4BCE", light: "#FFFFFF" } }),
]);

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{margin:0;width:1080px;height:1350px;overflow:hidden;font-family:Inter,"Segoe UI",Arial,sans-serif;background:#f7f9fc;color:#0a1220}.poster{position:relative;width:1080px;height:1350px;overflow:hidden}
.hero{position:absolute;inset:0 0 auto;height:545px;padding:48px 62px;color:#fff;background:linear-gradient(135deg,#0f4bff,#1463ff 55%,#3cc8ff);overflow:hidden}.route{position:absolute;inset:0;width:100%;height:100%;opacity:.2}.logo{position:relative;width:228px;z-index:2}.mascot{position:absolute;right:48px;top:42px;width:202px;height:202px;border:8px solid rgba(255,255,255,.94);border-radius:44px;box-shadow:0 20px 48px rgba(10,18,32,.25);transform:rotate(3deg);z-index:3}.eyebrow{position:relative;display:inline-block;margin-top:40px;padding:10px 17px;border:1px solid rgba(255,255,255,.45);border-radius:999px;background:rgba(10,18,32,.18);font-size:18px;font-weight:800;letter-spacing:.8px;z-index:2}h1{position:relative;margin:19px 0 11px;width:760px;font-size:61px;line-height:.97;letter-spacing:-2.7px;z-index:2}h1 span{color:#8ce2ff}.lead{position:relative;margin:0;width:710px;font-size:25px;line-height:1.27;font-weight:600;color:#eefaff;z-index:2}
.visual{position:absolute;left:0;right:0;top:485px;height:640px;overflow:hidden}.visual img{width:100%;height:100%;object-fit:cover;object-position:center 68%}.visual:before{content:"";position:absolute;inset:0;z-index:1;background:linear-gradient(180deg,#f7f9fc 0%,rgba(247,249,252,0) 17%,rgba(247,249,252,0) 76%,#eaf3ff 100%)}.benefits{position:absolute;left:58px;right:58px;top:538px;display:flex;gap:12px;z-index:4}.benefit{padding:12px 17px;border:2px solid #d9e8ff;border-radius:999px;background:rgba(255,255,255,.97);box-shadow:0 8px 22px rgba(10,44,120,.12);color:#173462;font-size:18px;font-weight:800}.benefit i{display:inline-grid;place-items:center;width:23px;height:23px;margin-right:7px;border-radius:50%;background:#16a36a;color:#fff;font-style:normal;font-size:15px}
.cta{position:absolute;left:56px;right:56px;bottom:48px;height:252px;padding:29px 31px;border-radius:30px;background:linear-gradient(110deg,#0a1220,#123c82 58%,#1463ff);box-shadow:0 20px 48px rgba(10,18,32,.24);color:#fff;display:flex;align-items:center;gap:28px;z-index:5}.copy{flex:1}.badge{display:inline-block;padding:7px 12px;border-radius:999px;background:#27b7ff;color:#071a38;font-size:14px;font-weight:900;letter-spacing:.6px}.cta h2{margin:12px 0 7px;font-size:35px;line-height:1;letter-spacing:-.8px}.cta p{margin:0;font-size:19px;line-height:1.3;color:#eaf5ff;font-weight:600}.qr-card{width:190px;height:196px;padding:12px;border-radius:22px;background:#fff;text-align:center}.qr-wrap{position:relative;width:146px;height:146px;margin:auto}.qr-wrap>img:first-child{width:146px;height:146px}.qr-mark{position:absolute;left:50%;top:50%;width:38px;height:38px;transform:translate(-50%,-50%);padding:4px;border-radius:10px;background:#fff;box-shadow:0 0 0 4px #fff}.qr-card strong{display:block;margin-top:2px;color:#1463ff;font-size:15px;line-height:1}
</style></head><body><main class="poster"><header class="hero"><svg class="route" viewBox="0 0 1080 545" fill="none"><path d="M-40 430 C160 255 340 490 520 290 S835 380 1120 120" stroke="white" stroke-width="6" stroke-linecap="round" stroke-dasharray="14 20"/><circle cx="520" cy="290" r="11" fill="white"/></svg><img class="logo" src="${logo}" alt="KAILA"><span class="eyebrow">CALLING ALL SERVICE PROVIDERS</span><h1>GAWING OPORTUNIDAD<br><span>ANG SKILLS MO.</span></h1><p class="lead">Build your profile, showcase your work, and connect with clients near you.</p><img class="mascot" src="${mascot}" alt="KAILA mascot"></header><section class="visual"><img src="${art}" alt="Filipino independent service providers"></section><div class="benefits"><span class="benefit"><i>✓</i> Get discovered nearby</span><span class="benefit"><i>✓</i> Showcase your work</span><span class="benefit"><i>✓</i> Build your reputation</span></div><section class="cta"><div class="copy"><span class="badge">PROVIDER REGISTRATION IS OPEN</span><h2>JOIN KAILA AS A SERVICE PROVIDER</h2><p>Create your provider profile today and bring your skills closer to local clients.</p></div><div class="qr-card"><div class="qr-wrap"><img src="${qr}" alt="Provider registration QR code"><img class="qr-mark" src="${mascot}" alt=""></div><strong>SCAN TO JOIN</strong></div></section></main></body></html>`;

const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
try { const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 }); await page.setContent(html, { waitUntil: "load" }); await page.evaluate(() => document.fonts.ready); await page.screenshot({ path: outPath, type: "png" }); }
finally { await browser.close(); }
console.log(outPath);
