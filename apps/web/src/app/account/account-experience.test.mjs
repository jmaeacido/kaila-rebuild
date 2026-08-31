import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("./page.tsx", import.meta.url), "utf8");
const styles = await readFile(new URL("./account.module.css", import.meta.url), "utf8");
const marketplaceNavigationStyles = await readFile(new URL("../../components/marketplace-navigation.module.css", import.meta.url), "utf8");
const addressHierarchy = await readFile(new URL("../address-hierarchy.tsx", import.meta.url), "utf8");

test("account keeps the five-destination mobile navigation with Profile active", () => {
  assert.match(page, /<MarketplaceNavigation active="profile" \/>/);
  assert.match(marketplaceNavigationStyles, /grid-template-columns: repeat\(5, minmax\(0, 1fr\)\)/);
  assert.match(
    marketplaceNavigationStyles,
    /\.bottomNav a\[aria-current="page"\][\s\S]*?color: var\(--color-primary\);[\s\S]*?font-weight: var\(--font-weight-semibold\);/,
  );
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

test("profile picture modal previews and tracks uploads awaiting review", () => {
  assert.match(page, /alt="Profile picture preview"/);
  assert.match(page, /request\.upload\.addEventListener\("progress"/);
  assert.match(page, /aria-label="Photo upload progress"/);
  assert.match(page, /Waiting for review/);
  assert.match(page, /current profile picture stays visible until this photo is approved/i);
  const fileSelection = page.match(/onFiles=\{\(files\) => \{([\s\S]*?)\n\s*\}\}/)?.[1] ?? "";
  assert.doesNotMatch(fileSelection, /setAvatarMenuOpen\(false\)/);
});

test("rejected profile reviews show the moderator reason", () => {
  assert.match(page, /notificationId/);
  assert.match(page, /item\.data\.reviewReason/);
  assert.match(page, /className=\{styles\.reviewReason\}/);
  assert.match(page, /The reviewer did not provide a reason\./);
});

test("saved city-level home areas populate the address hierarchy", () => {
  assert.match(addressHierarchy, /areas\.find\(\(area\) => String\(area\.id\) === value\) \?\?/);
  assert.match(addressHierarchy, /\["city", "municipality"\]\.includes\(selectedArea\.type/);
  assert.match(addressHierarchy, /\? selectedArea/);
  assert.match(addressHierarchy, /barangays\.some\(\(barangay\) => String\(barangay\.id\) === value\) \? value : ""/);
});

test("background profile refreshes do not overwrite unsaved client edits", () => {
  assert.match(page, /const clientFormIsDirty = useRef\(false\)/);
  assert.match(page, /const loadSequence = useRef\(0\)/);
  assert.match(page, /!clientFormIsDirty\.current && sequence === loadSequence\.current/);
  assert.match(page, /onInput=\{markClientFormDirty\}/);
  assert.match(page, /markClientFormDirty\(\);\s*setAreaId\(value\)/);
  assert.match(page, /clientFormIsDirty\.current = false;\s*await load\(\)/);
});
