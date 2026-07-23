import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { extname } from "node:path";

const mojibakeMarkers = ["â€", "â€™", "â€¦", "Ã", "Â·"];
const textExtensions = new Set([".css", ".html", ".js", ".json", ".md", ".mjs", ".php", ".ts", ".tsx", ".xml", ".yaml", ".yml"]);
const files = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);
const findings = [];

for (const file of files) {
  if (file === "scripts/check-text-encoding.mjs" || !textExtensions.has(extname(file))) continue;
  const content = readFileSync(file, "utf8");
  if (content.includes("\uFFFD") || mojibakeMarkers.some((marker) => content.includes(marker))) {
    findings.push(file);
  }
}

if (findings.length > 0) {
  process.stderr.write(`Possible text-encoding corruption found in:\n${findings.join("\n")}\n`);
  process.exit(1);
}

process.stdout.write(`Text-encoding scan passed (${files.length} files checked).\n`);
