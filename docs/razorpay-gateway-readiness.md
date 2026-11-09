# PennyGrade Razorpay Gateway Readiness

## Simulated underwriting result: HOLD

The code and public-facing descriptions have been improved, but this is **not yet a complete application-ready business evidence set**. See [the underwriting-style review](razorpay-underwriting-review.md) for the verifiable strengths, hold reasons and evidence checklist. In particular, legal/KYC identity, executed partner contracts, actual card stock/dispatch, delivery SLA, refund/support operations, live site and provider tests remain unverified. Do not represent Route category labels as standard Payment Gateway approval.

## Proposed business description for the application

PennyGrade is a local membership and privilege network operated by Samir Pandey
(proprietor / operating entity) from Daltonganj, Palamu, Jharkhand. Customers may
purchase PennyGrade's own six-month physical membership card for ₹500. The card
provides membership access to participating local businesses and their individually
listed benefits. PennyGrade processes the membership fee only. Participating
businesses independently supply goods or services, apply their own listed member
offer where eligible, and collect customer bills directly. The membership card is
currently delivered in Daltonganj, Jharkhand.

## Category to ask Razorpay to review

**Proposed:** SOCIAL → `associations_and_membership` (Associations and Membership).

**Alternative to ask about:** SOCIAL → `neighbourhood_network` (Local/Neighbourhood
network).

Razorpay's published category list includes these labels in its Route documentation.
That only establishes that the labels exist in that Route context. It does not
establish that either is selectable or approved for PennyGrade's standard Payment
Gateway account. Ask Razorpay onboarding to confirm the correct category and allowed
product description before relying on it.

## Readiness items visible in the project

- ₹500, 180-day membership plan and physical card checkout.
- Server-side order amount and payment verification.
- Direct merchant billing model explained on the About page.
- Public partner directory and membership verification flow.
- About, contact, terms, privacy, shipping, refund, membership terms, and merchant
  agreement routes.
- Public support email, phone, and Daltonganj service location.
- A migration removes the known non-local demo partners/offers and replaces
  unsupported plan benefit copy.
- Checkout fails closed when production card inventory is zero or cannot be read;
  local JSON demo inventory cannot make production checkout available.
- Partner publication now requires a recorded representative, business verification,
  signed agreement reference/date, and member issue contact in server validation and
  the admin workflow.
- Public partner and offer results filter to active, in-date records and partners with
  verification/agreement evidence.
- Local JSON snapshots are no longer written when `NODE_ENV=production`.

## Deployment gate

The migration `20261110000001_partner_verification_and_agreement_gate.sql` is a
reviewable draft and has **not** been applied. It adds evidence fields and database
triggers that prevent activation of an unverified partner or offer. Apply it only
through the authorised database review/release workflow; the site code that selects
these fields must be deployed with the compatible schema. Existing partner records
remain preserved, but records without signed evidence are not eligible for public
listing after the migration and code are deployed.

The 16 one-page PDFs in `output/pdf/razorpay-readiness/` are preparation drafts, not
proof of live partners, executed agreements, business registration, issued cards,
customer transactions, gateway approval, or operational SLAs. The invoice is a blank
illustration; the merchant agreement is unsigned; the card specimen redacts the seeded
sample identifier.

## Business evidence still needs to be real and on hand

- Proprietorship / business proof, PAN, bank account proof, and address proof matching
  the legal merchant name and application details.
- Signed partner agreements and a completed offer schedule for each active listing.
- A real physical card sample and actual packaging / handover or courier process.
- Customer invoice example and a working process for cancellations, refunds,
  complaints, and delivery problems. Complaints must be resolved within four business
  days under Razorpay's current terms; confirm the team can meet this consistently.
- Confirm a realistic dispatch/delivery estimate and any refund initiation time you can
  actually meet, and show it on the public policy pages before applying.
- Confirmation that all partner records and offers left in the live directory are
  current, authorized, and accurate.
- Confirm the legal operator name, address, delivery reach, and contact channels on
  the public site match the documents submitted to Razorpay.
- Supply genuine signed agreements and review the currently retained partner records;
  no partner count is asserted.
- Establish a real dispatch estimate, email sender, support handling and refund
  operating procedure before accepting live membership payments.
- Resolve the concurrent checkout inventory reservation gap before production sales; the
  current count check prevents checkout at zero stock but does not reserve a card for
  concurrent pending orders.
- Obtain a current Razorpay written category determination. Public Route category
  labels are not proof of standard Payment Gateway availability.

Do not state that there are 10–20 signed partners, that a particular count is active,
or that Razorpay has approved a category unless the supporting records or approval
exist. Category selection is Razorpay's decision.

## Official references checked

- [Razorpay Route integration guide](https://tfs.np.razorpay.in/docs/payments/route/integration-guide): lists SOCIAL labels in Route documentation; not proof of standard PG eligibility.
- [Razorpay Terms](https://razorpay.com/terms/): describes merchant-site/product review; read the current version before applying.
- [Razorpay onboarding document guide](https://razorpay.com/blog/minimum-documents-payment-gateway-onboarding-india/): October 2026 preparation guidance says sole-proprietor evidence depends on verification route and documents requested in the live onboarding flow.
- [MeitY DPDP Rules, 2025](https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa?pageTitle=Digital-Personal-Data-Protection-Rules-2025%3B): check official staged commencement provisions with privacy counsel.
