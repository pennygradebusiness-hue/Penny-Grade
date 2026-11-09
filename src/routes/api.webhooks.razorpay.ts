import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  fetchRazorpayPayment,
  isRazorpayPaymentCaptured,
  razorpayPaymentMatchesOrder,
  verifyRazorpayWebhookSignature,
} from "@/lib/razorpay.service";
import { getServiceRoleClient } from "@/lib/supabase-admin.server";
import { sendTransactionalEmail, renderPurchaseConfirmationEmail } from "@/lib/email.service";
import { sendPrebookingConfirmation } from "@/lib/prebooking.email";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

const RazorpayWebhookSchema = z.object({
  event: z.string(),
  payload: z
    .object({
      payment: z
        .object({
          entity: z
            .object({
              id: z.string().optional(),
              order_id: z.string().optional(),
              amount: z.number().optional(),
              currency: z.string().optional(),
            })
            .optional(),
        })
        .optional(),
    })
    .optional(),
});

export const Route = createFileRoute("/api/webhooks/razorpay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const signature = request.headers.get("x-razorpay-signature") || "";
        const rawBody = await request.text().catch(() => "");
        if (!rawBody || rawBody.length > 1_000_000)
          return json({ error: "Invalid webhook body" }, 400);
        if (!verifyRazorpayWebhookSignature({ rawBody, signature })) {
          console.warn("[RazorpayWebhook] Rejected invalid signature");
          return json({ error: "Invalid webhook signature" }, 400);
        }

        let parsedEvent: z.infer<typeof RazorpayWebhookSchema>;
        try {
          parsedEvent = RazorpayWebhookSchema.parse(JSON.parse(rawBody));
        } catch {
          return json({ error: "Malformed or invalid webhook payload" }, 400);
        }

        // A failed attempt is not a failed order: the customer may retry the same order.
        // Only a captured payment can fulfill an order. Other verified events are acknowledged.
        if (parsedEvent.event !== "payment.captured") return json({ status: "ignored" });

        const entity = parsedEvent.payload?.payment?.entity;
        const paymentId = entity?.id;
        const razorpayOrderId = entity?.order_id;
        if (!paymentId || !razorpayOrderId || !entity?.amount || !entity.currency) {
          return json({ error: "Captured event is missing payment identifiers" }, 400);
        }

        const db = getServiceRoleClient();
        if (!db) {
          console.error("[RazorpayWebhook] Service role database client is unavailable");
          return json({ error: "Order processing is temporarily unavailable" }, 503);
        }

        try {
          const payment = await fetchRazorpayPayment(paymentId);
          if (
            payment.id !== paymentId ||
            payment.order_id !== razorpayOrderId ||
            !isRazorpayPaymentCaptured(payment) ||
            payment.amount !== entity.amount ||
            payment.currency !== entity.currency
          ) {
            console.error(
              "[RazorpayWebhook] Captured payment details failed provider verification",
            );
            return json({ error: "Payment details did not match Razorpay" }, 400);
          }

          const { data: order, error: orderError } = await db
            .from("membership_orders")
            .select(
              "id, razorpay_order_id, razorpay_payment_id, amount, currency, payment_status, order_status",
            )
            .eq("razorpay_order_id", razorpayOrderId)
            .maybeSingle();
          if (orderError) throw orderError;
          if (!order) {
            const { data: prebooking, error: prebookingError } = await (db as any)
              .from("prebooking_orders")
              .select("id, reservation_number, customer_name, customer_email, amount, currency, campaign:prebooking_campaigns(title)")
              .eq("razorpay_order_id", razorpayOrderId)
              .maybeSingle();
            if (prebookingError) throw prebookingError;
            if (!prebooking) {
              console.error("[RazorpayWebhook] No local order matched captured payment", razorpayOrderId);
              return json({ error: "Local order not found" }, 503);
            }
            if (!razorpayPaymentMatchesOrder(payment, {
              orderId: prebooking.razorpay_order_id,
              amountInPaise: Math.round(Number(prebooking.amount) * 100),
              currency: prebooking.currency,
            })) return json({ error: "Prebooking payment amount or currency mismatch" }, 400);
            const { data: completion, error: completionError } = await (db as any).rpc("complete_prebooking_order", {
              p_razorpay_order_id: razorpayOrderId,
              p_razorpay_payment_id: paymentId,
              p_razorpay_signature: "webhook-verified",
            });
            if (completionError || !completion?.ok) {
              console.error("[RazorpayWebhook] Prebooking payment fulfillment failed", completionError?.message);
              return json({ error: "Prebooking fulfillment failed; retry is safe" }, 503);
            }
            const campaign = Array.isArray(prebooking.campaign) ? prebooking.campaign[0] : prebooking.campaign;
            const receipt = await sendPrebookingConfirmation({ ...prebooking, campaign });
            if (!receipt.ok) return json({ error: "Prebooking receipt email failed; retry is safe" }, 503);
            return json({ status: "prebooking_paid" });
          }
          if (
            order.razorpay_order_id !== payment.order_id ||
            !razorpayPaymentMatchesOrder(payment, {
              orderId: order.razorpay_order_id,
              amountInPaise: Math.round(Number(order.amount) * 100),
              currency: order.currency,
            })
          ) {
            console.error(
              "[RazorpayWebhook] Captured payment amount or currency did not match local order",
            );
            return json({ error: "Payment amount or currency mismatch" }, 400);
          }

          const { data: fulfillment, error: fulfillmentError } = await db.rpc(
            "fulfill_paid_membership_order",
            {
              p_order_id: order.id,
              p_razorpay_payment_id: paymentId,
              p_razorpay_signature: null,
            },
          );
          if (fulfillmentError) throw fulfillmentError;
          if (!fulfillment?.ok) {
            if (fulfillment?.code === "PAYMENT_ID_MISMATCH" || fulfillment?.code === "PAYMENT_ID_ALREADY_USED" || fulfillment?.code === "DUPLICATE_PAYMENT_ID") {
              console.error("[RazorpayWebhook] Captured payment needs duplicate-charge review", { orderId: order.id, paymentId });
              return json({ status: "duplicate_payment_review_required" });
            }
            if (fulfillment?.code === "ORDER_CANCELLED") {
              console.error("[RazorpayWebhook] Captured payment belongs to a cancelled order; refund review required", { orderId: order.id, paymentId });
              return json({ status: "cancelled_order_refund_review_required" });
            }
            if (fulfillment?.code === "ORDER_REFUNDED") {
              console.error("[RazorpayWebhook] Captured payment belongs to a refunded order; review required", { orderId: order.id, paymentId });
              return json({ status: "refunded_order_review_required" });
            }
            throw new Error(fulfillment?.message || "Order fulfillment failed");
          }

          const { data: paidOrder, error: paidOrderError } = await db
            .from("membership_orders")
            .select(
              "id, order_number, customer_name, customer_email, amount, created_at, delivery_address_line1, delivery_address_line2, delivery_city, delivery_state, delivery_pincode, membership:memberships(membership_number, card_number, expiry_date), plan:membership_plans(name)",
            )
            .eq("id", order.id)
            .maybeSingle();
          if (paidOrderError) throw paidOrderError;
          if (!paidOrder?.customer_email)
            throw new Error("Paid order customer details are unavailable");

          const membership = Array.isArray(paidOrder.membership)
            ? paidOrder.membership[0]
            : paidOrder.membership;
          const planDetails = Array.isArray(paidOrder.plan) ? paidOrder.plan[0] : paidOrder.plan;
          const email = renderPurchaseConfirmationEmail({
            customerName: paidOrder.customer_name,
            customerEmail: paidOrder.customer_email,
            orderNumber: paidOrder.order_number,
            planName: planDetails?.name || "PennyGrade Membership",
            amountPaid: Number(paidOrder.amount),
            purchaseDate: new Date(paidOrder.created_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
            membershipNumber: membership?.membership_number || fulfillment.membership_number,
            cardNumber: membership?.card_number || fulfillment.card_number,
            validityExpiry: membership?.expiry_date,
            deliveryAddress: {
              line1: paidOrder.delivery_address_line1,
              line2: paidOrder.delivery_address_line2,
              city: paidOrder.delivery_city,
              state: paidOrder.delivery_state,
              pincode: paidOrder.delivery_pincode,
            },
            cardAssigned: Boolean(membership?.card_number || fulfillment.card_assigned),
          });
          const emailResult = await sendTransactionalEmail({
            recipientEmail: paidOrder.customer_email,
            recipientName: paidOrder.customer_name,
            eventType: "PURCHASE_CONFIRMATION",
            subject: email.subject,
            html: email.html,
            idempotencyKey: `order-confirm-${paidOrder.id}`,
            relatedOrderId: paidOrder.id,
          });
          if (!emailResult.ok) {
            console.error("[RazorpayWebhook] Purchase email delivery failed:", emailResult.error);
            return json({ error: "Purchase email delivery failed; retry is safe" }, 503);
          }
          return json({ status: "ok" });
        } catch (error) {
          console.error("[RazorpayWebhook] Processing failed:", error);
          return json({ error: "Payment processing failed; retry is safe" }, 503);
        }
      },
    },
  },
});
