import { createFileRoute } from "@tanstack/react-router";
import { LegalDocLayout, type LegalTocItem } from "@/components/legal-page";
import { buildPageHead, buildBreadcrumbSchema } from "@/lib/seo";

const TOC: LegalTocItem[] = [
  { id: "delivery-method", title: "Delivery and handover" },
  { id: "address", title: "Delivery address" },
  { id: "dispatch", title: "Dispatch and tracking" },
  { id: "delays", title: "Delays or delivery problems" },
  { id: "support", title: "Contact support" },
];

export const Route = createFileRoute("/shipping-policy")({
  head: () =>
    buildPageHead({
      title: "Shipping & Delivery Policy | PennyGrade",
      description: "Physical membership card handover, dispatch, and order tracking information for PennyGrade customers.",
      path: "/shipping-policy",
      jsonLd: buildBreadcrumbSchema([
        { name: "Home", path: "/" },
        { name: "Shipping Policy", path: "/shipping-policy" },
      ]),
    }),
  component: ShippingPolicyPage,
});

function ShippingPolicyPage() {
  return (
    <LegalDocLayout
      currentPath="/shipping-policy"
      title="Shipping & Delivery Policy"
      subtitle="What to expect when PennyGrade prepares and hands over or dispatches your physical membership card."
      toc={TOC}
    >
      <section id="delivery-method" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Delivery and handover</h2>
        <p className="mt-2">
          A successful membership order includes one physical membership card. Checkout currently accepts delivery only in Daltonganj, Jharkhand. The current checkout shows delivery as free; no separate shipping charge is added there.
        </p>
        <p className="mt-2">
          PennyGrade has not published a fixed, guaranteed processing or delivery time. If an estimated dispatch/delivery date is not shown at checkout, contact PennyGrade before ordering to confirm the current fulfilment estimate. Any estimate is subject to card preparation and local delivery conditions.
        </p>
      </section>
      <section id="address" className="mt-8 scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Delivery address</h2>
        <p className="mt-2">
          Check that your name, phone number, street address, city, state, and PIN code are correct before paying. If you need to correct an address, contact support promptly and include your order number. Changes may not be possible after dispatch.
        </p>
      </section>
      <section id="dispatch" className="mt-8 scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Dispatch and tracking</h2>
        <p className="mt-2">
          After dispatch details are recorded, use the order tracking page with your order number and the matching checkout email or mobile number. A courier name, tracking reference, and tracking link appear when PennyGrade has added them to the order. Local handover may not have a courier tracking reference.
        </p>
      </section>
      <section id="delays" className="mt-8 scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Delays or delivery problems</h2>
        <p className="mt-2">
          If a delivery attempt fails, tracking is unavailable, or a delivery is delayed, contact PennyGrade promptly with the order number and correct phone/address details. The team will check with the delivery provider and coordinate a reattempt or return-to-sender handling. Any additional delivery charge must be confirmed with you before it is incurred. If the card arrives defective or unreadable, see the <a className="text-primary underline" href="/refund-policy">Refund &amp; Cancellation Policy</a>.
        </p>
      </section>
      <section id="support" className="mt-8 scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Contact support</h2>
        <p className="mt-2">
          Email <a className="text-primary underline" href="mailto:pennygradebusiness@gmail.com">pennygradebusiness@gmail.com</a> or call <a className="text-primary underline" href="tel:+919356897893">+91 93568 97893</a>. Include your order number and do not include passwords, one-time passcodes, or full payment card details.
        </p>
      </section>
    </LegalDocLayout>
  );
}
