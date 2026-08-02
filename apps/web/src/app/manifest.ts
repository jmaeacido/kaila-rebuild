import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KAILA — Local Services Near You",
    short_name: "KAILA",
    description: "Find and hire trusted local service providers in the Philippines.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f9fc",
    theme_color: "#1463ff",
    lang: "en-PH",
    categories: ["business", "lifestyle", "utilities"],
    icons: [
      { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
