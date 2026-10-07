export const inr = (n: number | string | null | undefined) =>
  "₹" + Number(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export type OfferLike = {
  discount_type: "PERCENTAGE" | "FIXED";
  discount_value: number;
  max_discount: number | null;
  minimum_bill: number;
};

export const offerHeadline = (o: OfferLike) =>
  o.discount_type === "PERCENTAGE" ? `${Number(o.discount_value)}% OFF` : `${inr(o.discount_value)} OFF`;

export const offerSub = (o: OfferLike) =>
  o.discount_type === "PERCENTAGE" && o.max_discount ? `Up to ${inr(o.max_discount)}` : "Flat discount";

export const maskId = (id?: string | null) => {
  if (!id) return "—";
  const parts = id.split("-");
  return parts.length === 3 ? `${parts[0]}-••••-${parts[2]}` : id;
};

export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const formatDays = (days: number[]) =>
  days.length === 7 ? "Monday – Sunday" : [...days].sort().map((d) => DAYS[d]).join(", ");

export const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—";
export const fmtTime = (d: string) =>
  new Date(d).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
export const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export function relDay(d: string) {
  const date = new Date(d);
  const today = new Date();
  const y = new Date(); y.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return `Today, ${fmtTime(d)}`;
  if (date.toDateString() === y.toDateString()) return `Yesterday, ${fmtTime(d)}`;
  return fmtDateTime(d);
}

export function effectiveStatus(m: { status: string; expiry_date: string }) {
  if (m.status === "ACTIVE" && new Date(m.expiry_date) < new Date(new Date().toDateString())) return "EXPIRED";
  return m.status;
}

export const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
