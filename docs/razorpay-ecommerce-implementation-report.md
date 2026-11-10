# PennyGrade e-commerce storefront implementation report

## 1. Implemented changes

- Added `/membership-card` as a product detail page for PennyGrade's own six-month physical membership card. It shows the single active 180-day plan price and actual inventory status without exposing stock counts; it has no hard-coded price fallback.
- Added a one-item cart at `/cart` with add/remove behavior, dynamic order summary, and plan-specific checkout handoff. Cart state stores only the plan ID in the browser; it does not create an order or allocate inventory.
- Updated homepage messaging, CTA labels, and site navigation to point to the product page and identify online purchase clearly.
- Updated Razorpay Checkout's product image to use PennyGrade's actual local brand asset instead of an unrelated `pennygrade.com` URL.
- Added a server-side live-payment gate: live order creation is blocked and the live public key withheld unless `RAZORPAY_LIVE_PAYMENTS_APPROVED=true` is explicitly configured after merchant/product approval.
- Replaced the legacy membership-inquiry route with a redirect to the product page, aligned public price copy with the authoritative product price, and removed unsupported proprietor/KYC placeholder wording from customer-facing pages.
- Added a factual payment-gateway business-description draft and e-commerce readiness checklist.

## 2. Existing features reused

- Existing `/checkout` customer and delivery form, server-priced membership order, inventory check, Razorpay payment initialization, server-side payment verification, and fulfillment handling.
- Existing order confirmation and `/track-order` flow.
- Existing membership verification, partner directory, partner offer pages, admin dashboard, Supabase architecture, and customer-facing legal/policy pages.

## 3. Remaining technical blockers

- Inventory is checked before payment initialization but is not atomically reserved. Concurrent purchases can contend for the last card; fix and test that before enabling production payments.
- The storefront requires exactly one active 180-day physical-card plan. Confirm its active price and terms are the intended offer before release.
- Prior production audit records live-route/runtime, migration/RLS, and isolated payment/webhook/email integration gaps. Local code checks do not establish deployed functionality; review `PRODUCTION_AUDIT.md`, `PAYMENT_AND_FULFILLMENT.md`, and `razorpay-underwriting-review.md`.
- No live Razorpay test or production payment, refund, webhook, card allocation, dispatch, or customer email was performed.

## 4. Remaining real-world business requirements

- Match the merchant's legal name, constitution, PAN, bank proof, and address across the application and public business information.
- Confirm actual card stock, product photographs, packaging, dispatch process, delivery estimate, and support staffing.
- Confirm that each business shown as a live partner has a genuine executed agreement and current approved offer details.
- Ensure the published refund and complaint process can be operated within the stated terms.
- Confirm the named payment merchant/legal identity, address, working hours, complaint-resolution target, refund-initiation timeframe, privacy handling, and partner agreements against current real records before submission. The website copy is not evidence that these commitments or records exist.

## 5. Items requiring Razorpay confirmation

- Whether the exact ₹500 physical-card-plus-six-month-membership product is eligible for standard Payment Gateway onboarding.
- Which category Razorpay wants for the actual legal entity and business; the website cannot assign or guarantee a category.
- Whether account-specific KYC, documents, product disclosures, or additional conditions apply.

## Verification performed

- `pnpm run build` — passed. Existing warnings include deprecated `createServerFn().inputValidator()` usage in multiple modules and the `vite-tsconfig-paths` plugin deprecation notice.
- `pnpm run typecheck` — passed.
- `pnpm test` — passed: 16 files, 145 tests.

No database migration was applied, the live-payment approval flag was not enabled, production payment was not enabled, deployment was not made, and no Razorpay application was submitted.

## Live storefront recheck — 10 November 2026

The public site and the main product, cart, checkout, and policy URLs returned HTTP 200. The live `/membership-card` response, however, displayed “Price unavailable” and “Purchase is temporarily unavailable while the active membership plan is being confirmed.” This means the live deployment does not currently expose the intended priced product for a normal customer purchase. The source code is deliberately fail-closed when it cannot confirm the unique active server-side plan. Before asking Razorpay to review the live website, verify production Supabase credentials/schema and plan data, confirm real available card inventory, then retest the product and checkout pages. Do not mask this with a hard-coded price or fabricated inventory.

The onboarding category cannot be conclusively inferred from a separate Razorpay Route category document. Based on the business description and the options shared by the merchant, Social group or platform appears closer than an inaccurate Ecommerce Marketplace or stored-value Gift Cards/Vouchers classification. If the dashboard requires Ecommerce, Coupons is only a possible label to ask Razorpay about, not a confirmed selection. Obtain Razorpay's written category guidance for this membership-plus-physical-card product before treating the category as settled.
