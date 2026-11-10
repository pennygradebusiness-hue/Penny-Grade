import { store, safeRandomUUID, generatePenCode } from "./v1-store";
import {
  createRazorpayOrder,
  verifyRazorpayPaymentSignature,
  getPublicRazorpayKeyId,
  fetchRazorpayPayment,
  razorpayPaymentMatchesOrder,
  isRazorpayPaymentCaptured,
} from "./razorpay.service";
import {
  sendTransactionalEmail,
  renderPurchaseConfirmationEmail,
  renderDispatchNotificationEmail,
  renderDeliveryConfirmationEmail,
  maskCardNumber,
} from "./email.service";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { V1Order, V1PhysicalCard } from "./v1-store";
import { classifyPaymentReplay } from "./payment-lifecycle";

type FulfillmentResult = {
  ok: boolean;
  code?: string;
  already_processed?: boolean;
  order_id?: string;
  order_number?: string;
  membership_id?: string | null;
  membership_number?: string;
  card_id?: string | null;
  card_number?: string;
  card_assigned?: boolean;
  message?: string;
  fulfillment_exception?: boolean;
};

type OrderRelations = {
  membership?: {
    membership_number?: string;
    card_number?: string;
    status?: string;
    expiry_date?: string;
  } | null;
  plan?: { name?: string } | null;
};
type TrackingOrder = V1Order & OrderRelations;
type AdminOrder = V1Order & {
  membership?: { membership_number?: string; card_number?: string } | null;
};

export interface PublicPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_days: number;
  benefits: string[];
  card_included: boolean;
  status: string;
}

export const CheckoutInputSchema = z.object({
  planId: z.string().min(1, "Please select a membership plan"),
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email address").max(120),
  mobile: z.string().regex(/^\d{10,15}$/, "Please enter a valid 10-digit mobile number"),
  deliveryAddress: z.object({
    line1: z.string().min(3, "House/Flat number and street are required").max(200),
    line2: z.string().max(200).optional().nullable(),
    landmark: z.string().max(100).optional().nullable(),
    city: z
      .string()
      .trim()
      .refine(
        (value) => value.toLowerCase() === "daltonganj",
        "We currently deliver only in Daltonganj",
      ),
    state: z
      .string()
      .trim()
      .refine(
        (value) => value.toLowerCase() === "jharkhand",
        "We currently deliver only in Jharkhand",
      ),
    pincode: z.string().regex(/^\d{6}$/, "Please enter a valid 6-digit Indian PIN code"),
    country: z.string().default("India"),
  }),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms and conditions to proceed",
  }),
});

export type CheckoutInput = z.infer<typeof CheckoutInputSchema>;

export const DEFAULT_PLANS: PublicPlan[] = [
  {
    id: "fd6de953-c15d-4b7f-aae4-b97b6d21b043",
    name: "PennyGrade 6-Month Membership",
    description:
      "Physical membership card providing six-month access to PennyGrade's participating local business network and listed member benefits.",
    price: 500,
    duration_days: 180,
    benefits: [
      "Explore participating local businesses and their current member offers",
      "Physical membership card included",
      "Online membership verification at participating businesses",
      "Card delivery available in Daltonganj, Jharkhand",
      "Membership support by email and phone",
    ],
    card_included: true,
    status: "ACTIVE",
  },
];

/**
 * Pure logic for creating a pending membership order and Razorpay order
 */
export async function createMembershipOrderLogic(rawInput: CheckoutInput) {
  const data = CheckoutInputSchema.parse(rawInput);
  let db: SupabaseClient | null = null;
  let plan: PublicPlan | undefined;

  if (process.env.NODE_ENV !== "test") {
    const { getServiceRoleClient } = await import("./supabase-admin.server");
    db = getServiceRoleClient();
    if (!db) throw new Error("Order storage is unavailable. Please try again later.");
    const { data: dbPlan, error } = await db
      .from("membership_plans")
      .select("id, name, description, price, duration_days, benefits, card_included, status")
      .eq("id", data.planId)
      .eq("status", "ACTIVE")
      .maybeSingle();
    if (error) throw new Error("Could not verify the selected membership plan.");
    if (!dbPlan)
      throw new Error("This membership plan is unavailable. Refresh and choose an active plan.");
    if (dbPlan.duration_days !== 180 || dbPlan.card_included !== true) {
      throw new Error("Only the active six-month physical membership card is available for online purchase.");
    }
    plan = {
      id: dbPlan.id,
      name: dbPlan.name,
      description: dbPlan.description,
      price: Number(dbPlan.price),
      duration_days: dbPlan.duration_days,
      benefits: dbPlan.benefits || DEFAULT_PLANS[0].benefits,
      card_included: dbPlan.card_included ?? true,
      status: dbPlan.status,
    };
  }

  if (!plan) {
    plan = DEFAULT_PLANS.find((p) => p.id === data.planId) || DEFAULT_PLANS[0];
  }

  // Production checkout must use the database inventory as its only source of
  // truth. A zero count is a real out-of-stock result; local demo/store data
  // must never turn it into an available production card.
  let availableCardCount = 0;
  if (db) {
    const { count, error } = await db
      .from("physical_cards")
      .select("id", { count: "exact", head: true })
      .eq("status", "AVAILABLE");
    if (error || count === null) {
      throw new Error("Card availability could not be confirmed. Please try again later.");
    }
    availableCardCount = count;
  } else if (process.env.NODE_ENV === "test" && store.cards) {
    for (const card of store.cards.values()) {
      if (card.status === "AVAILABLE") availableCardCount++;
    }
  }

  if (availableCardCount < 1) {
    throw new Error("Membership cards are temporarily out of stock. Please check back soon.");
  }

  const orderNumber = `ORD-${generatePenCode().slice(4)}`;
  const orderId = safeRandomUUID();
  const amountInRupees = plan.price;
  const amountInPaise = Math.round(amountInRupees * 100);

  const razorpayOrder = await createRazorpayOrder({
    amountInPaise,
    currency: "INR",
    receipt: orderNumber,
    notes: {
      orderId,
      orderNumber,
      planName: plan.name,
      customerName: data.fullName,
      customerEmail: data.email,
      customerMobile: data.mobile,
    },
  });

  if (db) {
    const { error } = await db.from("membership_orders").insert({
      id: orderId,
      order_number: orderNumber,
      customer_name: data.fullName.trim(),
      customer_email: data.email.trim().toLowerCase(),
      customer_phone: data.mobile.trim(),
      membership_plan_id: plan.id,
      amount: amountInRupees,
      currency: "INR",
      payment_status: "PENDING",
      order_status: "PAYMENT_PENDING",
      razorpay_order_id: razorpayOrder.id,
      delivery_address_line1: data.deliveryAddress.line1.trim(),
      delivery_address_line2: data.deliveryAddress.line2?.trim() || null,
      delivery_landmark: data.deliveryAddress.landmark?.trim() || null,
      delivery_city: data.deliveryAddress.city.trim(),
      delivery_state: data.deliveryAddress.state.trim(),
      delivery_pincode: data.deliveryAddress.pincode.trim(),
      delivery_country: data.deliveryAddress.country || "India",
    });
    if (error) throw new Error("Could not securely save your order. Please retry checkout.");
  }

  if (process.env.NODE_ENV === "test") {
    if (!store.orders) store.orders = new Map();
    store.orders.set(orderId, {
      id: orderId,
      order_number: orderNumber,
      customer_name: data.fullName.trim(),
      customer_email: data.email.trim().toLowerCase(),
      customer_phone: data.mobile.trim(),
      membership_plan_id: plan.id,
      membership_id: null,
      physical_card_id: null,
      amount: amountInRupees,
      currency: "INR",
      payment_status: "PENDING",
      order_status: "PAYMENT_PENDING",
      razorpay_order_id: razorpayOrder.id,
      razorpay_payment_id: null,
      razorpay_signature: null,
      delivery_address_line1: data.deliveryAddress.line1.trim(),
      delivery_address_line2: data.deliveryAddress.line2?.trim() || null,
      delivery_landmark: data.deliveryAddress.landmark?.trim() || null,
      delivery_city: data.deliveryAddress.city.trim(),
      delivery_state: data.deliveryAddress.state.trim(),
      delivery_pincode: data.deliveryAddress.pincode.trim(),
      delivery_country: data.deliveryAddress.country || "India",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  return {
    ok: true,
    orderId,
    orderNumber,
    razorpayOrderId: razorpayOrder.id,
    razorpayKeyId: getPublicRazorpayKeyId(),
    amount: amountInRupees,
    currency: "INR",
    plan: {
      id: plan.id,
      name: plan.name,
      price: plan.price,
      durationDays: plan.duration_days,
    },
    customer: {
      name: data.fullName.trim(),
      email: data.email.trim().toLowerCase(),
      mobile: data.mobile.trim(),
    },
    availableCardCount,
  };
}

/**
 * Pure logic for payment verification & atomic card reservation
 */
export async function verifyPaymentAndFulfillOrderLogic(data: {
  orderId: string;
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
}) {
  const isValidSignature = verifyRazorpayPaymentSignature({
    razorpayOrderId: data.razorpayOrderId,
    razorpayPaymentId: data.razorpayPaymentId,
    razorpaySignature: data.razorpaySignature,
  });

  if (!isValidSignature) {
    return {
      ok: false,
      message: "Payment verification failed. Invalid payment signature.",
    };
  }

  let fulfillmentResult: FulfillmentResult | null = null;

  if (process.env.NODE_ENV !== "test") {
    const { getServiceRoleClient } = await import("./supabase-admin.server");
    const db = getServiceRoleClient();
    if (!db)
      return {
        ok: false,
        message:
          "Order verification is temporarily unavailable. Your payment status will be confirmed shortly.",
      };

    const { data: order, error: orderError } = await db
      .from("membership_orders")
      .select(
        "id, razorpay_order_id, razorpay_payment_id, amount, currency, payment_status, order_status",
      )
      .eq("id", data.orderId)
      .maybeSingle();
    if (orderError || !order) return { ok: false, message: "Order could not be verified." };
    if (order.razorpay_order_id !== data.razorpayOrderId) {
      return { ok: false, message: "Payment does not belong to this order." };
    }
    if (classifyPaymentReplay(order.payment_status, order.razorpay_payment_id, data.razorpayPaymentId) === "DIFFERENT_PAYMENT_MISMATCH") {
      console.error(
        "[Checkout] A second captured payment was reported for an already paid order",
        data.orderId,
      );
      return {
        ok: false,
        message:
          "This order already has a successful payment. Contact support if you were charged twice.",
      };
    }
    if (order.order_status === "CANCELLED") {
      console.error(
        "[Checkout] Captured payment received for a cancelled order; manual refund review required",
        data.orderId,
      );
      return {
        ok: false,
        message: "Payment reached a cancelled order. Support has been alerted to review a refund.",
      };
    }

    let payment;
    try {
      payment = await fetchRazorpayPayment(data.razorpayPaymentId);
    } catch {
      return {
        ok: false,
        message: "Could not confirm payment with Razorpay. Please retry in a moment.",
      };
    }
    if (
      !razorpayPaymentMatchesOrder(payment, {
        orderId: order.razorpay_order_id,
        amountInPaise: Math.round(Number(order.amount) * 100),
        currency: order.currency,
      })
    ) {
      return { ok: false, message: "Razorpay payment details do not match this order." };
    }
    if (!isRazorpayPaymentCaptured(payment)) {
      return {
        ok: false,
        pending: payment.status === "authorized",
        message:
          payment.status === "authorized"
            ? "Payment is authorized and awaiting capture. We will confirm it automatically."
            : "Razorpay has not captured this payment.",
      };
    }

    const { data: res, error: fulfillmentError } = await db.rpc("fulfill_paid_membership_order", {
      p_order_id: data.orderId,
      p_razorpay_payment_id: data.razorpayPaymentId,
      p_razorpay_signature: data.razorpaySignature,
    });
    if (fulfillmentError || !res) {
      console.error("[Checkout] Atomic order fulfillment failed:", fulfillmentError?.message);
      return {
        ok: false,
        message:
          "Payment is confirmed but order fulfillment is delayed. Support has been notified.",
      };
    }
    const verifiedFulfillment = res as FulfillmentResult;
    if (!verifiedFulfillment.ok) {
      return {
        ok: false,
        message: verifiedFulfillment.message || "Payment was verified but could not be attached to this order.",
      };
    }
    fulfillmentResult = verifiedFulfillment;
  }

  // Fallback for test mode & in-memory store
  if (!fulfillmentResult && store.orders?.has(data.orderId)) {
    const order = store.orders.get(data.orderId)!;
    if (order.payment_status === "PAID") {
      fulfillmentResult = {
        ok: true,
        already_processed: true,
        order_id: order.id,
        order_number: order.order_number,
        membership_id: order.membership_id,
        card_id: order.physical_card_id,
        card_assigned: Boolean(order.physical_card_id),
      };
    } else {
      order.payment_status = "PAID";
      order.razorpay_payment_id = data.razorpayPaymentId;
      order.razorpay_signature = data.razorpaySignature;
      order.updated_at = new Date().toISOString();

      let availableCard: V1PhysicalCard | null = null;
      if (store.cards) {
        for (const c of store.cards.values()) {
          if (c.status === "AVAILABLE") {
            availableCard = c;
            break;
          }
        }
      }

      if (availableCard) {
        const membershipId = safeRandomUUID();
        const membershipNumber = generatePenCode();
        const now = new Date();
        const expiry = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);

        availableCard.status = "ACTIVE";
        availableCard.membership_id = membershipId;
        availableCard.issued_at = now.toISOString();

        const newMember = {
          id: membershipId,
          membership_number: membershipNumber,
          full_name: order.customer_name,
          mobile: order.customer_phone,
          email: order.customer_email,
          plan_id: order.membership_plan_id,
          plan_name: "PennyGrade 6-Month Membership",
          start_date: now.toISOString().slice(0, 10),
          expiry_date: expiry.toISOString().slice(0, 10),
          status: "ACTIVE" as const,
          card_id: availableCard.id,
          card_number: availableCard.card_number,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        };

        if (!store.members) store.members = new Map();
        store.members.set(membershipId, newMember);

        order.order_status = "PAID";
        order.membership_id = membershipId;
        order.physical_card_id = availableCard.id;

        fulfillmentResult = {
          ok: true,
          already_processed: false,
          order_id: order.id,
          order_number: order.order_number,
          membership_id: membershipId,
          membership_number: membershipNumber,
          card_id: availableCard.id,
          card_number: availableCard.card_number,
          card_assigned: true,
        };
      } else {
        order.order_status = "FULFILMENT_EXCEPTION";
        order.internal_notes = "ALERT: Card inventory exhausted. Flagged for admin allocation.";
        fulfillmentResult = {
          ok: true,
          already_processed: false,
          order_id: order.id,
          order_number: order.order_number,
          card_assigned: false,
          message: "Payment confirmed. Card inventory exhausted - flagged for admin dispatch.",
        };
      }
    }
  }

  if (!fulfillmentResult || !fulfillmentResult.ok) {
    return {
      ok: false,
      message: fulfillmentResult?.message || "Could not fulfill paid order.",
    };
  }

  let emailStatus: "PENDING" | "SENT" | "FAILED" = "PENDING";
  if (process.env.NODE_ENV !== "test") {
    try {
      const { getServiceRoleClient } = await import("./supabase-admin.server");
      const db = getServiceRoleClient();
      const { data: order } = await db!
        .from("membership_orders")
        .select(
          "id, order_number, customer_name, customer_email, amount, created_at, delivery_address_line1, delivery_address_line2, delivery_city, delivery_state, delivery_pincode, membership_plan_id, membership:memberships(membership_number, card_number, expiry_date), plan:membership_plans(name)",
        )
        .eq("id", data.orderId)
        .maybeSingle();
      if (order?.customer_email) {
        const membership = Array.isArray(order.membership) ? order.membership[0] : order.membership;
        const planDetails = Array.isArray(order.plan) ? order.plan[0] : order.plan;
        const emailData = renderPurchaseConfirmationEmail({
          customerName: order.customer_name,
          customerEmail: order.customer_email,
          orderNumber: order.order_number,
          planName: planDetails?.name || "PennyGrade Membership",
          amountPaid: Number(order.amount),
          purchaseDate: new Date(order.created_at).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
          membershipNumber: membership?.membership_number || fulfillmentResult.membership_number,
          cardNumber: membership?.card_number || fulfillmentResult.card_number,
          validityExpiry: membership?.expiry_date,
          deliveryAddress: {
            line1: order.delivery_address_line1,
            line2: order.delivery_address_line2,
            city: order.delivery_city,
            state: order.delivery_state,
            pincode: order.delivery_pincode,
          },
          cardAssigned: Boolean(membership?.card_number || fulfillmentResult.card_assigned),
        });
        const emailResult = await sendTransactionalEmail({
          recipientEmail: order.customer_email,
          recipientName: order.customer_name,
          eventType: "PURCHASE_CONFIRMATION",
          subject: emailData.subject,
          html: emailData.html,
          idempotencyKey: `order-confirm-${order.id}`,
          relatedOrderId: order.id,
        });
        emailStatus = emailResult.ok ? "SENT" : "FAILED";
        if (!emailResult.ok)
          console.error("[Checkout] Purchase confirmation email failed:", emailResult.error);
      }
    } catch (error) {
      emailStatus = "FAILED";
      console.error("[Checkout] Purchase confirmation email failed:", error);
    }
  }

  return {
    ok: true,
    orderNumber: fulfillmentResult.order_number,
    membershipId: fulfillmentResult.membership_id,
    membershipNumber: fulfillmentResult.membership_number,
    cardNumber: fulfillmentResult.card_number,
    cardAssigned: Boolean(fulfillmentResult.card_assigned),
    fulfillmentException: Boolean(fulfillmentResult.fulfillment_exception || !fulfillmentResult.card_assigned),
    emailStatus,
    message: fulfillmentResult.card_assigned
      ? "Payment captured and a physical card has been allocated to your order."
      : "Payment captured, but no physical card was allocated. Support must resolve the fulfilment exception.",
  };
}

/**
 * Pure logic for customer tracking lookup
 */
export async function getOrderTrackingDetailsLogic(data: {
  orderNumber: string;
  verificationMobileOrEmail: string;
}) {
  const cleanOrderNum = data.orderNumber.trim().toUpperCase();
  const cleanVerification = data.verificationMobileOrEmail.trim().toLowerCase();
  const cleanDigits = cleanVerification.replace(/\D/g, "");

  let order: TrackingOrder | null = null;

  if (process.env.NODE_ENV !== "test") {
    try {
      const { getServiceRoleClient } = await import("./supabase-admin.server");
      const db = getServiceRoleClient();
      if (!db) {
        return {
          ok: false,
          message:
            "Unable to verify the details provided. Check the order number and matching email or mobile number.",
        };
      }
      const { data: dbOrder, error } = await db
        .from("membership_orders")
        .select(
          "*, membership:memberships(membership_number, card_number, status, expiry_date), plan:membership_plans(name)",
        )
        .eq("order_number", cleanOrderNum)
        .maybeSingle();

      if (error) throw error;
      if (dbOrder) order = dbOrder as unknown as TrackingOrder;
    } catch {
      // Fail closed: tracking must not fall back to a stale or local server store.
      return {
        ok: false,
        message:
          "Unable to verify the details provided. Check the order number and matching email or mobile number.",
      };
    }
  } else if (store.orders) {
    for (const ord of store.orders.values()) {
      if (ord.order_number === cleanOrderNum) {
        order = ord;
        break;
      }
    }
  }

  if (!order) {
    return {
      ok: false,
      message:
        "Unable to verify the details provided. Check the order number and matching email or mobile number.",
    };
  }

  const orderEmail = (order.customer_email || "").toLowerCase();
  const orderPhoneDigits = (order.customer_phone || "").replace(/\D/g, "");

  const matchesEmail = cleanVerification.includes("@") && orderEmail === cleanVerification;
  const matchesPhone =
    cleanDigits.length >= 10 && orderPhoneDigits.slice(-10) === cleanDigits.slice(-10);

  if (!matchesEmail && !matchesPhone) {
    return {
      ok: false,
      message:
        "Unable to verify the details provided. Check the order number and matching email or mobile number.",
    };
  }

  const stages = [
    {
      id: "placed",
      label: "Order Placed",
      completed: true,
      date: order.created_at,
      description: "Order registered on PennyGrade network.",
    },
    {
      id: "payment",
      label: "Payment Confirmed",
      completed: order.payment_status === "PAID",
      date: order.payment_status === "PAID" ? order.updated_at : null,
      description:
        order.payment_status === "PAID" ? "Razorpay payment verified." : "Awaiting payment.",
    },
    {
      id: "card_assigned",
      label: "Card Allocated",
      completed: Boolean(order.physical_card_id),
      date: order.physical_card_id ? order.updated_at : null,
      description: order.physical_card_id
        ? `Card ${maskCardNumber(order.membership?.card_number || "PEN-****-XXXX")} linked.`
        : order.order_status === "FULFILMENT_EXCEPTION"
          ? "No card was allocated. Support must resolve this fulfilment exception."
          : "Card allocation is pending.",
    },
    {
      id: "processing",
      label: "Packed & Prepared",
      completed: ["PROCESSING", "READY_TO_DISPATCH", "SHIPPED", "DELIVERED"].includes(
        order.order_status,
      ),
      date: ["PROCESSING", "READY_TO_DISPATCH", "SHIPPED", "DELIVERED"].includes(order.order_status)
        ? order.updated_at
        : null,
      description: "Luxury card cardholder and packaging sealed.",
    },
    {
      id: "shipped",
      label: "Dispatched",
      completed: ["SHIPPED", "DELIVERED"].includes(order.order_status),
      date: order.shipped_at || (order.order_status === "SHIPPED" ? order.updated_at : null),
      description: order.courier_name
        ? `Handed over to ${order.courier_name}.`
        : "Handed over to delivery courier.",
    },
    {
      id: "delivered",
      label: "Delivered",
      completed: order.order_status === "DELIVERED",
      date: order.delivered_at || (order.order_status === "DELIVERED" ? order.updated_at : null),
      description:
        order.order_status === "DELIVERED"
          ? "Membership card received. Ready for counter discounts!"
          : "Out for delivery.",
    },
  ];

  return {
    ok: true,
    order: {
      orderNumber: order.order_number,
      customerName: order.customer_name,
      planName: order.plan?.name || "PennyGrade 6-Month Membership",
      amount: Number(order.amount),
      currency: order.currency || "INR",
      paymentStatus: order.payment_status,
      orderStatus: order.order_status,
      cardAllocated: Boolean(order.physical_card_id),
      maskedCardNumber: maskCardNumber(order.membership?.card_number),
      membershipNumber: order.membership?.membership_number || null,
      courierName: order.courier_name || null,
      trackingNumber: order.tracking_number || null,
      trackingUrl: order.tracking_url || null,
      deliveryCity: order.delivery_city,
      deliveryState: order.delivery_state,
      deliveryPincode: order.delivery_pincode,
      shippedAt: order.shipped_at || null,
      deliveredAt: order.delivered_at || null,
      createdAt: order.created_at,
      stages,
    },
  };
}

/**
 * Pure logic for admin updating order status
 */
export async function updateAdminOrderStatusLogic(
  data: {
    orderId: string;
    status:
      | "PROCESSING"
      | "READY_TO_DISPATCH"
      | "SHIPPED"
      | "DELIVERED"
      | "CANCELLED"
      | "FULFILMENT_EXCEPTION";
    courierName?: string | null;
    trackingNumber?: string | null;
    trackingUrl?: string | null;
    notes?: string | null;
  },
  adminUser: { email: string; full_name?: string },
) {
  if (data.status === "CANCELLED") {
    throw new Error("Cancellation is unavailable until a refund workflow is completed.");
  }
  let updatedOrder: AdminOrder | null = null;

  if (process.env.NODE_ENV !== "test") {
    try {
      const { getServerSupabase } = await import("./supabase-admin.server");
      const db = getServerSupabase();
      if (db) {
        const { data: res, error } = await db.rpc("admin_update_order_status", {
          p_order_id: data.orderId,
          p_status: data.status,
          p_courier_name: data.courierName || null,
          p_tracking_number: data.trackingNumber || null,
          p_tracking_url: data.trackingUrl || null,
          p_notes: data.notes || null,
          p_admin_user: adminUser.full_name || adminUser.email,
        });

        if (error || !res?.ok) {
          throw new Error(res?.message || error?.message || "Could not update order status.");
        }
        if (!error && res?.ok) {
          const { data: o } = await db
            .from("membership_orders")
            .select("*, membership:memberships(membership_number, card_number)")
            .eq("id", data.orderId)
            .single();
          updatedOrder = o as unknown as AdminOrder | null;
        }
      }
    } catch {
      // fallback
    }
  }

  if (process.env.NODE_ENV === "test" && !updatedOrder && store.orders?.has(data.orderId)) {
    const o = store.orders.get(data.orderId)!;
    o.order_status = data.status;
    if (data.courierName !== undefined) o.courier_name = data.courierName;
    if (data.trackingNumber !== undefined) o.tracking_number = data.trackingNumber;
    if (data.trackingUrl !== undefined) o.tracking_url = data.trackingUrl;
    if (data.notes) o.internal_notes = ((o.internal_notes || "") + "\n" + data.notes).trim();
    if (data.status === "SHIPPED") o.shipped_at = new Date().toISOString();
    if (data.status === "DELIVERED") o.delivered_at = new Date().toISOString();
    o.updated_at = new Date().toISOString();

    if (!store.orderHistory) store.orderHistory = [];
    store.orderHistory.push({
      id: safeRandomUUID(),
      order_id: data.orderId,
      from_status: null,
      to_status: data.status,
      changed_by: adminUser.email,
      notes: data.notes || null,
      created_at: new Date().toISOString(),
    });

    const member =
      o.membership_id && store.members ? store.members.get(o.membership_id) : undefined;
    updatedOrder = { ...o, membership: member ?? null };
  }

  if (!updatedOrder) {
    throw new Error("Order not found or update could not be persisted.");
  }

  // Trigger emails
  const customerEmail = updatedOrder.customer_email;
  const customerName = updatedOrder.customer_name;
  const orderNumber = updatedOrder.order_number;
  const cardNumber = updatedOrder.membership?.card_number || null;
  const membershipNumber = updatedOrder.membership?.membership_number || null;

  if (data.status === "SHIPPED" && customerEmail) {
    const emailData = renderDispatchNotificationEmail({
      customerName,
      customerEmail,
      orderNumber,
      cardNumber: cardNumber || undefined,
      membershipNumber: membershipNumber || undefined,
      dispatchDate: new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      courierName: data.courierName || updatedOrder.courier_name,
      trackingNumber: data.trackingNumber || updatedOrder.tracking_number,
      trackingUrl: data.trackingUrl || updatedOrder.tracking_url,
    });

    sendTransactionalEmail({
      recipientEmail: customerEmail,
      recipientName: customerName,
      eventType: "CARD_DISPATCHED",
      subject: emailData.subject,
      html: emailData.html,
      idempotencyKey: `order-dispatch-${data.orderId}`,
      relatedOrderId: data.orderId,
    }).catch(() => {});
  }

  if (data.status === "DELIVERED" && customerEmail) {
    const emailData = renderDeliveryConfirmationEmail({
      customerName,
      customerEmail,
      orderNumber,
      cardNumber: cardNumber || undefined,
      membershipNumber: membershipNumber || undefined,
      deliveryDate: new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    });

    sendTransactionalEmail({
      recipientEmail: customerEmail,
      recipientName: customerName,
      eventType: "CARD_DELIVERED",
      subject: emailData.subject,
      html: emailData.html,
      idempotencyKey: `order-delivered-${data.orderId}`,
      relatedOrderId: data.orderId,
    }).catch(() => {});
  }

  return { ok: true, status: data.status, orderId: data.orderId };
}

/**
 * Pure logic for admin manual card assignment
 */
export async function assignAdminOrderCardLogic(
  data: { orderId: string; cardId: string },
  adminUser: { email: string },
) {
  if (store.orders?.has(data.orderId) && store.cards?.has(data.cardId)) {
    const order = store.orders.get(data.orderId)!;
    const card = store.cards.get(data.cardId)!;

    if (card.status !== "AVAILABLE") {
      throw new Error("Selected card is not available");
    }

    const membershipId = order.membership_id || safeRandomUUID();
    const membershipNumber = generatePenCode();
    const now = new Date().toISOString();

    card.status = "ACTIVE";
    card.membership_id = membershipId;
    card.issued_at = now;

    if (!store.members) store.members = new Map();
    store.members.set(membershipId, {
      id: membershipId,
      membership_number: membershipNumber,
      full_name: order.customer_name,
      mobile: order.customer_phone,
      email: order.customer_email,
      plan_id: order.membership_plan_id,
      plan_name: "PennyGrade 6-Month Membership",
      start_date: now.slice(0, 10),
      expiry_date: new Date(Date.now() + 180 * 864e5).toISOString().slice(0, 10),
      status: "ACTIVE",
      card_id: card.id,
      card_number: card.card_number,
      created_at: now,
      updated_at: now,
    });

    order.physical_card_id = card.id;
    order.membership_id = membershipId;
    order.order_status = "PROCESSING";
    order.updated_at = now;

    return { ok: true, card_number: card.card_number, membership_id: membershipId };
  }

  throw new Error("Order or card not found.");
}
