import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const opportunitiesSource = readFileSync(new URL("../opportunities/page.tsx", import.meta.url), "utf8");
const opportunitiesStyles = readFileSync(new URL("../opportunities/page.module.css", import.meta.url), "utf8");
const opportunityDetailsSource = readFileSync(new URL("../opportunities/[jobId]/page.tsx", import.meta.url), "utf8");
const jobDetailsSource = readFileSync(new URL("../jobs/[jobId]/page.tsx", import.meta.url), "utf8");
const notificationBellSource = readFileSync(new URL("../notification-bell.tsx", import.meta.url), "utf8");
const authGuardSource = readFileSync(new URL("../auth-guard.tsx", import.meta.url), "utf8");
const brandedLoaderSource = readFileSync(new URL("../branded-loader.tsx", import.meta.url), "utf8");
const initialUiGateSource = readFileSync(new URL("../initial-ui-gate.tsx", import.meta.url), "utf8");
const globalStylesSource = readFileSync(new URL("../globals.css", import.meta.url), "utf8");
const brandStylesSource = readFileSync(new URL("../../components/brand-mark.module.css", import.meta.url), "utf8");
const sessionMenuSource = readFileSync(new URL("../../components/session-menu.tsx", import.meta.url), "utf8");
const marketplaceNavigationSource = readFileSync(new URL("../../components/marketplace-navigation.tsx", import.meta.url), "utf8");
const marketplaceNavigationStyles = readFileSync(new URL("../../components/marketplace-navigation.module.css", import.meta.url), "utf8");
const katabangStyles = readFileSync(new URL("../../components/floating-katabang.module.css", import.meta.url), "utf8");
const katabangSource = readFileSync(new URL("../../components/floating-katabang.tsx", import.meta.url), "utf8");

test("Home keeps every non-terminal job active for each marketplace mode", () => {
  assert.match(source, /const activeClientJobs = jobs\.filter/);
  assert.match(source, /const activeProviderJobs = jobs\.filter/);
  assert.match(source, /todaysJobs\.slice\(0, 3\)\.map\(\(job\)/);
  assert.match(source, /\["completed", "rated_closed", "cancelled"\]\.includes\(job\.status\)/);
});

test("Client Home presents one empty jobs state and role-aware navigation", () => {
  assert.match(source, /No active jobs/);
  assert.doesNotMatch(source, /No hired jobs yet/);
  assert.match(source, /Your posted jobs will appear here/);
  assert.match(source, /<MarketplaceNavigation \/>/);
  assert.match(marketplaceNavigationSource, /href="\/community"/);
  assert.match(marketplaceNavigationSource, />\s*Jobs\s*<\/Link>/);
  assert.match(marketplaceNavigationSource, /Find work/);
  assert.match(marketplaceNavigationSource, /href="\/home"/);
  assert.match(marketplaceNavigationSource, />\s*Home\s*<\/Link>/);
  assert.doesNotMatch(source, /user\.providerEligible \? "\/opportunities" : "\/provider-profile"/);
});

test("Home uses clear active navigation with foreground emphasis", () => {
  assert.match(
    marketplaceNavigationStyles,
    /\.bottomNav a\[aria-current="page"\][\s\S]*?color: var\(--color-primary\);[\s\S]*?font-weight: var\(--font-weight-semibold\);/,
  );
  assert.doesNotMatch(marketplaceNavigationStyles, /\.bottomNav a \{[\s\S]*?box-shadow: var\(--shadow-neu/);
});

test("Provider Home follows the supplied mobile hierarchy with truthful live data", () => {
  assert.match(source, /function ProviderHome/);
  assert.match(source, /title="Jobs Near You"/);
  assert.match(source, /title="Today’s Schedule"/);
  assert.match(source, /title="Your Offers"/);
  assert.match(source, /opportunities\.filter\(\(opportunity\) => !opportunity\.offer\)/);
  assert.match(source, /opportunities\.filter\(\(opportunity\) => opportunity\.offer\)/);
  assert.match(source, />Jobs Completed</);
  assert.match(source, />Rating</);
  assert.match(source, />Response</);
  assert.match(source, />Opportunities</);
  assert.match(source, /provider\?\.response_minutes/);
  assert.match(source, /href="\/opportunities"/);
  assert.match(source, /providerSummaryLink/);
});

test("The mobile Katabang trigger lives with header controls instead of covering content", () => {
  assert.match(
    authGuardSource,
    /const showKatabang = pathname !== "\/help\/katabang" && pathname !== "\/provider-profile"/,
  );
  assert.match(authGuardSource, /\{showKatabang && <FloatingKatabang \/>\}/);
  assert.match(authGuardSource, /sessionUserChangedEvent/);
  assert.match(authGuardSource, /window\.addEventListener\(sessionUserChangedEvent/);
});

test("Narrow phone navigation keeps every tab label on one line", () => {
  assert.match(
    marketplaceNavigationStyles,
    /@media \(max-width: 30rem\)[\s\S]*?\.bottomNav a \{[\s\S]*?overflow-wrap: normal;[\s\S]*?white-space: nowrap;/,
  );
});

test("Client Home follows the compact discovery layout while retaining shared navigation", () => {
  assert.match(source, /function ClientHome/);
  assert.match(source, /What service do you need\?/);
  assert.match(source, />Post a Job</);
  assert.match(source, /Trusted Providers Nearby/);
  assert.match(
    source,
    /providerAvatarWrap[\s\S]*?provider\.verified \?[\s\S]*?IdentityVerifiedBadge compact className=\{styles\.providerVerified\}/,
  );
  assert.match(source, /<MarketplaceNavigation \/>/);
});

test("Katabang uses the approved bull mascot as a mobile floating action", () => {
  assert.match(katabangSource, /kaila-bull-app-icon-v2\.png/);
  assert.match(katabangStyles, /@media \(max-width: 63\.999rem\)[\s\S]*?\.launcher \{[\s\S]*?position: fixed/);
  assert.match(katabangStyles, /bottom: calc\(var\(--spacing-64\)/);
});

test("Authenticated loading uses the approved KAILA lockup and human-facing copy", () => {
  assert.match(brandedLoaderSource, /<BrandMark className="brandedLoaderLogo" priority showBull \/>/);
  assert.match(brandedLoaderSource, /className="brandedLoaderBackdrop"/);
  assert.match(authGuardSource, /Getting KAILA ready for you/);
  assert.match(globalStylesSource, /animation: branded-loader-orbit/);
  assert.match(globalStylesSource, /animation: branded-loader-marker/);
  assert.match(globalStylesSource, /prefers-reduced-motion: reduce/);
});

test("session branding shows the approved bull and wordmark lockup", () => {
  assert.match(globalStylesSource, /\.appSessionBar \.sessionLogo \{[^}]*display: inline-flex/);
  assert.doesNotMatch(brandStylesSource, /@media[^}]+\.bull\s*\{\s*display: block/);
  assert.match(brandStylesSource, /\.lockup\.withBull \.bull \{\s*display: block/);
  assert.match(authGuardSource, /<BrandMark className="sessionLogo" priority showBull \/>/);
  assert.doesNotMatch(authGuardSource, /sessionLogo" priority showBull compact/);
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

test("Find work keeps the standardized provider bottom navigation", () => {
  assert.match(opportunitiesSource, /<MarketplaceNavigation active="opportunities" \/>/);
  assert.match(marketplaceNavigationSource, /aria-label="Marketplace navigation"/);
  assert.match(marketplaceNavigationSource, /href="\/opportunities"/);
  assert.match(marketplaceNavigationSource, /href="\/community"/);
  assert.match(marketplaceNavigationSource, /href="\/messages"/);
  assert.match(marketplaceNavigationSource, /href="\/account"/);
  assert.match(marketplaceNavigationSource, /isProvider \?/);
});

test("Desktop session header exposes compact marketplace navigation", () => {
  assert.match(authGuardSource, /<MarketplaceDesktopNav \/>/);
  assert.match(sessionMenuSource, /href="\/community"/);
  assert.match(marketplaceNavigationStyles, /@media \(min-width: 64rem\)[\s\S]*\.desktopNav/);
});

test("Find work stacks its header action on narrow phones", () => {
  assert.match(
    opportunitiesStyles,
    /@media\(max-width:30rem\)[^{]*\{[^}]*\.shell > header \{[^}]*display:grid[^}]*gap:var\(--spacing-12\)/,
  );
  assert.match(
    opportunitiesStyles,
    /\.shell > header button \{[^}]*justify-self:start[^}]*white-space:nowrap/,
  );
});

test("Provider Home renders each nearby job's service category icon", () => {
  assert.match(source, /openOpportunities\.slice\(0, 3\)\.map\(\(opportunity\)/);
  assert.match(source, /ServiceCategoryBadge icon=\{opportunity\.category\.icon\}/);
  assert.doesNotMatch(source, /<Hammer aria-hidden="true" \/>/);
});

test("Home keeps matched jobs visible beside active work and announces matches through shared dialogs", () => {
  assert.match(source, /id="matched-jobs-title"/);
  assert.match(source, /isEphemeralRealtimeEvent\(event\.type\)/);
  assert.match(source, /load\(true\)/);
  assert.doesNotMatch(source, /setPopupOpportunity/);
});

test("Home greets with the profile area and hides the pin when unset", () => {
  assert.match(source, /const locationLabel = homeAreaName;/);
  assert.match(source, /const locationLabel = coverageAreaLabel\(provider\?\.service_areas\);/);
  assert.match(source, /resolveAreaName\(profileBody\.data\.client\?\.area_id\)/);
  assert.match(source, /\{locationLabel \? \([\s\S]*?<MapPin aria-hidden="true" \/>\{locationLabel\}<\/span>[\s\S]*?\) : null\}/);
  assert.doesNotMatch(source, /Your local area/);
  assert.doesNotMatch(source, />Service Provider</);
});

test("Client and provider greetings place the account avatar before the name", () => {
  assert.match(source, /function GreetingAvatar/);
  assert.match(source, /<GreetingAvatar name=\{firstName\} avatarUrl=\{avatarUrl\} \/>[\s\S]*?<h1>\{firstName\}<\/h1>/);
  assert.doesNotMatch(authGuardSource, /className="sessionAvatar"/);
});

test("Nearby jobs show location, route, budget, and one clear action", () => {
  assert.match(source, /OpportunityRouteMetrics opportunityId=\{opportunity\.id\}/);
  assert.match(source, /money\(opportunity\.budgetMinCentavos, opportunity\.budgetMaxCentavos\)/);
  assert.match(source, /href=\{`\/opportunities\/\$\{opportunity\.jobId\}`\}>View Job/);
});

test("Provider Home retains the shared bottom navigation", () => {
  assert.match(source, /function ProviderHome[\s\S]*<MarketplaceNavigation \/>/);
  assert.match(marketplaceNavigationStyles, /grid-template-columns: repeat\(5/);
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
