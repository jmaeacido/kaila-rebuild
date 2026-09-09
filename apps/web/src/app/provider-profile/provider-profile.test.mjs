import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { formatAvailabilityTime, formatAvailabilityWindow } from "../../components/provider-availability.ts";

const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("./profile.module.css", import.meta.url), "utf8");
const availabilityStyles = readFileSync(new URL("../../components/provider-availability-editor.module.css", import.meta.url), "utf8");
const serviceStyles = readFileSync(new URL("../../components/service-category-multi-select.module.css", import.meta.url), "utf8");
const bannerSource = readFileSync(new URL("../../components/area-mismatch-banner.tsx", import.meta.url), "utf8");
const publicProfileSource = readFileSync(new URL("../providers/[providerId]/page.tsx", import.meta.url), "utf8");
const managerSource = readFileSync(new URL("../../components/provider-portfolio-manager.tsx", import.meta.url), "utf8");
const gallerySource = readFileSync(new URL("../../components/provider-portfolio-gallery.tsx", import.meta.url), "utf8");
const viewerSource = readFileSync(new URL("../../components/provider-portfolio-viewer.tsx", import.meta.url), "utf8");

test("Provider profile form styles do not override nested service and availability labels", () => {
  assert.doesNotMatch(styles, /\.form label\s*\{/);
  assert.match(styles, /\.formSection > label/);
  assert.match(styles, /\.addressFields > label/);
  assert.match(availabilityStyles, /\.toggle \{[\s\S]*?display: flex;/);
  assert.match(availabilityStyles, /flex-direction: row;/);
  assert.match(availabilityStyles, /\.times \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(availabilityStyles, /\.row \{[\s\S]*?grid-template-columns: minmax\(4\.5rem, auto\) minmax\(0, 1fr\)/);
  assert.match(availabilityStyles, /\.shortLabel/);
  assert.match(serviceStyles, /\.options \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(serviceStyles, /\.option \{[\s\S]*?grid-template-columns: var\(--spacing-32\) minmax\(0, 1fr\) auto/);
  assert.match(serviceStyles, /@media \(min-width: 48rem\)[\s\S]*grid-template-columns: var\(--spacing-40, 2\.5rem\) minmax\(0, 1fr\) var\(--spacing-24\)/);
});

test("Provider profile loads saved data from marketplace profile", () => {
  assert.match(source, /\/api\/v1\/me\/marketplace-profile/);
  assert.match(source, /provider\.display_name/);
  assert.match(source, /provider\.service_areas/);
  assert.match(source, /value=\{displayName\}/);
  assert.match(source, /value=\{bio\}/);
  assert.match(source, /<ServiceCategoryMultiSelect/);
  assert.match(source, /useRealtimeInvalidation/);
  assert.match(source, /profile\.updated/);
});

test("Provider profile does not overwrite edits during background refreshes", () => {
  assert.match(source, /const formIsDirty = useRef\(false\)/);
  assert.match(source, /const \[hasUnsavedChanges, setHasUnsavedChanges\] = useState\(false\)/);
  assert.match(source, /const loadSequence = useRef\(0\)/);
  assert.match(source, /provider && !formIsDirty\.current && sequence === loadSequence\.current/);
  assert.match(source, /onInput=\{markFormDirty\}/);
  assert.match(source, /markFormDirty\(\);\s*setServiceIds\(values\)/);
  assert.match(source, /setMessage\("saving"\);\s*loadSequence\.current \+= 1/);
  assert.match(source, /formIsDirty\.current = false/);
  assert.match(source, /setHasUnsavedChanges\(false\)/);
});

test("Submit for review stays disabled until the provider edits the form", () => {
  assert.match(source, /setHasUnsavedChanges\(true\)/);
  assert.match(source, /disabled=\{referenceStatus !== "ready" \|\| !hasUnsavedChanges\}/);
});

test("Provider profile loads and submits every offered service", () => {
  assert.match(source, /provider\.services\?\.map\(\(service\) => String\(service\.id\)\)/);
  assert.match(source, /serviceIds\.length === 0/);
  assert.match(source, /serviceIds: serviceIds\.map\(Number\)/);
  assert.doesNotMatch(source, /provider\.services\?\.\[0\]/);
});

test("Area mismatch banner reads provider service areas from API shape", () => {
  assert.match(bannerSource, /service_areas/);
  assert.doesNotMatch(bannerSource, /serviceAreas/);
});

test("Provider profile edit page loads and manages work photos", () => {
  assert.match(source, /providerPortfolio/);
  assert.match(source, /ProviderPortfolioManager/);
  assert.match(source, /Work photos/);
});

test("Provider portfolio manager uploads and deletes through profile assets API", () => {
  assert.match(managerSource, /purpose", "portfolio"/);
  assert.match(managerSource, /\/api\/v1\/me\/profile-assets/);
  assert.match(managerSource, /method: "DELETE"/);
});

test("Public provider profile renders portfolio gallery and conversion CTA", () => {
  assert.match(publicProfileSource, /provider\.portfolio/);
  assert.match(publicProfileSource, /ProviderPortfolioGallery/);
  assert.match(publicProfileSource, /togglePortfolioLike/);
  assert.match(gallerySource, /ProviderPortfolioViewer/);
  assert.match(viewerSource, /Heart/);
  assert.match(publicProfileSource, /withDemoPortfolio/);
  assert.match(publicProfileSource, /ProviderServicesShowcase/);
  assert.match(publicProfileSource, /variant="embedded"/);
  assert.match(publicProfileSource, /Request Service/);
  assert.match(publicProfileSource, /provider\.isOwnProfile/);
  assert.match(publicProfileSource, /Manage Provider Profile/);
  assert.match(publicProfileSource, /mobileCtaBar/);
  assert.match(gallerySource, /Work photos/);
});

test("Public provider availability uses a human-readable 12-hour schedule", () => {
  assert.equal(formatAvailabilityTime("08:00:00"), "8:00 AM");
  assert.equal(formatAvailabilityTime("12:30:00"), "12:30 PM");
  assert.equal(formatAvailabilityTime("17:00:00"), "5:00 PM");
  assert.equal(formatAvailabilityWindow(1, "08:00:00", "17:00:00"), "Monday, 8:00 AM–5:00 PM");
  assert.match(publicProfileSource, /formatAvailabilityWindow\(slot\.day_of_week, slot\.starts_at, slot\.ends_at\)/);
});
