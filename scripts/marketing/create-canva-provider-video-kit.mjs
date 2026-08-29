import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const root = path.resolve(import.meta.dirname, "../..");
const kitDir = path.join(root, "output/marketing/canva-provider-video-kit-v1");
const requireFromWeb = createRequire(path.join(root, "apps/web/package.json"));
const QRCode = requireFromWeb("qrcode");

const registrationUrl = "https://kaila-app.com/register?role=provider&next=%2Fprovider-profile";
const downloadUrl = "https://kaila-app.com/download";
const appIconPath = path.join(root, "apps/web/public/brand/kaila-bull-app-icon-v2.png");

await fs.mkdir(kitDir, { recursive: true });

await Promise.all([
  fs.copyFile(path.join(root, "apps/web/public/brand/kaila-wordmark-on-dark.png"), path.join(kitDir, "01-kaila-wordmark-on-dark.png")),
  fs.copyFile(appIconPath, path.join(kitDir, "02-kaila-bull-mascot.png")),
  fs.copyFile(
    "C:/Users/jacid/.codex/generated_images/01a04b2f-1390-7001-963a-0b0c06974541/exec-c8e705e8-1aae-4674-89c4-d65a9e63a6ae.png",
    path.join(kitDir, "03-service-provider-illustration.png"),
  ),
  fs.copyFile(path.join(root, "output/marketing/kaila-provider-recruitment-generic-v1.png"), path.join(kitDir, "06-generic-campaign-reference.png")),
]);

const appIconUrl = `data:image/png;base64,${(await fs.readFile(appIconPath)).toString("base64")}`;
const qrOptions = {
  errorCorrectionLevel: "H",
  margin: 3,
  width: 720,
  color: { dark: "#0F4BCE", light: "#FFFFFF" },
};

const makeQrCard = async (page, url, label, shortUrl, outputName) => {
  const qrUrl = await QRCode.toDataURL(url, qrOptions);
  await page.setContent(`<!doctype html><style>
    *{box-sizing:border-box}html,body{margin:0;width:800px;height:920px;overflow:hidden;background:transparent;font-family:Inter,"Segoe UI",Arial,sans-serif}
    .card{position:relative;width:800px;height:920px;padding:48px;border-radius:64px;background:#fff;border:6px solid #dce9ff;box-shadow:0 28px 70px rgba(10,18,32,.16);text-align:center}
    .qr{position:relative;width:650px;height:650px;margin:0 auto 28px}.qr>img:first-child{display:block;width:650px;height:650px}.mark{position:absolute;left:50%;top:50%;width:132px;height:132px;transform:translate(-50%,-50%);padding:11px;border-radius:34px;background:#fff;box-shadow:0 0 0 11px #fff}
    strong{display:block;color:#1463ff;font-size:54px;line-height:1.05;letter-spacing:-1px}small{display:block;margin-top:14px;color:#344054;font-size:29px;font-weight:750}
  </style><main class="card"><div class="qr"><img src="${qrUrl}"><img class="mark" src="${appIconUrl}"></div><strong>${label}</strong><small>${shortUrl}</small></main>`, { waitUntil: "load" });
  await page.screenshot({ path: path.join(kitDir, outputName), type: "png", omitBackground: true });
};

const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 800, height: 920 }, deviceScaleFactor: 1 });
  await makeQrCard(page, registrationUrl, "REGISTER NOW", "kaila-app.com/register", "04-registration-qr.png");
  await makeQrCard(page, downloadUrl, "DOWNLOAD THE APP", "kaila-app.com/download", "05-android-download-qr.png");
} finally {
  await browser.close();
}

console.log(kitDir);
