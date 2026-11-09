import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  createMembershipOrderLogic,
  verifyPaymentAndFulfillOrderLogic,
  getOrderTrackingDetailsLogic,
  CheckoutInputSchema,
  DEFAULT_PLANS,
  type CheckoutInput,
  type PublicPlan,
} from "./orders.logic";

export type { PublicPlan, CheckoutInput };

/**
 * 1. Public catalog read for active membership plans
 */
export const getPublicMembershipPlans = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicPlan[]> => {
    try {
      const { getServerSupabase } = await import("./supabase-admin.server");
      const db = getServerSupabase();
      if (db) {
        const { data, error } = await db
          .from("membership_plans")
          .select("id, name, description, price, duration_days, benefits, card_included, status")
          .eq("status", "ACTIVE")
          .order("price", { ascending: true });

        if (!error && data && data.length > 0) {
          return data.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            price: Number(p.price),
            duration_days: p.duration_days,
            benefits: p.benefits && p.benefits.length > 0 ? p.benefits : DEFAULT_PLANS[0].benefits,
            card_included: p.card_included ?? true,
            status: p.status,
          }));
        }
      }
    } catch (err) {
      console.warn("[getPublicMembershipPlans] Fallback to default plans:", err);
    }
    return DEFAULT_PLANS;
  },
);

/**
 * 2. Create pending membership order and initialize Razorpay payment
 */
export const createMembershipOrder = createServerFn({ method: "POST" })
  .inputValidator((data: CheckoutInput) => CheckoutInputSchema.parse(data))
  .handler(async ({ data }) => {
    return createMembershipOrderLogic(data);
  });

/**
 * 3. Verify Razorpay payment signature & atomically fulfill card & membership
 */
export const verifyPaymentAndFulfillOrder = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      orderId: string;
      razorpayPaymentId: string;
      razorpayOrderId: string;
      razorpaySignature: string;
    }) =>
      z
        .object({
          orderId: z.string().min(1),
          razorpayPaymentId: z.string().min(1),
          razorpayOrderId: z.string().min(1),
          razorpaySignature: z.string().min(1),
        })
        .parse(d),
  )
  .handler(async ({ data }) => {
    return verifyPaymentAndFulfillOrderLogic(data);
  });

/**
 * 4. Customer-facing order tracking lookup with anti-enumeration protection
 */
export const getOrderTrackingDetails = createServerFn({ method: "POST" })
  .inputValidator((d: { orderNumber: string; verificationMobileOrEmail: string }) =>
    z
      .object({
        orderNumber: z.string().min(3).max(40),
        verificationMobileOrEmail: z.string().min(3).max(120),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    return getOrderTrackingDetailsLogic(data);
  });
