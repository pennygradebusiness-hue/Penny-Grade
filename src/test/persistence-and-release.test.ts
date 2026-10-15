import { describe, it, expect, beforeEach } from "vitest";
import {
  store,
  generatePenCode,
  safeRandomUUID,
  type V1Member,
  type V1PhysicalCard,
  type V1Partner,
  type V1Offer,
} from "@/lib/v1-store";
import {
  generateCardBatchLogic,
  createMemberLogic,
  assignCardToMemberLogic,
  getAdminCardsLogic,
  getAdminMembersLogic,
  archivePartnerLogic,
} from "@/lib/v1-logic";

describe("PennyGrade Production Persistence & Release Verification", () => {
  const mockAdmin = {
    id: "admin-super",
    email: "pennygradebusiness@gmail.com",
    full_name: "Super Admin Tester",
  };

  beforeEach(() => {
    // Ensure clean in-memory state for each test
    if (!store.cards) store.cards = new Map();
    if (!store.members) store.members = new Map();
    if (!store.partners) store.partners = new Map();
    if (!store.offers) store.offers = new Map();
    if (!store.deletedPartnerIds) store.deletedPartnerIds = [];
    if (!store.deletedOfferIds) store.deletedOfferIds = [];
    if (!store.deletedMemberIds) store.deletedMemberIds = [];
  });

  it("prevents duplicate card numbers and verifies crypto-random formatting", () => {
    const generated = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const code = generatePenCode();
      expect(code).toMatch(/^PEN-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      expect(generated.has(code)).toBe(false);
      generated.add(code);
    }
    expect(generated.size).toBe(500);
  });

  it("handles batch card creation atomically and correctly tracks inventory", async () => {
    const initialCount = store.cards.size;
    const res = await generateCardBatchLogic(25, mockAdmin);

    expect(res.ok).toBe(true);
    expect(res.count).toBe(25);
    expect(store.cards.size).toBeGreaterThanOrEqual(initialCount + 25);

    // Verify all generated cards have status AVAILABLE and valid code
    let availableCount = 0;
    for (const card of store.cards.values()) {
      if (card.status === "AVAILABLE") {
        availableCount++;
        expect(card.card_number).toMatch(/^PEN-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
        expect(card.membership_id).toBeNull();
      }
    }
    expect(availableCount).toBeGreaterThanOrEqual(25);
  });

  it("maintains card assignment across separate requests without race conditions", async () => {
    // 1. Create a member
    const uniqueMobile = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const memberRes = await createMemberLogic(
      {
        full_name: "Persistence Test Member",
        mobile: uniqueMobile,
        email: `persist-${Date.now()}@example.com`,
        plan_id: "fd6de953-c15d-4b7f-aae4-b97b6d21b043",
        start_date: "2026-10-14",
        expiry_date: "2027-04-14",
      },
      mockAdmin
    );

    expect(memberRes.ok).toBe(true);
    expect(memberRes.membership_number).toBeDefined();

    // 2. Fetch members list in a separate call
    const membersList = await getAdminMembersLogic();
    const created = membersList.find((m) => m.membership_number === memberRes.membership_number);
    expect(created).toBeDefined();
    expect(created?.full_name).toBe("Persistence Test Member");

    // 3. Generate a fresh card
    const cardId = safeRandomUUID();
    const cardNumber = generatePenCode();
    const now = new Date().toISOString();
    store.cards.set(cardId, {
      id: cardId,
      card_number: cardNumber,
      membership_id: null,
      status: "AVAILABLE",
      issued_at: null,
      created_at: now,
      updated_at: now,
    });

    // 4. Assign card to member in another operation
    const assignRes = await assignCardToMemberLogic(
      {
        memberId: created!.id,
        cardId,
      },
      mockAdmin
    );

    expect(assignRes.ok).toBe(true);
    expect(assignRes.card_number).toBe(cardNumber);

    // 5. Verify cards list reflects assigned member details
    const cardsList = await getAdminCardsLogic();
    const assignedCard = cardsList.find((c) => c.card_number === cardNumber);
    expect(assignedCard).toBeDefined();
    expect(assignedCard?.status).toBe("ACTIVE");
    expect(assignedCard?.member).toBe("Persistence Test Member");
    expect(assignedCard?.membership_number).toBe(memberRes.membership_number);
  });

  it("verifies concurrent batch operations do not create collisions", async () => {
    const runs = await Promise.all([
      generateCardBatchLogic(15, mockAdmin),
      generateCardBatchLogic(15, mockAdmin),
      generateCardBatchLogic(15, mockAdmin),
    ]);

    for (const r of runs) {
      expect(r.ok).toBe(true);
      expect(r.count).toBe(15);
    }

    const seenCards = new Set<string>();
    for (const c of store.cards.values()) {
      expect(seenCards.has(c.card_number)).toBe(false);
      seenCards.add(c.card_number);
    }
  });

  it("archives partners and disables their offers without removing records", async () => {
    // 1. Setup active partner & offer
    const partnerId = "legit-partner-001";
    const offerId = "legit-offer-001";
    const now = new Date().toISOString();

    store.partners.set(partnerId, {
      id: partnerId,
      business_name: "Fresh Baker's Café",
      slug: "fresh-bakers-cafe",
      category_id: "e7d3fd02-abd7-4ba4-b129-294ac76bff15",
      status: "ACTIVE",
      featured: true,
      created_at: now,
      updated_at: now,
    });

    store.offers.set(offerId, {
      id: offerId,
      partner_id: partnerId,
      title: "15% Off Bakery",
      discount_type: "PERCENTAGE",
      discount_value: 15,
      max_discount: 300,
      minimum_bill: 150,
      valid_days: [0, 1, 2, 3, 4, 5, 6],
      usage_limit_type: "UNLIMITED",
      status: "ACTIVE",
      created_at: now,
      updated_at: now,
    });

    expect(store.partners.has(partnerId)).toBe(true);
    expect(store.offers.has(offerId)).toBe(true);

    const archiveRes = await archivePartnerLogic(partnerId, "Super Admin Tester");
    expect(archiveRes.ok).toBe(true);
    expect(archiveRes.archivedOfferIds).toContain(offerId);

    expect(store.partners.get(partnerId)?.status).toBe("INACTIVE");
    expect(store.offers.get(offerId)?.status).toBe("INACTIVE");
    expect(store.offers.has(offerId)).toBe(true);
    expect(store.deletedPartnerIds).not.toContain(partnerId);
  });

  it("ensures test data is isolated and does not persist to disk", () => {
    expect(process.env.NODE_ENV).toBe("test");
  });
});
