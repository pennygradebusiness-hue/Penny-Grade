# PennyGrade local QA inventory and Antigravity master prompt

Static repository inventory prepared 2026-11-04. This document describes the checked-in TanStack Start application and a safe plan for interactive local QA. No application flows or repository tests were run while preparing it.

## Local safety preflight

The checked-in local `.env` is configured with the Supabase host for project `gvdrpojyoznepohqrbpd`, which matches the linked project in `supabase/config.toml`; it contains a Supabase service role key. It also contains Resend credentials and Razorpay credentials (the key ID indicates test mode). `NODE_ENV` is not set in that file. Server functions execute with server-side credentials, so browser network interception alone cannot prevent a form from reaching the linked Supabase project or the configured email provider.

**Do not submit forms, invoke server mutations, run payment flows, or trigger email from the current configuration.** Before stateful QA, start a separate local Supabase stack or use an isolated staging project with dedicated test-only credentials, seed disposable fixtures, and replace/mock Razorpay and Resend. Ensure the dev server cannot load the existing `.env` or inherit its secrets. Confirm all server-side Supabase and provider hosts from the running process before opening the browser. If isolation cannot be demonstrated, limit the run to read-only navigation, rendering, client-side validation, and negative checks that do not call mutation endpoints. Do not use `scripts/live-browser-test.mjs` or `scripts/open-browser-verification.mjs`: they submit checkout/payment or order flows.

## Runtime and architecture

- Vite 8 with TanStack Start/file-based routing, React 19, Nitro server runtime; `vite.config.ts` configures the dev server on port 8080. The requested local URL is `http://localhost:8080`.
- TypeScript uses strict mode. Package scripts include `dev`, `build`, `typecheck`, `test` (Vitest), and `smoke:routes`. Vitest and Puppeteer Core are present; no Playwright configuration/package was found. Existing browser scripts are unsafe with the current environment.
- Public data access is in `src/lib/public.functions.ts`, using the publishable Supabase client for catalog reads and server functions for public verification/history. Order flows are in `src/lib/orders.functions.ts`; administrator operations/auth are in `src/lib/admin.functions.ts`. Customer account reads use `src/lib/member.ts` and Supabase auth.
- Discount verification is authoritative only in the `create_verification` SECURITY DEFINER SQL function, invoked via RPC. The partner page's bill savings widget is a preview; compare its presentation to the server result, never treat it as verification.
- Role data uses `public.app_role`, `user_roles`, `has_any_role`, and `is_admin`. Roles: `super_admin`, `manager`, `membership_manager`, `support`. UI permission labels are not proof of backend enforcement; attempt role boundary checks only against isolated fixtures.
- IDs for physical membership cards are generated with `gen_pen_code()` using cryptographic randomness; verify generated uniqueness/format without assuming sequential IDs.

## Route inventory

`/_authenticated` is a pathless guard, not a user-facing URL. Trailing slash normalization may occur for directory/account routes.

| Route | Audience / access | Main behavior and interactions | Data / integration |
|---|---|---|---|
| `/` | Public | Header/mobile navigation, hero CTAs, featured partners/offers, footer/legal links | Public categories, partners, offers |
| `/how-it-works` | Public | Step navigation/scroll links and CTAs | Static content |
| `/offers` | Public | Offer discovery and partner links | Public active catalog |
| `/partners` (`/partners/`) | Public | Search/autocomplete, intent suggestions, category and city selection, sort, filters (featured, offer, discount, min bill, type), URL sync, clear/remove filter, mobile filter sheet, partner cards | Public categories/partners |
| `/partners/$slug` | Public | Partner details, map/tel/email/website links, offer terms, local favorite toggle, bill-savings preview, continue to verification | Public partner/offer catalog; external map/contact links |
| `/p/$partnerSlug` | Public counter/merchant flow; no business login route found | Enter membership/card ID and bill amount; submit member eligibility and verification; show result/link session | `verifyMemberInput`, `createPublicVerification` → SQL `create_verification` RPC |
| `/verify` | Public | Choose partner from list and continue to partner verification | Public partner catalog |
| `/verification/$sessionId` | Public session result | Display verification outcome/status, retry/navigation CTAs | `getPublicVerificationSession` |
| `/history` | Public lookup | Membership ID + mobile lookup; reveal member/card/history data; navigation to partners/checkout | `getPublicCustomerHistory` (POST) |
| `/checkout` | Public purchase | Select membership plan; collect name/email/mobile/delivery address and accept terms; create order, payment UI, payment verification, confirmation | `getPublicMembershipPlans`, `createMembershipOrder`, Razorpay client/service, `verifyPaymentAndFulfillOrder`; order DB and email integration |
| `/order-confirmation/$orderNumber` | Public | Show order result/status; track order and partner directory links | Order lookup/status from route data |
| `/track-order` | Public lookup | Order number + email or mobile; optional prefill via query; show fulfillment/tracking details and courier link | `getOrderTrackingDetails` |
| `/become-a-member` | Public application | Member application: name, mobile, email, city, delivery/payment preference, notes; submit/success/reset | `submitMemberApplication` |
| `/partner-with-us` | Public application | Business/category/contact/mobile/email/city/address/offer/min bill/hours/notes; submit/success/reset; legal links | `submitPartnerApplication` |
| `/login` | Public informational/legacy | Explicitly says customer login is not required; links to admin login/history/partners, optional partner redirect | No customer sign-in form |
| `/register` | Public informational/legacy | Explicitly says customer registration is not available/required; links to admin login/history/partners | No customer registration form |
| `/account` | Customer auth guarded | Account landing, category/partner discovery and history link | Supabase authenticated user/member/catalog |
| `/account/history` | Customer auth guarded | Authenticated verification history | Supabase member data |
| `/account/membership` | Customer auth guarded | Membership/card details, reveal/mask ID toggle | Supabase member/membership/card data |
| `/account/profile` | Customer auth guarded | Edit name/mobile and save; email read-only | Supabase profiles update |
| `/admin/login` | Public admin sign-in | Email/password, show/hide password, forgot-password and first-time setup dialogs; generic reset success | Admin server functions, Supabase auth, signed HttpOnly admin session cookie |
| `/admin/reset-password` | Admin password recovery | New/confirm password fields, show/hide, return to login | Supabase auth/server sync |
| `/admin` | Admin guarded | Dashboard metrics and navigation | Admin summary RPCs |
| `/admin/orders` | Admin guarded | Orders/email tabs, metrics, search/payment/status filters, detail modal, card assignment, fulfillment status/courier/tracking/notes, CSV export, retry email | Admin order functions; DB, card inventory, Resend |
| `/admin/members` | Admin guarded | Members/applications tabs; search/status/sort/pagination; export; view; create; assign/replace card; renew; activate/deactivate/suspend/cancel/delete; mark application contacted/rejected; approve and issue card | Admin member/application/card functions; audit logging |
| `/admin/partners` | Admin guarded | Partner/inquiry tabs; search; create/edit partner and optional initial offer; feature/status changes; create offer; archive; inquiry contacted/onboard | Partner/application functions; catalog and audit log |
| `/admin/offers` | Admin guarded | Partner filter; create/edit/delete offer; percentage/fixed discount, cap/min bill, dates/days, terms, status | Admin offer functions; catalog and audit log |
| `/admin/categories` | Admin guarded | Add/edit category; icon/status; move display order up/down; activate/deactivate | Admin catalog writes, audit log |
| `/admin/plans` | Admin guarded | Add/edit plan name/description/price/duration/status | Admin catalog writes, audit log |
| `/admin/cards` | Admin guarded | Generate cryptographically random card batch, status filters, CSV export, preview/print; assignment lives in member/order workflows | `generateCardBatch`, card inventory |
| `/admin/qr-codes` | Admin guarded | Preview/print/download QR, regenerate URL-preserving QR, archive partner | Partner/QR admin functions |
| `/admin/verifications` | Admin guarded | Filter by date/member/partner/category/offer/status; retry read; export CSV | Admin verification logs |
| `/admin/reports` | Admin guarded | Month/partner filter, monthly metrics/table, CSV export | Verification/report data |
| `/admin/audit` | Admin guarded | Review audit events (read-only) | Admin audit log function |
| `/admin/admins` | Admin guarded; role-specific controls | Grant role/create credentials, generate password, copy credentials; reset password; revoke role | Privileged auth-user ops in `admin.functions.ts`; admin role/audit tables |
| `/admin/settings` | Admin guarded | Settings page; inspect visible controls and state (implementation is minimal) | Admin settings data if present |
| `/terms`, `/privacy`, `/disclaimer`, `/membership-terms`, `/merchant-agreement`, `/refund-policy`, `/shipping-policy` | Public | Legal text and cross-links | Static content |
| `/robots.txt`, `/sitemap.xml` | Public machine-readable | Validate content and status | Static/generated SEO responses |
| `/api/webhooks/razorpay` | Server POST endpoint | Razorpay webhook signature and event handling; don't invoke without isolated provider fixtures | Razorpay webhook, order/payment DB, email |

## Roles and authorization checks

The V1 customer journey does not require a customer login. `/login` and `/register` are informational legacy pages; public history and order tracking use lookup credentials. The `/account/*` routes are protected by the authenticated route guard, but there is no corresponding public customer sign-in/registration flow in these pages. Record the redirect/availability behavior as a product gap, not as a broken login form.

Admin sessions use a signed, HttpOnly cookie and a 30-day session with periodic expiry/sliding refresh. The route guard checks the session and redirects to `/admin/login`; admin layout additionally checks role data. Main navigation includes dashboard, orders, members, partners, verifications, reports. Sidebar also includes offers, cards, plans, categories, QR codes, admins/roles (super-admin-only UI), audit, and settings. Validate backend authorization for each server action; `support` is a defined role, but do not infer its write permissions from menu visibility.

Migration-derived data model includes profiles, user_roles, membership_plans, categories, partners, offers, memberships, physical_cards, verification_sessions, verification_logs, audit_logs, membership_orders, email_notifications, and order_status_history. Key invariants include active catalog visibility, own-profile/member/session access, role-checked admin writes, server-computed verification discounts, random card IDs, and blocking order cancellation until payment is refunded.

## Main end-to-end journeys

1. **Discover a partner:** Home/offers → directory search/filter → partner details → review offer terms → verification page. Check query-string filter persistence, empty states, card links, mobile filters, and calculator copy.
2. **Counter verification:** `/verify` or partner QR URL → enter membership/card ID and bill → invalid/member-not-found/inactive/expired/valid states → verification result/session. With isolated DB only, prove discount, cap, minimum bill, validity window, and duplicate/session behavior come from SQL RPC.
3. **Customer history:** `/history` → invalid lookup and valid fixture lookup → masked sensitive identifiers/history states.
4. **Membership inquiry:** `/become-a-member` → field validation → successful disposable submission → member application in admin → contact/reject/approve and card issuance (isolated DB only).
5. **Partner inquiry:** `/partner-with-us` → field validation → disposable submission → admin inquiry list/status → onboard partner and offer (isolated DB only).
6. **Purchase:** checkout plan selection → address/terms validation → payment success/failure/cancel → order confirmation → tracking. Mock Razorpay end-to-end; cover webhook idempotency and payment verification with controlled fixtures only.
7. **Fulfillment:** admin order search/detail → assign available card → status progression/courier details → customer tracking view → email notification queue/retry. Mock email and enforce payment/refund transition rules.
8. **Admin authorization:** login, session refresh/expiry/logout, direct URL, role matrix and server endpoint denial; exercise admin management only with disposable admin accounts in isolated DB.

## Known gaps and QA attention

- Current `.env` prevents safe stateful browser QA until backend/provider isolation is complete.
- Public customer login/register pages intentionally provide no account flow, while guarded account routes exist. Test and document the redirect; do not report the informational page as a broken form.
- `/partners/$slug` labels a client-side savings preview as an exact savings calculator. Treat only the SQL verification result as authoritative; compare the two and flag misleading divergence/copy.
- `/verify` and partner QR route have no distinct business-user authentication surface. Do not invent a merchant dashboard or business representative role.
- `.env` names Razorpay test mode, but this does not make Supabase writes or Resend email safe. Require complete host/credential isolation.
- Exercise error and loading states, keyboard access, labels, focus handling, browser back/forward, refresh/deep links, mobile drawers, and direct route authorization. Do not infer security from client-side hiding.

## Antigravity master prompt

Copy the full prompt below into Antigravity after preparing an isolated local environment.

```text
ROLE
You are a Principal QA Architect and autonomous browser automation engineer. Exhaustively test the PennyGrade application in the actual repository at http://localhost:8080. Your goal is a reproducible, evidence-backed QA report covering every user-visible route, control, link, validation rule, role boundary, and end-to-end journey listed below. Do not deploy, publish, contact real people, or use production services.

APP CONTEXT
This is PennyGrade, a React 19 + TanStack Start app using Vite/Nitro and Supabase. The project is a local discount membership and physical card system. Public customers browse partners/offers, look up history, apply for membership, verify a membership at a partner counter, buy a card, and track orders. Admins manage catalog, members, cards, applications, verification logs, orders, reports, audits, and administrator roles.

NON-NEGOTIABLE SAFETY PREFLIGHT
1. Before browser interaction, inspect the actual server process environment and app server configuration. The repository `.env` points to Supabase project gvdrpojyoznepohqrbpd and contains a service role key, Resend credentials, and Razorpay test-mode credentials. Do not load, print, copy, or use these secrets. Do not assume the Razorpay test key makes database or email writes safe.
2. Confirm the running app's server-side Supabase host is a dedicated local Supabase instance or explicitly isolated staging project with disposable data and test-only credentials. Confirm Resend and Razorpay are mocked or point only to safe test sinks. Browser-side request interception is insufficient for server functions. Do not start the app in a way that inherits the repository `.env` or current shell production secrets.
3. If any host or credential cannot be verified as isolated, STOP all write-flow testing. Continue only with GET/read-only UI navigation, screenshots, accessibility inspection, and client-side validation that demonstrably makes no server call. Report the exact blocked workflows and reason. Do not attempt a "harmless" test submission.
4. Use only synthetic data, e.g. names ending `QA Fixture`, reserved example.test emails, and phone numbers explicitly provisioned in isolated fixtures. Never use a real customer's data. Never send external email/SMS, create a live payment, fulfill a real order, alter a production catalog/account, or invoke the Razorpay webhook against a real backend.
5. Preserve existing repository files and local data. Do not edit app source, install packages, start deploys, or run repository test scripts. You may create a timestamped QA report and screenshots under `artifacts/local-qa/` after checking that directory; do not overwrite prior artifacts.

SETUP AND EVIDENCE
- Confirm app responds at http://localhost:8080 and record browser/version, viewport, timestamp, app commit if available, and sanitized backend/provider host identities. Never include secret values in evidence.
- Use the available browser automation tools already installed/configured. If no browser automation is available, report that limitation rather than installing tooling.
- Capture console errors, failed network requests, JS exceptions, screenshots for findings, route/status, and concise reproduction steps. Redact emails/phones/session tokens/card IDs except synthetic fixtures. Maintain a route/control checklist and mark each item Pass, Fail, Blocked, or N/A with reason.
- Test desktop 1440x900, tablet 768x1024, and mobile 390x844; additionally check 320px width for overflow. Exercise keyboard-only navigation, visible focus, labels, dialogs, escape/backdrop behavior, and browser back/forward. Check reload/deep-link for every route.
- Visit every route below. Discover visible links and buttons from the DOM/accessibility tree at each page; activate each safe navigation/control at least once, deduplicating repeated partner cards while testing representative first/middle/last entries. For stateful actions, use only isolated fixtures after preflight passes. Never click an action that can trigger an unmocked external side effect.

ROUTES AND COVERAGE
Public content/navigation:
/, /how-it-works, /offers, /partners, /partners/$slug, /verify, /p/$partnerSlug, /verification/$sessionId, /history, /become-a-member, /partner-with-us, /login, /register, /terms, /privacy, /disclaimer, /membership-terms, /merchant-agreement, /refund-policy, /shipping-policy, /robots.txt, /sitemap.xml.
Commerce:
/checkout, /order-confirmation/$orderNumber, /track-order. Never perform actual payment; use the configured mock payment provider and seeded fixture only.
Guarded customer:
/account, /account/history, /account/membership, /account/profile. The public `/login` and `/register` pages intentionally state that customer sign-in/registration is not required/available, while `/account/*` is guarded. Record actual redirect behavior and report the product-flow inconsistency; do not invent a missing customer login form.
Admin:
/admin/login, /admin/reset-password, /admin, /admin/orders, /admin/members, /admin/partners, /admin/offers, /admin/categories, /admin/plans, /admin/cards, /admin/qr-codes, /admin/verifications, /admin/reports, /admin/audit, /admin/admins, /admin/settings.
Server endpoint: `/api/webhooks/razorpay` is POST-only and must not be called directly unless a fully isolated webhook fixture/provider is in place. GET can be used to verify method handling if it is read-only.
`/_authenticated` is a pathless guard, not a URL. Trailing slash normalization may apply to `/partners/` and `/account/`.

ROLE MATRIX
Roles in the repository are `super_admin`, `manager`, `membership_manager`, and `support`. Use existing isolated seeded accounts only. Test anonymous, each available role, and expired session states against direct URL access and server actions. Verify UI visibility and server denial independently. Expected broad scope: super_admin/manager catalog administration; super_admin/manager/membership_manager membership/card operations; admin role controls are super-admin-only in UI. Support permissions must be observed from server policy and reported, never guessed. Do not create/remove real users or role grants. Check login, first-time password setup, forgotten-password generic response, password reset, logout, refresh, expiry, and HttpOnly session behavior only with isolated accounts.

PAGE-LEVEL INTERACTION CHECKLIST
- Home/how-it-works/offers/legal: every header, footer, CTA, breadcrumb, card and cross-link; responsive menu open/close, focus order, anchors and broken links.
- Partner directory: search and autocomplete, submit and clear query, synonym/intent chips, category/city, sorting, featured/has-offer/discount/minimum-bill/offer-type filters, filter badges/removal, clear-all, URL query synchronization, browser history, empty results, mobile filter sheet and show-results action. Verify result counts and no horizontal overflow.
- Partner details: logo/banner fallback, contact/map/external links, favorite toggle persistence behavior, offer terms, minimums, opening hours if present, savings input with zero/negative/large/non-numeric values, output formatting, and link to real verification. Explicitly distinguish preview from SQL-authoritative verification.
- `/verify` and `/p/$partnerSlug`: partner selection/QR route, required input, malformed/unknown ID, blank/zero/negative/decimal/very large bill, inactive/expired/suspended member, inactive partner/offer, below minimum, offer date/day/cap, duplicate submission, loading and RPC failure. On isolated DB, compare displayed bill/discount/final amount exactly to SQL response; never calculate expected authoritative discount in browser.
- `/verification/$sessionId` and `/history`: valid/invalid/expired session, invalid ID/mobile, mismatch, no history, multiple history rows, sensitive data masking, retry/navigation. Do not brute force identifiers.
- Membership/partner applications: required/email/phone/length validation, keyboard and autofill, optional values, duplicate handling, server errors, success/reset; then isolated admin review actions.
- Checkout: plan selection, complete address/terms validation, invalid values, payment modal open/close/failure/success, duplicate click/idempotency, server-side amount integrity, confirmation deep link. Mock all payment and email events; verify no client-controlled price is trusted.
- Order tracking: valid number plus matching email/mobile, wrong identifier, unknown order, each status, tracking link safety, query prefill, refresh/back, missing courier fields.
- Admin shared shell: session/login state, desktop/mobile sidebar, direct routes, breadcrumbs, logout, expired session, role-limited nav and server denial.
- Members: members/application tabs, search/status/sort/pagination, CSV content, details, create validation, application contact/reject/approve, card assign/replace, renewal and status transitions. Test destructive confirmation, cancellation and delete only on disposable fixtures.
- Partners: partner/inquiry tabs, search, create/edit required fields and validation, featured/status toggles, initial offer, offer link, archive confirmation and preserved history; inquiry contact/onboard.
- Offers: partner filter, create/edit, percentage/fixed values, percentage >100, cap/minimum, date ranges, days toggles, terms, active state, delete confirmation; verify public catalog visibility changes only after valid isolated writes.
- Categories/plans: add/edit, required/invalid bounds, slug uniqueness, icon/status, reorder; plan price/duration validation and public checkout plan display.
- Cards/QR: batch sizes and safe generation, random/nonsequential uniqueness, status filters/export, preview/print/download, QR URL correctness/regeneration, archive behavior. Test with isolated data; do not print to a real device.
- Orders: search, payment/status filters, metrics/tabs, details, available card assignment, valid/invalid fulfillment transitions, courier/carrier/tracking URL/notes, CSV export, email notification list/retry. Check refund-before-cancel invariant, event/idempotency behavior and safe link schemes. Email retries must hit mock sink only.
- Verifications/reports/audit: date and member/partner/category/offer/status filters, empty/error/retry states, CSV correctness, monthly and partner aggregates, audit visibility and read-only behavior.
- Admins/settings: grant/reset/revoke flows, generated password quality and copy control, prevent unauthorized role changes, no password/token leakage, settings controls and save/error states. Role mutations only against disposable accounts.
- Error handling: unknown route, malformed slug/session/order number, server offline, empty catalog, stale session, denied function, delayed response and retry. Check no uncaught exception or secret/stack trace in UI.

DATA AND SECURITY ASSERTIONS
- All public catalog data must be active/published and must not reveal private profiles, admin data, internal notes, or credentials.
- Admin write authorization must be enforced by server-side function/RLS role policy, not merely hidden controls. Check each role against representative routes and server functions.
- Discount validation/calculation is exclusively the SQL `create_verification` SECURITY DEFINER RPC. Confirm the browser sends inputs and renders returned values; it must not be authoritative for discounts.
- Card/member identifiers are cryptographically random via `gen_pen_code()`, never sequential or enumerable.
- Public history/order lookups require the expected paired verification data and return minimal/masked data; do not enumerate.
- Payment amount/status must be server verified; client return URL alone cannot mark paid. Webhook signature validation and idempotency must hold in isolated fixtures.
- Order cancellation cannot occur before refund; fulfillment transitions and card assignment cannot violate inventory/payment invariants.
- Session cookies should be HttpOnly, Secure when applicable, SameSite appropriate; passwords and provider secrets must not appear in rendered HTML, browser storage, logs, URLs, or screenshots.
- Validate link targets against unsafe schemes and ensure external links use safe rel attributes where applicable.

REPORT FORMAT
Write `artifacts/local-qa/report-<timestamp>.md` and a concise `artifacts/local-qa/findings-<timestamp>.md` only after verifying artifact paths do not overwrite prior work. Include:
1. Executive result and safety preflight evidence (sanitized host names only).
2. Coverage totals by route, viewport, role and journey; each route/control item marked Pass/Fail/Blocked/N/A.
3. Findings ordered Critical/High/Medium/Low with title, route, role, viewport, exact reproduction, expected/actual result, security/business impact, screenshot/console/network evidence, and likely code area if known.
4. Accessibility, responsive, security, data-integrity and UX results, plus all tests blocked by isolation.
5. Clear distinction among verified facts, assumptions and untested cases. Never claim a pass for a blocked workflow.
6. No secrets or personal data in report/artifacts. Do not modify app code or deploy.

Begin with the safety preflight. If it passes, proceed through the route list and journeys systematically, preserving a checklist as you go. If it fails, perform only the read-only work explicitly allowed above and report the block.
```
