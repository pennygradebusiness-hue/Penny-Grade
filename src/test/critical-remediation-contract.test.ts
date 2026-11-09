import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20261111000001_critical_partner_and_payment_guards.sql",
  "utf8",
);

describe("critical-remediation migration contract (static checks, not DB integration)", () => {
  it("moves partner evidence behind admin-only RLS and excludes incomplete history", () => {
    expect(migration).toMatch(/CREATE TABLE IF NOT EXISTS public\.partner_private_evidence/i);
    expect(migration).toMatch(/REVOKE ALL ON public\.partner_private_evidence FROM PUBLIC, anon/i);
    expect(migration).toMatch(/REVOKE ALL ON FUNCTION public\.partner_has_complete_evidence\(uuid\) FROM PUBLIC, anon, authenticated/i);
    expect(migration).toMatch(/partner_is_publicly_eligible/);
    expect(migration).toMatch(/Admins read partner private evidence/i);
    expect(migration).toMatch(/Managers manage partner private evidence/i);
    expect(migration).toMatch(/UPDATE public\.offers[\s\S]*?NOT public\.partner_has_complete_evidence/i);
    expect(migration).toMatch(/UPDATE public\.partners[\s\S]*?NOT public\.partner_has_complete_evidence/i);
    expect(migration).toMatch(/DROP COLUMN representative_name[\s\S]*?DROP COLUMN benefit_dispute_contact/i);
  });

  it("serializes payment fulfillment and rejects mismatched or reused payment IDs", () => {
    expect(migration).toMatch(/FROM public\.membership_orders WHERE id = p_order_id FOR UPDATE/i);
    expect(migration).toMatch(/v_order\.razorpay_payment_id IS DISTINCT FROM p_razorpay_payment_id/i);
    expect(migration).toMatch(/idx_membership_orders_razorpay_payment_id_unique/i);
    expect(migration).toMatch(/PAYMENT_ID_ALREADY_USED/i);
    expect(migration).toMatch(/CARD_ALREADY_ASSIGNED/i);
  });

  it("guards manual card allocation with paid status and eligible fulfilment states", () => {
    const assignmentFunction = migration.slice(migration.indexOf("CREATE OR REPLACE FUNCTION public.admin_assign_card_to_order"));
    expect(assignmentFunction).toMatch(/v_order\.payment_status <> 'PAID'/i);
    expect(assignmentFunction).toMatch(/'CANCELLED', 'SHIPPED', 'DELIVERED'/i);
    expect(assignmentFunction).toMatch(/status = 'AVAILABLE'/i);
  });

  it("does not show client-side exact savings or overstate callback fulfilment", () => {
    const detailPage = readFileSync("src/routes/partners.$slug.tsx", "utf8");
    const emailService = readFileSync("src/lib/email.service.ts", "utf8");
    const confirmationPage = readFileSync("src/routes/order-confirmation.$orderNumber.tsx", "utf8");
    const legacyLogic = readFileSync("src/lib/v1-logic.ts", "utf8");
    expect(detailPage).not.toMatch(/Calculate Your Exact Savings|estimatedSavings|estimatedPayable/);
    expect(emailService).not.toMatch(/Reserved & In Preparation|Queued for Packing/);
    expect(confirmationPage).not.toMatch(/Card Reserved!|Confirmation Email Sent:/);
    expect(confirmationPage).toMatch(/confirmation\.cardStatus/);
    expect(confirmationPage).toMatch(/confirmation\.emailStatus/);
    expect(legacyLogic).not.toMatch(/calculateDiscount|createVerificationSessionLogic/);
  });
});
