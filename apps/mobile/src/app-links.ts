import { App } from "@capacitor/app";
import { deepLinkRoute } from "./routes";

// getLaunchUrl retains the original intent. Read it once per WebView load so
// remounting the runtime cannot send the user back to an old QR destination.
let launchUrlRead = false;

export async function initializeAppLinks(options: {
  appHost: string;
  navigate(path: string): void;
  beforeNavigate(): void;
}) {
  let receivedLiveLink = false;
  const open = (url: string) => {
    const route = deepLinkRoute(url, options.appHost);
    if (!route) return;
    options.beforeNavigate();
    options.navigate(route);
  };
  const handle = await App.addListener("appUrlOpen", ({ url }) => {
    receivedLiveLink = true;
    open(url);
  });

  if (!launchUrlRead) {
    launchUrlRead = true;
    // A newer live intent takes precedence over a delayed cold-start lookup.
    const launch = await App.getLaunchUrl().catch(() => undefined);
    if (launch?.url && !receivedLiveLink) open(launch.url);
  }
  return handle;
}
