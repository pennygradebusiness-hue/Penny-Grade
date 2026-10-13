import { createFileRoute } from "@tanstack/react-router";
import { LegalDocLayout, type LegalTocItem } from "@/components/legal-page";
import { buildPageHead, buildBreadcrumbSchema } from "@/lib/seo";

const TOC: LegalTocItem[] = [
  { id: "preamble", title: "1. Preamble & Purpose" },
  { id: "commercial-terms", title: "2. Commercial Model & Zero Upfront Fee" },
  { id: "discount-obligations", title: "3. Agreed Member Discount & Offer Terms" },
  { id: "verification-procedure", title: "4. Mandatory In-Person Verification Protocol" },
  { id: "billing-payments", title: "5. Direct Offline Payment Collection" },
  { id: "promotions-branding", title: "6. Platform Promotion & Acrylic QR Standees" },
  { id: "non-exclusivity", title: "7. Non-Exclusivity" },
  { id: "offer-modifications", title: "8. Offer Modifications (7 Days' Notice)" },
  { id: "service-standards", title: "9. Service Quality & Non-Discrimination" },
  { id: "term-renewal", title: "10. Term & Automatic Renewal (1 Year)" },
  { id: "termination", title: "11. Termination Rights (15 Days' Notice)" },
  { id: "representations", title: "12. Merchant Representations & Statutory Compliance" },
  { id: "indemnity-liability", title: "13. Indemnity & Limitation of Liability" },
  { id: "governing-law", title: "14. Governing Law & Dispute Resolution" },
  { id: "execution-schedule", title: "15. Formal Execution & Offer Schedule" },
];

export const Route = createFileRoute("/merchant-agreement")({
  head: () =>
    buildPageHead({
      title: "Merchant Partnership Agreement | PennyGrade Business",
      description:
        "Official Merchant & Partner Partnership Agreement governing offline discount verification, zero upfront fees, promotional support, and partner obligations in Daltonganj.",
      path: "/merchant-agreement",
      jsonLd: buildBreadcrumbSchema([
        { name: "Home", path: "/" },
        { name: "Merchant Agreement", path: "/merchant-agreement" },
      ]),
    }),
  component: MerchantAgreementPage,
});

function MerchantAgreementPage() {
  return (
    <LegalDocLayout
      currentPath="/merchant-agreement"
      title="Merchant Partnership Agreement"
      subtitle="Standard commercial terms and operating guidelines governing partnerships between PennyGrade and participating offline merchants, cafés, restaurants, salons, and retail outlets."
      version="1.0"
      effectiveDate="October 14, 2026"
      lastUpdated="October 14, 2026"
      toc={TOC}
    >
      <section id="preamble" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">1. Preamble & Purpose</h2>
        <p className="mt-2">
          This Merchant Partnership Agreement (&ldquo;Agreement&rdquo;) is entered into between:
        </p>
        <p className="mt-2 pl-4 border-l-2 border-primary/50 italic text-slate-800 dark:text-slate-200">
          <strong>PennyGrade</strong>, an Indian digital privilege and discount membership platform operated by Samir Pandey 
          (Proprietor / Operating Entity), having its administrative desk in Daltonganj, Palamu, Jharkhand - 822101 (&ldquo;PennyGrade&rdquo;),
        </p>
        <p className="mt-2 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">— AND —</p>
        <p className="mt-2 pl-4 border-l-2 border-primary/50 italic text-slate-800 dark:text-slate-200">
          The business enterprise, proprietor, firm, or company whose details are set forth in the Execution Schedule 
          annexed hereto (&ldquo;Partner Merchant&rdquo; or &ldquo;Merchant&rdquo;).
        </p>
        <p className="mt-3">
          <strong>Recitals:</strong> PennyGrade operates a proprietary customer network connecting verified physical cardholders 
          with trusted local establishments in Daltonganj, Palamu, and surrounding regions. The Merchant wishes to partner with 
          PennyGrade to increase retail footfall, attract new customers, enhance repeat visits, and offer pre-agreed discounts to verified Members.
        </p>
      </section>

      <section id="commercial-terms" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">2. Commercial Model & Zero Upfront Fee</h2>
        <div className="mt-2 space-y-2">
          <p>
            <strong>Zero Joining &amp; Setup Fee:</strong> In accordance with PennyGrade&rsquo;s confirmed commercial policy, 
            PennyGrade does <strong className="text-slate-900 dark:text-white">NOT charge any upfront registration, joining, listing, or onboarding fee</strong> to the Merchant.
          </p>
          <p>
            <strong>Complimentary Promotional QR Standee:</strong> PennyGrade provides the Merchant with high-quality, 
            custom-branded acrylic counter QR standees and promotional door stickers at zero cost to the Merchant.
          </p>
          <p>
            <strong>No Sales Commissions:</strong> PennyGrade does not deduct commissions or percentages from the Merchant&rsquo;s 
            gross revenue. The Merchant keeps 100% of all customer payments.
          </p>
        </div>
      </section>

      <section id="discount-obligations" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">3. Agreed Member Discount & Offer Terms</h2>
        <p className="mt-2">
          The Merchant agrees to honor and apply the discount offer mutually approved and recorded in the Schedule 
          annexed hereto (&ldquo;Offer Terms&rdquo;). Each offer shall explicitly specify:
        </p>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li><strong>Discount Structure:</strong> The agreed percentage discount (e.g., 10% or 15% off) or fixed flat discount (e.g., Flat ₹300 off).</li>
          <li><strong>Minimum Bill Amount:</strong> The minimum bill subtotal required before the discount becomes applicable (e.g., Minimum bill of ₹500), if any.</li>
          <li><strong>Maximum Discount Cap:</strong> The maximum monetary savings ceiling per bill (e.g., Up to ₹500 maximum discount), if applicable.</li>
          <li><strong>Eligible Products / Services:</strong> The specific menu categories, services, or merchandise to which the offer applies.</li>
          <li><strong>Permissible Exclusions:</strong> Any excluded items (e.g., MRP goods, tobacco, statutory taxes, festive days) explicitly approved during onboarding.</li>
        </ul>
      </section>

      <section id="verification-procedure" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">4. Mandatory In-Person Verification Protocol</h2>
        <p className="mt-2">
          To maintain fairness and prevent fraudulent redemptions, Merchant staff and cashiers must adhere to the official PennyGrade verification workflow:
        </p>
        <ol className="mt-2 list-decimal pl-5 space-y-2">
          <li>
            <strong>Physical Card Inspection:</strong> The customer presents their active physical PennyGrade card at the checkout counter.
          </li>
          <li>
            <strong>Counter QR Scan:</strong> The customer scans the official PennyGrade QR standee installed at the Merchant&rsquo;s cashier counter.
          </li>
          <li>
            <strong>Real-Time Server Computation:</strong> The customer inputs their PenCode and the un-discounted bill subtotal into the official verification interface at <code>pennygrade.in</code>.
          </li>
          <li>
            <strong>Inspection of Live Screen:</strong> Merchant staff inspects the live visual verification screen displaying a green active badge, 
            a live real-time countdown timer, the customer&rsquo;s member name, calculated discount, and net payable amount.
          </li>
          <li>
            <strong>Bill Deduction:</strong> Merchant deducts the exact discount amount indicated on the live screen from the customer&rsquo;s final bill.
          </li>
        </ol>
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-900 dark:text-red-200">
          <strong>Mandatory Rejection of Screenshots:</strong> Merchant staff must NEVER accept screenshots, photos of phones, expired verification screens, 
          or verbal claims. Discounts are valid ONLY upon direct inspection of a live, active countdown screen on the customer&rsquo;s device.
        </div>
      </section>

      <section id="billing-payments" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">5. Direct Offline Payment Collection</h2>
        <p className="mt-2">
          <strong className="text-slate-900 dark:text-white">PennyGrade does NOT collect customer bill payments.</strong> 
          All customer billing, invoices, receipts, and payments are settled directly between the customer and the Merchant 
          at the Merchant&rsquo;s cashier counter through the Merchant&rsquo;s existing POS, Cash, UPI, or Card swipe terminals.
        </p>
      </section>

      <section id="promotions-branding" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">6. Platform Promotion & Acrylic QR Standees</h2>
        <div className="mt-2 space-y-2">
          <p>
            <strong>Directory &amp; Digital Promotion:</strong> PennyGrade shall feature the Merchant in the PennyGrade online directory, 
            public catalog, search filters, and local promotional channels (including social media channels and member bulletins).
          </p>
          <p>
            <strong>Display of Standees:</strong> The Merchant agrees to place and maintain the official PennyGrade acrylic QR standee 
            prominently at their primary cashier counter or reception desk throughout the term of this Agreement.
          </p>
          <p>
            <strong>No Footfall Guarantee:</strong> While PennyGrade actively promotes participating partners, PennyGrade makes no warranties 
            or guarantees regarding specific numbers of customers, leads, impressions, or revenue volumes.
          </p>
        </div>
      </section>

      <section id="non-exclusivity" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">7. Non-Exclusivity</h2>
        <p className="mt-2">
          This partnership is strictly non-exclusive. The Merchant remains entirely free to run independent promotional campaigns, 
          issue internal loyalty cards, or participate in other third-party aggregators or discount platforms. 
          Similarly, PennyGrade reserves the right to partner with other merchants in the same category or locality.
        </p>
      </section>

      <section id="offer-modifications" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">8. Offer Modifications (7 Days' Notice)</h2>
        <p className="mt-2">
          To maintain trust and ensure transparent member communications, any proposed changes to the approved Offer Terms 
          (including changes in discount percentage, minimum bill thresholds, or exclusions) require{" "}
          <strong className="text-slate-900 dark:text-white">seven (7) business days&rsquo; prior written notice</strong> to PennyGrade 
          via email to <a href="mailto:pennygradebusiness@gmail.com" className="text-primary underline">pennygradebusiness@gmail.com</a>.
        </p>
        <p className="mt-2">
          Offer changes become effective only after PennyGrade updates the authoritative system parameters in the production database. 
          No modification may retroactively invalidate a live verification session generated prior to the effective update.
        </p>
      </section>

      <section id="service-standards" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">9. Service Quality & Non-Discrimination</h2>
        <p className="mt-2">
          The Merchant agrees to treat PennyGrade Members with the same dignity, respect, courtesy, and high standards of service 
          accorded to regular retail customers. The Merchant shall not offer inferior portions, substandard ingredients, or 
          discriminatory service on account of a customer availing a PennyGrade member discount.
        </p>
      </section>

      <section id="term-renewal" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">10. Term & Automatic Renewal (1 Year)</h2>
        <p className="mt-2">
          This Agreement shall remain in full force and effect for an initial period of{" "}
          <strong className="text-slate-900 dark:text-white">one (1) year</strong> from the Effective Date, and shall automatically renew 
          for successive one-year periods unless terminated by either party in accordance with Section 11.
        </p>
      </section>

      <section id="termination" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">11. Termination Rights (15 Days' Notice)</h2>
        <div className="mt-2 space-y-2">
          <p>
            <strong>Termination for Convenience:</strong> Either party may terminate this Agreement without cause and without any penalty fee 
            by providing <strong className="text-slate-900 dark:text-white">fifteen (15) days&rsquo; prior written notice</strong> via email.
          </p>
          <p>
            <strong>Immediate Termination for Cause:</strong> PennyGrade may immediately terminate this Agreement and remove the Merchant&rsquo;s 
            listing in the event of: (a) repeated unjustified refusal to honour valid member discounts; (b) fraud or collusion in verification sessions; 
            (c) rude or abusive conduct toward members; (d) loss of statutory operating licenses or FSSAI registration; or (e) material breach of this Agreement.
          </p>
          <p>
            <strong>Post-Termination Obligations:</strong> Upon termination, the Merchant shall promptly return or safely dispose of 
            the PennyGrade acrylic QR standee, and PennyGrade shall remove the Merchant from the public catalog.
          </p>
        </div>
      </section>

      <section id="representations" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">12. Merchant Representations & Statutory Compliance</h2>
        <p className="mt-2">
          The Merchant represents, warrants, and covenants that:
        </p>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>It holds all necessary statutory licenses, including FSSAI food licenses, GST registration (where applicable), Shop and Establishment licenses, and municipal trade clearances.</li>
          <li>All goods, food, beverages, and services supplied to customers are merchantable, fit for consumption, safe, and prepared in compliance with Indian safety and hygiene standards.</li>
          <li>It is solely responsible for collecting and remitting applicable Goods and Services Tax (GST) and local levies.</li>
        </ul>
      </section>

      <section id="indemnity-liability" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">13. Indemnity & Limitation of Liability</h2>
        <p className="mt-2">
          The Merchant agrees to indemnify, defend, and hold harmless PennyGrade, its proprietors, affiliates, and representatives 
          against any claims, fines, liabilities, damages, or expenses arising from: (a) food contamination, poisoning, defective goods, 
          or personal injuries occurring at the Merchant&rsquo;s premises; (b) tax deficiencies or regulatory non-compliance by the Merchant; 
          or (c) breach of this Agreement by the Merchant.
        </p>
        <p className="mt-2">
          PennyGrade&rsquo;s liability under this Agreement shall be limited strictly to direct technical failures within PennyGrade&rsquo;s 
          sole control, and shall under no circumstances exceed ₹1,000 (Rupees One Thousand).
        </p>
      </section>

      <section id="governing-law" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">14. Governing Law & Dispute Resolution</h2>
        <p className="mt-2">
          This Agreement is governed by the laws of India. Any disputes arising out of or in connection with this Agreement 
          shall be settled amicably through mutual discussion within thirty (30) days. In the event mutual resolution fails, 
          the courts of <strong className="text-slate-900 dark:text-white">Daltonganj / Palamu, Jharkhand, India</strong> shall have exclusive jurisdiction.
        </p>
      </section>

      <section id="execution-schedule" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">15. Formal Execution & Offer Schedule</h2>
        <p className="mt-2">
          This Agreement is formally executed by the authorized representatives of both parties as of the Effective Date written below. 
          To sign or print a physical copy for your records, use the &ldquo;Print Document&rdquo; button above.
        </p>

        <div className="mt-6 rounded-2xl border-2 border-slate-300 bg-slate-50/50 p-6 dark:border-slate-700 dark:bg-slate-900/50 space-y-6">
          <div className="border-b border-slate-300 pb-4 dark:border-slate-700">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
              SCHEDULE A: MERCHANT &amp; APPROVED OFFER PARTICULARS
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <p className="font-semibold text-slate-500">Agreement Reference:</p>
              <p className="mt-1 font-mono text-slate-900 dark:text-white">PG-MPA-2026-________</p>
            </div>
            <div>
              <p className="font-semibold text-slate-500">Effective Date:</p>
              <p className="mt-1 text-slate-900 dark:text-white">____ / ____ / 2026</p>
            </div>
            <div className="sm:col-span-2">
              <p className="font-semibold text-slate-500">Merchant Legal / Business Name:</p>
              <div className="mt-1 h-7 border-b border-dashed border-slate-400"></div>
            </div>
            <div>
              <p className="font-semibold text-slate-500">Trade / Outlet Name:</p>
              <div className="mt-1 h-7 border-b border-dashed border-slate-400"></div>
            </div>
            <div>
              <p className="font-semibold text-slate-500">Category (Café / Salon / Retail / etc.):</p>
              <div className="mt-1 h-7 border-b border-dashed border-slate-400"></div>
            </div>
            <div className="sm:col-span-2">
              <p className="font-semibold text-slate-500">Physical Store Address:</p>
              <div className="mt-1 h-7 border-b border-dashed border-slate-400"></div>
            </div>
            <div>
              <p className="font-semibold text-slate-500">City &amp; PIN Code:</p>
              <p className="mt-1 text-slate-900 dark:text-white">Daltonganj, Jharkhand - 822101</p>
            </div>
            <div>
              <p className="font-semibold text-slate-500">Authorized Contact Person &amp; Phone:</p>
              <div className="mt-1 h-7 border-b border-dashed border-slate-400"></div>
            </div>
            <div className="sm:col-span-2 border-t border-slate-300 pt-4 dark:border-slate-700">
              <p className="font-bold text-slate-800 dark:text-slate-200">Approved Member Offer Details:</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[11px] text-slate-500">Discount Offered:</span>
                  <div className="h-6 border-b border-dashed border-slate-400"></div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Minimum Bill:</span>
                  <div className="h-6 border-b border-dashed border-slate-400"></div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Max Savings Cap:</span>
                  <div className="h-6 border-b border-dashed border-slate-400"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 border-t border-slate-300 pt-6 dark:border-slate-700 text-xs">
            <div className="space-y-4">
              <p className="font-bold text-slate-900 dark:text-white">For PennyGrade:</p>
              <div className="h-16 border-b border-slate-400"></div>
              <p>Authorized Signatory</p>
              <p className="text-slate-500">Date: ____ / ____ / 2026</p>
            </div>

            <div className="space-y-4">
              <p className="font-bold text-slate-900 dark:text-white">For the Partner Merchant:</p>
              <div className="h-16 border-b border-slate-400"></div>
              <p>Authorized Signatory &amp; Stamp</p>
              <p className="text-slate-500">Date: ____ / ____ / 2026</p>
            </div>
          </div>
        </div>
      </section>
    </LegalDocLayout>
  );
}
