export type PaymentPhase = "idle" | "initializing" | "gateway" | "verifying";

export function classifyPaymentReplay(
  paymentStatus: string,
  storedPaymentId: string | null | undefined,
  incomingPaymentId: string,
): "NEW_PAYMENT" | "SAME_PAYMENT_REPLAY" | "DIFFERENT_PAYMENT_MISMATCH" {
  if (paymentStatus !== "PAID") return "NEW_PAYMENT";
  return storedPaymentId === incomingPaymentId ? "SAME_PAYMENT_REPLAY" : "DIFFERENT_PAYMENT_MISMATCH";
}

/**
 * Razorpay can dismiss its modal after a successful payment handler starts.
 * Only a user dismissal while the gateway is still open may unlock checkout.
 */
export function shouldReleasePaymentLockOnGatewayDismiss(phase: PaymentPhase) {
  return phase === "gateway";
}

export function isPaymentLocked(phase: PaymentPhase) {
  return phase !== "idle";
}

export function needsPaymentBlockingOverlay(phase: PaymentPhase) {
  return phase === "initializing" || phase === "verifying";
}
