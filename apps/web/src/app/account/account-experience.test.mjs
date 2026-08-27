import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("./page.tsx", import.meta.url), "utf8");
const styles = await readFile(new URL("./account.module.css", import.meta.url), "utf8");
const addressHierarchy = await readFile(new URL("../address-hierarchy.tsx", import.meta.url), "utf8");

test("account keeps the five-destination mobile navigation with Profile active", () => {
  assert.match(page, /aria-label="Marketplace navigation"/);
  assert.match(page, /aria-current="page" href="\/account"/);
  assert.match(styles, /grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
});

test("account uses a compact mobile identity and a wider desktop composition", () => {
  assert.match(styles, /\.identityCard \{[^}]*grid-template-columns:auto minmax\(0,1fr\)/);
  assert.match(styles, /\.accountGrid \{ grid-template-columns:minmax\(0,1\.45fr\) minmax\(18rem,\.8fr\)/);
  assert.match(styles, /min-height:var\(--control-min-height\)/);
});

test("profile picture actions stay behind the avatar camera control", () => {
  assert.match(page, /aria-label="Change profile picture"/);
  assert.match(page, /avatarMenuOpen &&[\s\S]*<ActionModal/);
  assert.match(page, /onClose=\{\(\) => setAvatarMenuOpen\(false\)\}/);
  assert.match(styles, /@media\(hover:hover\) and \(pointer:fine\)/);
  assert.match(styles, /\.avatarTrigger\[aria-expanded="true"\]/);
  assert.match(styles, /\.avatarTrigger \{[^}]*inset:0[^}]*opacity:0/);
});

test("saved city-level home areas populate the address hierarchy", () => {
  assert.match(addressHierarchy, /areas\.find\(\(area\) => String\(area\.id\) === value\) \?\?/);
  assert.match(addressHierarchy, /\["city", "municipality"\]\.includes\(selectedArea\.type/);
  assert.match(addressHierarchy, /\? selectedArea/);
  assert.match(addressHierarchy, /barangays\.some\(\(barangay\) => String\(barangay\.id\) === value\) \? value : ""/);
});
