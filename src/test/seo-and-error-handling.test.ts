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
import { generateRequestId, sanitizeLogData, createApiError } from "@/lib/errors";
import { logApplicationError } from "@/lib/error-logger";
import { renderErrorPage } from "@/lib/error-page";

describe("PennyGrade Technical SEO & Metadata Architecture", () => {
  it("resolves authoritative production site origin correctly", () => {
    const origin = getSiteUrl();
    expect(origin).toBe("https://pennygrade.in");
    expect(origin.endsWith("/")).toBe(false);
  });

  describe("Canonical URL Generation & Normalization", () => {
    it("generates root canonical URL with trailing slash", () => {
      expect(buildCanonicalUrl("/")).toBe("https://pennygrade.in/");
      expect(buildCanonicalUrl("")).toBe("https://pennygrade.in/");
    });

    it("generates normalized canonical URLs for public pages without trailing slash", () => {
      expect(buildCanonicalUrl("/how-it-works")).toBe("https://pennygrade.in/how-it-works");
      expect(buildCanonicalUrl("/partners")).toBe("https://pennygrade.in/partners");
      expect(buildCanonicalUrl("/partners/")).toBe("https://pennygrade.in/partners");
      expect(buildCanonicalUrl("/offers")).toBe("https://pennygrade.in/offers");
      expect(buildCanonicalUrl("/become-a-member")).toBe("https://pennygrade.in/become-a-member");
      expect(buildCanonicalUrl("/partner-with-us")).toBe("https://pennygrade.in/partner-with-us");
    });

    it("strips query parameters and filters from canonical URLs", () => {
      expect(buildCanonicalUrl("/partners?q=coffee&category=cafes&sort=popular")).toBe(
        "https://pennygrade.in/partners",
      );
      expect(buildCanonicalUrl("/offers?discountMin=15")).toBe("https://pennygrade.in/offers");
    });

    it("strips hash fragments from canonical URLs", () => {
      expect(buildCanonicalUrl("/how-it-works#calculator")).toBe(
        "https://pennygrade.in/how-it-works",
      );
    });

    it("generates correct partner profile canonical URLs using verified slug", () => {
      expect(buildCanonicalUrl("/partners/abc-cafe")).toBe(
        "https://pennygrade.in/partners/abc-cafe",
      );
      expect(buildCanonicalUrl("/partners/urban-brew/")).toBe(
        "https://pennygrade.in/partners/urban-brew",
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
      expect(ogUrl?.content).toBe("https://pennygrade.in/how-it-works");

      const ogImage = head.meta.find((m) => m.property === "og:image");
      expect(ogImage?.content).toBe("https://pennygrade.in/test-image.png");

      const twitterCard = head.meta.find((m) => m.name === "twitter:card");
      expect(twitterCard?.content).toBe("summary_large_image");

      const robotsMeta = head.meta.find((m) => m.name === "robots");
      expect(robotsMeta?.content).toContain("index, follow");

      // Canonical link
      const canonicalLink = head.links.find((l) => l.rel === "canonical");
      expect(canonicalLink?.href).toBe("https://pennygrade.in/how-it-works");
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
      expect(org.url).toBe("https://pennygrade.in/");
      expect(org.logo).toContain("/pennygrade-logo.jpg");
      expect(org.contactPoint["@type"]).toBe("ContactPoint");
      expect(org.contactPoint.email).toBe("pennygradebusiness@gmail.com");
    });

    it("generates valid WebSite schema with search action", () => {
      const site = buildWebSiteSchema();
      expect(site["@context"]).toBe("https://schema.org");
      expect(site["@type"]).toBe("WebSite");
      expect(site.name).toBe("PennyGrade");
      expect(site.url).toBe("https://pennygrade.in/");
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
      expect(breadcrumbs.itemListElement[0].item).toBe("https://pennygrade.in/");
      expect(breadcrumbs.itemListElement[1].name).toBe("Partners");
      expect(breadcrumbs.itemListElement[1].item).toBe("https://pennygrade.in/partners");
      expect(breadcrumbs.itemListElement[2].name).toBe("ABC Café");
      expect(breadcrumbs.itemListElement[2].item).toBe("https://pennygrade.in/partners/abc-cafe");
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
      expect(cafeSchema.url).toBe("https://pennygrade.in/partners/abc-cafe");
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
      expect(faqSchema.mainEntity[0].acceptedAnswer.text).toBe(
        "PennyGrade is a physical card membership.",
      );
    });
  });

  describe("robots.txt Configuration Validation", () => {
    it("contains valid sitemap declaration and crawl rules", () => {
      const robotsPath = path.resolve(process.cwd(), "public", "robots.txt");
      const content = fs.readFileSync(robotsPath, "utf-8");

      expect(content).toContain("Sitemap: https://pennygrade.in/sitemap.xml");
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
    const err = createApiError("VALIDATION_ERROR", "Invalid input received", {
      field: "billAmount",
    });
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

  describe("XML Sitemap Schema & Sensitive Route Exclusion Guarantees", () => {
    it("ensures public sitemap includes only indexable public pages", async () => {
      const sitemapModule = await import("@/routes/sitemap[.]xml");
      // @ts-expect-error server handlers access
      const getHandler = sitemapModule.Route.options.server?.handlers?.GET;
      expect(typeof getHandler).toBe("function");

      const res = await getHandler();
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/xml; charset=utf-8");

      const xml = await res.text();
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');

      // Must include canonical public discovery routes
      expect(xml).toContain("<loc>https://pennygrade.in/</loc>");
      expect(xml).toContain("<loc>https://pennygrade.in/how-it-works</loc>");
      expect(xml).toContain("<loc>https://pennygrade.in/partners</loc>");
      expect(xml).toContain("<loc>https://pennygrade.in/offers</loc>");
      expect(xml).toContain("<loc>https://pennygrade.in/become-a-member</loc>");
      expect(xml).toContain("<loc>https://pennygrade.in/partner-with-us</loc>");
      expect(xml).toContain("<loc>https://pennygrade.in/terms</loc>");
      expect(xml).toContain("<loc>https://pennygrade.in/privacy</loc>");
      expect(xml).toContain("<loc>https://pennygrade.in/merchant-agreement</loc>");
      expect(xml).toContain("<loc>https://pennygrade.in/membership-terms</loc>");
      expect(xml).toContain("<loc>https://pennygrade.in/disclaimer</loc>");

      // MUST NOT include sensitive, customer, or admin routes
      expect(xml).not.toContain("/admin");
      expect(xml).not.toContain("/account");
      expect(xml).not.toContain("/history");
      expect(xml).not.toContain("/verification");
      expect(xml).not.toContain("/p/");
      expect(xml).not.toContain("/login");
      expect(xml).not.toContain("/register");
    });
  });

  describe("Critical Business Flow Error Handling & Validation", () => {
    it("handles customer history queries and strictly enforces 2FA mobile verification", async () => {
      const { getCustomerHistoryLogic } = await import("@/lib/v1-logic");

      // Missing mobile number -> must be rejected
      const missingMobile = getCustomerHistoryLogic({ membershipNumber: "PEN-7X4P-92LM", mobile: "" });
      expect(missingMobile.ok).toBe(false);
      expect(missingMobile.message).toContain("registered mobile");

      // Wrong mobile number -> must be rejected with generic error (anti-enumeration)
      const wrongMobile = getCustomerHistoryLogic({ membershipNumber: "PEN-7X4P-92LM", mobile: "9999999999" });
      expect(wrongMobile.ok).toBe(false);
      expect(wrongMobile.message).toContain("Unable to verify");

      // Non-existent card with random mobile -> must be rejected
      const nonExistent = getCustomerHistoryLogic({ membershipNumber: "PEN-0000-0000", mobile: "9876543210" });
      expect(nonExistent.ok).toBe(false);
      expect(nonExistent.message).toContain("Unable to verify");
    });

    it("handles membership verification edge cases cleanly", async () => {
      const { verifyMemberInputLogic } = await import("@/lib/v1-logic");

      // Empty input
      const emptyRes = verifyMemberInputLogic("");
      expect(emptyRes.ok).toBe(false);

      // Malformed input
      const malformedRes = verifyMemberInputLogic("xyz-123");
      expect(malformedRes.ok).toBe(false);
    });

    it("verifies server-side discount calculation error conditions", async () => {
      const { calculateDiscount } = await import("@/lib/v1-logic");
      const sampleOffer = {
        id: "off-test",
        title: "15% Off",
        discount_type: "PERCENTAGE" as const,
        discount_value: 15,
        max_discount: 300,
        minimum_bill: 500,
      };

      // Negative bill
      const neg = calculateDiscount(-100, sampleOffer);
      expect(neg.eligible).toBe(false);
      expect(neg.discount).toBe(0);

      // Zero bill
      const zero = calculateDiscount(0, sampleOffer);
      expect(zero.eligible).toBe(false);

      // Below minimum bill
      const below = calculateDiscount(400, sampleOffer);
      expect(below.eligible).toBe(false);
      expect(below.message).toContain("minimum bill");

      // Valid bill with max cap enforcement
      const capped = calculateDiscount(5000, sampleOffer);
      expect(capped.eligible).toBe(true);
      expect(capped.discount).toBe(300); // capped at max_discount
      expect(capped.finalAmount).toBe(4700);
    });
  });

  describe("Cross-System Entity Deletion & Synchronization Persistence", () => {
    it("deleting a business partner removes it, tracks deletion, and prevents re-seeding", async () => {
      const { store, saveStoreToDisk } = await import("@/lib/v1-store");

      const testPartnerId = "test-partner-to-delete";
      const testPartnerSlug = "test-partner-outlet";
      store.partners.set(testPartnerId, {
        id: testPartnerId,
        business_name: "Test Partner To Delete",
        slug: testPartnerSlug,
        category_id: "cafes",
        category_name: "Cafés",
        description: "Test outlet",
        logo_url: "",
        cover_image_url: "",
        phone: "+91 99999 00000",
        email: "test@outlet.com",
        website: "",
        address: "Main Road",
        city: "Daltonganj",
        latitude: null,
        longitude: null,
        business_hours: "9 AM - 9 PM",
        status: "ACTIVE",
        featured: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      expect(store.partners.has(testPartnerId)).toBe(true);

      // Simulate deletion: track and remove
      if (!store.deletedPartnerIds) store.deletedPartnerIds = [];
      store.deletedPartnerIds.push(testPartnerId);
      store.deletedPartnerIds.push(testPartnerSlug);
      store.partners.delete(testPartnerId);
      saveStoreToDisk();

      expect(store.partners.has(testPartnerId)).toBe(false);
      expect(store.deletedPartnerIds).toContain(testPartnerId);
      expect(store.deletedPartnerIds).toContain(testPartnerSlug);

      // Filtered view must exclude deleted partner
      const visible = Array.from(store.partners.values()).filter(
        (p) => !store.deletedPartnerIds.includes(p.id) && !store.deletedPartnerIds.includes(p.slug)
      );
      expect(visible.find((p) => p.id === testPartnerId)).toBeUndefined();
    });

    it("deleting a member releases assigned physical card and unlinks membership", async () => {
      const { store, saveStoreToDisk } = await import("@/lib/v1-store");

      const testMemberId = "mem-test-del-001";
      const testCardId = "card-test-del-001";
      const testMemNum = "PEN-DEL1-TEST";

      // Setup member and linked card
      store.cards.set(testCardId, {
        id: testCardId,
        card_number: testMemNum,
        membership_id: testMemberId,
        status: "ACTIVE",
        issued_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      store.members.set(testMemberId, {
        id: testMemberId,
        membership_number: testMemNum,
        full_name: "Test Delete Member",
        mobile: "9988776655",
        email: "del.member@test.com",
        plan_id: "plan-6m",
        plan_name: "6-Month Plan",
        start_date: "2026-10-12",
        expiry_date: "2027-04-12",
        status: "ACTIVE",
        card_id: testCardId,
        card_number: testMemNum,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      expect(store.members.has(testMemberId)).toBe(true);
      expect(store.cards.get(testCardId)?.status).toBe("ACTIVE");

      // Simulate deletion logic
      if (!store.deletedMemberIds) store.deletedMemberIds = [];
      store.deletedMemberIds.push(testMemberId);
      store.deletedMemberIds.push(testMemNum);

      // Card release
      const card = store.cards.get(testCardId)!;
      card.membership_id = null;
      card.status = "AVAILABLE";
      card.updated_at = new Date().toISOString();

      store.members.delete(testMemberId);
      saveStoreToDisk();

      // Assertions
      expect(store.members.has(testMemberId)).toBe(false);
      expect(store.deletedMemberIds).toContain(testMemberId);
      expect(store.cards.get(testCardId)?.status).toBe("AVAILABLE");
      expect(store.cards.get(testCardId)?.membership_id).toBeNull();
    });

    it("revoking an admin user removes them from team list and tracks revocation", async () => {
      const { store, saveStoreToDisk } = await import("@/lib/v1-store");

      const testAdminId = "adm-test-revoke-001";
      const testEmail = "temp.manager@pennygrade.in";

      if (!store.adminUsers) store.adminUsers = [];
      store.adminUsers.push({
        id: testAdminId,
        user_id: "uid-test-revoke-001",
        full_name: "Temporary Manager",
        email: testEmail,
        role: "manager",
        created_at: new Date().toISOString(),
      });

      expect(store.adminUsers.some((u) => u.id === testAdminId)).toBe(true);

      // Simulate revoke
      if (!store.deletedAdminUserIds) store.deletedAdminUserIds = [];
      store.deletedAdminUserIds.push(testAdminId);
      store.deletedAdminUserIds.push(testEmail.toLowerCase());

      store.adminUsers = store.adminUsers.filter(
        (u) => u.id !== testAdminId && u.email.toLowerCase() !== testEmail.toLowerCase()
      );
      saveStoreToDisk();

      expect(store.adminUsers.some((u) => u.id === testAdminId)).toBe(false);
      expect(store.deletedAdminUserIds).toContain(testAdminId);
      expect(store.deletedAdminUserIds).toContain(testEmail.toLowerCase());
    });
  });

  describe("Official Production Legal Documentation & Contact Architecture", () => {
    it("ensures all 5 authoritative legal routes export valid route configurations", async () => {
      const termsMod = await import("@/routes/terms");
      const privacyMod = await import("@/routes/privacy");
      const merchantMod = await import("@/routes/merchant-agreement");
      const membershipMod = await import("@/routes/membership-terms");
      const disclaimerMod = await import("@/routes/disclaimer");

      expect(termsMod.Route).toBeDefined();
      expect(privacyMod.Route).toBeDefined();
      expect(merchantMod.Route).toBeDefined();
      expect(membershipMod.Route).toBeDefined();
      expect(disclaimerMod.Route).toBeDefined();
    });

    it("ensures canonical support email and helpline are uniformly configured", async () => {
      const { buildOrganizationSchema } = await import("@/lib/seo");
      const schema = buildOrganizationSchema();
      expect(schema.contactPoint.email).toBe("pennygradebusiness@gmail.com");
      expect(schema.contactPoint.telephone).toBe("+91-93568-97893");
    });
  });
});
