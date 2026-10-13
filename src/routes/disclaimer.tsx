import { createFileRoute } from "@tanstack/react-router";
import { LegalDocLayout, type LegalTocItem } from "@/components/legal-page";
import { buildPageHead, buildBreadcrumbSchema } from "@/lib/seo";

const TOC: LegalTocItem[] = [
  { id: "intermediary-status", title: "1. Digital Intermediary Status (Section 79, IT Act)" },
  { id: "merchant-goods", title: "2. Independent Merchant Goods & Services" },
  { id: "payment-disclaimer", title: "3. Non-Processing of Customer Bill Payments" },
  { id: "catalog-accuracy", title: "4. Accuracy of Catalog Listings & Timings" },
  { id: "food-health-safety", title: "5. Food Hygiene, Health & Safety Disclaimers" },
  { id: "external-links", title: "6. External Links & Third-Party Platforms" },
  { id: "as-is-basis", title: "7. 'As Is' & 'As Available' Website Provision" },
  { id: "consumer-protection", title: "8. Consumer Protection Act Disclosures" },
  { id: "contact-desk", title: "9. Regulatory Disclosures & Contact" },
];

export const Route = createFileRoute("/disclaimer")({
  head: () =>
    buildPageHead({
      title: "Website & Platform Disclaimer | PennyGrade Intermediary Notice",
      description:
        "Official platform disclaimer establishing PennyGrade's intermediary status under Section 79 of the Information Technology Act, 2000 and independent merchant liability.",
      path: "/disclaimer",
      jsonLd: buildBreadcrumbSchema([
        { name: "Home", path: "/" },
        { name: "Disclaimer", path: "/disclaimer" },
      ]),
    }),
  component: DisclaimerPage,
});

function DisclaimerPage() {
  return (
    <LegalDocLayout
      currentPath="/disclaimer"
      title="Website & Platform Disclaimer"
      subtitle="Important legal disclaimers regarding PennyGrade's intermediary role under Indian law, independent merchant liabilities, catalog listings, and offline payment processing."
      version="1.0"
      effectiveDate="October 14, 2026"
      lastUpdated="October 14, 2026"
      toc={TOC}
    >
      <section id="intermediary-status" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">1. Digital Intermediary Status (Section 79, IT Act)</h2>
        <p className="mt-2">
          PennyGrade, accessible via <strong className="text-slate-900 dark:text-white">pennygrade.in</strong>, operates 
          as a digital discovery and discount verification intermediary. In accordance with Section 79 of the 
          <strong> Information Technology Act, 2000</strong>, PennyGrade provides an electronic platform enabling members 
          to identify participating merchant venues and verify in-person discount eligibility.
        </p>
        <p className="mt-2">
          PennyGrade does not initiate the transmission, select the receiver of the transmission, or modify the information 
          contained in transmissions between Members and Merchants, and is entitled to the statutory safe harbor protections 
          accorded to digital intermediaries under Indian law.
        </p>
      </section>

      <section id="merchant-goods" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">2. Independent Merchant Goods & Services</h2>
        <p className="mt-2">
          All dining, food preparation, beverage services, beauty and salon treatments, fitness coaching, hospitality rooms, 
          and retail products featured on this website are provided exclusively by independent third-party partner merchants.
        </p>
        <p className="mt-2">
          <strong>No Agency or Employment:</strong> Partner Merchants are independent contractors and are not agents, partners, 
          franchisees, joint-venturers, or employees of PennyGrade. PennyGrade has no ownership, operational control, or management 
          authority over any partner establishment, its staff, its kitchen, or its premises.
        </p>
      </section>

      <section id="payment-disclaimer" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">3. Non-Processing of Customer Bill Payments</h2>
        <p className="mt-2">
          <strong className="text-slate-900 dark:text-white">PennyGrade does NOT collect, handle, or process customer bill payments.</strong> 
          PennyGrade only computes the eligible discount amount through our server functions. 
          All monetary transactions, billing invoices, receipts, and payments occur directly between you and the merchant at the merchant&rsquo;s 
          counter through Cash, UPI, or credit/debit card swipe machines.
        </p>
      </section>

      <section id="catalog-accuracy" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">4. Accuracy of Catalog Listings & Timings</h2>
        <p className="mt-2">
          Information regarding partner outlets (including operating hours, outlet photos, address directions, menus, and discount terms) 
          is provided by the respective merchants or compiled from public listings. While we strive to maintain accurate, up-to-date information:
        </p>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>Merchants may change business hours, relocate, or adjust seating arrangements without prior notice to PennyGrade.</li>
          <li>Photos and cover images on partner profile pages are illustrative and may not reflect temporary seasonal menus or renovations.</li>
          <li>We advise contacting the partner venue directly if you have specific timing or reservation requirements.</li>
        </ul>
      </section>

      <section id="food-health-safety" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">5. Food Hygiene, Health & Safety Disclaimers</h2>
        <p className="mt-2">
          PennyGrade does not inspect restaurant kitchens, prepare food, formulate salon cosmetics, or supervise gym equipment.
        </p>
        <ul className="mt-2 list-disc pl-5 space-y-1.5">
          <li><strong>Food Safety &amp; FSSAI:</strong> Partner dining venues are solely responsible for compliance with the Food Safety and Standards Authority of India (FSSAI) guidelines, hygiene, freshness, and allergen warnings.</li>
          <li><strong>Salon &amp; Personal Care:</strong> Partner salons and clinics are solely responsible for customer skin patch tests, product safety, hair chemicals, and sterilization of salon tools.</li>
          <li><strong>Fitness &amp; Sports:</strong> Members engage in gym or fitness activities at their own risk under the guidance of venue instructors.</li>
        </ul>
      </section>

      <section id="external-links" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">6. External Links & Third-Party Platforms</h2>
        <p className="mt-2">
          Our website may contain hyperlinks to external websites, social media pages, Google Maps directions, or partner websites. 
          PennyGrade does not endorse, sponsor, control, or assume responsibility for the content, privacy policies, or practices of any third-party websites.
        </p>
      </section>

      <section id="as-is-basis" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">7. 'As Is' & 'As Available' Website Provision</h2>
        <p className="mt-2">
          The PennyGrade website and digital verification screens are provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; 
          basis without warranties of any kind, either express or implied. We do not warrant that digital verification services 
          will be completely error-free or uninterrupted by telecommunication network failures.
        </p>
      </section>

      <section id="consumer-protection" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">8. Consumer Protection Act Disclosures</h2>
        <p className="mt-2">
          Under the Consumer Protection Act, 2019 and the Consumer Protection (E-Commerce) Rules, 2020:
        </p>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>PennyGrade operates in good faith to facilitate genuine, transparent savings for verified consumers.</li>
          <li>PennyGrade does not engage in deceptive pricing, hidden platform surcharge fees, or misleading advertising.</li>
          <li>In the event of a dispute between a member and a merchant regarding the quality of goods or services delivered, the member must address the complaint directly to the merchant. PennyGrade will provide reasonable assistance by verifying whether the merchant is in compliance with their PennyGrade partnership agreement.</li>
        </ul>
      </section>

      <section id="contact-desk" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">9. Regulatory Disclosures & Contact</h2>
        <p className="mt-2">
          For any legal or regulatory queries concerning this disclaimer:
        </p>
        <div className="mt-3 rounded-xl border border-border bg-muted/40 p-4 text-xs space-y-1.5">
          <p><strong>Platform:</strong> PennyGrade (Samir Pandey, Operating Entity)</p>
          <p><strong>Legal Email:</strong> <a href="mailto:pennygradebusiness@gmail.com" className="text-primary underline">pennygradebusiness@gmail.com</a></p>
          <p><strong>Direct Helpline:</strong> <a href="tel:+919356897893" className="text-primary underline">+91 93568 97893</a></p>
          <p><strong>Operating Address:</strong> Daltonganj, Palamu, Jharkhand - 822101, India</p>
        </div>
      </section>
    </LegalDocLayout>
  );
}
