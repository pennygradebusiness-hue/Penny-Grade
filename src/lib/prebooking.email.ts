import { renderPrebookingConfirmationEmail, sendTransactionalEmail } from "./email.service";

export async function sendPrebookingConfirmation(order: { id: string; reservation_number: string; customer_name: string; customer_email: string; amount: number; campaign: { title: string } | null }) {
  if (!order.customer_email || !order.campaign?.title) throw new Error("Prebooking receipt details are unavailable.");
  const rendered = renderPrebookingConfirmationEmail({ customerName: order.customer_name, campaignTitle: order.campaign.title, reservationNumber: order.reservation_number, amountPaid: Number(order.amount) });
  return sendTransactionalEmail({ recipientEmail: order.customer_email, recipientName: order.customer_name, eventType: "PREBOOKING_CONFIRMATION", subject: rendered.subject, html: rendered.html, idempotencyKey: `prebooking-confirm-${order.id}`, metadata: { reservation_number: order.reservation_number } });
}
