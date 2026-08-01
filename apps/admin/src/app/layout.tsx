import type { Metadata } from "next";
import "./globals.css";
import { AdminShellNav } from "./components/admin-shell-nav";

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
      <body><AdminShellNav />{children}</body>
    </html>
  );
}
