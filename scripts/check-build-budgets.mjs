import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const budgets = [["apps/web/.next/static", 1_500_000], ["apps/admin/.next/static", 1_000_000]];
async function javascriptBytes(directory) {
  let total = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) total += await javascriptBytes(path);
    else if (entry.name.endsWith(".js")) total += (await stat(path)).size;
  }
  return total;
}
let failed = false;
for (const [directory, budget] of budgets) {
  const bytes = await javascriptBytes(directory);
  const status = bytes <= budget ? "PASS" : "FAIL";
  console.log(`${status} ${directory}: ${bytes} / ${budget} bytes`);
  failed ||= bytes > budget;
}
if (failed) process.exitCode = 1;
