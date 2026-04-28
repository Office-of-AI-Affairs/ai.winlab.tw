import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/auth/",
        "/login",
        "/forgot-password",
        "/reset-password",
        "/account",
        "/settings",
        "/carousel",
        "/contacts",
        "/design",
        "/*/edit",
        "/*/edit/",
      ],
    },
    sitemap: "https://ai.winlab.tw/sitemap.xml",
  };
}
