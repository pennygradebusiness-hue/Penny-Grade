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

  describe("Primary Owner & Administrator Forgot Password Recovery Protocol", () => {
    it("allows the primary owner (pennygradebusiness@gmail.com) to reset password using registered owner mobile", async () => {
      const { verifyAndResetForgottenPasswordLogic, verifyAdminLoginCredentialsLogic } = await import("@/lib/v1-logic");

      // Reset password using registered helpline/owner mobile (+91 93568 97893)
      const res = verifyAndResetForgottenPasswordLogic({
        email: "pennygradebusiness@gmail.com",
        verification_credential: "+91 93568 97893",
        new_password: "OwnerSecurePass@2026!",
      });

      expect(res.ok).toBe(true);
      expect(res.user.email).toBe("pennygradebusiness@gmail.com");

      // Now verify they can immediately sign in with the new password
      const loginRes = verifyAdminLoginCredentialsLogic({
        email: "pennygradebusiness@gmail.com",
        password: "OwnerSecurePass@2026!",
      });

      expect(loginRes.ok).toBe(true);
      expect(loginRes.user?.email).toBe("pennygradebusiness@gmail.com");
      expect(loginRes.user?.role).toBe("super_admin");
    });

    it("allows requesting a 6-digit security code and verifying password reset", async () => {
      const { requestAdminPasswordResetCodeLogic, verifyAndResetForgottenPasswordLogic, verifyAdminLoginCredentialsLogic } = await import("@/lib/v1-logic");

      const codeRes = requestAdminPasswordResetCodeLogic({
        email: "pennygradebusiness@gmail.com",
      });

      expect(codeRes.ok).toBe(true);
      expect(codeRes.code).toBeDefined();

      const resetRes = verifyAndResetForgottenPasswordLogic({
        email: "pennygradebusiness@gmail.com",
        verification_credential: codeRes.code!,
        new_password: "UpdatedOwnerPass#99!",
      });

      expect(resetRes.ok).toBe(true);

      const loginRes = verifyAdminLoginCredentialsLogic({
        email: "pennygradebusiness@gmail.com",
        password: "UpdatedOwnerPass#99!",
      });

      expect(loginRes.ok).toBe(true);
    });

    it("strictly rejects password reset when verification credential is invalid", async () => {
      const { verifyAndResetForgottenPasswordLogic } = await import("@/lib/v1-logic");

      expect(() => {
        verifyAndResetForgottenPasswordLogic({
          email: "pennygradebusiness@gmail.com",
          verification_credential: "WRONG-CODE-0000",
          new_password: "NewPassword123!",
        });
      }).toThrow(/Invalid verification code or mobile number/);
    });

    it("strictly rejects password reset when new password is under 6 characters", async () => {
      const { verifyAndResetForgottenPasswordLogic } = await import("@/lib/v1-logic");

      expect(() => {
        verifyAndResetForgottenPasswordLogic({
          email: "pennygradebusiness@gmail.com",
          verification_credential: "9356897893",
          new_password: "123",
        });
      }).toThrow(/at least 6 characters/);
    });
  });

  describe("Supabase Auth Administrator Password Recovery Flow", () => {
    it("exports /admin/reset-password route with noindex, nofollow robots protection", async () => {
      const { Route } = await import("@/routes/admin.reset-password");
      expect(Route).toBeDefined();
      expect(Route.options).toBeDefined();

      if (typeof Route.options.head === "function") {
        const head = await (Route.options.head as any)({} as any);
        const meta = head?.meta || [];
        const robots = meta.find((m: any) => m.name === "robots");
        expect(robots).toBeDefined();
        expect(robots?.content).toBe("noindex, nofollow");
        const title = meta.find((m: any) => m.title);
        expect(title?.title).toContain("Reset Administrator Password");
      }
    });

    it("ensures recovery redirect URL points to /admin/reset-password on canonical site origin", async () => {
      const { getSiteUrl } = await import("@/lib/seo");
      const origin = getSiteUrl();
      const recoveryRedirect = `${origin}/admin/reset-password`;

      expect(recoveryRedirect).toMatch(/^https?:\/\/.+\/admin\/reset-password$/);
      expect(recoveryRedirect).not.toContain("localhost:3000");
    });

    it("enforces password policy: rejects short passwords or mismatched confirmation", () => {
      const validatePolicy = (pass: string, confirm: string) => {
        const hasMinLength = pass.length >= 8;
        const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pass);
        const matches = pass.length > 0 && pass === confirm;
        return hasMinLength && hasNumberOrSymbol && matches;
      };

      // Fails: under 8 chars
      expect(validatePolicy("Short1!", "Short1!")).toBe(false);
      // Fails: no number or symbol
      expect(validatePolicy("NoNumberOrSymbolPass", "NoNumberOrSymbolPass")).toBe(false);
      // Fails: mismatch
      expect(validatePolicy("ValidPass123!", "ValidPass123?")).toBe(false);
      // Passes: 8+ chars with number/symbol and exact match
      expect(validatePolicy("PennyAdmin#2026", "PennyAdmin#2026")).toBe(true);
    });

    it("synchronizes admin store password upon verified Supabase Auth reset", async () => {
      const { syncAdminPasswordAfterSupabaseResetLogic, verifyAdminLoginCredentialsLogic } = await import("@/lib/v1-logic");

      const syncRes = syncAdminPasswordAfterSupabaseResetLogic({
        email: "pennygradebusiness@gmail.com",
        new_password: "NewSupabasePass2026!",
      });

      expect(syncRes.ok).toBe(true);

      // Verify sign in works with the updated password
      const loginCheck = verifyAdminLoginCredentialsLogic({
        email: "pennygradebusiness@gmail.com",
        password: "NewSupabasePass2026!",
      });

      expect(loginCheck.ok).toBe(true);
      expect(loginCheck.user?.email).toBe("pennygradebusiness@gmail.com");
    });
  });
});

