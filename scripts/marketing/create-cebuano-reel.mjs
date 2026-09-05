import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";

const root = path.resolve(import.meta.dirname, "../..");
const out = path.join(root, "output/marketing/cebuano-reel");
await fs.mkdir(out, { recursive: true });
const asset = async (name) => `data:image/png;base64,${await fs.readFile(path.join(root, "apps/web/public/brand", name), "base64")}`;
const logo = await asset("kaila-wordmark-on-dark.png");
const mascot = await asset("kaila-bull-app-icon-v2.png");
// Lucide icon paths, rendered consistently as SVG.
const paths = {
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z"/>',
  zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.9 5.96A1 1 0 0 0 14 10h6a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.9-5.96A1 1 0 0 0 10 14z"/>',
  droplets: '<path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"/><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a7 7 0 0 1-10 6.32"/>',
};
const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
const route = '<svg class="route" viewBox="0 0 1080 1920"><path d="M-90 1280 C280 1550 990 970 770 820 S120 890 290 450 S980 230 1180 410" fill="none" stroke="white" stroke-width="5" stroke-dasharray="12 24"/><circle cx="290" cy="450" r="15" fill="white"/></svg>';
const scenes = [
  `<div class="eyebrow">TABANG SA BALAY?</div><h1>Naay guba<br>sa balay?</h1><div class="hero-icon">${icon("wrench")}</div><p class="support">Nangita kag motabang?</p><div class="bottom">Sugdi sa KAILA.</div>`,
  `<div class="eyebrow">SERBISYO DUOL NIMO</div><h1>Pangita og<br>motabang.</h1><div class="services"><div>${icon("droplets")}<span>Tubero</span></div><div>${icon("zap")}<span>Elektrisyan</span></div><div>${icon("wrench")}<span>Teknisyan</span></div></div><p class="support">Para sa imong kinahanglan.</p>`,
  `<div class="eyebrow">IMONG KAUBAN SA ADLAW-ADLAW</div><h1 style="font-size:88px">Nindot kung<br>naa kay Kaila</h1><img class="mascot" src="${mascot}" alt="KAILA mascot"><div class="cta">Pangita og serbisyo</div><p class="website">kaila-app.com</p>`,
];
const css = `:root{--blue:#1463ff;--cyan:#27b7ff;--ink:#0a1220;--surface:#fff;--background:#f7f9fc;--space:24px;--radius:48px}*{box-sizing:border-box}body{margin:0;width:1080px;height:1920px;font-family:Inter,system-ui,sans-serif;color:var(--surface);background:linear-gradient(155deg,#0f4bff,#3cc8ff);overflow:hidden}.scene{position:relative;width:1080px;height:1920px;padding:210px 96px 320px}.route{position:absolute;inset:0;width:100%;height:100%;opacity:.13;z-index:-1}.logo{display:block;width:252px;height:auto;margin-bottom:96px}.eyebrow{font-size:24px;font-weight:600;letter-spacing:3px;margin-bottom:32px}h1{font-size:108px;line-height:1.07;letter-spacing:-4px;font-weight:700;margin:0}.hero-icon{margin:80px auto 64px;width:360px;height:360px;display:grid;place-items:center;border-radius:96px;background:white;color:var(--blue)}.hero-icon svg{width:210px;height:210px}.support{font-size:38px;font-weight:500;text-align:center;margin:48px 0 0}.bottom{font-size:30px;font-weight:600;text-align:center;margin-top:32px}.services{display:grid;gap:24px;margin-top:64px}.services>div{display:flex;align-items:center;gap:32px;background:var(--surface);color:var(--ink);padding:32px 40px;border-radius:var(--radius);font-size:44px;font-weight:600;height:144px}.services svg{width:72px;height:72px;color:var(--blue)}.mascot{display:block;width:408px;height:408px;object-fit:contain;margin:56px auto;border-radius:80px}.cta{background:var(--surface);color:var(--blue);border-radius:42px;text-align:center;padding:28px 16px;font-weight:700;font-size:40px}.website{text-align:center;font-size:34px;font-weight:600;margin-top:28px}.footer{position:absolute;left:96px;bottom:264px;display:flex;gap:12px}.footer span{width:64px;height:6px;border-radius:12px;background:#ffffff55}.footer span.active{background:white}`;
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  for (let i = 0; i < scenes.length; i++) {
    const html = `<!doctype html><html lang="ceb"><meta charset="utf-8"><title>KAILA Cebuano reel — scene ${i + 1}</title><style>${css}</style><main class="scene">${route}<img class="logo" src="${logo}" alt="KAILA">${scenes[i]}<div class="footer">${scenes.map((_, j) => `<span class="${i === j ? "active" : ""}"></span>`).join("")}</div></main></html>`;
    await fs.writeFile(path.join(out, `scene-${i + 1}.html`), html);
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(out, `scene-${i + 1}.png`) });
  }
} finally {
  await browser.close();
}
const result = spawnSync("ffmpeg", ["-y", "-loop", "1", "-t", "3.2", "-i", path.join(out,"scene-1.png"), "-loop", "1", "-t", "3.7", "-i", path.join(out,"scene-2.png"), "-loop", "1", "-t", "3.5", "-i", path.join(out,"scene-3.png"), "-filter_complex", "[0:v]fps=30,format=yuv420p,settb=AVTB[a];[1:v]fps=30,format=yuv420p,settb=AVTB[b];[2:v]fps=30,format=yuv420p,settb=AVTB[c];[a][b]xfade=transition=fade:duration=0.2:offset=3[ab];[ab][c]xfade=transition=fade:duration=0.2:offset=6.5[v]", "-map", "[v]", "-t", "10", "-r", "30", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", path.join(out, "kaila-cebuano-10s.mp4")], { stdio: "inherit" });
if (result.status !== 0) throw new Error("Video export failed");
await fs.writeFile(path.join(out, "caption.txt"), "Naay kinahanglan ipatrabaho? Pangita og serbisyo duol nimo sa KAILA. 🤝\n\nNindot kung naa kay Kaila. 💙\nhttps://kaila-app.com\n\n#KAILA #SerbisyoDuolNimo #SupportLocal\n");
console.log(out);
