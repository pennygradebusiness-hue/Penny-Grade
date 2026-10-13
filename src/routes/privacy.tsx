import { createFileRoute } from "@tanstack/react-router";
import { LegalDocLayout, type LegalTocItem } from "@/components/legal-page";
import { buildPageHead, buildBreadcrumbSchema } from "@/lib/seo";

const TOC: LegalTocItem[] = [
  { id: "overview", title: "1. Privacy Overview & Scope" },
  { id: "data-we-collect", title: "2. Personal Data We Collect" },
  { id: "zero-contact-sharing", title: "3. Zero Contact Sharing Guarantee" },
  { id: "purpose", title: "4. Purpose & Lawful Grounds for Processing" },
  { id: "sharing-disclosure", title: "5. Data Sharing & Infrastructure Providers" },
  { id: "cookies-tracking", title: "6. Cookies & Tracking Technologies" },
  { id: "security", title: "7. Data Protection & Security Safeguards" },
  { id: "retention", title: "8. Data Retention Policy" },
  { id: "user-rights", title: "9. Rights of Data Principals (DPDPA 2023)" },
  { id: "children", title: "10. Children's Privacy" },
  { id: "grievance-contact", title: "11. Grievance Officer & Contact Information" },
  { id: "updates", title: "12. Policy Updates & Version History" },
];

export const Route = createFileRoute("/privacy")({
  head: () =>
    buildPageHead({
      title: "Privacy Policy | PennyGrade Customer Data Protection",
      description:
        "Learn how PennyGrade protects member information, enforces zero contact sharing with partner staff, and complies with Indian privacy standards (DPDPA 2023).",
      path: "/privacy",
      jsonLd: buildBreadcrumbSchema([
        { name: "Home", path: "/" },
        { name: "Privacy Policy", path: "/privacy" },
      ]),
    }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalDocLayout
      currentPath="/privacy"
      title="Privacy Policy"
      subtitle="PennyGrade is committed to safeguarding your personal data and respecting your privacy under the Digital Personal Data Protection Act, 2023 and the Information Technology Act, 2000."
      version="1.0"
      effectiveDate="October 14, 2026"
      lastUpdated="October 14, 2026"
      toc={TOC}
    >
      <section id="overview" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">1. Privacy Overview & Scope</h2>
        <p className="mt-2">
          This Privacy Policy explains how <strong className="text-slate-900 dark:text-white">PennyGrade</strong> (&ldquo;We&rdquo;, 
          &ldquo;Us&rdquo;, or &ldquo;Our&rdquo;), operating via the website{" "}
          <strong className="text-slate-900 dark:text-white">pennygrade.in</strong>, collects, processes, stores, and protects 
          your personal information when you purchase or use our physical membership cards, access our digital verification screens, 
          or enroll as a partner merchant in Daltonganj, Palamu, and across Jharkhand, India.
        </p>
        <p className="mt-2">
          We process personal data in strict compliance with applicable Indian data protection laws, including the 
          <strong> Digital Personal Data Protection Act, 2023 (DPDPA 2023)</strong> and the 
          <strong> Information Technology Act, 2000</strong> read with the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011.
        </p>
      </section>

      <section id="data-we-collect" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">2. Personal Data We Collect</h2>
        <p className="mt-2">We collect only the minimum data strictly required to deliver our membership services:</p>

        <div className="mt-3 space-y-4">
          <div className="rounded-xl border border-border/80 bg-muted/20 p-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">A. Member Account &amp; Card Data</h3>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-xs">
              <li><strong>Member Name:</strong> Used to personalize membership records and verify the rightful cardholder.</li>
              <li><strong>Mobile Number:</strong> Used solely for membership activation, two-factor history verification, and urgent account security notifications.</li>
              <li><strong>Unique PenCode:</strong> The cryptographically random identifier (e.g., <code>PEN-7X4P-92LM</code>) physically stamped on your card.</li>
              <li><strong>Membership Plan &amp; Expiry Date:</strong> Tier details (Standard, Plus, Elite) and validity periods.</li>
            </ul>
          </div>

          <div className="rounded-xl border border-border/80 bg-muted/20 p-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">B. Verification &amp; Redemption Data</h3>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-xs">
              <li><strong>Verification Logs:</strong> Partner establishment visited, offer availed, bill subtotal entered, discount amount calculated, and net payable amount.</li>
              <li><strong>Session Identifiers:</strong> Temporary session token generated when scanning the counter QR standee to validate real-time checkout.</li>
              <li><strong>Timestamps:</strong> Exact date and time when an in-person discount verification was authorized.</li>
            </ul>
          </div>

          <div className="rounded-xl border border-border/80 bg-muted/20 p-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">C. Merchant / Partner Information</h3>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-xs">
              <li><strong>Business Profile:</strong> Trade name, legal entity name, store address, geographic coordinates, category, operating hours, and contact details.</li>
              <li><strong>Authorized Representative:</strong> Name, phone number, and email of the store manager or proprietor for partnership communication.</li>
            </ul>
          </div>

          <div className="rounded-xl border border-border/80 bg-muted/20 p-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">D. Technical &amp; System Logs</h3>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-xs">
              <li><strong>Server Logs:</strong> IP address, browser type, and operating system collected routinely by server infrastructure for DDoS protection and error diagnosis.</li>
              <li><strong>Administrative Audit Logs:</strong> Cryptographically logged administrative actions (e.g., card inventory generation, partner status changes) to ensure tamper-proof operational auditability.</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="zero-contact-sharing" className="scroll-mt-36">
        <div className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/10 p-6 text-emerald-950 dark:text-emerald-200">
          <h2 className="text-base font-bold flex items-center gap-2 text-emerald-900 dark:text-emerald-100">
            <span>🛡️</span> 3. Zero Contact Sharing Guarantee
          </h2>
          <p className="mt-2 text-xs leading-relaxed">
            <strong>We respect your personal privacy at checkout counters.</strong> When you scan a partner&rsquo;s QR standee and display 
            your live verification screen to café, restaurant, or salon cashiers, <strong className="underline">venue staff NEVER see your phone number, email address, or billing history</strong>.
          </p>
          <p className="mt-2 text-xs leading-relaxed">
            The cashier only views: (1) Your Member Name, (2) Masked PenCode, (3) Current Offer Name, and (4) The server-calculated discount amount. 
            PennyGrade does not sell, lease, or share your contact number with partner merchants for marketing spam or unsolicited phone calls.
          </p>
        </div>
      </section>

      <section id="purpose" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">4. Purpose & Lawful Grounds for Processing</h2>
        <p className="mt-2">We process personal data only for lawful, legitimate business purposes:</p>
        <ul className="mt-2 list-disc pl-5 space-y-1.5">
          <li><strong>Service Delivery:</strong> Issuing physical cards, activating valid subscriptions, and calculating eligible discounts at partner counters.</li>
          <li><strong>Fraud Prevention:</strong> Preventing duplicate redemptions, screenshot forgery, and unauthorized commercial redistribution of membership benefits.</li>
          <li><strong>Account History:</strong> Permitting Members to review their aggregate lifetime savings and past discount visits.</li>
          <li><strong>Partner Reconciliation:</strong> Aggregating non-personally identifiable visit counts to audit partner performance.</li>
          <li><strong>Statutory Compliance:</strong> Maintaining audit trails required under Indian tax, corporate, and digital intermediary laws.</li>
        </ul>
      </section>

      <section id="sharing-disclosure" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">5. Data Sharing & Infrastructure Providers</h2>
        <p className="mt-2">
          <strong>We never sell your personal data to data brokers or third-party advertisers.</strong> Data is shared only with 
          trusted infrastructure partners under strict confidentiality:
        </p>
        <ul className="mt-2 list-disc pl-5 space-y-1.5">
          <li><strong>Database &amp; Cloud Infrastructure:</strong> We utilize Supabase (PostgreSQL) hosted in SOC 2 Type II compliant secure data facilities for database storage and secure authentication.</li>
          <li><strong>Web Hosting:</strong> Our web application is deployed via high-performance cloud hosting networks providing edge caching and enterprise SSL/TLS encryption.</li>
          <li><strong>Legal &amp; Law Enforcement:</strong> We may disclose data if legally required by an order issued by a competent Indian court, regulatory body, or law enforcement authority under applicable legislation.</li>
        </ul>
      </section>

      <section id="cookies-tracking" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">6. Cookies & Tracking Technologies</h2>
        <p className="mt-2">
          PennyGrade maintains a clean, private browsing experience:
        </p>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li><strong>No Third-Party Advertising Pixels:</strong> We do NOT employ Meta/Facebook Pixel, Google AdSense, or invasive commercial tracking scripts.</li>
          <li><strong>Essential Operational Cookies:</strong> We only utilize strictly necessary, encrypted session cookies required for administrator login sessions and secure route authorization.</li>
        </ul>
      </section>

      <section id="security" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">7. Data Protection & Security Safeguards</h2>
        <p className="mt-2">
          In compliance with Section 43A of the Information Technology Act, 2000, we implement reasonable security practices and procedures:
        </p>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li><strong>Cryptographic Identifiers:</strong> Membership PenCodes are generated using cryptographically strong random generation (<code>gen_pen_code()</code>), preventing sequential enumeration attacks.</li>
          <li><strong>Row Level Security (RLS):</strong> Authoritative database tables enforce PostgreSQL Row Level Security policies so unprivileged actors cannot query member records.</li>
          <li><strong>Transport Layer Security:</strong> All data transmitted between your browser and our servers is encrypted in transit using industry-standard TLS 1.3 / HTTPS.</li>
        </ul>
      </section>

      <section id="retention" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">8. Data Retention Policy</h2>
        <p className="mt-2">
          We retain personal data only for as long as necessary to fulfill the operational purposes set forth herein:
        </p>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li><strong>Active Memberships:</strong> Data is retained throughout your active membership term and for a reasonable period (up to 3 years) following expiration to facilitate renewals, audit verifications, or dispute resolutions.</li>
          <li><strong>Verification Logs:</strong> Retained for auditing and accounting reconciliation, after which logs may be permanently anonymized for analytical trends.</li>
        </ul>
      </section>

      <section id="user-rights" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">9. Rights of Data Principals (DPDPA 2023)</h2>
        <p className="mt-2">
          Under the Digital Personal Data Protection Act, 2023, you are recognized as a Data Principal and enjoy the following statutory rights:
        </p>
        <ul className="mt-2 list-disc pl-5 space-y-1.5">
          <li><strong>Right to Access:</strong> You may request a summary of the personal data collected about you and details of processing activities.</li>
          <li><strong>Right to Correction &amp; Erasure:</strong> You may request correction of inaccurate data or deletion of your account information, subject to statutory retention obligations.</li>
          <li><strong>Right of Grievance Redressal:</strong> You have the right to register complaints regarding data processing with our designated Grievance Officer.</li>
          <li><strong>Right to Nominate:</strong> You may nominate an individual to exercise your privacy rights in the event of death or incapacity.</li>
        </ul>
        <p className="mt-2">
          To exercise any of these rights, please submit a written request to <a href="mailto:pennygradebusiness@gmail.com" className="text-primary underline">pennygradebusiness@gmail.com</a> with your registered mobile number and PenCode.
        </p>
      </section>

      <section id="children" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">10. Children's Privacy</h2>
        <p className="mt-2">
          The PennyGrade membership platform is designed for individuals who are 18 years of age or older (including university students and working adults). 
          We do not knowingly collect personal information directly from children under 18 years of age without parental or guardian consent. 
          If you believe a child has provided us with personal information without parental consent, please contact us for immediate removal.
        </p>
      </section>

      <section id="grievance-contact" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">11. Grievance Officer & Contact Information</h2>
        <p className="mt-2">
          In accordance with the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023, 
          the contact details of our designated Data Protection &amp; Grievance Redressal Officer are as follows:
        </p>
        <div className="mt-3 rounded-xl border border-border bg-muted/40 p-4 text-xs space-y-1.5">
          <p><strong>Designation:</strong> Data Protection &amp; Grievance Officer</p>
          <p><strong>Platform:</strong> PennyGrade (Samir Pandey, Operating Entity)</p>
          <p><strong>Email:</strong> <a href="mailto:pennygradebusiness@gmail.com" className="text-primary underline">pennygradebusiness@gmail.com</a></p>
          <p><strong>Phone:</strong> <a href="tel:+919356897893" className="text-primary underline">+91 93568 97893</a></p>
          <p><strong>Registered Operating Desk:</strong> Daltonganj, Palamu, Jharkhand - 822101, India</p>
          <p><strong>Response Time:</strong> We acknowledge requests within 24 to 48 business hours and resolve verified grievances in accordance with statutory guidelines.</p>
        </div>
      </section>

      <section id="updates" className="scroll-mt-36">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">12. Policy Updates & Version History</h2>
        <p className="mt-2">
          We reserve the right to amend this Privacy Policy periodically. Any modifications will be posted to this page with an updated 
          &ldquo;Last Updated&rdquo; timestamp. We encourage you to review this policy periodically.
        </p>
        <div className="mt-4 border-t border-border/80 pt-4 text-xs text-muted-foreground">
          <p><strong>Document ID:</strong> PG-LEG-PRIVACY-V1</p>
          <p><strong>Version:</strong> 1.0 (Production Release)</p>
          <p><strong>Effective Date:</strong> October 14, 2026</p>
        </div>
      </section>
    </LegalDocLayout>
  );
}
