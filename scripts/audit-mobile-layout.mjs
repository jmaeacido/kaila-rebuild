import { spawn } from "node:child_process";
import { chromium } from "playwright";

const origin = "http://127.0.0.1:3011";
const routes = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password?token=audit&email=audit%40example.com",
  "/privacy",
  "/terms",
  "/account-deletion",
  "/home",
  "/account",
  "/settings",
  "/notifications",
  "/community",
  "/community/share",
  "/help/katabang",
  "/messages",
  "/messages/audit",
  "/opportunities",
  "/opportunities/audit",
  "/post-job",
  "/provider-profile",
  "/jobs/audit",
  "/jobs/audit/offers",
  "/jobs/audit/work",
  "/jobs/audit/hired/conversation",
  "/jobs/audit/hired/travel",
];
const viewports = [
  { name: "small-android", width: 360, height: 800 },
  { name: "large-android", width: 412, height: 915 },
];

const nextCli = new URL(
  "../apps/web/node_modules/next/dist/bin/next",
  import.meta.url,
);
const server = spawn(
  process.execPath,
  [nextCli, "start", "-p", "3011"],
  {
    cwd: new URL("..", import.meta.url),
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  },
);

let serverOutput = "";
server.stdout.on("data", (chunk) => {
  serverOutput += chunk;
});
server.stderr.on("data", (chunk) => {
  serverOutput += chunk;
});

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(origin);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`KAILA web server did not start.\n${serverOutput}`);
}

const failures = [];
let browser;

try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });

  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
    });

    for (const route of routes) {
      const page = await context.newPage();
      await page.goto(`${origin}${route}`, {
        waitUntil: "networkidle",
        timeout: 20_000,
      });
      await page.waitForTimeout(150);

      const result = await page.evaluate(() => {
        const root = document.documentElement;
        const body = document.body;
        const overflow = Math.max(root.scrollWidth, body.scrollWidth) - window.innerWidth;
        const visibleControls = [...document.querySelectorAll("a, button, input, select, textarea")]
          .filter((element) => {
            const style = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return (
              style.display !== "none" &&
              style.visibility !== "hidden" &&
              rect.width > 0 &&
              rect.height > 0
            );
          });
        const undersized = visibleControls
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            return rect.width < 44 || rect.height < 44;
          })
          .map((element) => ({
            tag: element.tagName.toLowerCase(),
            label:
              element.getAttribute("aria-label") ||
              element.textContent?.trim().slice(0, 60) ||
              element.getAttribute("name") ||
              "",
            width: Math.round(element.getBoundingClientRect().width),
            height: Math.round(element.getBoundingClientRect().height),
          }));
        return {
          finalPath: `${location.pathname}${location.search}`,
          overflow: Math.max(0, Math.round(overflow)),
          undersized,
        };
      });

      if (result.overflow > 0 || result.undersized.length > 0) {
        failures.push({
          viewport: viewport.name,
          route,
          ...result,
        });
      }
      await page.close();
    }

    await context.close();
  }
} finally {
  await browser?.close();
  server.kill();
}

if (failures.length > 0) {
  console.error(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
} else {
  console.log(
    `Mobile layout audit passed for ${routes.length} routes at ${viewports.length} Android viewport sizes.`,
  );
}
