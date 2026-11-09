# PennyGrade Production Test Report

Audit date: 2026-11-04

## Local checks

| Check | Result | Evidence |
|---|---|---|
| `pnpm test` | **PASS** | 11 test files, 135 tests passed after remediation. This includes route matching, server error-boundary, tracking privacy, and admin cookie tests. |
| `pnpm typecheck` | **PASS** | `tsc --noEmit` exited 0. |
| `pnpm build` | **PASS, local preset only** | Plain build exited 0, but local environment selected Cloudflare; this does not verify the Netlify adapter. |
| `pnpm --package=netlify-cli dlx netlify build --offline` | **PASS** | Netlify production build context exited 0 and generated/packaged the Netlify server function. Existing framework deprecation warnings remain. |
| `pnpm smoke:routes` against fresh local Vite dev server on port 8090 | **PASS** | HTTP 200 for `/`, `/checkout`, `/track-order`, `/refund-policy`, `/shipping-policy`, `/verify`, `/admin/orders`, and `/how-it-works`; unknown route returned 404. Request IDs and all configured security-header checks passed. |
| Netlify Dev local runtime route smoke | **FAIL** | All nine smoke URLs returned 404 without application request IDs/security headers. The generated function was packaged but not invoked. Static-mode diagnostics with/without generated `_redirects` and with either candidate functions directory also returned 404. `netlify functions:invoke server` found no matching function. Exact CLI/framework incompatibility is unknown. |
| Local browser rendering with Chromium | **PASS** for rendering only | Eight required paths loaded at 1280px, 768px, and 390px without browser console/page errors. Admin orders redirected to `/admin/login`. A mobile `/verify` overflow was found, fixed, and rechecked at 390/768/1280px. Does not cover payment or authenticated workflows. |
| Repeated live HTTP route recheck on 2026-11-04 | **FAIL** for required paths | 3/3 GETs each returned 404 for `/checkout`, `/track-order`, `/refund-policy`, `/shipping-policy`, `/verify`, and `/admin/orders`. `/` and `/how-it-works` returned 200 on 3/3 each; a test-only unknown path returned 404 on 3/3. Request IDs, `nosniff`, and `SAMEORIGIN` were present on sampled responses. |
| Other live public GET routes on 2026-11-04 | **PASS** for HTTP resolution only | `/become-a-member`, `/disclaimer`, `/history`, `/login`, `/membership-terms`, `/merchant-agreement`, `/offers`, `/partners`, `/privacy`, `/register`, `/terms`, and `/sitemap.xml` returned 200 with request IDs; `/robots.txt` returned 200 as static plain text (no application request ID expected). Dynamic record, authenticated, and mutation routes were not included. |
| Repeated live `/how-it-works` GET | **PASS** for repeat check | Current recheck: 3/3 HTTP 200; previous audit: 12/12 HTTP 200 after one observed 500. The cause of the earlier 500 remains unknown and **BLOCKED**. |

## Production route baseline

The previous audit observed `/checkout`, `/track-order`, `/refund-policy`, `/shipping-policy`, `/verify`, and `/admin/orders` returning HTTP 404; `/how-it-works` returned HTTP 500 once and then 200. Successful sampled production pages included the requested security headers and request IDs; the observed 500 lacked them. `/admin/reset-password` included `noindex, nofollow`.

The new source has not been deployed, so those baseline route failures remain the last confirmed results for the live release. No post-deploy production check is claimed.

## Security and integration checks

| Area | Status | Notes |
|---|---|---|
| Public server error redaction and headers | **PASS** locally | New tests cover JSON and HTML 5xx responses, generic public messages, request IDs, security headers, and error-body redaction. |
| Route matching and unknown-route behavior | **PASS** locally | Critical static and dynamic route matches covered; direct HTTP smoke confirms unknown path is 404. |
| Tracking lookup privacy | **PASS** locally | Tests assert unknown and mismatched order lookups use the same generic response, reject partial phone suffixes, and fail closed instead of using local-store data in production mode. |
| Admin session cookie handling | **PASS** locally | Server helper emits HttpOnly/SameSite cookie attributes and Secure in production; client helpers keep only display metadata. Browser cookie behavior still needs preview verification. |
| Supabase migration list and production schema | **BLOCKED** | Supabase returned HTTP 403 because the account lacks the required project/database privileges. |
| Production RLS, anon/customer/admin access tests | **BLOCKED** | No authorized test accounts or live policy verification performed. |
| Razorpay sandbox payment and webhook | **BLOCKED** | No sandbox credentials or isolated staging database were verified; no payment created. |
| Resend provider delivery | **BLOCKED** | No provider send test performed; no customer emails sent. |
| Admin order mutation and tracking | **BLOCKED** | No admin test session or staging order fixture. |
| Browser/mobile end-to-end testing | **BLOCKED** | Route smoke is HTTP-level; no full visual or interactive checkout test was completed. |
| Netlify preview/production deploy | **BLOCKED** | Netlify CLI reports this workstation is not logged in; no authenticated deploy/log access verified. |
| Netlify Dev local runtime preview | **FAIL** | Requests returned 404 despite the successful offline build. Diagnostic local static mode and explicit functions-directory selection did not fix invocation. No production deployment was attempted. |

## Remaining blockers

Production route behavior is **FAIL** for the six required new routes. Deployment commit and serverless logs for the prior 500, production Supabase migration/RLS state, provider integrations, and browser-level critical workflows remain **BLOCKED** on access and isolated staging fixtures. Do not use real customer payment details or production order fixtures for these tests.
