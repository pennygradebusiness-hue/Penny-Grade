# PennyGrade Payment and Fulfillment

## Implemented flow in the repository

1. The checkout route validates customer details and asks the server to create an order.
2. `createMembershipOrderLogic` reads the selected active membership plan and obtains the amount from server-side plan data before creating a Razorpay order.
3. The payment callback is checked by `verifyPaymentAndFulfillOrderLogic`. The code verifies an HMAC-SHA-256 signature with constant-time comparison, checks that Razorpay's payment/order IDs, amount, and currency match the stored order, and looks up payment status from Razorpay.
4. Only a captured payment is passed to `fulfill_paid_membership_order`. The SQL routine locks the order row, handles repeat fulfillment idempotently, and atomically reserves an available physical card and creates/links a membership. If stock is exhausted, it records a fulfillment exception rather than fabricating a card assignment.
5. The Razorpay webhook route verifies the webhook signature and invokes fulfillment for eligible events. Order confirmation email uses the Resend outbox path and an idempotency key.
6. Admin order functions record dispatch and delivery details; customer tracking uses the order number plus a matching contact value.

## Security boundaries

- Pricing and discount calculations are server/database responsibilities; the browser's payment payload is not authoritative.
- Razorpay secret and webhook secret are server-only. `VITE_RAZORPAY_KEY_ID` is a public checkout identifier, not a secret.
- Fulfillment SQL execution is restricted to `service_role`; the server verifies the payment before calling it.
- `create_verification` remains the only discount calculation authority and is called through a server function.
- Email idempotency and outbox persistence are implemented in source. Provider delivery and production outbox policy still need live verification.

## Verification completed

- Unit tests cover order creation/validation, payment signature handling, payment lookup behavior, fulfillment logic, Razorpay service, and email delivery paths.
- The full local Vitest suite passes (11 files, 135 tests after this remediation).
- TypeScript typecheck and `netlify build --offline` pass. Plain `pnpm build` selected the local Cloudflare preset and is not Netlify target verification.
- Local Chromium rendering was checked at 1280px, 768px, and 390px for all required paths. A 390px horizontal overflow on `/verify` was found and fixed by constraining its one-column partner grid and flex children; the route now fits at all three widths. The admin orders route redirects to `/admin/login` locally.
- On 2026-11-04, live production returned 404 on 3/3 GETs for each of the six required new routes. `/` and `/how-it-works` returned 200 on 3/3 each.
- The Netlify offline build packages a server function, but the local Netlify CLI does not invoke it: Netlify Dev returned 404 and `functions:invoke` reported no matching generated function.
- No actual Razorpay payment, webhook delivery, physical card assignment in production, Resend email to a customer, or paid-order admin action was performed.

## Remaining critical checks

**BLOCKED:** Configure isolated Razorpay test credentials and webhook secret; use an isolated Supabase staging project with card fixtures; test success, failure, abandonment, forged signature, mismatched order, duplicate callback/webhook, captured payment arriving after cancellation, and stock exhaustion. Verify provider logs and database state after each case. Use a Resend test destination and verify idempotency/outbox records without contacting real customers.

Production readiness must remain **FAIL** until these checks and the production migration inventory are complete.
