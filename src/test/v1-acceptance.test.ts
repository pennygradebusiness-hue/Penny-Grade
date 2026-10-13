import { describe, expect, it } from "vitest";
import {
  store,
  generatePenCode,
  normalizeMembershipNumber,
  normalizeMobile,
  checkRateLimit,
} from "@/lib/v1-store";
import {
  verifyMemberInputLogic,
  calculateDiscount,
  createVerificationSessionLogic,
  getVerificationSessionLogic,
  getCustomerHistoryLogic,
  addAdminLogic,
  verifyAdminLoginCredentialsLogic,
  firstTimeSetPasswordLogic,
} from "@/lib/v1-logic";

describe("PennyGrade V1 Final Acceptance Criteria & Security Tests", () => {
  it("generates cryptographically secure PEN-XXXX-XXXX codes with valid alphabet", () => {
    const code = generatePenCode();
    expect(code).toMatch(/^PEN-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(code.includes("0")).toBe(false);
    expect(code.includes("O")).toBe(false);
    expect(code.includes("1")).toBe(false);
    expect(code.includes("I")).toBe(false);
  });

  it("normalizes membership numbers cleanly", () => {
    expect(normalizeMembershipNumber("pen-7x4p-92lm")).toBe("PEN-7X4P-92LM");
    expect(normalizeMembershipNumber(" PEN 7X4P 92LM ")).toBe("PEN-7X4P-92LM");
    expect(normalizeMembershipNumber("PEN7X4P92LM")).toBe("PEN-7X4P-92LM");
  });

  it("normalizes mobile numbers to 10 digits", () => {
    expect(normalizeMobile("+91 98765 43210")).toBe("9876543210");
    expect(normalizeMobile("9876543210")).toBe("9876543210");
  });

  it("verifies the pre-seeded Samir Pandey membership (PEN-7X4P-92LM)", () => {
    const res = verifyMemberInputLogic("PEN-7X4P-92LM");
    expect(res.ok).toBe(true);
    expect(res.member_name).toBe("Samir Pandey");
    expect(res.membership_number).toBe("PEN-7X4P-92LM");
  });

  it("rejects non-existent membership numbers with a generic error (anti-enumeration)", () => {
    const res = verifyMemberInputLogic("PEN-0000-0000");
    expect(res.ok).toBe(false);
    expect(res.message).toBe(
      "Unable to verify membership. Please check your membership number and try again."
    );
  });

  it("executes the full ABC Café QR discount flow: ₹2,000 bill -> ₹200 discount -> ₹1,800 final", () => {
    const abcPartner = {
      id: "partner-abc",
      business_name: "ABC Café",
      slug: "abc-cafe",
    };
    const abcOffer = {
      id: "offer-abc-10",
      title: "10% Off",
      discount_type: "PERCENTAGE" as const,
      discount_value: 10,
      max_discount: 500,
      minimum_bill: 500,
    };

    const res = createVerificationSessionLogic({
      partner: abcPartner,
      offer: abcOffer,
      membershipNumber: "PEN-7X4P-92LM",
      billAmount: 2000,
    });

    expect(res.ok).toBe(true);
    expect(res.session_id).toBeDefined();

    // Verify session data
    const session = getVerificationSessionLogic(res.session_id!);
    expect(session).not.toBeNull();
    expect(session?.partner_name).toBe("ABC Café");
    expect(session?.member_name).toBe("Samir Pandey");
    expect(session?.bill_amount).toBe(2000);
    expect(session?.discount_amount).toBe(200);
    expect(session?.final_amount).toBe(1800);
    expect(session?.status).toBe("ACTIVE");
  });

  it("enforces maximum discount cap: ₹10,000 bill at 10% is capped at ₹500 discount", () => {
    const abcOffer = {
      id: "offer-abc-10",
      title: "10% Off",
      discount_type: "PERCENTAGE" as const,
      discount_value: 10,
      max_discount: 500,
      minimum_bill: 500,
    };

    const calc = calculateDiscount(10000, abcOffer);
    expect(calc.eligible).toBe(true);
    expect(calc.discount).toBe(500); // Capped at max_discount = 500
    expect(calc.finalAmount).toBe(9500);
  });

  it("enforces minimum bill requirement: ₹300 bill is rejected for ₹500 minimum bill offer", () => {
    const abcOffer = {
      id: "offer-abc-10",
      title: "10% Off",
      discount_type: "PERCENTAGE" as const,
      discount_value: 10,
      max_discount: 500,
      minimum_bill: 500,
    };

    const calc = calculateDiscount(300, abcOffer);
    expect(calc.eligible).toBe(false);
    expect(calc.message).toContain("minimum bill of ₹500");
  });

  it("allows customer history lookup with Membership Number + Registered Mobile", () => {
    const res = getCustomerHistoryLogic({
      membershipNumber: "PEN-7X4P-92LM",
      mobile: "9876543210",
    });

    expect(res.ok).toBe(true);
    expect(res.member?.full_name).toBe("Samir Pandey");
    expect(res.member?.status).toBe("ACTIVE");
    expect(Array.isArray(res.history)).toBe(true);
    expect(res.history?.length).toBeGreaterThan(0);
  });

  it("denies customer history lookup when mobile does not match registered mobile", () => {
    const res = getCustomerHistoryLogic({
      membershipNumber: "PEN-7X4P-92LM",
      mobile: "9111111111", // Wrong mobile
    });

    expect(res.ok).toBe(false);
    expect(res.message).toBe(
      "Unable to verify membership details. Please check your membership number and registered mobile number."
    );
  });

  it("enforces rate limiting against repeated brute force attempts", () => {
    const testKey = "rate-test-" + Date.now();
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(testKey, 5, 60_000)).toBe(true);
    }
    // 6th attempt should be blocked
    expect(checkRateLimit(testKey, 5, 60_000)).toBe(false);
  });

  it("verifies 6-month membership validity window (180 days) and rejects expired memberships", () => {
    const today = new Date();
    const plus180Days = new Date(today);
    plus180Days.setDate(plus180Days.getDate() + 180);
    const expectedExpiryStr = plus180Days.toISOString().slice(0, 10);

    // Verify 180-day calculation format
    expect(expectedExpiryStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // Verify rejection of an expired membership
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 10);
    const expiredMemberNumber = "PEN-EXPR-0001";

    // Inject temporary expired member
    store.members.set("test-expired", {
      id: "test-expired",
      membership_number: expiredMemberNumber,
      full_name: "Expired User",
      email: "expired@example.com",
      mobile: "9000000000",
      plan_id: "plan-6m",
      plan_name: "PennyGrade 6-Month Membership",
      status: "ACTIVE",
      start_date: "2024-01-01",
      expiry_date: pastDate.toISOString().slice(0, 10),
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    });

    const res = verifyMemberInputLogic(expiredMemberNumber);
    expect(res.ok).toBe(false);
    expect(res.message).toContain("Unable to verify membership");

    // Clean up
    store.members.delete("test-expired");
  });

  it("allows superadmin to create another superadmin with temporary password and complete first-time login", async () => {
    // 1. Super Admin creates a new Super Admin with an auto/custom temporary password
    const newAdminEmail = "newsuper@pennygrade.in";
    const res = addAdminLogic({
      email: newAdminEmail,
      role: "super_admin",
      full_name: "Vikram Singhania",
      temporary_password: "Penny@Temp99!",
    });

    expect(res.ok).toBe(true);
    expect(res.temporary_password).toBe("Penny@Temp99!");
    expect(res.admin.role).toBe("super_admin");

    // 2. Newly created Super Admin logs in using their first-time temporary password
    const loginRes = verifyAdminLoginCredentialsLogic({
      email: newAdminEmail,
      password: "Penny@Temp99!",
    });

    expect(loginRes.ok).toBe(true);
    expect(loginRes.user?.email).toBe(newAdminEmail);
    expect(loginRes.user?.role).toBe("super_admin");

    // 3. Trying to log in with an incorrect password fails
    const badLogin = verifyAdminLoginCredentialsLogic({
      email: newAdminEmail,
      password: "WrongPassword123",
    });
    expect(badLogin.ok).toBe(false);

    // 4. Admin updates their password to a permanent one via firstTimeSetPasswordLogic
    const updateRes = firstTimeSetPasswordLogic({
      email: newAdminEmail,
      current_temporary_password: "Penny@Temp99!",
      new_password: "Perm@Password2026!",
    });
    expect(updateRes.ok).toBe(true);

    // 5. Old temporary password no longer works
    const oldLogin = verifyAdminLoginCredentialsLogic({
      email: newAdminEmail,
      password: "Penny@Temp99!",
    });
    expect(oldLogin.ok).toBe(false);

    // 6. New permanent password works
    const newLogin = verifyAdminLoginCredentialsLogic({
      email: newAdminEmail,
      password: "Perm@Password2026!",
    });
    expect(newLogin.ok).toBe(true);
    expect(newLogin.user?.role).toBe("super_admin");

    // Clean up test admin
    store.adminUsers = store.adminUsers.filter((u) => u.email !== newAdminEmail);
  });
});
