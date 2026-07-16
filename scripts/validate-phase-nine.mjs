import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const required = [
  "apps/api/config/phase_nine.php",
  "apps/api/app/Http/Controllers/DirectConversationController.php",
  "apps/api/app/Http/Controllers/CallController.php",
  "apps/api/app/Http/Controllers/CommunityController.php",
  "apps/api/app/Http/Controllers/KatabangController.php",
  "apps/api/app/Http/Controllers/AdminPhaseNineController.php",
  "apps/api/tests/Feature/PhaseNineModulesTest.php",
  "apps/web/src/app/community/page.tsx",
  "apps/web/src/app/community/share/page.tsx",
  "apps/web/src/app/messages/page.tsx",
  "apps/web/src/app/help/katabang/page.tsx",
  "apps/admin/src/app/analytics/page.tsx",
];
const missing = required.filter((path) => !existsSync(resolve(path)));
if (missing.length > 0) throw new Error(`Missing Phase 9 modules: ${missing.join(", ")}`);
const config = readFileSync(resolve("apps/api/config/phase_nine.php"), "utf8");
if (!config.includes("PHASE_NINE_CALLS', false") || !config.includes("turn_configured")) throw new Error("Calls must default off and require TURN configuration.");
const assistant = readFileSync(resolve("apps/api/app/Http/Controllers/KatabangController.php"), "utf8");
if (!assistant.includes("'length'") || assistant.includes("'input' => $data['message']")) throw new Error("Katabang storage must not retain message content.");
const analytics = readFileSync(resolve("apps/api/app/Http/Controllers/AdminPhaseNineController.php"), "utf8");
if (!analytics.includes("analytics_minimum_cohort") || !analytics.includes("suppressed")) throw new Error("Analytics must enforce cohort suppression.");
process.stdout.write("Phase 9 static operations validation passed.\n");
