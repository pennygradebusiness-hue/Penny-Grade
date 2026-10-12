# Engineering Guidelines & Architecture Rules

## Architecture rules
- Discount validation/calculation lives only in the `create_verification` SECURITY DEFINER SQL function; clients call it via RPC — never compute discounts client-side (why: server is the source of truth, frontend is untrusted).
- Role checks use `user_roles` + `has_any_role`/`is_admin`; admin writes go through RLS role policies, privileged auth-user ops through `src/lib/admin.functions.ts` (why: authorization enforced server-side).
- Public catalog reads go through `src/lib/public.functions.ts` with the publishable client (why: SSR/SEO without exposing private data).
- Membership/card IDs come from `gen_pen_code()` (crypto random) — never sequential (why: anti-enumeration).
- tsconfig keeps `strict` but disables the extra pedantic flags (why: Supabase join types made them noisy without safety gain).
