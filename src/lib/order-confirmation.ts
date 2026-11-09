const PENDING_VERIFIED_ORDER_KEY = "pennygrade:verified-order-for-confirmation";

export type VerifiedOrderHandoff = {
  orderNumber: string;
  paymentStatus: "CAPTURED";
  cardStatus: "ALLOCATED" | "FULFILLMENT_EXCEPTION";
  emailStatus: "PENDING" | "SENT" | "FAILED";
};

type ConfirmationStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** Store only the order whose payment was just verified, for the immediate client navigation. */
export function recordVerifiedOrderForNavigation(
  handoff: VerifiedOrderHandoff,
  storage: ConfirmationStorage | undefined =
    typeof window === "undefined" ? undefined : window.sessionStorage,
): void {
  if (!storage || !handoff.orderNumber) return;
  try {
    storage.setItem(PENDING_VERIFIED_ORDER_KEY, JSON.stringify(handoff));
  } catch {
    // If storage is unavailable, the route falls back to the safe order lookup screen.
  }
}

/** Consume the one-time handoff so a guessed URL cannot assert payment or fulfillment. */
export function consumeVerifiedOrderForNavigation(
  orderNumber: string,
  storage: ConfirmationStorage | undefined =
    typeof window === "undefined" ? undefined : window.sessionStorage,
): VerifiedOrderHandoff | null {
  if (!storage || !orderNumber) return null;
  try {
    const value = storage.getItem(PENDING_VERIFIED_ORDER_KEY);
    if (!value) return null;
    const handoff = JSON.parse(value) as VerifiedOrderHandoff;
    if (handoff.orderNumber !== orderNumber) return null;
    storage.removeItem(PENDING_VERIFIED_ORDER_KEY);
    return handoff;
  } catch {
    return null;
  }
}
