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
const mainActivity = readFileSync(
  new URL("../android/app/src/main/java/com/kaila/marketplace/MainActivity.java", import.meta.url),
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

  it("does not start WebRTC before navigating the WebView for a native answer", () => {
    const navigation = mainActivity.indexOf("window.location.assign");
    const returnAfterNavigation = mainActivity.indexOf("return;", navigation);
    const eventDispatch = mainActivity.indexOf("window.dispatchEvent", navigation);
    expect(navigation).toBeGreaterThan(-1);
    expect(returnAfterNavigation).toBeGreaterThan(navigation);
    expect(eventDispatch).toBeGreaterThan(returnAfterNavigation);
  });
});
