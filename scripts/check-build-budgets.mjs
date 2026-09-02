import { readdir } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { join } from "node:path";
import { createGzip } from "node:zlib";

// Count compressed transfer bytes across all route chunks. This includes the
// route-scoped MapLibre runtime without treating its uncompressed worker source
// as bytes sent over the network. Keep headroom narrow and review increases.
const budgets = [["apps/web/.next/static", 780_000], ["apps/admin/.next/static", 270_000]];
async function gzipBytes(path) {
  let total = 0;
  const gzip = createReadStream(path).pipe(createGzip({ level: 9 }));
  for await (const chunk of gzip) total += chunk.length;
  return total;
}
async function javascriptBytes(directory) {
  let total = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) total += await javascriptBytes(path);
    else if (entry.name.endsWith(".js")) total += await gzipBytes(path);
  }
  return total;
}
let failed = false;
for (const [directory, budget] of budgets) {
  const bytes = await javascriptBytes(directory);
  const status = bytes <= budget ? "PASS" : "FAIL";
  console.log(`${status} ${directory}: ${bytes} / ${budget} gzip bytes`);
  failed ||= bytes > budget;
}
if (failed) process.exitCode = 1;
