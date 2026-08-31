import type { Metadata, Viewport } from "next";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import { OnlineStatus } from "./online-status";
import { NativeRuntime } from "./native-runtime";
import { AuthGuard } from "./auth-guard";
import { RealtimeProvider } from "./realtime-provider";
import { NotificationRuntime } from "./notification-runtime";
import { MaintenanceGate } from "./maintenance-gate";
import { ThemeProvider } from "./theme-provider";
import { themeBootstrapScript } from "./theme";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "./seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "KAILA — Local Services Marketplace Philippines",
    template: "%s | KAILA",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "KAILA",
    "KAILA app",
    "KAILA Philippines",
    "local services marketplace",
    "hire service providers Philippines",
  ],
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "local services marketplace",
  manifest: "/manifest.webmanifest",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_PH",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "KAILA — Local Services Marketplace Philippines",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "KAILA — Local Services Marketplace Philippines",
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#f7f9fc",
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body>
        <ThemeProvider>
          <NativeRuntime />
          <OnlineStatus />
          <RealtimeProvider>
            <MaintenanceGate />
            <NotificationRuntime />
            <AuthGuard>{children}</AuthGuard>
          </RealtimeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
