# PennyGrade Database Security Review

Audit date: 2026-11-04

## Production migration status

The repository contains Supabase migrations in `supabase/migrations/`, including order/fulfillment migrations dated 2026-11-03. `supabase/config.toml` identifies project reference `gvdrpojyoznepohqrbpd` (Pennygrade). Supabase CLI 3.0.0 was used. The read-only command `pnpm --package=supabase dlx supabase migration list --linked` reached that project but failed with HTTP 403 while initializing the database login role. The CLI warned that `--linked` is deprecated in v3; the replacement is `--remote`. Supabase reported that the authenticated account lacks the privileges required for the endpoint. `supabase status` also could not inspect local database health because Docker/Podman is not installed.

**Production migration history and live schema: BLOCKED.** No migration was applied. No reset, schema synchronization, destructive operation, or customer-data query was run.

## Static schema and authorization findings

- `membership_orders` and `email_notifications` are created with RLS enabled in `20261103000001_card_purchasing_and_fulfilment.sql`.
- The reviewed order/email table policies permit full access only through `public.is_admin(auth.uid())` for authenticated administrators. No anonymous read policy was present in that migration.
- The payment fulfillment routine `fulfill_paid_membership_order(uuid,text,text)` is `SECURITY DEFINER`, uses a fixed `search_path`, revokes execution from `PUBLIC`, `anon`, and `authenticated`, and grants execution to `service_role`.
- The counter routine `create_verification(text,text,numeric)` is `SECURITY DEFINER`, uses a fixed `search_path`, revokes execution from public client roles, and grants execution to `service_role`. The public client reaches it through a validated server function.
- Membership/card identifiers are generated through `gen_pen_code()` in the reviewed migration/schema sources.
- Admin data writes are routed through server functions and database role policies. Privileged auth-user operations reside in `src/lib/admin.functions.ts`.
- The custom administrator session token is now sent in a server-issued `HttpOnly` cookie; browser-side storage contains only display metadata. Every server function remains responsible for authorization independently of the UI state.

These are source findings only. They do not prove the same migrations and grants are present in production.

## Verification needed from a Supabase project administrator

1. Run the migration list against the linked production project and compare it with the checked-in migration files.
2. Review production table definitions, foreign keys, indexes, constraints, triggers, function bodies, function ownership, grants, and RLS policies.
3. Use approved anon, customer, and admin test identities to confirm direct reads/writes are denied or scoped correctly.
4. Confirm service-role credentials are available only to server runtime and are absent from client bundles and build output.
5. Verify storage buckets and policies if used by the current deployment.
6. Review any pending migration for data loss or lock risk before applying it. Apply only reviewed, forward-only migrations; never use `supabase db reset` on production.

## Status

**BLOCKED** for production schema, migration, grants, and live RLS verification because the connected Supabase account received HTTP 403 while initializing the database login role. Ask a Supabase organization/project administrator to grant this account project-scoped content access and authorize a time-limited, least-privilege read-only Postgres login role/connection for catalog and migration-history inspection. If the CLI's access-control endpoint still rejects that role, ask the administrator to run `supabase migration list --remote` and provide the output plus approved read-only schema/RLS inspection. Do not send a database password, service-role key, or access token through chat. Static review does not satisfy production security acceptance criteria. See [Supabase access control](https://supabase.com/docs/guides/platform/access-control), [temporary team database access](https://supabase.com/docs/guides/platform/team-database-access), and the [migration list CLI reference](https://supabase.com/docs/reference/cli/supabase-migration-list).
