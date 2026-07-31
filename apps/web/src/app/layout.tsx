import type { Metadata } from "next";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import { OnlineStatus } from "./online-status";
import { NativeRuntime } from "./native-runtime";
import { AuthGuard } from "./auth-guard";
import { RealtimeProvider } from "./realtime-provider";

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
      <body><NativeRuntime /><OnlineStatus /><RealtimeProvider><AuthGuard>{children}</AuthGuard></RealtimeProvider></body>
    </html>
  );
}
