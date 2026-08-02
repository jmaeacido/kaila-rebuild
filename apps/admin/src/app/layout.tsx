import type { Metadata } from "next";
import "./globals.css";
import { AdminShellNav } from "./components/admin-shell-nav";
import { AdminMaintenanceBanner } from "./components/admin-maintenance-banner";

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
    <html lang="en">
      <body>
        <AdminShellNav />
        <AdminMaintenanceBanner />
        {children}
      </body>
    </html>
  );
}
