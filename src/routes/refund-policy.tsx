import { createFileRoute } from "@tanstack/react-router";
import { LegalDocLayout, type LegalTocItem } from "@/components/legal-page";
import { buildPageHead, buildBreadcrumbSchema } from "@/lib/seo";

const TOC: LegalTocItem[] = [
  { id: "eligibility", title: "When a refund may be requested" },
  { id: "issued-cards", title: "After a card has been issued" },
  { id: "defective-card", title: "Defective or unreadable cards" },
  { id: "payment-issues", title: "Payment and order issues" },
  { id: "request", title: "How to contact us" },
];

export const Route = createFileRoute("/refund-policy")({
  head: () =>
    buildPageHead({
      title: "Refund Policy | PennyGrade",
      description: "Refund, cancellation, and defective physical card support for PennyGrade membership orders.",
      path: "/refund-policy",
      jsonLd: buildBreadcrumbSchema([
        { name: "Home", path: "/" },
        { name: "Refund Policy", path: "/refund-policy" },
      ]),
    }),
  component: RefundPolicyPage,
});

function RefundPolicyPage() {
  return (
    <LegalDocLayout
      currentPath="/refund-policy"
      title="Refund & Cancellation Policy"
      subtitle="How PennyGrade handles membership order cancellations, payment issues, and defective physical cards."
      toc={TOC}
    >
      <section id="eligibility" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">When a refund may be requested</h2>
        <p className="mt-2">
          Contact PennyGrade if a payment was taken but you did not receive an order confirmation, if you believe you were charged more than once, or if your order has another payment problem. We will review the payment and order records before confirming any refund. We aim to decide a complete cancellation/refund request within four business days. A cancellation request before card personalisation/production is reviewed against the order's actual fulfilment status; it is not cancelled automatically by sending an email.
        </p>
        <p className="mt-2">
          An unpaid or pending order is not a completed membership purchase. A payment reported as successful is checked against Razorpay before the order is marked paid.
        </p>
        <p className="mt-2">
          Paid prebooking reservations are also checked against Razorpay. The cancellation and refund terms shown for the specific campaign at checkout form part of that booking; contact PennyGrade with your reservation number to request a review. This policy does not replace any consumer right that cannot lawfully be excluded.
        </p>
      </section>
      <section id="issued-cards" className="mt-8 scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">After a card has been issued</h2>
        <p className="mt-2">
          If the card has been personalised/printed, dispatched, delivered, or the membership activated, contact support and state the reason. PennyGrade will review the order, physical fulfilment, membership status, and applicable consumer requirements before deciding the request. The current membership terms generally treat the fee as non-refundable after card production, delivery, or activation, subject to rights that cannot lawfully be excluded. Paid orders are not cancelled until any applicable refund has been reviewed and recorded.
        </p>
      </section>
      <section id="defective-card" className="mt-8 scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Defective or unreadable cards</h2>
        <p className="mt-2">
          If a card arrives physically defective or unreadable, contact us within 7 days of delivery with the order number and clear photos of the issue. We will review and, if confirmed, arrange a replacement card. Do not post personal or payment-card details in public channels. This replacement route does not remove any remedy available under applicable law.
        </p>
      </section>
      <section id="payment-issues" className="mt-8 scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Payment and order issues</h2>
        <p className="mt-2">
          For duplicate payments, include both payment references if available. For a failed payment that appears debited, include the order number and transaction date; the provider or bank may reverse an unsuccessful debit under its process. For an approved refund, PennyGrade initiates it through the payment provider to the original payment method within five business days of approval. The bank or payment provider controls when the credit appears. PennyGrade sends a status update after initiation. Ask support for the current review status; no instant or self-serve refund is offered from this page.
        </p>
      </section>
      <section id="request" className="mt-8 scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">How to contact us</h2>
        <p className="mt-2">
          Email <a className="text-primary underline" href="mailto:pennygradebusiness@gmail.com">pennygradebusiness@gmail.com</a> or call <a className="text-primary underline" href="tel:+919356897893">+91 93568 97893</a>. Please allow time for the team to review the transaction before sending a duplicate request.
        </p>
      </section>
    </LegalDocLayout>
  );
}
