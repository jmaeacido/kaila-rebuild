import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    const privateRoutes = [
      "/api/:path*",
      "/account/:path*",
      "/account-deletion",
      "/community/:path*",
      "/help/:path*",
      "/home/:path*",
      "/jobs/:path*",
      "/messages/:path*",
      "/notifications/:path*",
      "/opportunities/:path*",
      "/post-job/:path*",
      "/provider-profile/:path*",
      "/providers/:path*",
      "/safety/:path*",
      "/settings/:path*",
      "/support/:path*",
    ];
    const utilityRoutes = [
      "/forgot-password",
      "/login",
      "/maintenance",
      "/register",
      "/reset-password",
      "/status/:path*",
    ];
    return [
      ...privateRoutes.map((source) => ({
        source,
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      })),
      ...utilityRoutes.map((source) => ({
        source,
        headers: [{ key: "X-Robots-Tag", value: "noindex, follow, noarchive" }],
      })),
    ];
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.kaila-app.com" }],
        destination: "https://kaila-app.com/:path*",
        permanent: true,
      },
      {
        source: "/",
        has: [{ type: "query", key: "route", value: "privacy" }],
        destination: "/privacy",
        permanent: true,
      },
      {
        source: "/",
        has: [{ type: "query", key: "route", value: "terms" }],
        destination: "/terms",
        permanent: true,
      },
      {
        source: "/",
        has: [{ type: "query", key: "route", value: "account-deletion" }],
        destination: "/account-deletion",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    const apiOrigin = process.env.KAILA_API_ORIGIN ?? "http://127.0.0.1:8000";

    return [{ source: "/api/:path*", destination: `${apiOrigin}/api/:path*` }];
  },
};

export default nextConfig;
