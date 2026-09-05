import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const root = path.resolve(import.meta.dirname, "../..");
const requireFromWeb = createRequire(path.join(root, "apps/web/package.json"));
const QRCode = requireFromWeb("qrcode");
const isCebuanoVector = process.argv.includes("--cebuano-vector");
const outputDir = path.join(root, "output/marketing/skill-drop");
const outputPath = path.join(outputDir, isCebuanoVector
  ? "kaila-skill-drop-facebook-post-cebuano-vector-v1.png"
  : "kaila-skill-drop-facebook-post-v1.png");
const photoPath = path.join(outputDir, isCebuanoVector
  ? "assets/kaila-skill-drop-technician-vector-v1.png"
  : "assets/kaila-skill-drop-technician-v1.png");
const logoPath = path.join(root, "apps/web/public/brand/kaila-wordmark-on-dark.png");
const mascotPath = path.join(root, "apps/web/public/brand/kaila-bull-app-icon-v2.png");
const registerUrl = "https://kaila-app.com/register?role=provider&next=%2Fprovider-profile";
const copy = isCebuanoVector ? {
  headline: "USA KA TRABAHO.<br>USA KA ISTORYA.<br><span>IPAKITA.</span>",
  proof: "ANG IMONG TRABAHO MAOY PAMATUOD",
  question: "Aduna kay trabaho nga imong gipasigarbo?",
  prompt: "Sugdi ang imong KAILA portfolio sa usa ka hulagway.",
  challenge: "IPAKITA ANG IMONG ABILIDAD",
  cta: "IPAKITA ANG IMONG LABING MAAYONG TRABAHO.",
  description: "Himoa ang imong provider profile ug ipakita sa mga kliyente sa inyong lugar unsay kaya nimo—sugdi sa usa ka trabaho nga imong gipasigarbo.",
  steps: ["Pagrehistro", "Idugang ang serbisyo", "I-upload imong trabaho"],
  join: "APIL SA<br>SKILL DROP",
  scan: "I-scan aron magrehistro isip<br>KAILA Service Provider",
} : {
  headline: "ISANG GAWA.<br>ISANG KUWENTO.<br><span>IPAKITA MO.</span>",
  proof: "YOUR WORK IS YOUR PROOF",
  question: "May gawa kang ipinagmamalaki?",
  prompt: "Start your KAILA portfolio with one photo.",
  challenge: "A PROOF-FIRST PROVIDER CHALLENGE",
  cta: "LET YOUR BEST WORK FIND YOU MORE WORK.",
  description: "Create your provider profile and show local clients what you can do—starting with one job you’re proud of.",
  steps: ["Register", "Add your service", "Upload your work"],
  join: "JOIN THE<br>SKILL DROP",
  scan: "Scan to register as a<br>KAILA Service Provider",
};

const asDataUrl = async (file) =>
  `data:image/png;base64,${(await fs.readFile(file)).toString("base64")}`;

await fs.mkdir(outputDir, { recursive: true });
const [photo, logo, mascot, qr] = await Promise.all([
  asDataUrl(photoPath),
  asDataUrl(logoPath),
  asDataUrl(mascotPath),
  QRCode.toDataURL(registerUrl, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 320,
    color: { dark: "#0f4bce", light: "#ffffff" },
  }),
]);

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{margin:0;width:1080px;height:1350px;overflow:hidden;font-family:Inter,"Segoe UI",Arial,sans-serif;background:#0a1220}.poster{position:relative;width:1080px;height:1350px;overflow:hidden;background:#f7f9fc;color:#0a1220}.photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center}.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,18,32,.76) 0%,rgba(10,18,32,.25) 39%,rgba(10,18,32,.04) 61%,rgba(10,18,32,.84) 100%)}.top{position:absolute;left:56px;right:56px;top:48px;color:#fff}.logo{width:218px}.tag{position:absolute;right:0;top:0;padding:12px 18px;border:1px solid rgba(255,255,255,.52);border-radius:999px;background:rgba(10,18,32,.25);font-size:16px;font-weight:800;letter-spacing:1.2px}.headline{margin:55px 0 0;max-width:740px;font-size:76px;line-height:.92;letter-spacing:-3.4px;font-weight:800;text-shadow:0 5px 24px rgba(10,18,32,.35)}.headline span{color:#58d2ff}.prompt{position:absolute;left:56px;top:538px;width:365px;padding:22px 24px;border-radius:24px;background:rgba(255,255,255,.94);box-shadow:0 16px 42px rgba(10,18,32,.22);transform:rotate(-2deg)}.prompt small{display:block;margin-bottom:8px;color:#1463ff;font-size:14px;font-weight:800;letter-spacing:.8px}.prompt strong{display:block;font-size:26px;line-height:1.08}.prompt p{margin:8px 0 0;color:#344054;font-size:17px;line-height:1.28;font-weight:600}.pin{position:absolute;right:54px;top:545px;width:80px;height:80px;border:6px solid #fff;border-radius:50% 50% 50% 0;background:linear-gradient(135deg,#1463ff,#27b7ff);transform:rotate(-45deg);box-shadow:0 12px 28px rgba(10,18,32,.25)}.pin:after{content:"";position:absolute;left:24px;top:24px;width:20px;height:20px;border-radius:50%;background:#fff}.panel{position:absolute;left:42px;right:42px;bottom:40px;height:364px;padding:31px 32px;border-radius:32px;background:linear-gradient(115deg,rgba(10,18,32,.98),rgba(16,50,109,.98) 65%,rgba(20,99,255,.98));box-shadow:0 22px 60px rgba(10,18,32,.35);color:#fff}.panel-copy{width:700px}.eyebrow{display:inline-block;padding:7px 12px;border-radius:999px;background:#27b7ff;color:#071a38;font-size:14px;font-weight:900;letter-spacing:.9px}.panel h2{margin:13px 0 8px;font-size:39px;line-height:1;letter-spacing:-1px}.panel p{margin:0;width:655px;color:#eaf5ff;font-size:19px;line-height:1.34;font-weight:600}.steps{display:flex;gap:10px;margin-top:24px}.step{display:flex;align-items:center;gap:9px;padding:10px 14px;border:1px solid rgba(255,255,255,.28);border-radius:999px;background:rgba(255,255,255,.08);font-size:15px;font-weight:800}.num{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:#fff;color:#1463ff;font-size:13px}.qr-card{position:absolute;right:28px;top:28px;width:210px;height:305px;padding:16px;border-radius:25px;background:#fff;text-align:center;color:#0a1220}.qr-wrap{position:relative;width:174px;height:174px;margin:0 auto}.qr-wrap>img:first-child{width:174px;height:174px}.qr-mark{position:absolute;left:50%;top:50%;width:44px;height:44px;transform:translate(-50%,-50%);padding:4px;border-radius:11px;background:#fff;box-shadow:0 0 0 4px #fff}.qr-card strong{display:block;margin-top:8px;color:#1463ff;font-size:20px;line-height:1}.qr-card small{display:block;margin-top:6px;color:#344054;font-size:13px;font-weight:700;line-height:1.25}.route{position:absolute;left:0;right:0;bottom:352px;width:100%;height:130px;opacity:.75}
</style></head><body><main class="poster"><img class="photo" src="${photo}" alt="A local service provider photographs his finished work"><div class="shade"></div><section class="top"><img class="logo" src="${logo}" alt="KAILA"><span class="tag">KAILA SKILL DROP</span><h1 class="headline">${copy.headline}</h1></section><aside class="prompt"><small>${copy.proof}</small><strong>${copy.question}</strong><p>${copy.prompt}</p></aside><i class="pin"></i><svg class="route" viewBox="0 0 1080 130" fill="none"><path d="M-20 96 C210 2 385 122 610 42 S885 96 1100 18" stroke="#55d2ff" stroke-width="5" stroke-linecap="round" stroke-dasharray="13 18"/></svg><section class="panel"><div class="panel-copy"><span class="eyebrow">${copy.challenge}</span><h2>${copy.cta}</h2><p>${copy.description}</p><div class="steps"><span class="step"><i class="num">1</i> ${copy.steps[0]}</span><span class="step"><i class="num">2</i> ${copy.steps[1]}</span><span class="step"><i class="num">3</i> ${copy.steps[2]}</span></div></div><div class="qr-card"><div class="qr-wrap"><img src="${qr}" alt="Provider registration QR code"><img class="qr-mark" src="${mascot}" alt=""></div><strong>${copy.join}</strong><small>${copy.scan}</small></div></section></main></body></html>`;

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});

try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: outputPath, type: "png" });
} finally {
  await browser.close();
}

console.log(outputPath);
