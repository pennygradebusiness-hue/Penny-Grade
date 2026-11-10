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

export type StorefrontMembershipProduct = {
  plan: PublicPlan;
  availability: "IN_STOCK" | "OUT_OF_STOCK" | "UNCONFIRMED";
  paymentEnabled: boolean;
};

/** A single, verified physical-card plan for the public product page. */
export const getPublicStorefrontMembershipProduct = createServerFn({ method: "GET" }).handler(
  async (): Promise<StorefrontMembershipProduct | null> => {
    try {
      const { getServiceRoleClient } = await import("./supabase-admin.server");
      const { isRazorpayConfigured } = await import("./razorpay.service");
      const db = getServiceRoleClient();
      if (!db) return null;

      const { data: plans, error: plansError } = await db
        .from("membership_plans")
        .select("id, name, description, price, duration_days, benefits, card_included, status")
        .eq("status", "ACTIVE")
        .eq("card_included", true)
        .eq("duration_days", 180)
        .order("price", { ascending: true });

      // A product page must not silently choose between multiple plans or
      // substitute a hard-coded price when the authoritative catalog fails.
      if (plansError || !plans || plans.length !== 1) return null;
      const row = plans[0];
      const price = Number(row.price);
      if (!Number.isFinite(price) || price <= 0) return null;

      const { count, error: inventoryError } = await db
        .from("physical_cards")
        .select("id", { count: "exact", head: true })
        .eq("status", "AVAILABLE");

      return {
        plan: {
          id: row.id,
          name: row.name,
          description: row.description,
          price,
          duration_days: row.duration_days,
          benefits: row.benefits || DEFAULT_PLANS[0].benefits,
          card_included: row.card_included ?? true,
          status: row.status,
        },
        availability: inventoryError || count === null
          ? "UNCONFIRMED"
          : count > 0
            ? "IN_STOCK"
            : "OUT_OF_STOCK",
        paymentEnabled: isRazorpayConfigured(),
      };
    } catch (error) {
      console.warn("[getPublicStorefrontMembershipProduct] Product catalog unavailable:", error);
      return null;
    }
  },
);

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

        const cardPlans = (data || []).filter((p) => p.card_included === true && p.duration_days === 180);
        if (!error && cardPlans.length === 1) {
          return cardPlans.map((p) => ({
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
      console.warn("[getPublicMembershipPlans] Active plan catalog unavailable:", err);
    }
    return [];
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
