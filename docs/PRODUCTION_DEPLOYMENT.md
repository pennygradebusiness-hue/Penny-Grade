# PennyGrade Production Deployment

## Architecture

- Framework: TanStack Start with React and file-based routes under `src/routes/`.
- Build/runtime: Vite 8 and Nitro; `vite.config.ts` selects the Netlify Nitro preset when `NETLIFY=true`.
- Repository deployment config: `netlify.toml` sets `pnpm run build` and publishes `dist`; tracked `public/_redirects` rewrites application paths to `/.netlify/functions/server`.
- Route generation: the TanStack router plugin generates `src/routeTree.gen.ts` during Vite builds. Do not edit that file by hand.
- Node: 22, as declared in `.node-version`, `.nvmrc`, and Netlify build configuration.
- Package manager: pnpm 10.33.0.
- Database/auth: the linked Supabase project configured in `supabase/config.toml`.

The live `www.pennygrade.in` response was observed with `Server: Vercel` on 2026-11-10, which conflicts with the repository's Netlify deployment config. The actual Vercel project settings, build command, environment variables, deployment branch, and commit could not be inspected from this workstation. The local Netlify build generated `dist/_redirects`, `dist/assets/`, and `.netlify/functions-internal/server/`, then packaged `server/server.mjs` as a function. Netlify Dev returned 404 for every route tested both with framework proxying and with static mode. Do not treat the Netlify setup as verified production configuration until the deployment owner resolves this host/config mismatch.

## Environment variables

Set variables in the actual hosting project's runtime/build context. Values must be kept in the provider's secret store and must never be copied into source control or browser bundles. The current live host is not verified against this repository's Netlify config.

| Variable name | Use | Exposure |
|---|---|---|
| `SITE_URL` | Canonical server-side site origin | Server |
| `SUPABASE_PROJECT_ID` | Server Supabase project selection | Server |
| `SUPABASE_URL` | Server Supabase endpoint | Server |
| `SUPABASE_PUBLISHABLE_KEY` | Server-side public client key | Server config; publishable by design |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged server database operations | **Server secret only** |
| `ADMIN_SESSION_SECRET` | Signs admin session tokens | **Server secret only** |
| `RAZORPAY_KEY_ID` | Server Razorpay API key ID | Server; public checkout key may be separately exposed |
| `RAZORPAY_KEY_SECRET` | Razorpay API and payment-signature secret | **Server secret only** |
| `RAZORPAY_LIVE_PAYMENTS_APPROVED` | Explicit gate for live payment order creation; keep `false` until the merchant account and exact product are approved | Server; exact value `true` enables live collection |
| `RAZORPAY_WEBHOOK_SECRET` | Verifies Razorpay webhook signatures | **Server secret only** |
| `VITE_RAZORPAY_KEY_ID` | Razorpay Checkout browser key ID | Browser-visible key ID only |
| `RESEND_API_KEY` | Sends transactional email | **Server secret only** |
| `RESEND_FROM_EMAIL` | Verified transactional sender address | Server |
| `RESEND_FROM_NAME` | Transactional sender display name | Server |

The project also supports `VITE_SITE_URL`, `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_PUBLISHABLE_KEY` build-time aliases. Only publishable values may be exposed through `VITE_` variables. Confirm the authoritative values with the deployment administrator before changing them.

## Build and preview procedure

1. Use Node 22 and pnpm 10.33.0.
2. Install from the checked-in lockfile with `pnpm install --frozen-lockfile`.
3. Run `pnpm test`, `pnpm typecheck`, and `pnpm build`.
4. From the exact reviewed commit, run a Netlify preview deployment using the team's authenticated Netlify CLI or normal Git-based preview workflow.
5. Set `ROUTE_SMOKE_BASE_URL` to the preview URL and run `pnpm smoke:routes`; resolve or explain the local Netlify Dev 404 using an authenticated preview before release.
6. Run the isolated integration checklist in [PRODUCTION_TEST_REPORT.md](./PRODUCTION_TEST_REPORT.md). A 200 response alone is not a functional check.
7. Promote the verified preview through the normal Netlify release process. Confirm the published commit and run the route smoke test against the production domain.

## Local code and production data are separate

The local site does not synchronize source-code edits to the production website. Code changes must be committed and merged to the deployment branch, then the connected Netlify build must publish that commit. Changing local files or pushing a feature branch alone does not guarantee that the live site has updated.

Supabase is a separate service. Browser and server requests go directly to whichever project their build-time/runtime variables select. Check the local target with `pnpm db:target`; it verifies that `.env`, browser/server endpoints, and `supabase/config.toml` refer to one project without printing credentials. It cannot read Netlify's hosted variables, so those must be compared in Netlify's site settings with the same project ID. The production site and local app screenshots showed identical order totals and Annual Membership orders, consistent with both reading the same project. The production database currently has an active ₹500, 365-day Annual Membership plan; local code edits do not change that row.

Schema changes are not synchronized by a code push. Before a schema change, inspect the SQL migration and confirm the linked target; then use the team's authenticated Supabase CLI migration workflow and verify the applied migration on the hosted project. Never use local JSON snapshots, ad hoc table edits, or a feature-branch push as a substitute for a reviewed migration. The current workstation's Supabase migration inventory request returned HTTP 403, so production migration history could not be verified here.

Admin mutations must fail visibly if production Supabase is unavailable. Production admin orders, email logs, and order statistics must not silently show the development in-memory store after a query failure. Development may use the local store only when no production runtime is involved.

Do not use a preview that points at live payment credentials or sends mail to real customers. Use provider test mode and isolated customer records.

## Rollback

1. Identify the last known-good immutable deploy in the hosting provider's deploy history.
2. Restore that deploy using the provider's rollback action and verify the production domain.
3. Check compatibility before rolling back code if a database migration has been applied. Do not reverse schema changes or restore a database snapshot without a separately reviewed recovery plan.
4. Re-run the route smoke test and confirm payment/webhook health after rollback.

The rollback procedure has not been exercised because hosting project access was unavailable.

## Current deployment status

**PARTIALLY VERIFIED.** Source was pushed to `hue/main` at commit `4045bf8`; the public membership-card URL returned HTTP 200 and a Vercel server header on 2026-11-10. The exact deployed commit and production deployment configuration remain unverified because this workstation has no access to the hosting project. The Supabase migration inventory command reached the configured project but returned HTTP 403 for insufficient account privileges. The current live product page reports price unavailable because the database does not contain exactly one active physical-card plan with a six-month term. No production database row or migration was changed.
