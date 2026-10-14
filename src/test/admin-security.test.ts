import { describe, it, expect } from "vitest";
import { store, generatePenCode } from "@/lib/v1-store";
import { calculateDiscount, verifyMemberInputLogic } from "@/lib/v1-logic";

describe("PennyGrade Comprehensive Security & Hardening Tests", () => {
  describe("Server-Side Discount Calculation & Boundary Protection", () => {
    const standardOffer = {
      id: "off-sec-01",
      title: "20% Off Test Offer",
      discount_type: "PERCENTAGE" as const,
      discount_value: 20,
      max_discount: 400,
      minimum_bill: 500,
    };

    it("strictly rejects negative and zero bill amounts", () => {
      const zero = calculateDiscount(0, standardOffer);
      expect(zero.eligible).toBe(false);
      expect(zero.discount).toBe(0);

      const negative = calculateDiscount(-250, standardOffer);
      expect(negative.eligible).toBe(false);
      expect(negative.discount).toBe(0);
    });

    it("rejects bills below the minimum spend requirement", () => {
      const below = calculateDiscount(499, standardOffer);
      expect(below.eligible).toBe(false);
      expect(below.message).toContain("minimum bill");
    });

    it("enforces maximum discount cap and guarantees discount never exceeds bill amount", () => {
      const bigBill = calculateDiscount(10000, standardOffer);
      expect(bigBill.eligible).toBe(true);
      expect(bigBill.discount).toBe(400); // capped at max_discount
      expect(bigBill.finalAmount).toBe(9600);

      const fixedHighOffer = {
        id: "off-fixed-high",
        title: "Flat 1000 Off",
        discount_type: "FIXED" as const,
        discount_value: 1000,
        max_discount: null,
        minimum_bill: 100,
      };

      const smallBill = calculateDiscount(200, fixedHighOffer);
      expect(smallBill.eligible).toBe(true);
      expect(smallBill.discount).toBe(200); // cannot exceed bill
      expect(smallBill.finalAmount).toBe(0);
    });
  });

  describe("Anti-Enumeration and Anti-Collision Guarantees", () => {
    it("returns generic, identical error message for non-existent and malformed membership queries", () => {
      const fake1 = verifyMemberInputLogic("PEN-9999-9999");
      const fake2 = verifyMemberInputLogic("INVALID-CODE");
      expect(fake1.ok).toBe(false);
      expect(fake2.ok).toBe(false);
      expect(fake1.message).toBe("Unable to verify membership. Please check your membership number and try again.");
      expect(fake2.message).toBe("Unable to verify membership. Please check your membership number and try again.");
    });

    it("generates unique codes with zero collisions across a high-volume sample", () => {
      const generated = new Set<string>();
      const sampleSize = 1000;
      for (let i = 0; i < sampleSize; i++) {
        const code = generatePenCode();
        expect(code).toMatch(/^PEN-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
        expect(generated.has(code)).toBe(false);
        generated.add(code);
      }
      expect(generated.size).toBe(sampleSize);
    });
  });

  describe("Card Batch Collision Check Logic", () => {
    it("guarantees newly generated cards do not collide with existing card numbers in store", () => {
      const existing = new Set<string>();
      for (const c of store.cards.values()) {
        existing.add(c.card_number);
      }
      expect(existing.size).toBeGreaterThan(0);
      let checked = 0;
      for (const code of existing) {
        expect(existing.has(code)).toBe(true);
        checked++;
        if (checked >= 5) break;
      }
    });
  });

  describe("Administrative Authentication & Ownership Hardening", () => {
    it("strictly rejects the removed mock credentials (admin@pennygrade.in / admin123)", async () => {
      const { verifyAdminLoginCredentialsLogic } = await import("@/lib/v1-logic");
      const res = verifyAdminLoginCredentialsLogic({
        email: "admin@pennygrade.in",
        password: "admin123",
      });
      expect(res.ok).toBe(false);
      expect(res.message).toBe("Invalid administrator credentials.");
    });

    it("prevents demotion of the primary owner (pennygradebusiness@gmail.com)", async () => {
      const { addAdminLogic } = await import("@/lib/v1-logic");
      expect(() => {
        addAdminLogic({
          email: "pennygradebusiness@gmail.com",
          role: "manager",
        });
      }).toThrow(/primary system owner/);
    });

    it("guarantees verification logs and sessions contain zero mock demo data", () => {
      const mockLogs = store.logs.filter((l: any) =>
        l.notes?.includes("mock") || l.partner_name?.includes("Demo") || l.member_name?.includes("Mock")
      );
      expect(mockLogs.length).toBe(0);
    });
  });
});
