export const MEMBERSHIP_CART_KEY = "pennygrade-membership-card-cart";

export function isMembershipCardInCart(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(MEMBERSHIP_CART_KEY) === "1";
}

export function setMembershipCardInCart(added: boolean): void {
  if (typeof window === "undefined") return;
  if (added) window.localStorage.setItem(MEMBERSHIP_CART_KEY, "1");
  else window.localStorage.removeItem(MEMBERSHIP_CART_KEY);
}
