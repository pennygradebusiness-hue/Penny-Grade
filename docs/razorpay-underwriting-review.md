# PennyGrade: simulated Razorpay underwriting review

**Outcome: HOLD — not ready to submit as a complete application.** This is an independent readiness assessment based on the checked repository, draft materials and publicly available Razorpay terms. It is not a Razorpay decision, does not use internal Razorpay policy and cannot predict approval.

## What the reviewer can verify from the product design

- Product presented: one PennyGrade six-month physical membership card for ₹500, with Daltonganj-only delivery.
- PennyGrade receives the membership fee. Members pay participating businesses directly for their purchases; partner billing is not routed through PennyGrade.
- Member listings describe partner benefits and conditions; the card supports membership identity and online verification.
- Checkout now states that partner privileges vary by listing and that dispatch/delivery timing must be confirmed before payment.
- Website contains business, contact, membership, privacy, shipping, cancellation/refund, terms and partnership information.
- The code validates Razorpay payment signatures/server-side payment status and does not permit production checkout to rely on local demo stock.

## Hold reasons and evidence needed

| Review area | Finding | Required before application |
| --- | --- | --- |
| Category | `SOCIAL` subcategories appear in Razorpay Route documentation only. That is not evidence that standard Payment Gateway onboarding offers or approves them. | Obtain written category and product eligibility guidance from Razorpay for the actual legal entity and ₹500 physical membership. |
| Merchant identity / KYC | The repository cannot prove legal form, PAN, proprietor details, bank ownership or address evidence. A public policy still asks the operator's legal name to be matched against KYC records. | Assemble current identity, business, bank and address documents; make the site/application identity consistent. |
| Partner network | Code includes a verification/agreement gate, but this repository cannot prove genuine, executed agreements or confirm live partner/benefit accuracy. The schema migration is draft and unapplied. | Sign and retain real agreements, validate every partner and offer; review and authorize the migration/deployment sequence. |
| Physical product and inventory | Card artwork/specimen and inventory workflow exist in the repository, but no physical stock, printing quality, packaging or dispatch evidence was inspected. Checkout's stock check is not an atomic reservation, so simultaneous orders could exceed available stock and require manual paid-order resolution. | Photograph the real card and packaging, count usable stock, demonstrate dispatch; implement/verify atomic reservation or an equivalent oversell control before accepting live payments. |
| Delivery disclosure | No measured dispatch/delivery estimate is available. Checkout now discloses this and asks customers to contact support before paying, but this is a purchase-friction and readiness gap. | Set a realistic operational SLA and publish it at checkout and in shipping policy; do not invent an estimate. |
| Refunds and complaints | Public policy states complete requests are targeted for decision within four business days and approved refunds are initiated within five business days. The repository has no customer self-serve refund flow; operator capacity and dashboard process were not inspected. | Confirm staffing and payment-dashboard procedure, record outcomes, and demonstrate deadlines can be met. |
| Data retention | Privacy notice says transaction/order/invoice/fulfilment records may be retained for ten years, reflecting current Razorpay merchant terms. This operational burden and any applicable legal retention schedule need owner/legal confirmation. | Confirm data storage, access restrictions, deletion holds and records process. |
| Live site and integrations | Public production site could not be inspected in this review. No production Supabase schema/RLS, Razorpay KYC/account, test/live payment, webhook, email sender, refund, or delivery operation was accessible. | Run an authorized production/staging review after the migration and deployment; verify checkout, webhook idempotency, support email and customer notices end to end. |
| Draft evidence pack | The 16 generated PDFs are summaries/templates, not executed records or proof of operations. The invoice is illustrative and the partner agreement is unsigned. | Replace applicable drafts with truthful, dated, real business evidence; do not submit illustrations as completed transactions or signed documents. |

## Suggested application description (subject to Razorpay confirmation)

PennyGrade sells its own ₹500 six-month physical membership to local consumers in Daltonganj. The fee covers membership registration, a personalised physical membership card, online membership verification, access to currently participating independent businesses, and member support. Participating businesses independently supply their goods/services, apply their own published member benefits subject to offer conditions, and collect bills directly from customers. PennyGrade does not collect partner sales proceeds. Physical card delivery is currently limited to Daltonganj. The exact legal merchant identity, fulfilment estimate, partner roster and category must be confirmed against current records before use.

## Public guidance considered

- [Razorpay Route integration guide](https://tfs.np.razorpay.in/docs/payments/route/integration-guide) lists SOCIAL business labels in a Route context; it does not establish standard PG category availability.
- [Razorpay Terms](https://razorpay.com/terms/) describe product/site/policy review and merchant obligations including refund disclosures, complaint handling and transaction record retention.
- [Razorpay onboarding document guide](https://razorpay.com/blog/minimum-documents-payment-gateway-onboarding-india/) explains that requirements depend on legal structure and verification route.

## Release decision

Do not describe PennyGrade as Razorpay-approved or submit the preparation pack as proof. The current code and website copy are improved for truthful review, but the application should wait for the evidence and operational items above. Database migration is intentionally unapplied; no payment gateway application or production deployment was made.
