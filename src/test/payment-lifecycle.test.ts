import { describe, expect, it } from "vitest";
import {
  classifyPaymentReplay,
  isPaymentLocked,
  needsPaymentBlockingOverlay,
  shouldReleasePaymentLockOnGatewayDismiss,
} from "@/lib/payment-lifecycle";

describe("payment lifecycle", () => {
  it("treats same-payment retries as idempotent and rejects a different captured payment ID", () => {
    expect(classifyPaymentReplay("PENDING", null, "pay_new")).toBe("NEW_PAYMENT");
    expect(classifyPaymentReplay("PAID", "pay_same", "pay_same")).toBe("SAME_PAYMENT_REPLAY");
    expect(classifyPaymentReplay("PAID", "pay_original", "pay_other")).toBe("DIFFERENT_PAYMENT_MISMATCH");
  });

  it("keeps checkout locked while payment verification is in progress", () => {
    expect(isPaymentLocked("verifying")).toBe(true);
    expect(needsPaymentBlockingOverlay("verifying")).toBe(true);
  });

  it("does not unlock checkout when Razorpay dismisses after the success handler begins", () => {
    expect(shouldReleasePaymentLockOnGatewayDismiss("verifying")).toBe(false);
    expect(shouldReleasePaymentLockOnGatewayDismiss("gateway")).toBe(true);
  });
});
