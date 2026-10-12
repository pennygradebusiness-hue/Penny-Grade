import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  getSiteUrl,
  buildCanonicalUrl,
  buildPageHead,
  buildOrganizationSchema,
  buildWebSiteSchema,
  buildBreadcrumbSchema,
  buildLocalBusinessSchema,
  buildFaqSchema,
} from "@/lib/seo";
import {
  generateRequestId,
  sanitizeLogData,
  createApiError,
} from "@/lib/errors";
import { logApplicationError } from "@/lib/error-logger";
import { renderErrorPage } from "@/lib/error-page";

describe("PennyGrade Technical SEO & Metadata Architecture", () => {
  it("resolves authoritative production site origin correctly", () => {
    const origin = getSiteUrl();
    expect(origin).toBe("https://pennygrade.com");
    expect(origin.endsWith("/")).toBe(false);
  });

  describe("Canonical URL Generation & Normalization", () => {
    it("generates root canonical URL with trailing slash", () => {
      expect(buildCanonicalUrl("/")).toBe("https://pennygrade.com/");
      expect(buildCanonicalUrl("")).toBe("https://pennygrade.com/");
    });

    it("generates normalized canonical URLs for public pages without trailing slash", () => {
      expect(buildCanonicalUrl("/how-it-works")).toBe("https://pennygrade.com/how-it-works");
      expect(buildCanonicalUrl("/partners")).toBe("https://pennygrade.com/partners");
      expect(buildCanonicalUrl("/partners/")).toBe("https://pennygrade.com/partners");
      expect(buildCanonicalUrl("/offers")).toBe("https://pennygrade.com/offers");
      expect(buildCanonicalUrl("/become-a-member")).toBe("https://pennygrade.com/become-a-member");
      expect(buildCanonicalUrl("/partner-with-us")).toBe("https://pennygrade.com/partner-with-us");
    });

    it("strips query parameters and filters from canonical URLs", () => {
      expect(buildCanonicalUrl("/partners?q=coffee&category=cafes&sort=popular")).toBe(
        "https://pennygrade.com/partners"
      );
      expect(buildCanonicalUrl("/offers?discountMin=15")).toBe("https://pennygrade.com/offers");
    });

    it("strips hash fragments from canonical URLs", () => {
      expect(buildCanonicalUrl("/how-it-works#calculator")).toBe(
        "https://pennygrade.com/how-it-works"
      );
    });

    it("generates correct partner profile canonical URLs using verified slug", () => {
      expect(buildCanonicalUrl("/partners/abc-cafe")).toBe(
        "https://pennygrade.com/partners/abc-cafe"
      );
      expect(buildCanonicalUrl("/partners/urban-brew/")).toBe(
        "https://pennygrade.com/partners/urban-brew"
      );
    });
  });

  describe("Page Head & Metadata Construction", () => {
    it("generates complete metadata with Open Graph, Twitter, and canonical links", () => {
      const head = buildPageHead({
        title: "Test Page | PennyGrade",
        description: "Test description for PennyGrade member benefits.",
        path: "/how-it-works",
        image: "/test-image.png",
      });

      // Meta tags
      const titleMeta = head.meta.find((m) => "title" in m);
      expect(titleMeta?.title).toBe("Test Page | PennyGrade");

      const descMeta = head.meta.find((m) => m.name === "description");
      expect(descMeta?.content).toBe("Test description for PennyGrade member benefits.");

      const ogTitle = head.meta.find((m) => m.property === "og:title");
      expect(ogTitle?.content).toBe("Test Page | PennyGrade");

      const ogUrl = head.meta.find((m) => m.property === "og:url");
      expect(ogUrl?.content).toBe("https://pennygrade.com/how-it-works");

      const ogImage = head.meta.find((m) => m.property === "og:image");
      expect(ogImage?.content).toBe("https://pennygrade.com/test-image.png");

      const twitterCard = head.meta.find((m) => m.name === "twitter:card");
      expect(twitterCard?.content).toBe("summary_large_image");

      const robotsMeta = head.meta.find((m) => m.name === "robots");
      expect(robotsMeta?.content).toContain("index, follow");

      // Canonical link
      const canonicalLink = head.links.find((l) => l.rel === "canonical");
      expect(canonicalLink?.href).toBe("https://pennygrade.com/how-it-works");
    });

    it("applies noindex, nofollow directives for sensitive or private routes", () => {
      const head = buildPageHead({
        title: "Admin Dashboard | PennyGrade",
        description: "Administrative dashboard.",
        path: "/admin",
        noindex: true,
      });

      const robotsMeta = head.meta.find((m) => m.name === "robots");
      expect(robotsMeta?.content).toBe("noindex, nofollow");
    });
  });

  describe("Schema.org JSON-LD Structured Data Generators", () => {
    it("generates valid Organization schema", () => {
      const org = buildOrganizationSchema();
      expect(org["@context"]).toBe("https://schema.org");
      expect(org["@type"]).toBe("Organization");
      expect(org.name).toBe("PennyGrade");
      expect(org.url).toBe("https://pennygrade.com/");
      expect(org.logo).toContain("/pennygrade-logo.jpg");
      expect(org.contactPoint["@type"]).toBe("ContactPoint");
      expect(org.contactPoint.email).toBe("support@pennygrade.com");
    });

    it("generates valid WebSite schema with search action", () => {
      const site = buildWebSiteSchema();
      expect(site["@context"]).toBe("https://schema.org");
      expect(site["@type"]).toBe("WebSite");
      expect(site.name).toBe("PennyGrade");
      expect(site.url).toBe("https://pennygrade.com/");
      expect(site.potentialAction["@type"]).toBe("SearchAction");
    });

    it("generates valid BreadcrumbList schema", () => {
      const breadcrumbs = buildBreadcrumbSchema([
        { name: "Home", path: "/" },
        { name: "Partners", path: "/partners" },
        { name: "ABC Café", path: "/partners/abc-cafe" },
      ]);

      expect(breadcrumbs["@context"]).toBe("https://schema.org");
      expect(breadcrumbs["@type"]).toBe("BreadcrumbList");
      expect(breadcrumbs.itemListElement).toHaveLength(3);
      expect(breadcrumbs.itemListElement[0].name).toBe("Home");
      expect(breadcrumbs.itemListElement[0].item).toBe("https://pennygrade.com/");
      expect(breadcrumbs.itemListElement[1].name).toBe("Partners");
      expect(breadcrumbs.itemListElement[1].item).toBe("https://pennygrade.com/partners");
      expect(breadcrumbs.itemListElement[2].name).toBe("ABC Café");
      expect(breadcrumbs.itemListElement[2].item).toBe("https://pennygrade.com/partners/abc-cafe");
    });

    it("generates valid LocalBusiness schema with category resolution", () => {
      const cafeSchema = buildLocalBusinessSchema({
        business_name: "ABC Café",
        slug: "abc-cafe",
        description: "Specialty coffee and breakfast",
        category_name: "Cafés",
        address: "12 Hill Road",
        city: "Daltonganj",
        phone: "+91 98200 11111",
        latitude: 24.0416,
        longitude: 84.0722,
      });

      expect(cafeSchema["@type"]).toBe("CafeOrCoffeeShop");
      expect(cafeSchema.name).toBe("ABC Café");
      expect(cafeSchema.url).toBe("https://pennygrade.com/partners/abc-cafe");
      expect(cafeSchema.telephone).toBe("+91 98200 11111");
      expect(cafeSchema.address).toEqual({
        "@type": "PostalAddress",
        streetAddress: "12 Hill Road",
        addressLocality: "Daltonganj",
        addressRegion: "Jharkhand",
        addressCountry: "IN",
      });
      expect(cafeSchema.geo).toEqual({
        "@type": "GeoCoordinates",
        latitude: 24.0416,
        longitude: 84.0722,
      });

      const restaurantSchema = buildLocalBusinessSchema({
        business_name: "Grand Dining",
        slug: "grand-dining",
        category_name: "Restaurants",
      });
      expect(restaurantSchema["@type"]).toBe("Restaurant");
    });

    it("generates valid FAQPage schema", () => {
      const faqs = [
        { question: "What is PennyGrade?", answer: "PennyGrade is a physical card membership." },
        { question: "How to save?", answer: "Scan the venue QR code at checkout." },
      ];
      const faqSchema = buildFaqSchema(faqs);
      expect(faqSchema["@type"]).toBe("FAQPage");
      expect(faqSchema.mainEntity).toHaveLength(2);
      expect(faqSchema.mainEntity[0].name).toBe("What is PennyGrade?");
      expect(faqSchema.mainEntity[0].acceptedAnswer.text).toBe("PennyGrade is a physical card membership.");
    });
  });

  describe("robots.txt Configuration Validation", () => {
    it("contains valid sitemap declaration and crawl rules", () => {
      const robotsPath = path.resolve(process.cwd(), "public", "robots.txt");
      const content = fs.readFileSync(robotsPath, "utf-8");

      expect(content).toContain("Sitemap: https://pennygrade.com/sitemap.xml");
      expect(content).toContain("Disallow: /admin");
      expect(content).toContain("Disallow: /account");
      expect(content).toContain("Disallow: /verification");
      expect(content).toContain("Disallow: /p/");
      expect(content).toContain("Disallow: /history");
      expect(content).toContain("Allow: /");
      expect(content).not.toContain("Disallow: / ");
    });
  });
});

describe("PennyGrade Professional Error Handling & Reliability Architecture", () => {
  it("generates unique correlation IDs for error tracing", () => {
    const id1 = generateRequestId();
    const id2 = generateRequestId();
    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id1).not.toBe(id2);
  });

  it("redacts sensitive authentication data, tokens, and passwords from logs", () => {
    const payload = {
      email: "user@example.com",
      password: "SuperSecretPassword123",
      apiKey: "secret_live_key_9999",
      sessionToken: "sess_xyz_123",
      headers: {
        authorization: "Bearer secret-token-abc",
      },
      metadata: {
        pin: "1234",
        otp: "654321",
        normalField: "public-value",
      },
    };

    const sanitized = sanitizeLogData(payload) as Record<string, unknown>;
    expect(sanitized.password).toBe("[REDACTED]");
    expect(sanitized.apiKey).toBe("[REDACTED]");
    expect(sanitized.sessionToken).toBe("[REDACTED]");
    expect((sanitized.headers as Record<string, unknown>).authorization).toBe("[REDACTED]");
    expect((sanitized.metadata as Record<string, unknown>).otp).toBe("[REDACTED]");
    expect((sanitized.metadata as Record<string, unknown>).normalField).toBe("public-value");
  });

  it("formats standardized API error responses", () => {
    const err = createApiError("VALIDATION_ERROR", "Invalid input received", { field: "billAmount" });
    expect(err.ok).toBe(false);
    expect(err.success).toBe(false);
    expect(err.error.code).toBe("VALIDATION_ERROR");
    expect(err.error.message).toBe("Invalid input received");
    expect(err.error.requestId).toBeTruthy();
    expect(err.error.details).toEqual({ field: "billAmount" });
  });

  it("logs application error and returns correlation ID", () => {
    const error = new Error("Test simulation error");
    const reqId = logApplicationError(error, { boundary: "UnitTestBoundary" });
    expect(reqId).toBeTruthy();
  });

  it("renders branded catastrophic error page containing correlation ID", () => {
    const html = renderErrorPage("req_test_12345");
    expect(html).toContain("PennyGrade is temporarily unavailable");
    expect(html).toContain("Reference ID: req_test_12345");
    expect(html).toContain("Return to Home");
    expect(html).not.toContain("stack");
  });
});
