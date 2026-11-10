import { createFileRoute } from "@tanstack/react-router";
import { LegalDocLayout, type LegalTocItem } from "@/components/legal-page";
import { buildPageHead, buildBreadcrumbSchema } from "@/lib/seo";

const TOC: LegalTocItem[] = [
  { id: "enrollment", title: "1. Membership Enrollment & Card Issuance" },
  { id: "offline-private", title: "2. App-free access & counter verification" },
  { id: "pencode-security", title: "3. Unique PenCode & Card Custody" },
  { id: "non-transferable", title: "4. Personal & Non-Transferable Status" },
  { id: "unlimited-usage", title: "5. Unlimited Visit Frequency" },
  { id: "redemption-rules", title: "6. Counter Redemption Rules" },
  { id: "screenshots", title: "7. Zero Tolerance for Screenshots" },
  { id: "lost-damaged", title: "8. Lost, Stolen, or Damaged Cards" },
  { id: "refund-policy", title: "9. Cancellation & Refund Policy" },
  { id: "partner-directory", title: "10. Merchant Catalog Fluctuations" },
  { id: "support-desk", title: "11. Membership Support Desk" },
];

export const Route = createFileRoute("/membership-terms")({
  head: () =>
    buildPageHead({
      title: "Membership & Card Terms | PennyGrade Offline Privilege Card",
      description:
        "Membership terms for the PennyGrade six-month physical card, partner-specific benefits, online verification, support and delivery in Daltonganj.",
      path: "/membership-terms",
      jsonLd: buildBreadcrumbSchema([
        { name: "Home", path: "/" },
        { name: "Membership Terms", path: "/membership-terms" },
      ]),
    }),
  component: MembershipTermsPage,
});

function MembershipTermsPage() {
  return (
    <LegalDocLayout
      currentPath="/membership-terms"
      title="Membership & Card Terms"
      subtitle="These rules govern the purchase, possession, online verification, and validity of your physical PennyGrade membership card across participating partner venues."
      version="1.0"
      effectiveDate="October 14, 2026"
      lastUpdated="October 14, 2026"
      toc={TOC}
    >
      <section id="enrollment" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">1. Membership Enrollment & Card Issuance</h2>
        <p className="mt-2">
          PennyGrade offers a six-month physical membership card that provides access to its participating local business network. Each partner's current offer, eligibility, and exclusions are shown on its listing and may vary.
        </p>
        <p className="mt-2">
          The current membership price is shown on the product page and at checkout. The six-month plan includes one physical membership card featuring a unique PenCode. Membership privileges commence on the date of card activation and remain valid for the subscribed duration.
        </p>
      </section>

      <section id="offline-private" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">2. App-free access & counter verification</h2>
        <p className="mt-2">
          <strong>No Mandatory App Downloads:</strong> PennyGrade does not require you to download invasive mobile apps, 
          grant background location permissions, or maintain complex passwords to save money at local checkouts.
        </p>
        <p className="mt-2">
          <strong>Counter verification:</strong> Carry your physical card and use PennyGrade's web-based verification flow where supported. The verification screen is designed to show the member and offer details needed for a counter check, rather than displaying your phone number or email to partner staff.
        </p>
      </section>

      <section id="pencode-security" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">3. Unique PenCode & Card Custody</h2>
        <p className="mt-2">
          Your card features a unique anti-enumeration identifier (&ldquo;PenCode&rdquo;). This code is bound to your registered 
          account record in our secure database. You are responsible for preserving the physical integrity of your card and keeping 
          your registered mobile number updated for verification security.
        </p>
      </section>

      <section id="non-transferable" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">4. Personal & Non-Transferable Status</h2>
        <p className="mt-2">
          Your PennyGrade membership card is strictly personal to the registered member. Lending, leasing, loaning, 
          or re-selling your card to friends, relatives, colleagues, or strangers is strictly prohibited. 
          Cashiers may ask to cross-verify the cardholder&rsquo;s identity if card misuse is suspected.
        </p>
      </section>

      <section id="unlimited-usage" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">5. Partner-Specific Benefit Limits</h2>
        <p className="mt-2">
          Each listed member benefit has its own validity dates, eligibility conditions, minimum bill, cap, exclusions, and any redemption limits agreed with that partner. Check the current partner listing before ordering. The partner decides and applies the benefit, and you pay that partner directly.
        </p>
      </section>

      <section id="redemption-rules" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">6. Counter Redemption Rules</h2>
        <p className="mt-2">
          To receive your discount at a participating venue:
        </p>
        <ul className="mt-2 list-disc pl-5 space-y-1.5">
          <li>Inform cashier staff prior to final bill settlement that you are availing your PennyGrade member discount.</li>
          <li>Scan the cashier counter&rsquo;s official PennyGrade QR standee.</li>
          <li>Enter your PenCode and bill amount to trigger the real-time discount calculation.</li>
          <li>Show the live green verification countdown screen to the cashier so the deduction can be applied directly to your offline invoice.</li>
        </ul>
      </section>

      <section id="screenshots" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">7. Zero Tolerance for Screenshots</h2>
        <p className="mt-2">
          Screenshots, static photo captures, screen recordings, or expired sessions are strictly rejected by partner cashiers. 
          A screenshot is not a live verification result. Suspected misuse may lead to a temporary membership review or suspension after reasonable notice and an opportunity to contact support. Any final action and any payment remedy will be assessed under the published policies and applicable law.
        </p>
      </section>

      <section id="lost-damaged" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">8. Lost, Stolen, or Damaged Cards</h2>
        <p className="mt-2">
          If your physical card is lost, stolen, or damaged:
        </p>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>Promptly notify our support desk at <a href="mailto:pennygradebusiness@gmail.com" className="text-primary underline">pennygradebusiness@gmail.com</a> or <a href="tel:+919356897893" className="text-primary underline">+91 93568 97893</a>.</li>
          <li>We will review the report and, where supported by the membership system, disable the compromised card before authorising a replacement.</li>
          <li>Contact support to confirm replacement availability, any fee, and delivery method before ordering. No fixed replacement fee is promised in these terms.</li>
        </ul>
      </section>

      <section id="refund-policy" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">9. Cancellation & Refund Policy</h2>
        <p className="mt-2">
          Refund and cancellation requests are handled under the current <a href="/refund-policy" className="text-primary underline">Refund &amp; Cancellation Policy</a>. Contact support with your order reference; do not assume a cancellation or refund is automatic.
        </p>
        <p className="mt-2">Applicable consumer remedies are not excluded by this page.</p>
      </section>

      <section id="partner-directory" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">10. Merchant Catalog Fluctuations</h2>
        <p className="mt-2">
          Partner listings and benefits can change when an agreement or offer ends. Check the live directory before visiting. If a published benefit is unavailable or a material membership issue arises, contact support for review under the current refund policy and applicable consumer rights.
        </p>
      </section>

      <section id="support-desk" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">11. Membership Support Desk</h2>
        <p className="mt-2">
          For any assistance with card activation, partner disputes, or renewal inquiries, contact our local team:
        </p>
        <div className="mt-3 rounded-xl border border-border bg-muted/40 p-4 text-xs space-y-1.5">
          <p><strong>Support:</strong> PennyGrade membership and order enquiries</p>
          <p><strong>Email:</strong> <a href="mailto:pennygradebusiness@gmail.com" className="text-primary underline">pennygradebusiness@gmail.com</a></p>
          <p><strong>Phone:</strong> <a href="tel:+919356897893" className="text-primary underline">+91 93568 97893</a></p>
          <p><strong>Location:</strong> Daltonganj, Palamu, Jharkhand - 822101</p>
        </div>
      </section>
    </LegalDocLayout>
  );
}
