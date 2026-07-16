import type { Metadata } from "next";
import "./globals.css";
import { OnlineStatus } from "./online-status";
import { NativeRuntime } from "./native-runtime";

export const metadata: Metadata = {
  title: "KAILA — Local services near you",
  description: "Find trusted independent service providers in your area.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body><NativeRuntime /><OnlineStatus />{children}</body>
    </html>
  );
}
