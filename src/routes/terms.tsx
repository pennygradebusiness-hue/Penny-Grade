import { createFileRoute } from "@tanstack/react-router";
import { LegalDocLayout, type LegalTocItem } from "@/components/legal-page";
import { buildPageHead, buildBreadcrumbSchema } from "@/lib/seo";

const TOC: LegalTocItem[] = [
  { id: "acceptance", title: "1. Acceptance of Terms" },
  { id: "definitions", title: "2. Key Definitions" },
  { id: "business-model", title: "3. Platform Nature & Scope" },
  { id: "membership-cards", title: "4. Physical Cards & Identifiers" },
  { id: "verification-flow", title: "5. In-Person Verification Protocol" },
  { id: "discounts-billing", title: "6. Discount Calculations & Offline Billing" },
  { id: "merchant-status", title: "7. Independent Merchant Operations" },
  { id: "prohibited-use", title: "8. Prohibited Conduct & Fraud" },
  { id: "suspension", title: "9. Suspension & Termination" },
  { id: "ip-rights", title: "10. Intellectual Property Rights" },
  { id: "liability", title: "11. Limitation of Liability" },
  { id: "grievance", title: "12. Grievance Officer & Contact" },
  { id: "governing-law", title: "13. Governing Law & Jurisdiction" },
  { id: "amendments", title: "14. Modifications & Version History" },
];

export const Route = createFileRoute("/terms")({
  head: () =>
    buildPageHead({
      title: "Terms & Conditions | PennyGrade Membership Network",
      description:
        "Official Terms & Conditions governing PennyGrade physical memberships, in-person discount verification rules, and partner merchant guidelines in Daltonganj, Jharkhand.",
      path: "/terms",
      jsonLd: buildBreadcrumbSchema([
        { name: "Home", path: "/" },
        { name: "Terms & Conditions", path: "/terms" },
      ]),
    }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalDocLayout
      currentPath="/terms"
      title="Terms & Conditions"
      subtitle="These Terms & Conditions govern your access to and use of the PennyGrade membership platform, physical membership cards, counter QR verification services, and partner directory."
      version="1.0"
      effectiveDate="October 14, 2026"
      lastUpdated="October 14, 2026"
      toc={TOC}
    >
      <section id="acceptance" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">1. Acceptance of Terms</h2>
        <p className="mt-2">
          By purchasing, activating, possessing, or utilizing a PennyGrade physical membership card, 
          or by accessing the PennyGrade website located at{" "}
          <strong className="text-slate-900 dark:text-white">pennygrade.in</strong> (the &ldquo;Platform&rdquo;), you 
          agree to be legally bound by these Terms &amp; Conditions (&ldquo;Terms&rdquo;). If you do not agree to these 
          Terms, you must not purchase or use the PennyGrade card or its verification services.
        </p>
        <p className="mt-2">
          PennyGrade operates in India and primarily facilitates privilege memberships and local venue discounts 
          in Daltonganj, Palamu, and surrounding regions of Jharkhand.
        </p>
      </section>

      <section id="definitions" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">2. Key Definitions</h2>
        <ul className="mt-2 list-disc pl-5 space-y-2">
          <li>
            <strong>&ldquo;PennyGrade&rdquo;, &ldquo;We&rdquo;, &ldquo;Us&rdquo;, or &ldquo;Our&rdquo;:</strong> Refers to the operating 
            enterprise and proprietary platform managed by Samir Pandey and authorized operating entities behind pennygrade.in.
          </li>
          <li>
            <strong>&ldquo;Member&rdquo; or &ldquo;You&rdquo;:</strong> An individual who has validly acquired a PennyGrade physical 
            card and holds an active membership record.
          </li>
          <li>
            <strong>&ldquo;Partner Merchant&rdquo; or &ldquo;Partner&rdquo;:</strong> An independent third-party commercial enterprise 
            (such as a café, restaurant, salon, fitness centre, hotel, or retail outlet) that has entered into a merchant partnership 
            agreement with PennyGrade to offer specified discounts to verified Members.
          </li>
          <li>
            <strong>&ldquo;Physical Card&rdquo;:</strong> The branded physical membership card bearing a unique 
            cryptographic identifier (&ldquo;PenCode&rdquo;) issued to a Member.
          </li>
          <li>
            <strong>&ldquo;PenCode&rdquo;:</strong> The unique, cryptographically random, anti-enumeration membership code 
            (formatted as <code>PEN-XXXX-XXXX</code>) assigned to a physical card.
          </li>
          <li>
            <strong>&ldquo;Live Verification Session&rdquo;:</strong> The temporary, time-bound visual confirmation screen generated 
            when a Member scans a Partner&rsquo;s counter QR code and inputs their PenCode and bill amount.
          </li>
        </ul>
      </section>

      <section id="business-model" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">3. Platform Nature & Scope</h2>
        <p className="mt-2">
          PennyGrade operates as a discovery and discount verification platform connecting consumers with local brick-and-mortar 
          businesses. <strong className="text-slate-900 dark:text-white">PennyGrade is NOT a payment gateway, banking institution, or wallet.</strong> 
          PennyGrade does not collect bill payments from customers on behalf of Partner Merchants, nor does PennyGrade process in-store financial transactions.
        </p>
        <p className="mt-2">
          When you dine or shop at a Partner outlet, you pay the Partner directly at their counter using cash, UPI, debit/credit cards, 
          or any payment method accepted by that Partner, with the verified PennyGrade discount deducted from your offline bill.
        </p>
      </section>

      <section id="membership-cards" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">4. Physical Cards & Identifiers</h2>
        <div className="mt-2 space-y-2">
          <p>
            <strong>Personal &amp; Non-Transferable:</strong> Each PennyGrade physical card is issued to a specific Member and is strictly 
            non-transferable. You may not lend, sell, rent, or transfer your card to third parties.
          </p>
          <p>
            <strong>Validity Period:</strong> Membership privileges remain valid for the period specified at the time of enrollment (standard 
            6 months from activation unless a different tier is documented). Upon expiration, privileges cease until renewal.
          </p>
          <p>
            <strong>Card Custody &amp; Replacement:</strong> You are responsible for the physical custody of your card. In the event of loss, theft, 
            or damage, contact our support desk at <a href="mailto:pennygradebusiness@gmail.com" className="text-primary underline">pennygradebusiness@gmail.com</a>. 
            Replacement cards may incur a nominal physical production and reissuance fee.
          </p>
        </div>
      </section>

      <section id="verification-flow" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">5. In-Person Verification Protocol</h2>
        <p className="mt-2">
          To receive an approved discount at a Partner Merchant, Members must complete the official verification flow at the checkout counter:
        </p>
        <ol className="mt-2 list-decimal pl-5 space-y-2">
          <li>
            <strong>Present Physical Card:</strong> Show your physical PennyGrade card to the venue cashier or service attendant prior to bill generation.
          </li>
          <li>
            <strong>Scan Permanent Partner QR Standee:</strong> Scan the official PennyGrade acrylic QR standee placed at the cashier counter.
          </li>
          <li>
            <strong>Initiate Live Session:</strong> Enter your registered PenCode (or select your saved card) and your pre-tax bill amount to trigger 
            the real-time server calculation.
          </li>
          <li>
            <strong>Display Live Screen:</strong> Present the temporary live verification screen to the cashier. The screen features a real-time countdown 
            timer, animated security indicators, the calculated discount, and net payable amount.
          </li>
        </ol>
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-900 dark:text-amber-200">
          <strong>Strict Prohibition on Screenshots:</strong> Screenshots, static photos, cached screen captures, or expired verification screens 
          are strictly invalid. Cashiers are instructed and required to reject any static image.
        </div>
      </section>

      <section id="discounts-billing" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">6. Discount Calculations & Offline Billing</h2>
        <p className="mt-2">
          Discounts are computed exclusively through PennyGrade&rsquo;s cryptographic server functions based on the current active offer rules 
          registered for that Partner in our authoritative database:
        </p>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>
            <strong>Minimum Bill Requirements:</strong> Offers may specify a minimum bill threshold (e.g., minimum bill of ₹500). If your subtotal is below this threshold, the discount will not apply.
          </li>
          <li>
            <strong>Maximum Discount Caps:</strong> Percentage offers may feature a maximum savings cap (e.g., 10% off up to ₹300 maximum discount).
          </li>
          <li>
            <strong>Non-Stackable:</strong> Unless expressly stated in writing by the Partner, PennyGrade discounts cannot be combined with existing venue promotions, festival combos, happy hours, or third-party loyalty vouchers.
          </li>
          <li>
            <strong>Alcohol, Tobacco &amp; Statutory Exclusions:</strong> In compliance with Indian laws, discounts do not apply to tobacco products, statutory taxes (GST, VAT, service charges), or alcoholic beverages where prohibited by local regulations.
          </li>
        </ul>
      </section>

      <section id="merchant-status" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">7. Independent Merchant Operations</h2>
        <p className="mt-2">
          Partner Merchants are independent third-party businesses. PennyGrade does not own, manage, supervise, or control Partner establishments, 
          their kitchens, inventory, employees, or retail premises.
        </p>
        <p className="mt-2">
          <strong>Goods &amp; Service Quality:</strong> The Partner Merchant is solely responsible for the preparation, quality, taste, hygiene, 
          safety, fitness for purpose, and delivery of all food, beverages, wellness services, and merchandise sold to you. 
          PennyGrade disclaims all liability for food safety, allergen disclosures, service delays, or venue conduct.
        </p>
      </section>

      <section id="prohibited-use" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">8. Prohibited Conduct & Fraud</h2>
        <p className="mt-2">You agree not to engage in any of the following prohibited activities:</p>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>Attempting to duplicate, forge, clone, or digitally replicate a PennyGrade physical card or PenCode.</li>
          <li>Sharing screenshots or video recordings of verification sessions to obtain unauthorized discounts.</li>
          <li>Reselling, sublicensing, or commercially exploiting PennyGrade cards or membership benefits.</li>
          <li>Inputting fabricated bill amounts to manipulate verification logs.</li>
          <li>Harassing, abusing, or threatening venue staff or PennyGrade representatives.</li>
          <li>Reverse-engineering, scraping, or launching automated requests against the pennygrade.in platform.</li>
        </ul>
      </section>

      <section id="suspension" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">9. Suspension & Termination</h2>
        <p className="mt-2">
          PennyGrade reserves the right to immediately suspend, blacklist, or permanently revoke any membership card and associated PenCode 
          without refund if we determine, in our reasonable discretion, that the card has been subjected to fraud, unauthorized transfer, 
          terms violation, or systematic misuse.
        </p>
      </section>

      <section id="ip-rights" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">10. Intellectual Property Rights</h2>
        <p className="mt-2">
          All trademarks, wordmarks, brand emblems, card graphics, user interfaces, website source code, algorithms, and documentation 
          associated with PennyGrade are the exclusive intellectual property of PennyGrade and its operating proprietors. 
          No license or ownership rights are transferred to Members or third parties.
        </p>
      </section>

      <section id="liability" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">11. Limitation of Liability</h2>
        <p className="mt-2">
          To the maximum extent permitted under applicable Indian law, PennyGrade, its proprietors, affiliates, and representatives 
          shall not be liable for any indirect, incidental, punitive, special, or consequential damages arising out of or related to:
        </p>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>The refusal of any Partner Merchant to honour a discount, whether lawful or unlawful.</li>
          <li>The quality, safety, condition, or defect of any goods or services purchased from a Partner.</li>
          <li>Temporary platform downtime, internet interruptions, or mobile network connectivity failures during counter verification.</li>
          <li>Loss or damage caused by unauthorized use of your physical card prior to reporting it stolen.</li>
        </ul>
        <p className="mt-2">
          In any event, PennyGrade&rsquo;s aggregate liability arising out of any claim under these Terms shall not exceed the actual membership enrollment fee paid by you for the active membership period.
        </p>
      </section>

      <section id="grievance" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">12. Grievance Officer & Contact</h2>
        <p className="mt-2">
          In compliance with the Information Technology Act, 2000 and the Consumer Protection (E-Commerce) Rules, 2020, 
          the contact details of our designated Customer Support and Grievance Officer are set forth below:
        </p>
        <div className="mt-3 rounded-xl border border-border bg-muted/40 p-4 text-xs space-y-1.5">
          <p><strong>Designation:</strong> Customer Support &amp; Grievance Redressal Desk</p>
          <p><strong>Operating Entity:</strong> PennyGrade (Samir Pandey, Proprietor / Operating Entity)</p>
          <p><strong>Email:</strong> <a href="mailto:pennygradebusiness@gmail.com" className="text-primary underline">pennygradebusiness@gmail.com</a></p>
          <p><strong>Helpline:</strong> <a href="tel:+919356897893" className="text-primary underline">+91 93568 97893</a></p>
          <p><strong>Postal Address:</strong> Daltonganj, Palamu, Jharkhand - 822101, India</p>
          <p><strong>Working Hours:</strong> Monday – Saturday, 10:00 AM – 6:00 PM IST</p>
        </div>
      </section>

      <section id="governing-law" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">13. Governing Law & Jurisdiction</h2>
        <p className="mt-2">
          These Terms, their interpretation, and any disputes arising out of or in connection with them shall be governed 
          exclusively by the laws of India. Any legal suit, action, or proceeding arising under these Terms shall be instituted 
          exclusively in the competent courts situated in <strong className="text-slate-900 dark:text-white">Daltonganj / Palamu, Jharkhand, India</strong>.
        </p>
      </section>

      <section id="amendments" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">14. Modifications & Version History</h2>
        <p className="mt-2">
          We may update or revise these Terms from time to time to reflect modifications in our business arrangements, partner network, 
          or legal compliance requirements. Revised terms become effective upon publication on this page with an updated &ldquo;Last Updated&rdquo; date. 
          Continued use of your physical card after changes are published constitutes acceptance of the amended Terms.
        </p>
        <div className="mt-4 border-t border-border/80 pt-4 text-xs text-muted-foreground">
          <p><strong>Document ID:</strong> PG-LEG-TERMS-V1</p>
          <p><strong>Current Version:</strong> 1.0 (Production)</p>
          <p><strong>Effective Date:</strong> October 14, 2026</p>
        </div>
      </section>
    </LegalDocLayout>
  );
}
