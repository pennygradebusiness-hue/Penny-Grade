/**
 * PennyGrade Transactional Email Service
 * Powered by Resend (https://resend.com)
 *
 * Implements durable database-backed notification logging, idempotency checks,
 * retry tracking, and branded responsive HTML email templates for:
 * 1. Purchase Confirmation
 * 2. Physical Card Dispatched
 * 3. Card Delivered
 * 4. Partner Offer Redemption
 */

import { store } from "./v1-store";
import type { Json } from "@/integrations/supabase/types";

export interface EmailSenderOptions {
  apiKey?: string;
  fromEmail?: string;
  fromName?: string;
}

export interface PurchaseConfirmationEmailData {
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  planName: string;
  amountPaid: number;
  purchaseDate: string;
  membershipNumber?: string;
  cardNumber?: string;
  validityExpiry?: string;
  deliveryAddress: {
    line1: string;
    line2?: string | null;
    city: string;
    state: string;
    pincode: string;
  };
  cardAssigned: boolean;
  orderUrl?: string;
}

export interface DispatchNotificationEmailData {
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  membershipNumber?: string;
  cardNumber?: string;
  dispatchDate: string;
  courierName?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  estimatedDelivery?: string | null;
}

export interface DeliveryConfirmationEmailData {
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  membershipNumber?: string;
  cardNumber?: string;
  deliveryDate: string;
  partnersUrl?: string;
}

export interface RedemptionNotificationEmailData {
  customerName: string;
  customerEmail: string;
  membershipNumber: string;
  cardNumber?: string;
  partnerName: string;
  offerTitle: string;
  originalBill: number;
  discountAmount: number;
  finalPayable: number;
  discountType?: "PERCENTAGE" | "FIXED";
  discountValue?: number;
  redemptionDate: string;
  redemptionReference: string;
}

export interface SendEmailResult {
  ok: boolean;
  messageId?: string;
  status: "SENT" | "FAILED" | "MOCK_SENT" | "ALREADY_SENT";
  error?: string;
}

export type TransactionalEmailEvent =
  "PURCHASE_CONFIRMATION" | "CARD_DISPATCHED" | "CARD_DELIVERED" | "OFFER_REDEMPTION" | "PREBOOKING_CONFIRMATION";

export function renderPrebookingConfirmationEmail(data: { customerName: string; campaignTitle: string; reservationNumber: string; amountPaid: number }) {
  const escape = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
  const subject = `PennyGrade prebooking confirmed: ${data.reservationNumber}`;
  const body = `<h2 style="color:#0f172a;font-size:22px;font-weight:800">Your prebooking is confirmed</h2><p style="color:#475569;font-size:15px;line-height:1.6">Hello ${escape(data.customerName)}, your payment for <strong>${escape(data.campaignTitle)}</strong> has been confirmed.</p><div class="card-box"><div style="font-size:11px;color:#fbbf24;font-weight:700">RESERVATION NUMBER</div><div style="font:700 20px monospace;color:#fff;margin-top:6px">${escape(data.reservationNumber)}</div></div><p style="color:#475569">Amount paid: <strong>₹${data.amountPaid.toLocaleString("en-IN")}</strong></p><p style="color:#64748b;font-size:13px;line-height:1.6">Please keep this reference for your records. Campaign benefits and applicable terms are as shown on the PennyGrade prebooking page at the time of booking.</p>`;
  return { subject, html: wrapInPennyGradeEmailLayout(subject, body) };
}

export function maskCardNumber(cardNumber?: string | null): string {
  if (!cardNumber) return "—";
  // PEN-XXXX-XXXX -> PEN-****-XXXX
  const parts = cardNumber.split("-");
  if (parts.length === 3) {
    return `${parts[0]}-****-${parts[2]}`;
  }
  if (cardNumber.length > 4) {
    return `****-${cardNumber.slice(-4)}`;
  }
  return cardNumber;
}

function getEmailConfig(): {
  apiKey: string | null;
  fromEmail: string;
  fromName: string;
  fromFormatted: string;
} {
  const apiKey = process.env.RESEND_API_KEY || null;
  const rawFrom = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  const fromName = process.env.RESEND_FROM_NAME || "PennyGrade";
  const fromFormatted = rawFrom.includes("<") ? rawFrom : `${fromName} <${rawFrom}>`;
  return { apiKey, fromEmail: rawFrom, fromName, fromFormatted };
}

/**
 * Base Responsive HTML Email Wrapper with PennyGrade luxury branding
 */
export function wrapInPennyGradeEmailLayout(title: string, bodyContent: string): string {
  const siteUrl = process.env.SITE_URL || process.env.VITE_SITE_URL || "https://pennygrade.com";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      max-width: 600px;
      margin: 24px auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .header {
      background: linear-gradient(135deg, #090d16 0%, #0f172a 100%);
      padding: 32px 24px;
      text-align: center;
      border-bottom: 2px solid #f59e0b;
    }
    .brand-title {
      color: #ffffff;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin: 0;
    }
    .brand-accent {
      color: #f59e0b;
    }
    .brand-tagline {
      color: #94a3b8;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-top: 6px;
      font-weight: 600;
    }
    .content {
      padding: 36px 32px;
    }
    .footer {
      background-color: #0b1120;
      color: #64748b;
      padding: 24px;
      text-align: center;
      font-size: 12px;
      line-height: 1.6;
      border-top: 1px solid #1e293b;
    }
    .footer a {
      color: #f59e0b;
      text-decoration: none;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: #ffffff !important;
      font-weight: 700;
      font-size: 14px;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
      margin-top: 20px;
    }
    .card-box {
      background-color: #0f172a;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 20px;
      color: #ffffff;
      margin: 20px 0;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    .info-table td {
      padding: 10px 0;
      border-bottom: 1px solid #f1f5f9;
      font-size: 14px;
    }
    .info-table td.label {
      color: #64748b;
      font-weight: 500;
      width: 40%;
    }
    .info-table td.value {
      color: #0f172a;
      font-weight: 700;
      text-align: right;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1 class="brand-title">Penny<span class="brand-accent">Grade</span></h1>
      <div class="brand-tagline">Universal City Privilege Network</div>
    </div>
    <div class="content">
      ${bodyContent}
    </div>
    <div class="footer">
      <p style="margin: 0 0 8px 0;">PennyGrade Universal Privilege Network • Daltonganj, Jharkhand</p>
      <p style="margin: 0 0 8px 0;">Questions? Contact Concierge Support at <a href="mailto:support@pennygrade.com">support@pennygrade.com</a></p>
      <p style="margin: 0; font-size: 11px; color: #475569;">
        <a href="${siteUrl}/terms">Terms & Conditions</a> • <a href="${siteUrl}/privacy">Privacy Policy</a> • <a href="${siteUrl}/track-order">Track Order</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * 1. Successful Purchase Confirmation Email Template
 */
export function renderPurchaseConfirmationEmail(data: PurchaseConfirmationEmailData): {
  subject: string;
  html: string;
} {
  const subject = "Your PennyGrade Membership Purchase Is Confirmed!";
  const siteUrl = process.env.SITE_URL || process.env.VITE_SITE_URL || "https://pennygrade.com";
  const trackUrl =
    data.orderUrl ||
    `${siteUrl}/track-order?orderNumber=${encodeURIComponent(data.orderNumber)}&email=${encodeURIComponent(data.customerEmail)}`;

  const body = `
    <h2 style="color: #0f172a; font-size: 22px; font-weight: 800; margin-top: 0;">Congratulations, ${data.customerName}!</h2>
    <p style="color: #475569; font-size: 15px; line-height: 1.6;">
      Your PennyGrade membership purchase was successful. Your membership is registered, and your physical membership card is being prepared for delivery.
    </p>

    <div class="card-box">
      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #f59e0b; font-weight: 700; margin-bottom: 8px;">
        MEMBERSHIP ALLOCATION
      </div>
      <div style="font-size: 18px; font-weight: 800; letter-spacing: 0.5px;">
        ${data.cardNumber ? data.cardNumber : "Allocation in Progress"}
      </div>
      <div style="font-size: 13px; color: #94a3b8; margin-top: 6px;">
        Plan: <strong style="color: #ffffff;">${data.planName}</strong>
      </div>
      ${
        data.validityExpiry
          ? `<div style="font-size: 12px; color: #cbd5e1; margin-top: 4px;">Valid until: <strong>${data.validityExpiry}</strong></div>`
          : ""
      }
    </div>

    <table class="info-table">
      <tr>
        <td class="label">Order Number</td>
        <td class="value">${data.orderNumber}</td>
      </tr>
      <tr>
        <td class="label">Amount Paid</td>
        <td class="value">₹${data.amountPaid.toLocaleString("en-IN")}</td>
      </tr>
      <tr>
        <td class="label">Payment Status</td>
        <td class="value" style="color: #10b981;">PAID & VERIFIED</td>
      </tr>
      <tr>
        <td class="label">Purchase Date</td>
        <td class="value">${data.purchaseDate}</td>
      </tr>
      <tr>
        <td class="label">Physical Card Fulfilment</td>
        <td class="value">${data.cardAssigned ? "Allocated to this order" : "Allocation pending - support review required"}</td>
      </tr>
      <tr>
        <td class="label">Delivery Destination</td>
        <td class="value" style="font-size: 13px; font-weight: 600;">
          ${data.deliveryAddress.line1}${data.deliveryAddress.line2 ? `, ${data.deliveryAddress.line2}` : ""}<br>
          ${data.deliveryAddress.city}, ${data.deliveryAddress.state} - ${data.deliveryAddress.pincode}
        </td>
      </tr>
    </table>

    <div style="text-align: center; margin-top: 30px;">
      <a href="${trackUrl}" class="button">View Order & Fulfilment Details</a>
    </div>

    <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin-top: 32px; text-align: center;">
      You will automatically receive another notification when your physical luxury card is dispatched with courier tracking.
    </p>
  `;

  return { subject, html: wrapInPennyGradeEmailLayout(subject, body) };
}

/**
 * 2. Physical Card Dispatch Notification Email Template
 */
export function renderDispatchNotificationEmail(data: DispatchNotificationEmailData): {
  subject: string;
  html: string;
} {
  const subject = "Your PennyGrade Membership Card Has Been Dispatched!";
  const siteUrl = process.env.SITE_URL || process.env.VITE_SITE_URL || "https://pennygrade.com";
  const trackUrl =
    data.trackingUrl ||
    `${siteUrl}/track-order?orderNumber=${encodeURIComponent(data.orderNumber)}&email=${encodeURIComponent(data.customerEmail)}`;

  const body = `
    <h2 style="color: #0f172a; font-size: 22px; font-weight: 800; margin-top: 0;">Good news, ${data.customerName}!</h2>
    <p style="color: #475569; font-size: 15px; line-height: 1.6;">
      Your physical PennyGrade membership card has been packed, verified, and handed over to our dispatch courier.
    </p>

    <div class="card-box">
      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #f59e0b; font-weight: 700; margin-bottom: 8px;">
        DISPATCHED CARD
      </div>
      <div style="font-size: 18px; font-weight: 800; letter-spacing: 1px; font-family: monospace;">
        ${maskCardNumber(data.cardNumber)}
      </div>
      <div style="font-size: 12px; color: #94a3b8; margin-top: 6px;">
        Order Ref: <strong style="color: #ffffff;">${data.orderNumber}</strong>
      </div>
    </div>

    <table class="info-table">
      <tr>
        <td class="label">Dispatch Date</td>
        <td class="value">${data.dispatchDate}</td>
      </tr>
      <tr>
        <td class="label">Courier Service</td>
        <td class="value">${data.courierName || "Local Priority Handover / Express Courier"}</td>
      </tr>
      ${
        data.trackingNumber
          ? `<tr>
              <td class="label">Tracking Number</td>
              <td class="value" style="font-family: monospace;">${data.trackingNumber}</td>
            </tr>`
          : ""
      }
      ${
        data.estimatedDelivery
          ? `<tr>
              <td class="label">Estimated Delivery</td>
              <td class="value">${data.estimatedDelivery}</td>
            </tr>`
          : ""
      }
    </table>

    <div style="text-align: center; margin-top: 30px;">
      <a href="${trackUrl}" class="button">Track Delivery Progress</a>
    </div>

    <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin-top: 32px; text-align: center;">
      Please keep your phone reachable so the delivery executive can contact you during final delivery.
    </p>
  `;

  return { subject, html: wrapInPennyGradeEmailLayout(subject, body) };
}

/**
 * 3. Card Delivery Confirmation Email Template
 */
export function renderDeliveryConfirmationEmail(data: DeliveryConfirmationEmailData): {
  subject: string;
  html: string;
} {
  const subject = "Your PennyGrade Card Has Been Delivered!";
  const siteUrl = process.env.SITE_URL || process.env.VITE_SITE_URL || "https://pennygrade.com";
  const partnersUrl = data.partnersUrl || `${siteUrl}/partners`;

  const body = `
    <h2 style="color: #0f172a; font-size: 22px; font-weight: 800; margin-top: 0;">Welcome to the Privilege Network, ${data.customerName}!</h2>
    <p style="color: #475569; font-size: 15px; line-height: 1.6;">
      Your physical PennyGrade membership card has been safely delivered. Your card is active and ready to unlock exclusive verified discounts.
    </p>

    <div class="card-box">
      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #10b981; font-weight: 700; margin-bottom: 8px;">
        STATUS: DELIVERED & ACTIVE
      </div>
      <div style="font-size: 18px; font-weight: 800; letter-spacing: 1px; font-family: monospace;">
        ${maskCardNumber(data.cardNumber)}
      </div>
      <div style="font-size: 12px; color: #cbd5e1; margin-top: 6px;">
        Delivered on: <strong>${data.deliveryDate}</strong>
      </div>
    </div>

    <h3 style="color: #0f172a; font-size: 16px; font-weight: 700; margin-top: 24px; margin-bottom: 12px;">How To Use Your Card:</h3>
    <ol style="color: #475569; font-size: 14px; line-height: 1.7; padding-left: 20px; margin: 0 0 24px 0;">
      <li>Visit any participating partner venue (cafés, restaurants, salons, retail, gyms).</li>
      <li>At billing, scan the permanent PennyGrade QR code on the counter.</li>
      <li>Enter your card number and bill amount on your mobile browser.</li>
      <li>Present your live verification screen to venue staff to apply your discount instantly!</li>
    </ol>

    <div style="text-align: center; margin-top: 20px;">
      <a href="${partnersUrl}" class="button">Explore Participating Partners</a>
    </div>
  `;

  return { subject, html: wrapInPennyGradeEmailLayout(subject, body) };
}

/**
 * 4. Successful Coupon/Offer Redemption Email Template
 */
export function renderRedemptionSuccessEmail(data: RedemptionNotificationEmailData): {
  subject: string;
  html: string;
} {
  const subject = "Your PennyGrade Offer Was Successfully Redeemed!";

  const body = `
    <h2 style="color: #0f172a; font-size: 22px; font-weight: 800; margin-top: 0;">Offer Successfully Redeemed!</h2>
    <p style="color: #475569; font-size: 15px; line-height: 1.6;">
      Hello ${data.customerName}, you just redeemed an exclusive PennyGrade discount privilege at <strong>${data.partnerName}</strong>.
    </p>

    <div class="card-box" style="background-color: #0b1528; border-color: #1e3a8a;">
      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #60a5fa; font-weight: 700; margin-bottom: 4px;">
        PARTNER VENUE
      </div>
      <div style="font-size: 20px; font-weight: 800; color: #ffffff;">
        ${data.partnerName}
      </div>
      <div style="font-size: 13px; color: #cbd5e1; margin-top: 4px;">
        ${data.offerTitle}
      </div>
    </div>

    <table class="info-table">
      <tr>
        <td class="label">Original Bill</td>
        <td class="value">₹${data.originalBill.toLocaleString("en-IN")}</td>
      </tr>
      <tr>
        <td class="label">Discount Applied</td>
        <td class="value" style="color: #10b981;">-₹${data.discountAmount.toLocaleString("en-IN")}</td>
      </tr>
      <tr style="background-color: #f8fafc;">
        <td class="label" style="font-weight: 700; color: #0f172a; font-size: 15px;">Final Payable Amount</td>
        <td class="value" style="color: #0f172a; font-size: 16px; font-weight: 800;">₹${data.finalPayable.toLocaleString("en-IN")}</td>
      </tr>
      <tr>
        <td class="label">Member Card</td>
        <td class="value" style="font-family: monospace;">${maskCardNumber(data.cardNumber || data.membershipNumber)}</td>
      </tr>
      <tr>
        <td class="label">Redemption Date & Time</td>
        <td class="value">${data.redemptionDate}</td>
      </tr>
      <tr>
        <td class="label">Verification Reference</td>
        <td class="value" style="font-family: monospace; font-size: 11px;">${data.redemptionReference}</td>
      </tr>
    </table>

    <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 16px; margin-top: 24px; text-align: center;">
      <div style="color: #065f46; font-size: 14px; font-weight: 700;">
        You saved ₹${data.discountAmount.toLocaleString("en-IN")} on this visit with PennyGrade!
      </div>
    </div>

    <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin-top: 28px; text-align: center;">
      Thank you for being an active PennyGrade member. Flash your card at our next partner venue to keep saving!
    </p>
  `;

  return { subject, html: wrapInPennyGradeEmailLayout(subject, body) };
}

/**
 * Universal Resend Dispatcher with Database Outbox Tracking & Idempotency
 */
export async function sendTransactionalEmail(params: {
  recipientEmail: string;
  recipientName?: string;
  eventType: TransactionalEmailEvent;
  subject: string;
  html: string;
  idempotencyKey?: string;
  relatedOrderId?: string;
  relatedRedemptionId?: string;
  metadata?: { [key: string]: Json | undefined };
}): Promise<SendEmailResult> {
  const { apiKey, fromEmail, fromName, fromFormatted } = getEmailConfig();

  // Test mode / in-memory store fast path
  if (process.env.NODE_ENV === "test") {
    if (!store.emailNotifications) store.emailNotifications = new Map();

    if (params.idempotencyKey) {
      for (const n of store.emailNotifications.values()) {
        if (
          n.idempotency_key === params.idempotencyKey &&
          (n.delivery_status === "SENT" || n.delivery_status === "MOCK_SENT")
        ) {
          return {
            ok: true,
            messageId: n.provider_message_id || undefined,
            status: "ALREADY_SENT",
          };
        }
      }
    }

    const mockId = `mock_msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    store.emailNotifications.set(notifId, {
      id: notifId,
      recipient_email: params.recipientEmail,
      recipient_name: params.recipientName || null,
      event_type: params.eventType,
      subject: params.subject,
      provider: "resend",
      provider_message_id: mockId,
      delivery_status: "SENT",
      attempt_count: 1,
      sent_at: new Date().toISOString(),
      idempotency_key: params.idempotencyKey || null,
      related_order_id: params.relatedOrderId || null,
      related_redemption_id: params.relatedRedemptionId || null,
      metadata: params.metadata || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return { ok: true, messageId: mockId, status: "MOCK_SENT" };
  }

  // 1. Database Outbox check & logging via Service Role
  let notificationId: string | null = null;

  try {
    const { getServiceRoleClient } = await import("./supabase-admin.server");
    const db = getServiceRoleClient();

    if (db) {
      if (params.idempotencyKey) {
        const { data: existing } = await db
          .from("email_notifications")
          .select("id, delivery_status, provider_message_id")
          .eq("idempotency_key", params.idempotencyKey)
          .maybeSingle();

        if (existing) {
          if (existing.delivery_status === "SENT") {
            return {
              ok: true,
              messageId: existing.provider_message_id || undefined,
              status: "ALREADY_SENT",
            };
          }
          notificationId = existing.id;
        }
      }

      if (!notificationId) {
        const basePayload = {
          recipient_email: params.recipientEmail,
          recipient_name: params.recipientName || null,
          event_type: params.eventType,
          subject: params.subject,
          related_order_id: params.relatedOrderId || null,
          related_redemption_id: params.relatedRedemptionId || null,
          delivery_status: "PENDING",
          idempotency_key: params.idempotencyKey || null,
          metadata: (params.metadata || {}) as import("@/integrations/supabase/types").Json,
        };

        const { data: inserted, error: insertErr } = await db
          .from("email_notifications")
          .insert({
            ...basePayload,
            html_body: params.html,
          })
          .select("id")
          .single();

        if (insertErr && /html_body/i.test(insertErr.message)) {
          // If html_body column has not yet been migrated on remote database, fallback gracefully
          const { data: fallbackInserted } = await db
            .from("email_notifications")
            .insert({
              ...basePayload,
              metadata: {
                ...(params.metadata || {}),
                html_body: params.html,
              } as import("@/integrations/supabase/types").Json,
            })
            .select("id")
            .single();

          if (fallbackInserted) {
            notificationId = fallbackInserted.id;
          }
        } else if (!insertErr && inserted) {
          notificationId = inserted.id;
        }
      }
    }
  } catch (err) {
    console.warn("[EmailService] Database logging fallback:", err);
  }

  if (process.env.NODE_ENV === "production" && !notificationId) {
    return {
      ok: false,
      status: "FAILED",
      error: "Email outbox is unavailable; the message was not sent.",
    };
  }

  // 2. Mock mode if no Resend API Key is set or in unit tests
  if (!apiKey || apiKey.startsWith("re_mock_") || process.env.NODE_ENV === "test") {
    if (process.env.NODE_ENV === "production") {
      const error = "Resend is not configured with a live API key.";
      if (notificationId) {
        const { getServiceRoleClient } = await import("./supabase-admin.server");
        const db = getServiceRoleClient();
        if (db) {
          await db
            .from("email_notifications")
            .update({ delivery_status: "FAILED", last_error: error, attempt_count: 1 })
            .eq("id", notificationId);
        }
      }
      return { ok: false, status: "FAILED", error };
    }
    const mockId = `mock_msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    console.log(
      `[EmailService MOCK] [${params.eventType}] to ${params.recipientEmail}: "${params.subject}"`,
    );

    if (notificationId) {
      try {
        const { getServiceRoleClient } = await import("./supabase-admin.server");
        const db = getServiceRoleClient();
        if (db) {
          await db
            .from("email_notifications")
            .update({
              delivery_status: "SENT",
              provider_message_id: mockId,
              sent_at: new Date().toISOString(),
              attempt_count: 1,
            })
            .eq("id", notificationId);
        }
      } catch {
        // ignore
      }
    }

    return { ok: true, messageId: mockId, status: "MOCK_SENT" };
  }

  // 3. Dispatch to official Resend API
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(params.idempotencyKey ? { "Idempotency-Key": params.idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from: fromFormatted,
        to: [params.recipientEmail],
        subject: params.subject,
        html: params.html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Resend API error (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as { id: string };

    if (notificationId) {
      const { getServiceRoleClient } = await import("./supabase-admin.server");
      const db = getServiceRoleClient();
      if (db) {
        await db
          .from("email_notifications")
          .update({
            delivery_status: "SENT",
            provider_message_id: data.id,
            sent_at: new Date().toISOString(),
            attempt_count: 1,
            last_error: null,
          })
          .eq("id", notificationId);
      }
    }

    return { ok: true, messageId: data.id, status: "SENT" };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const friendlyError = errorMsg.includes("You can only send testing emails to your own email address")
      ? "Resend Sandbox Restriction: Testing emails can only be delivered to the registered Resend account owner (pennygradebusiness@gmail.com). Add and verify your custom domain (pennygrade.in) at resend.com/domains to send to customer emails."
      : errorMsg;
    console.error("[EmailService] Delivery failed:", friendlyError);

    if (notificationId) {
      try {
        const { getServiceRoleClient } = await import("./supabase-admin.server");
        const db = getServiceRoleClient();
        if (db) {
          await db
            .from("email_notifications")
            .update({
              delivery_status: "FAILED",
              last_error: friendlyError,
              attempt_count: 1,
            })
            .eq("id", notificationId);
        }
      } catch {
        // ignore
      }
    }

    return { ok: false, status: "FAILED", error: friendlyError };
  }
}
