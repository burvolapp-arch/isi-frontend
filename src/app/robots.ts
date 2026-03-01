import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/country/*/scenario"],
        crawlDelay: 1,
      },
    ],
    sitemap: "https://isi.internationalsovereignty.org/sitemap.xml",
  };
}
