import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createRazorpayOrder, fetchRazorpayPayment, getPublicRazorpayKeyId, isRazorpayPaymentCaptured, razorpayPaymentMatchesOrder, verifyRazorpayPaymentSignature } from "./razorpay.service";
import { getServiceRoleClient } from "./supabase-admin.server";
import { requireAdminAuth } from "./admin-auth.server";
import { generatePenCode, safeRandomUUID } from "./v1-store";

const campaignFields = z.object({
  id: z.string().uuid().optional(), title: z.string().trim().min(3).max(120),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  summary: z.string().trim().min(10).max(400), description: z.string().trim().min(10).max(10000),
  benefits: z.array(z.string().trim().min(2).max(300)).max(20), amount: z.number().positive().max(100000),
  booking_opens_at: z.string().datetime(), booking_closes_at: z.string().datetime(),
  benefit_starts_at: z.string().datetime().nullable(), benefit_ends_at: z.string().datetime().nullable(),
  terms_and_refunds: z.string().trim().min(20).max(10000), popup_enabled: z.boolean(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"]),
});
const bookingInput = z.object({ campaignId: z.string().uuid(), fullName: z.string().trim().min(2).max(100), email: z.string().trim().email().max(120), mobile: z.string().trim().regex(/^\+?[0-9 ()-]{10,16}$/), acceptedTerms: z.literal(true) });

export type PrebookingCampaignInput = z.infer<typeof campaignFields>;

export const createPrebookingOrder = createServerFn({ method: "POST" }).inputValidator((d: unknown) => bookingInput.parse(d)).handler(async ({ data }) => {
  const db = getServiceRoleClient();
  if (!db) throw new Error("Booking is temporarily unavailable.");
  const { data: campaign, error } = await (db as any).from("prebooking_campaigns").select("id,title,amount,booking_opens_at,booking_closes_at,status").eq("id", data.campaignId).maybeSingle();
  const now = Date.now();
  if (error || !campaign || campaign.status !== "ACTIVE" || now < Date.parse(campaign.booking_opens_at) || now >= Date.parse(campaign.booking_closes_at)) throw new Error("This campaign is not accepting bookings right now.");
  const amount = Number(campaign.amount);
  if (!Number.isSafeInteger(Math.round(amount * 100)) || amount <= 0) throw new Error("Campaign price is invalid.");
  const id = safeRandomUUID();
  const reservationNumber = `PGB-${generatePenCode().slice(4)}`;
  const order = await createRazorpayOrder({ amountInPaise: Math.round(amount * 100), currency: "INR", receipt: reservationNumber, notes: { prebookingId: id, campaignId: campaign.id, campaignTitle: campaign.title } });
  const { error: insertError } = await (db as any).rpc("create_prebooking_order", { p_id: id, p_reservation_number: reservationNumber, p_campaign_id: campaign.id, p_customer_name: data.fullName, p_customer_email: data.email, p_customer_phone: data.mobile, p_amount: amount, p_razorpay_order_id: order.id, p_terms_accepted: data.acceptedTerms });
  if (insertError) throw new Error("Could not reserve this campaign. Refresh and retry.");
  return { ok: true, orderId: id, reservationNumber, razorpayOrderId: order.id, razorpayKeyId: getPublicRazorpayKeyId(), amount, currency: "INR", campaignTitle: campaign.title, customer: { name: data.fullName, email: data.email, mobile: data.mobile } };
});

export const verifyPrebookingPayment = createServerFn({ method: "POST" }).inputValidator((d: unknown) => z.object({ razorpayOrderId: z.string().min(1), razorpayPaymentId: z.string().min(1), razorpaySignature: z.string().min(1) }).parse(d)).handler(async ({ data }) => {
  if (!verifyRazorpayPaymentSignature({ razorpayOrderId: data.razorpayOrderId, razorpayPaymentId: data.razorpayPaymentId, razorpaySignature: data.razorpaySignature })) throw new Error("Payment signature could not be verified.");
  const db = getServiceRoleClient();
  if (!db) throw new Error("Payment confirmation is temporarily unavailable.");
  const { data: order, error } = await (db as any).from("prebooking_orders").select("id,reservation_number,customer_name,customer_email,amount,currency,payment_status,campaign:prebooking_campaigns(title)").eq("razorpay_order_id", data.razorpayOrderId).maybeSingle();
  if (error || !order) throw new Error("Prebooking order could not be found.");
  const payment = await fetchRazorpayPayment(data.razorpayPaymentId);
  if (!razorpayPaymentMatchesOrder(payment, { orderId: data.razorpayOrderId, amountInPaise: Math.round(Number(order.amount) * 100), currency: order.currency }) || !isRazorpayPaymentCaptured(payment)) throw new Error("Razorpay has not confirmed this payment yet.");
  const { data: result, error: completeError } = await (db as any).rpc("complete_prebooking_order", { p_razorpay_order_id: data.razorpayOrderId, p_razorpay_payment_id: data.razorpayPaymentId, p_razorpay_signature: data.razorpaySignature });
  if (completeError || !result?.ok) throw new Error("Payment is confirmed but the booking needs support review.");
  const { sendPrebookingConfirmation } = await import("./prebooking.email");
  const email = await sendPrebookingConfirmation({ ...order, campaign: Array.isArray(order.campaign) ? order.campaign[0] : order.campaign });
  if (!email.ok) console.error("[Prebooking] Payment receipt email needs retry", { orderId: order.id, error: email.error });
  return { ok: true, reservationNumber: result.reservation_number || order.reservation_number };
});

export const getAdminPrebookingCampaigns = createServerFn({ method: "GET" }).handler(async () => {
  requireAdminAuth(["super_admin", "manager"]);
  const db = getServiceRoleClient(); if (!db) throw new Error("Campaign storage is unavailable.");
  const { data, error } = await (db as any).from("prebooking_campaigns").select("*").order("created_at", { ascending: false });
  if (error) throw new Error("Could not load campaigns."); return data || [];
});

export const savePrebookingCampaign = createServerFn({ method: "POST" }).inputValidator((d: unknown) => campaignFields.parse(d)).handler(async ({ data }) => {
  requireAdminAuth(["super_admin", "manager"]);
  const db = getServiceRoleClient(); if (!db) throw new Error("Campaign storage is unavailable.");
  if (data.status === "ACTIVE" && data.benefits.length === 0) throw new Error("Add at least one specific, customer-facing benefit before publishing.");
  if (Date.parse(data.booking_closes_at) <= Date.parse(data.booking_opens_at)) throw new Error("Booking close time must be after open time.");
  const values = { ...data, updated_at: new Date().toISOString() };
  const { data: saved, error } = await (db as any).from("prebooking_campaigns").upsert(values).select().single();
  if (error) throw new Error(`Could not save campaign: ${error.message}`); return saved;
});

export const getAdminPrebookingOrders = createServerFn({ method: "GET" }).handler(async () => {
  requireAdminAuth(["super_admin", "manager"]);
  const db = getServiceRoleClient(); if (!db) throw new Error("Booking storage is unavailable.");
  const { data, error } = await (db as any).from("prebooking_orders").select("*,campaign:prebooking_campaigns(title,slug)").order("created_at", { ascending: false }).limit(500);
  if (error) throw new Error("Could not load prebooking orders."); return data || [];
});
