import type { Metadata } from "next";
import "./globals.css";
import { AdminShellNav } from "./components/admin-shell-nav";
import { AdminMaintenanceBanner } from "./components/admin-maintenance-banner";
import { AppearanceSwitcher } from "./components/appearance-switcher";

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
        <AdminShellNav />
        <AdminMaintenanceBanner />
        {children}
        <AppearanceSwitcher />
      </body>
    </html>
  );
}
