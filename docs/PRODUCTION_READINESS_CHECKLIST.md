# PennyGrade Production Readiness Checklist

| Area | Status | Evidence / next action |
|---|---|---|
| Local routing | **PASS** | Direct local HTTP smoke test passes for all eight required routes; unknown paths return 404. |
| Production routing | **FAIL** | 2026-11-04: 3/3 live GETs returned 404 for checkout, tracking, refund, shipping, verify, and admin orders. Root and `/how-it-works` returned 200 on 3/3 each. |
| Netlify local runtime | **FAIL** | Offline build packaged a function, but Netlify Dev returned 404 for all smoke URLs and CLI invoke found no matching function. Resolve or verify through an authenticated preview. |
| Reliability | **BLOCKED** | `/how-it-works` returned 3/3 200 in the current live check and 12/12 in the earlier audit, but prior 500 cause remains unknown. Inspect deploy logs by request ID. |
| Customer checkout | **BLOCKED** | No live or staging order flow executed. Validate with test provider credentials and isolated fixtures. |
| Razorpay payment and webhook | **BLOCKED** | Source and unit tests reviewed; sandbox success/failure/forgery/duplicate cases remain. |
| Database migrations | **BLOCKED** | Linked production migration-list request received HTTP 403. Obtain Supabase administrator review. |
| RLS and server authorization | **BLOCKED** | Static source policies reviewed; live anon/customer/admin probes not run. |
| Admin session credential exposure | **PASS** locally | Custom token now uses a server-issued HttpOnly cookie; production behavior needs preview verification. |
| Card allocation | **BLOCKED** | SQL is atomic/idempotent by inspection; no staging database integration test run. |
| Fulfillment and tracking | **BLOCKED** | Local route resolves; no paid staging order or courier workflow verified. |
| Transactional email | **BLOCKED** | Templates/outbox logic reviewed; no controlled Resend provider send. |
| Counter discount verification | **BLOCKED** | SQL/server boundary reviewed; no card/offer staging fixture exercised. |
| Admin operations | **BLOCKED** | Admin orders route resolves locally; no authenticated staging write test. |
| Automated local checks | **PASS** | 135 tests, typecheck, plain local-preset build, Netlify offline build, Vite route smoke, and Chromium route rendering pass. |
| Mobile page layout | **PASS** locally | Found and fixed `/verify` horizontal overflow at 390px; 390/768/1280px retest passes. |
| Preview/production deployment | **BLOCKED** | Netlify CLI is unauthenticated; no deploy initiated. Live routes still fail. |
| Required documentation | **PASS** | Audit, deployment, database, payment/fulfillment, test report, and this checklist created. |

## Release decision

**Do not declare production readiness.** Critical production routing, payment, database security, fulfillment, email, and deployment criteria remain failed or blocked. Resume release verification after authorized Netlify and Supabase access plus isolated provider/test fixtures are available.
