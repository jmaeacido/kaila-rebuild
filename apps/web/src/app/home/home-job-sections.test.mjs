import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const opportunitiesSource = readFileSync(new URL("../opportunities/page.tsx", import.meta.url), "utf8");
const opportunityDetailsSource = readFileSync(new URL("../opportunities/[jobId]/page.tsx", import.meta.url), "utf8");
const jobDetailsSource = readFileSync(new URL("../jobs/[jobId]/page.tsx", import.meta.url), "utf8");
const notificationBellSource = readFileSync(new URL("../notification-bell.tsx", import.meta.url), "utf8");
const authGuardSource = readFileSync(new URL("../auth-guard.tsx", import.meta.url), "utf8");
const brandedLoaderSource = readFileSync(new URL("../branded-loader.tsx", import.meta.url), "utf8");
const initialUiGateSource = readFileSync(new URL("../initial-ui-gate.tsx", import.meta.url), "utf8");
const globalStylesSource = readFileSync(new URL("../globals.css", import.meta.url), "utf8");
const brandStylesSource = readFileSync(new URL("../../components/brand-mark.module.css", import.meta.url), "utf8");

test("Home keeps every non-terminal job active and terminal jobs in history", () => {
  assert.match(source, /const activeClientJobs = jobs\.filter/);
  assert.match(source, /const activeProviderJobs = jobs\.filter/);
  assert.match(source, /activeJobs\.map\(\(job\)/);
  assert.match(source, /\["completed", "rated_closed", "cancelled"\]\.includes\(job\.status\)/);
  assert.doesNotMatch(source, /job\.id !== currentJob\?\.id/);
});

test("Client Home presents one empty jobs state and role-aware primary navigation", () => {
  assert.match(source, /No jobs yet/);
  assert.match(source, /jobHistory\.length > 0 && <section/);
  assert.doesNotMatch(source, /No hired jobs yet/);
  assert.match(source, /<EmptyJobsIllustration \/>/);
  assert.match(source, />\s*Jobs\s*<\/Link>/);
  assert.match(source, />\s*Opportunities\s*<\/Link>/);
  assert.doesNotMatch(source, /user\.providerEligible \? "\/opportunities" : "\/provider-profile"/);
});

test("Home keeps the hero action primary and removes duplicate discovery actions", () => {
  assert.match(source, /className=\{styles\.secondaryAction\} href="\/providers"/);
  assert.match(source, />Find a provider</);
  assert.match(source, />\s*View more services/);
  assert.doesNotMatch(source, /categories\.length > 6 &&/);
  assert.doesNotMatch(source, /Find a specific provider/);
  assert.doesNotMatch(source, /<Link href="\/post-job">\s*<Search/);
});

test("The mobile Katabang trigger lives with header controls instead of covering content", () => {
  assert.match(authGuardSource, /<NotificationBell \/>\s*\{pathname !== "\/help\/katabang" && <FloatingKatabang \/>\}/);
});

test("Authenticated loading uses the approved KAILA lockup and human-facing copy", () => {
  assert.match(brandedLoaderSource, /<BrandMark className="brandedLoaderLogo" priority showBull \/>/);
  assert.match(brandedLoaderSource, /className="brandedLoaderBackdrop"/);
  assert.match(authGuardSource, /Getting KAILA ready for you/);
  assert.match(globalStylesSource, /animation: branded-loader-orbit/);
  assert.match(globalStylesSource, /animation: branded-loader-marker/);
  assert.match(globalStylesSource, /prefers-reduced-motion: reduce/);
});

test("desktop session branding stays compact and only shows the bull when requested", () => {
  assert.match(globalStylesSource, /\.appSessionBar \.sessionLogo \{[^}]*display: inline-flex/);
  assert.doesNotMatch(brandStylesSource, /@media[^}]+\.bull\s*\{\s*display: block/);
  assert.match(brandStylesSource, /\.lockup\.withBull \.bull \{\s*display: block/);
  assert.match(authGuardSource, /<BrandMark className="sessionLogo" priority showBull \/>/);
});

test("Authenticated navigation retains the session and reveals pages after their initial UI settles", () => {
  assert.match(authGuardSource, /if \(sessionReady\) return/);
  assert.match(authGuardSource, /\{sessionReady \? \(/);
  assert.match(authGuardSource, /<InitialUiGate key=\{pathname\}>/);
  assert.match(initialUiGateSource, /MutationObserver/);
  assert.match(initialUiGateSource, /image\.complete/);
  assert.match(initialUiGateSource, /document\.fonts\?\.ready/);
  assert.match(initialUiGateSource, /requestAnimationFrame\(\(\) => requestAnimationFrame/);
});

test("Every job-card surface uses its service category icon", () => {
  assert.match(opportunitiesSource, /ServiceCategoryIcon icon=\{item\.category\.icon\}/);
  assert.match(opportunityDetailsSource, /ServiceCategoryIcon icon=\{opportunity\.category\.icon\}/);
  assert.match(jobDetailsSource, /ServiceCategoryIcon icon=\{job\.category\.icon\}/);
});

test("Home renders each job's service category icon", () => {
  assert.match(source, /ServiceCategoryIcon icon=\{job\.category\.icon\}/);
  assert.match(source, /opportunities\.map\(\(opportunity\)/);
  assert.match(source, /ServiceCategoryIcon icon=\{opportunity\.category\.icon\}/);
  assert.doesNotMatch(source, /<Hammer aria-hidden="true" \/>/);
});

test("Home keeps matched jobs visible beside active work and announces matches through shared dialogs", () => {
  assert.match(source, /id="matched-jobs-title"/);
  assert.match(source, /isEphemeralRealtimeEvent\(event\.type\)/);
  assert.match(source, /load\(true\)/);
  assert.doesNotMatch(source, /setPopupOpportunity/);
});

test("Home pairs hired work and nearby jobs only when both have content", () => {
  assert.match(source, /activeJobs\.length > 0 \|\| opportunities\.length === 0/);
  assert.match(source, /opportunities\.length === 0 \? styles\.fullWidth/);
  assert.match(source, /activeJobs\.length === 0 \? styles\.fullWidth/);
});

test("Nearby jobs show client trust and route information", () => {
  assert.match(source, /opportunity\.client\.avatarUrl/);
  assert.match(source, /opportunity\.client\.displayName/);
  assert.match(source, /opportunity\.client\.reviewCount/);
  assert.match(source, /OpportunityRouteMetrics opportunityId=\{opportunity\.id\}/);
  assert.match(source, /styles\.personAvatar/);
  assert.match(source, /styles\.clientName/);
  assert.match(source, /styles\.clientReputation/);
  assert.doesNotMatch(source, />With \{opportunity\.client\.displayName\}/);
});

test("All Home job cards lead with people and stack reputation below names", () => {
  assert.match(source, /job\.counterpart\?\.avatarUrl/);
  assert.match(source, /styles\.historyName/);
  assert.doesNotMatch(source, />With \{job\.counterpart\.displayName\}/);
});

test("Travel status speaks to the active user in the correct role", () => {
  assert.match(source, /if \(job\.role === travelerRole\) return "You’re on the way"/);
  assert.match(source, /travelerRole === "client" \? "Client on the way" : "Provider on the way"/);
});

test("Every active job keeps a truthful Distance and ETA row visible", () => {
  assert.match(source, /activeJobs\.map\(\(job\)[\s\S]*<ActiveJobRouteMetrics job=\{job\}/);
  assert.match(source, /useHiredRouteEstimate/);
  assert.match(source, /preview\?\.distanceMeters \?\? job\.travel\?\.distanceMeters/);
  assert.match(source, /Distance: \$\{distance == null \? "—"/);
  assert.match(source, /ETA: \$\{eta == null \? "—"/);
  assert.match(source, /Distance: Not applicable · ETA: Not applicable/);
});

test("Opportunity cards request approximate driving distance", () => {
  assert.match(opportunitiesSource, /opportunityId=\{item\.id\}/);
  assert.match(opportunityDetailsSource, /opportunityId=\{opportunity\.id\}/);
});

test("Header notification clicks persist read state before navigation", () => {
  assert.match(notificationBellSource, /notifications\/\$\{item\.id\}\/read/);
  assert.match(notificationBellSource, /event\.preventDefault\(\)/);
  assert.match(notificationBellSource, /setUnread\(\(current\) => Math\.max\(0, current - 1\)\)/);
  assert.match(notificationBellSource, /const target = notificationRoute\(item\)/);
  assert.match(notificationBellSource, /router\.push\(target\)/);
});
