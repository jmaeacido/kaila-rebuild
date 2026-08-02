import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const notifier = readFileSync(
  new URL("../android/app/src/main/java/com/kaila/marketplace/IncomingCallNotifier.java", import.meta.url),
  "utf8",
);
const channels = readFileSync(
  new URL("../android/app/src/main/java/com/kaila/marketplace/KailaSoundChannels.java", import.meta.url),
  "utf8",
);

describe("Android incoming call presentation", () => {
  it("uses native call style and opens MainActivity directly when answered", () => {
    expect(notifier).toMatch(/NotificationCompat\.CallStyle\.forIncomingCall/);
    expect(notifier).toMatch(/PendingIntent answer = activityPending/);
    expect(notifier).toMatch(/new Intent\(context, MainActivity\.class\)/);
    expect(notifier).toMatch(/setFullScreenIntent\(fullScreenPending, true\)/);
    expect(channels).toMatch(/CALLS = "kaila_calls_v4"/);
  });
});
