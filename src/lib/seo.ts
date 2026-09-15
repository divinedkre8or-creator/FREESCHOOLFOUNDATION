export const SITE_URL = "https://thefreeschoolfoundation.com.ng";
export const SITE_NAME = "The Free School Foundation";
export const DEFAULT_SOCIAL_IMAGE = `${SITE_URL}/social-share.jpg`;

export function absoluteUrl(path = "/") {
  return new URL(path, `${SITE_URL}/`).toString();
}

type SeoOptions = {
  title: string;
  description: string;
  path: string;
  imageAlt?: string;
  noIndex?: boolean;
  scripts?: Array<{ type: string; children: string }>;
};

export function seoHead({
  title,
  description,
  path,
  imageAlt = "The Free School Foundation scholarship programme",
  noIndex = false,
  scripts = [],
}: SeoOptions) {
  const url = absoluteUrl(path);
  const robots = noIndex
    ? "noindex, nofollow, noarchive"
    : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { name: "robots", content: robots },
      { name: "googlebot", content: robots },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:image", content: DEFAULT_SOCIAL_IMAGE },
      { property: "og:image:alt", content: imageAlt },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: DEFAULT_SOCIAL_IMAGE },
      { name: "twitter:image:alt", content: imageAlt },
    ],
    links: [{ rel: "canonical", href: url }],
    scripts,
  };
}

export function breadcrumbSchema(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
