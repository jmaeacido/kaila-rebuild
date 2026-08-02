import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AdminShellNav } from "./components/admin-shell-nav";
import { AdminMaintenanceBanner } from "./components/admin-maintenance-banner";
import { AppearanceSwitcher } from "./components/appearance-switcher";
import { AdminPushRuntime } from "./components/admin-push-runtime";

const appearanceScript = `(() => {
  try {
    const stored = localStorage.getItem("kaila-admin-appearance");
    const preference = ["light", "dark", "system"].includes(stored) ? stored : "light";
    const resolved = preference === "system"
      ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : preference;
    document.documentElement.dataset.appearance = preference;
    document.documentElement.dataset.theme = resolved;
  } catch {
    document.documentElement.dataset.appearance = "light";
    document.documentElement.dataset.theme = "light";
  }
})();`;

export const metadata: Metadata = {
  title: "KAILA Administration",
  description: "Separate marketplace operations and verification workflows.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f9fc" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: appearanceScript }} />
      </head>
      <body>
        <AdminPushRuntime />
        <AdminShellNav />
        <AdminMaintenanceBanner />
        {children}
        <AppearanceSwitcher />
      </body>
    </html>
  );
}
