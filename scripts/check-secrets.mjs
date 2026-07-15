import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";

const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /REALTIME_TICKET_SIGNING_SEED_BASE64=[A-Za-z0-9+/]{40,}={0,2}/,
  /AKIA[0-9A-Z]{16}/,
  /AIza[0-9A-Za-z_-]{35}/,
  /"private_key"\s*:\s*"-----BEGIN PRIVATE KEY-----/,
];
const excluded = new Set([
  "pnpm-lock.yaml",
  "apps/api/composer.lock",
  "scripts/check-secrets.mjs",
]);
const files = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);
const findings = [];

for (const file of files) {
  if (excluded.has(file) || statSync(file).size > 1_000_000) continue;
  const content = readFileSync(file, "utf8");
  if (patterns.some((pattern) => pattern.test(content))) findings.push(file);
}

if (findings.length > 0) {
  process.stderr.write(`Potential committed secrets found in:\n${findings.join("\n")}\n`);
  process.exit(1);
}

process.stdout.write(`Committed-secret scan passed (${files.length} tracked files checked).\n`);
