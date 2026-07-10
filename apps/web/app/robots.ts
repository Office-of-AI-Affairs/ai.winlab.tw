import type { MetadataRoute } from "next";

// Admin / auth / user-only paths, blocked in both locales. English lives under
// `/en/*`, so each admin path needs an `/en`-prefixed variant too.
const ADMIN_PATHS = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/account",
  "/settings",
  "/carousel",
  "/contacts",
  "/design",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/auth/",
        ...ADMIN_PATHS,
        ...ADMIN_PATHS.map((p) => `/en${p}`),
        "/*/edit",
        "/*/edit/",
      ],
    },
    sitemap: "https://ai.winlab.tw/sitemap.xml",
  };
}
