import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const dir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(dir, "[jobId]/work/lifecycle-timeline.tsx"), "utf8");
const styles = readFileSync(join(dir, "[jobId]/work/lifecycle-timeline.module.css"), "utf8");

test("Job progress labels stay compact and single-line on narrow phones", () => {
  assert.match(source, /label: "Travel"/);
  assert.match(source, /label: "Work"/);
  assert.match(source, /label: "Done"/);
  assert.match(source, /className=\{styles\.label\}/);
  assert.match(styles, /white-space:\s*nowrap/);
  assert.match(styles, /grid-auto-flow:\s*column/);
  assert.match(styles, /minmax\(4\.75rem,\s*1fr\)/);
  assert.match(styles, /overflow-x:\s*auto/);
});
