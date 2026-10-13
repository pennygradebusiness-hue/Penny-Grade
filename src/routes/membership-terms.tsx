import { createFileRoute } from "@tanstack/react-router";
import { LegalDocLayout, type LegalTocItem } from "@/components/legal-page";
import { buildPageHead, buildBreadcrumbSchema } from "@/lib/seo";

const TOC: LegalTocItem[] = [
  { id: "enrollment", title: "1. Membership Enrollment & Card Issuance" },
  { id: "offline-private", title: "2. Offline & Private Guarantee" },
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
        "Official cardholder terms governing PennyGrade physical cards, unlimited in-person venue visits, zero app downloads, and replacement rules in Daltonganj.",
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
      subtitle="These rules govern the purchase, possession, offline usage, and validity of your physical PennyGrade membership card across participating partner venues."
      version="1.0"
      effectiveDate="October 14, 2026"
      lastUpdated="October 14, 2026"
      toc={TOC}
    >
      <section id="enrollment" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">1. Membership Enrollment & Card Issuance</h2>
        <p className="mt-2">
          PennyGrade offers a physical privilege card that grants verified discounts across our curated network of 
          cafés, dining spots, salons, fitness clubs, and retail outlets in Daltonganj and surrounding regions.
        </p>
        <p className="mt-2">
          Upon submitting a membership application and paying the applicable pass fee (e.g., standard ₹500 6-Month Pass), 
          you are issued an embossed physical membership card featuring a unique cryptographic PenCode (e.g., <code>PEN-7X4P-92LM</code>). 
          Membership privileges commence on the date of card activation and remain valid for the subscribed duration.
        </p>
      </section>

      <section id="offline-private" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">2. Offline & Private Guarantee</h2>
        <p className="mt-2">
          <strong>No Mandatory App Downloads:</strong> PennyGrade does not require you to download invasive mobile apps, 
          grant background location permissions, or maintain complex passwords to save money at local checkouts.
        </p>
        <p className="mt-2">
          <strong>Privacy at Cashier Counters:</strong> Simply carry your physical card in your wallet. When availing discounts, 
          you interact with a fast, web-based verification screen that never reveals your phone number or email to restaurant or shop staff.
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
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">5. Unlimited Visit Frequency</h2>
        <p className="mt-2">
          Unlike restrictive voucher books or coupon platforms, PennyGrade does not restrict you to a single visit per partner. 
          Subject to normal operating hours and seat availability, you may visit participating partner outlets as frequently 
          as you wish throughout your 6-month validity period (e.g., daily coffee, weekly salon visits, weekend dining).
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
          Attempting to pass off a screenshot as a live verification constitutes fraudulent misuse and will result in 
          immediate, irreversible revocation of your membership card without refund.
        </p>
      </section>

      <section id="lost-damaged" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">8. Lost, Stolen, or Damaged Cards</h2>
        <p className="mt-2">
          If your physical card is lost, stolen, or damaged:
        </p>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>Promptly notify our support desk at <a href="mailto:pennygradebusiness@gmail.com" className="text-primary underline">pennygradebusiness@gmail.com</a> or <a href="tel:+919356897893" className="text-primary underline">+91 93568 97893</a>.</li>
          <li>We will immediately deactivate your compromised PenCode to prevent unauthorized usage.</li>
          <li>A replacement card with a newly generated cryptographic PenCode can be issued for a nominal physical printing and logistics fee of ₹150.</li>
        </ul>
      </section>

      <section id="refund-policy" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">9. Cancellation & Refund Policy</h2>
        <p className="mt-2">
          Due to the immediate issuance and un-capped nature of offline membership privileges:
        </p>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li><strong>Non-Refundable Once Issued:</strong> All membership pass fees are non-refundable once the physical card is printed, delivered, or activated.</li>
          <li><strong>Defective Card Exchange:</strong> If your card arrives physically defective or unreadable, we will replace it free of charge within 7 days of delivery.</li>
        </ul>
      </section>

      <section id="partner-directory" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">10. Merchant Catalog Fluctuations</h2>
        <p className="mt-2">
          While we maintain long-term agreements with our partners, independent venues may occasionally close, undergo renovations, 
          relocate, or terminate their partnership in accordance with their agreement. The temporary or permanent exit of an individual 
          partner does not entitle a member to a full or partial membership refund, as the pass provides access to the overall participating network.
        </p>
      </section>

      <section id="support-desk" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">11. Membership Support Desk</h2>
        <p className="mt-2">
          For any assistance with card activation, partner disputes, or renewal inquiries, contact our local team:
        </p>
        <div className="mt-3 rounded-xl border border-border bg-muted/40 p-4 text-xs space-y-1.5">
          <p><strong>Desk:</strong> PennyGrade Cardholder Member Desk</p>
          <p><strong>Email:</strong> <a href="mailto:pennygradebusiness@gmail.com" className="text-primary underline">pennygradebusiness@gmail.com</a></p>
          <p><strong>Phone:</strong> <a href="tel:+919356897893" className="text-primary underline">+91 93568 97893</a></p>
          <p><strong>Location:</strong> Daltonganj, Palamu, Jharkhand - 822101</p>
        </div>
      </section>
    </LegalDocLayout>
  );
}
