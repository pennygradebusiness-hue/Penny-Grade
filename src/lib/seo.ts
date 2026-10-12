/**
 * PennyGrade Technical SEO & Structured Data Library
 *
 * Provides:
 * - Authoritative canonical URL construction & normalization
 * - Type-safe TanStack Router route head definitions
 * - Open Graph & Twitter Card social metadata
 * - Schema.org JSON-LD generation (Organization, WebSite, LocalBusiness, BreadcrumbList, FAQPage)
 */

export interface PageHeadOptions {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: "website" | "article" | "profile" | "business.business";
  noindex?: boolean;
  keywords?: string[];
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
}

/**
 * Resolves the authoritative production origin.
 * Priority:
 * 1. import.meta.env.VITE_SITE_URL (Vite client/build time)
 * 2. process.env.VITE_SITE_URL
 * 3. process.env.SITE_URL
 * 4. Authoritative PennyGrade production domain fallback
 */
export function getSiteUrl(): string {
  let rawUrl: string | undefined;

  if (typeof import.meta !== "undefined" && import.meta.env) {
    rawUrl =
      (import.meta.env.VITE_SITE_URL as string | undefined) ||
      (import.meta.env.SITE_URL as string | undefined);
  }

  if (!rawUrl && typeof process !== "undefined" && process.env) {
    rawUrl = process.env.VITE_SITE_URL || process.env.SITE_URL;
  }

  const base = rawUrl ? rawUrl.trim() : "https://pennygrade.com";
  // Normalize: ensure HTTPS in production / strip trailing slash
  return base.replace(/\/+$/, "");
}

/**
 * Constructs an absolute, normalized canonical URL.
 * - Strips query parameters and hash fragments
 * - Strips trailing slashes (except root "/")
 * - Ensures valid HTTPS origin in production
 */
export function buildCanonicalUrl(path = "/"): string {
  const origin = getSiteUrl();
  // Strip query string and fragment if passed
  const cleanPath = path.split("?")[0].split("#")[0];
  const normalizedPath = cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`;

  if (normalizedPath === "/" || normalizedPath === "") {
    return `${origin}/`;
  }

  return `${origin}${normalizedPath.replace(/\/+$/, "")}`;
}

export const DEFAULT_OG_IMAGE = "/pennygrade-card.png";
export const BRAND_NAME = "PennyGrade";

/**
 * Generates TanStack Router compliant `head` payload.
 */
export function buildPageHead({
  title,
  description,
  path = "/",
  image = DEFAULT_OG_IMAGE,
  type = "website",
  noindex = false,
  keywords,
  jsonLd,
}: PageHeadOptions) {
  const origin = getSiteUrl();
  const canonicalUrl = buildCanonicalUrl(path);
  const absoluteImageUrl =
    image.startsWith("http://") || image.startsWith("https://")
      ? image
      : `${origin}${image.startsWith("/") ? image : `/${image}`}`;

  const meta: Array<{
    title?: string;
    name?: string;
    property?: string;
    content?: string;
    charSet?: string;
  }> = [
    { title },
    { name: "description", content: description },
    // Open Graph
    { property: "og:site_name", content: BRAND_NAME },
    { property: "og:type", content: type },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: canonicalUrl },
    { property: "og:image", content: absoluteImageUrl },
    // Twitter / X Cards
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: absoluteImageUrl },
  ];

  if (keywords && keywords.length > 0) {
    meta.push({ name: "keywords", content: keywords.join(", ") });
  }

  if (noindex) {
    meta.push({ name: "robots", content: "noindex, nofollow" });
  } else {
    meta.push({
      name: "robots",
      content: "index, follow, max-image-preview:large, max-snippet:-1",
    });
  }

  const links: Array<{ rel: string; href: string }> = [{ rel: "canonical", href: canonicalUrl }];

  const scripts: Array<{ type: string; children: string }> = [];

  if (jsonLd) {
    const schemas = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
    for (const schema of schemas) {
      scripts.push({
        type: "application/ld+json",
        children: JSON.stringify(schema),
      });
    }
  }

  return { meta, links, scripts };
}

// ============================================================================
// SCHEMA.ORG STRUCTURED DATA GENERATORS (JSON-LD)
// ============================================================================

/**
 * Organization Schema for PennyGrade
 */
export function buildOrganizationSchema() {
  const origin = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND_NAME,
    url: `${origin}/`,
    logo: `${origin}/pennygrade-logo.jpg`,
    description:
      "PennyGrade is a smart physical card discount membership network providing verified in-person savings across dining, retail, wellness, and hotels.",
    sameAs: ["https://twitter.com/pennygrade", "https://instagram.com/pennygrade"],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Support",
      email: "support@pennygrade.com",
      areaServed: "IN",
      availableLanguage: ["English", "Hindi"],
    },
  };
}

/**
 * WebSite Schema for Search Engine Discovery
 */
export function buildWebSiteSchema() {
  const origin = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: BRAND_NAME,
    url: `${origin}/`,
    description: "PennyGrade — India's Physical Card Discount Membership Network",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${origin}/partners?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * BreadcrumbList Schema
 */
export function buildBreadcrumbSchema(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: buildCanonicalUrl(item.path),
    })),
  };
}

/**
 * LocalBusiness Schema for Verified Partner Outlets
 */
export interface PartnerSchemaInput {
  business_name: string;
  slug: string;
  description?: string | null;
  cover_image_url?: string | null;
  logo_url?: string | null;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  website?: string | null;
  category_name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  business_hours?: string | null;
}

export function buildLocalBusinessSchema(partner: PartnerSchemaInput) {
  const origin = getSiteUrl();
  const partnerUrl = `${origin}/partners/${partner.slug}`;

  // Map category to schema.org type if specific, otherwise LocalBusiness
  let schemaType = "LocalBusiness";
  const cat = (partner.category_name || "").toLowerCase();
  if (cat.includes("café") || cat.includes("cafe") || cat.includes("coffee")) {
    schemaType = "CafeOrCoffeeShop";
  } else if (cat.includes("restaurant") || cat.includes("dining") || cat.includes("food")) {
    schemaType = "Restaurant";
  } else if (cat.includes("hotel") || cat.includes("stay")) {
    schemaType = "Hotel";
  } else if (cat.includes("salon") || cat.includes("spa") || cat.includes("barber")) {
    schemaType = "BeautySalon";
  } else if (cat.includes("fitness") || cat.includes("gym")) {
    schemaType = "HealthClub";
  } else if (cat.includes("shopping") || cat.includes("store") || cat.includes("retail")) {
    schemaType = "Store";
  }

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": schemaType,
    name: partner.business_name,
    url: partnerUrl,
    priceRange: "₹₹",
  };

  if (partner.description) {
    schema.description = partner.description;
  }

  if (partner.cover_image_url) {
    schema.image = partner.cover_image_url;
  }

  if (partner.phone) {
    schema.telephone = partner.phone;
  }

  if (partner.website) {
    schema.sameAs = partner.website;
  }

  if (partner.address || partner.city) {
    schema.address = {
      "@type": "PostalAddress",
      streetAddress: partner.address || undefined,
      addressLocality: partner.city || "Daltonganj",
      addressRegion: "Jharkhand",
      addressCountry: "IN",
    };
  }

  if (typeof partner.latitude === "number" && typeof partner.longitude === "number") {
    schema.geo = {
      "@type": "GeoCoordinates",
      latitude: partner.latitude,
      longitude: partner.longitude,
    };
  }

  return schema;
}

/**
 * FAQPage Schema
 */
export function buildFaqSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}
