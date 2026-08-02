import type { Metadata, Viewport } from "next";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import { OnlineStatus } from "./online-status";
import { NativeRuntime } from "./native-runtime";
import { AuthGuard } from "./auth-guard";
import { RealtimeProvider } from "./realtime-provider";
import { NotificationRuntime } from "./notification-runtime";
import { ThemeProvider } from "./theme-provider";
import { themeBootstrapScript } from "./theme";

export const metadata: Metadata = {
  title: "KAILA — Local services near you",
  description: "Find trusted independent service providers in your area.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f9fc" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1524" },
  ],
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
            <NotificationRuntime />
            <AuthGuard>{children}</AuthGuard>
          </RealtimeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
