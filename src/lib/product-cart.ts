export const MEMBERSHIP_CART_KEY = "pennygrade-membership-card-cart";

export function getMembershipCartPlanId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(MEMBERSHIP_CART_KEY);
}

export function isMembershipCardInCart(): boolean {
  return getMembershipCartPlanId() !== null;
}

export function setMembershipCardInCart(planId: string | null): void {
  if (typeof window === "undefined") return;
  if (planId) window.localStorage.setItem(MEMBERSHIP_CART_KEY, planId);
  else window.localStorage.removeItem(MEMBERSHIP_CART_KEY);
}
