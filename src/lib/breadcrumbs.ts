// ============================================================================
// BreadcrumbList JSON-LD generator
// ============================================================================

const BASE_URL = "https://isi.internationalsovereignty.org";

interface BreadcrumbItem {
  name: string;
  href: string;
}

/**
 * Generate a Schema.org BreadcrumbList for structured data.
 * Always starts with the home page as the first item.
 */
export function generateBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: BASE_URL,
      },
      ...items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 2,
        name: item.name,
        item: `${BASE_URL}${item.href}`,
      })),
    ],
  };
}
