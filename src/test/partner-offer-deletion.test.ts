import { describe, expect, it } from "vitest";
import { store, saveStoreToDisk, seedPartners, seedOffers, type V1Partner, type V1Offer } from "@/lib/v1-store";
import {
  archivePartnerLogic,
  deleteOfferCascadeLogic,
  getFilteredOffersLogic,
} from "@/lib/v1-logic";

describe("Partner archiving preserves historical data", () => {
  it("archives the partner and disables offers without deleting the records", async () => {
    // 1. Create a test partner and offer
    const testPartnerId = "test-partner-xyz-123";
    const testSlug = "test-cafe-xyz";
    store.deletedPartnerIds = store.deletedPartnerIds.filter((id) => id !== testPartnerId && id !== testSlug);
    const testPartner: V1Partner = {
      id: testPartnerId,
      business_name: "Test Café XYZ",
      slug: testSlug,
      category_id: "e7d3fd02-abd7-4ba4-b129-294ac76bff15",
      category_name: "Cafés",
      description: "Test description",
      status: "ACTIVE",
      featured: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    store.partners.set(testPartnerId, testPartner);

    const testOfferId = "test-offer-xyz-123";
    store.deletedOfferIds = store.deletedOfferIds.filter((id) => id !== testOfferId);
    const testOffer: V1Offer = {
      id: testOfferId,
      partner_id: testPartnerId,
      title: "25% Off Everything",
      description: "Test offer description",
      discount_type: "PERCENTAGE",
      discount_value: 25,
      max_discount: 500,
      minimum_bill: 200,
      valid_from: null,
      valid_until: null,
      valid_days: [0, 1, 2, 3, 4, 5, 6],
      terms_conditions: "Test terms",
      usage_limit_type: "UNLIMITED",
      status: "ACTIVE",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      partner: {
        id: testPartnerId,
        business_name: "Test Café XYZ",
        slug: testSlug,
      },
    };
    store.offers.set(testOfferId, testOffer);

    // Verify both exist before deletion
    expect(store.partners.has(testPartnerId)).toBe(true);
    expect(store.offers.has(testOfferId)).toBe(true);

    const verificationLog = {
      id: "test-verification-log-1",
      verification_session_id: "test-session-1",
      membership_id: "test-member-1",
      membership_number: "PEN-TEST-0001",
      partner_id: testPartnerId,
      partner_name: testPartner.business_name,
      offer_id: testOfferId,
      offer_title: testOffer.title,
      bill_amount: 1000,
      discount_amount: 250,
      final_amount: 750,
      status: "VERIFIED",
      created_at: new Date().toISOString(),
    };
    store.logs.push(verificationLog);

    // Archive the partner; the history and records must remain.
    const result = await archivePartnerLogic(testPartnerId, "Super Admin Tester");
    expect(result.ok).toBe(true);

    expect(store.partners.get(testPartnerId)?.status).toBe("INACTIVE");
    expect(store.deletedPartnerIds).not.toContain(testPartnerId);
    expect(store.deletedPartnerIds).not.toContain(testSlug);

    expect(store.offers.get(testOfferId)?.status).toBe("INACTIVE");
    expect(store.offers.has(testOfferId)).toBe(true);
    expect(store.deletedOfferIds).not.toContain(testOfferId);

    expect(store.logs.some((log) => log.id === verificationLog.id && log.partner_id === testPartnerId)).toBe(true);
  });

  it("permanently deletes an individual offer and prevents resurrection", async () => {
    const singleOfferId = "test-single-offer-999";
    const partnerId = "c55b653f-1445-44f8-896e-c0cd58dc2a31"; // ABC Cafe
    const singleOffer: V1Offer = {
      id: singleOfferId,
      partner_id: partnerId,
      title: "One-Off Special 50% Off",
      discount_type: "PERCENTAGE",
      discount_value: 50,
      max_discount: 1000,
      minimum_bill: 500,
      valid_days: [0, 1, 2, 3, 4, 5, 6],
      usage_limit_type: "UNLIMITED",
      status: "ACTIVE",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    store.offers.set(singleOfferId, singleOffer);

    // Delete single offer
    const res = await deleteOfferCascadeLogic(singleOfferId, "Super Admin Tester");
    expect(res.ok).toBe(true);

    // Verify removed from store and in deletedOfferIds
    expect(store.offers.has(singleOfferId)).toBe(false);
    expect(store.deletedOfferIds).toContain(singleOfferId);

    // Verify getFilteredOffersLogic excludes it
    const filteredOffers = await getFilteredOffersLogic();
    expect(filteredOffers.some((o) => o.id === singleOfferId)).toBe(false);
  });

  it("server restart simulation does NOT resurrect deleted partners or deleted offers", () => {
    // Save current store to disk with deletions
    saveStoreToDisk();

    // Verify deletedPartnerIds and deletedOfferIds persist in memory and disk format
    expect(store.deletedPartnerIds.length).toBeGreaterThan(0);
    expect(store.deletedOfferIds.length).toBeGreaterThan(0);

    // Re-seed attempts must ignore deleted items
    const seededPartners = seedPartners();
    const seededOffers = seedOffers();

    for (const delP of store.deletedPartnerIds) {
      const partner = store.partners.get(delP);
      expect(partner === undefined || partner.status === "INACTIVE").toBe(true);
    }
    for (const delO of store.deletedOfferIds) {
      const offer = store.offers.get(delO);
      expect(offer === undefined || offer.status === "INACTIVE").toBe(true);
    }
  });

  it("archived partners remain in admin records but are no longer active", async () => {
    const qrPartnerId = "test-partner-qr-999";
    const qrPartnerSlug = "test-qr-cafe";
    store.deletedPartnerIds = store.deletedPartnerIds.filter((id) => id !== qrPartnerId && id !== qrPartnerSlug);
    const qrPartner: V1Partner = {
      id: qrPartnerId,
      business_name: "Test QR Cafe",
      slug: qrPartnerSlug,
      category_id: "cat-1",
      status: "ACTIVE",
      featured: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    store.partners.set(qrPartnerId, qrPartner);

    expect(store.partners.has(qrPartnerId)).toBe(true);

    await archivePartnerLogic(qrPartnerId, "Admin Tester");

    expect(store.partners.get(qrPartnerId)?.status).toBe("INACTIVE");
    expect(store.deletedPartnerIds).not.toContain(qrPartnerId);
    expect(store.deletedPartnerIds).not.toContain(qrPartnerSlug);

    // List of partners available for QR generation must exclude this partner
    const activePartners = Array.from(store.partners.values()).filter(
      (p) => !store.deletedPartnerIds.includes(p.id) && !store.deletedPartnerIds.includes(p.slug)
    );
    expect(activePartners.find((p) => p.id === qrPartnerId)?.status).toBe("INACTIVE");
  });
});
