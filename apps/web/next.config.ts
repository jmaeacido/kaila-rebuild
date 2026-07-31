import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
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
