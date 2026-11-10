# PennyGrade minimum e-commerce readiness

Status snapshot: repository review and local implementation only. This is not an independent Razorpay review, a live-production validation, or approval to accept live payments.

## Live site review — 10 November 2026

An unauthenticated HTTP check of `https://www.pennygrade.in` and the product, cart, checkout, About, Contact, Terms, Privacy, Shipping, Refund, and Membership Terms routes returned HTTP 200. This confirms reachability at the time of review, not end-to-end checkout correctness. The live `/membership-card` page currently renders **“Price unavailable”** and **“Purchase is temporarily unavailable while the active membership plan is being confirmed.”** Therefore the live storefront is **not ready to submit for final website review as a functioning priced storefront** until the production plan query resolves to the intended active ₹500, 180-day, physical-card plan and actual available card inventory is confirmed. Do not hard-code a fallback price or invent stock to hide this issue. Diagnose the production Supabase/server configuration and database state, then verify the live page and checkout again.

### Category selection guidance

The actual product is a PennyGrade membership, represented by a physical card, which grants access to a local partner directory and partner-defined offers. It is not a third-party seller marketplace, a stored-value gift card, or a standalone coupon product. On the category options supplied from the current onboarding form, **Social group or platform** is the closest description of the membership-network business, if its offered subcategory accurately supports memberships. The old Razorpay Route `SOCIAL` list mentioning “Associations and Membership” is only a lead for clarification; it does not establish the standard Payment Gateway category or eligibility.

If Razorpay explicitly instructs the merchant to select **Ecommerce**, no displayed Ecommerce subcategory is an exact fit. `Coupons` is the nearest possible label only as a question to put to Razorpay, not a confirmed recommendation: the product includes a physical card and term membership rather than a coupon-only sale. Do not choose `Ecommerce Marketplace` (PennyGrade does not collect seller payments) or `Gift Cards Vouchers` (the card is not stored value or a gift balance) to improve approval odds. Ask Razorpay to confirm the category/subcategory for the exact product in writing and disclose the membership-plus-card model fully. No category can make approval certain.

## Website and purchase flow implemented in this repository

- A dedicated PennyGrade physical membership card product page showing the sole active 180-day card-included plan's live server-side price, actual inventory status (without exposing counts), included features, delivery-area disclosure, and policy links. If plan, inventory, or payment status cannot be verified, purchase actions are disabled instead of displaying fallback data.
- One-product cart, remove-item action, order summary, and direct Buy Now / checkout path. The cart stores only the selected active plan ID in the browser; it does not create orders or allocate card numbers.
- Existing checkout collects customer contact and delivery details, accepts the published terms, checks card stock before payment initialization, and uses the selected active plan amount on the server when creating an order. The product-to-checkout link passes the authoritative plan ID and checkout reconciles it with the active plan list.
- Existing order confirmation and order tracking routes; payment status is verified server-side before fulfilment and card assignment.
- Homepage and navigation now identify the card as a product available to shop online. Partner businesses remain independent and are not presented as PennyGrade-owned products.
- About, Contact, Terms, Privacy, Shipping, Refund/Cancellation, Membership Terms, and Merchant Partnership pages are linked. Copy was reviewed to remove unsupported operator-status assertions and overbroad privacy language; all legal identity, refund, complaint, support-hours, and fulfilment commitments still need owner confirmation.

## Existing technical controls and limitations observed

- Existing payment logic verifies provider signatures and captured payment status, and has an idempotent fulfilment path. A code review or unit test is not proof that production credentials, webhook events, migrations, provider configuration, or fulfilment work end to end.
- Live Razorpay order creation fails closed unless `RAZORPAY_LIVE_PAYMENTS_APPROVED=true`; the public key is withheld and storefront purchase actions are blocked when a live key is not explicitly approved. Keep the setting false until the actual account and product receive approval.
- Review of the specific earlier audit concerns found source-level controls for keeping partner-evidence fields out of the public catalog projection; requiring partner evidence in admin activation paths; blocking order-card assignment unless the order is paid; idempotent payment fulfilment; returning the actual card-allocation result to the confirmation UI; and obtaining discount totals from the database verification result. The partner-evidence database gate is a migration, and its production application/RLS state is not confirmed. Source checks do not establish deployed or database behavior.
- The order-creation stock count is a check, not an atomic reservation. Concurrent orders can race for the last available physical card. Resolve and verify that oversell risk before enabling live collection.
- The product and cart price come from the single active database plan with a physical card and 180-day duration; the purchase page is unavailable if there is no unique matching plan. The checkout reads the active plan amount server-side. Confirm that plan configuration and terms before release.
- `src/routeTree.gen.ts` must be regenerated from the route modules as part of the build; do not deploy a mismatched route tree.
- The production audit documents outstanding verification gaps around partner-evidence privacy/publication, database migration and RLS state, production routes/runtime, and isolated provider integration. Review `PRODUCTION_AUDIT.md`, `razorpay-underwriting-review.md`, and `PAYMENT_AND_FULFILLMENT.md` before release.
- No application code can establish that there is real card stock, accurate partner benefits, signed partner agreements, a measured delivery SLA, trained customer support, or an approved Razorpay account.

## Real-world evidence required from the operator

- Current PAN, legal-constitution/business proof, bank ownership, and address evidence matching the merchant profile.
- Photographs of the real card and packaging; count and quality records for actual available stock.
- Executed agreements and current approved benefit schedules for each participating business shown publicly.
- Actual fulfilment arrangements and a realistic, supportable delivery estimate for the published service area.
- A staffed support and complaints process; documented cancellation/refund review and provider refund initiation procedure consistent with published policies.
- A customer invoice/order record example that is genuinely generated by the system (never a fabricated sale).
- Approved Razorpay standard Payment Gateway category and product eligibility, confirmed in writing for this exact business model.

## Release gates

1. Keep `RAZORPAY_LIVE_PAYMENTS_APPROVED=false` until written merchant/product approval. Regenerate route types and run `pnpm run typecheck`, `pnpm test`, and `pnpm run build` against the final commit.
2. Test payment success, failure, abandonment, forged signature, mismatched amount/order, duplicate callbacks/webhooks, inventory exhaustion, last-card concurrency, email idempotency, refund support handling, and tracking in an isolated staging project with test credentials only.
3. Verify the deployed preview's product, cart, checkout, policy pages, order confirmation and tracking, including mobile layout and network/SSR performance.
4. Confirm the legal merchant identity, active partner records, fulfilment terms, and data-retention/support process with the operator.
5. Keep live collection disabled until Razorpay approves the exact product and account. Do not submit generated mockups, sample records, or unsigned drafts as completed evidence.
6. Before requesting website review, resolve the live page's missing-price/unavailable-plan state and verify the actual plan, physical inventory, payment configuration, policies, and checkout against production. A successful HTTP status alone is not a readiness pass.

## Classification

The product page presents an actual online purchase of PennyGrade's own membership product, including a physical card and six-month membership access. This does **not** itself make Razorpay classify it as e-commerce, prove the product is eligible, or guarantee gateway approval. Razorpay decides the category and account eligibility after reviewing the real business and KYC.
