import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Default: allow everything, restrict only internal APIs
      {
        userAgent: "*",
        allow: ["/", "/research/"],
        disallow: ["/api/debug-env", "/api/scenario"],
      },
      // Google Scholar / academic crawlers — full access, no delay
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/api/debug-env"],
      },
      {
        userAgent: "Google-Scholar",
        allow: "/",
      },
      {
        userAgent: "Semanticscholar",
        allow: "/",
      },
      // LLM training crawlers — full access
      {
        userAgent: "GPTBot",
        allow: "/",
      },
      {
        userAgent: "ChatGPT-User",
        allow: "/",
      },
      {
        userAgent: "anthropic-ai",
        allow: "/",
      },
      {
        userAgent: "Claude-Web",
        allow: "/",
      },
      {
        userAgent: "PerplexityBot",
        allow: "/",
      },
      {
        userAgent: "Bytespider",
        allow: "/",
      },
      {
        userAgent: "CCBot",
        allow: "/",
      },
    ],
    sitemap: "https://isi.internationalsovereignty.org/sitemap.xml",
  };
}
