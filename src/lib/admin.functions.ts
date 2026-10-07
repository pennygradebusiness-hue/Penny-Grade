import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

async function requireRoles(ctx: Ctx, roles: string[]) {
  const { data, error } = await ctx.supabase.rpc("has_any_role", { _user_id: ctx.userId, _roles: roles });
  if (error || !data) throw new Error("Not authorized");
}

const memberSchema = z.object({
  full_name: z.string().trim().min(2).max(100),
  mobile: z.string().trim().min(10).max(16),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72).optional().or(z.literal("")),
  plan_id: z.string().uuid(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  card_id: z.string().uuid().optional().or(z.literal("")),
});

export const createMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => memberSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireRoles(context as Ctx, ["super_admin", "manager", "membership_manager"]);
    if (data.expiry_date < data.start_date) throw new Error("Expiry must be after start date");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Find or create auth user
    let userId: string | null = null;
    const { data: existing } = await supabaseAdmin.from("profiles").select("user_id").ilike("email", data.email).maybeSingle();
    if (existing) userId = existing.user_id;
    else {
      if (!data.password) throw new Error("A temporary password is required for new members");
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: data.email, password: data.password, email_confirm: true,
        user_metadata: { full_name: data.full_name, mobile: data.mobile },
      });
      if (error || !created.user) throw new Error(error?.message ?? "Could not create user");
      userId = created.user.id;
    }
    await supabaseAdmin.from("profiles").update({ full_name: data.full_name, mobile: data.mobile, email: data.email }).eq("user_id", userId);

    const { data: m, error: mErr } = await supabaseAdmin.from("memberships").insert({
      user_id: userId, plan_id: data.plan_id, start_date: data.start_date, expiry_date: data.expiry_date, status: "ACTIVE",
    }).select("id, membership_number").single();
    if (mErr || !m) throw new Error("Could not create membership");

    if (data.card_id) {
      const { error: cErr } = await supabaseAdmin.from("physical_cards")
        .update({ membership_id: m.id, status: "ACTIVE", issued_at: new Date().toISOString() })
        .eq("id", data.card_id).eq("status", "AVAILABLE");
      if (cErr) throw new Error("Membership created, but card assignment failed");
    }
    await supabaseAdmin.from("audit_logs").insert({
      admin_user_id: (context as Ctx).userId, action: "Created member", target_type: "membership", target_id: m.id,
      metadata: { email: data.email, membership_number: m.membership_number },
    });
    return { membership_number: m.membership_number };
  });

export const addAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ email: z.string().trim().email(), role: z.enum(["super_admin", "manager", "membership_manager", "support"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRoles(context as Ctx, ["super_admin"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prof } = await supabaseAdmin.from("profiles").select("user_id").ilike("email", data.email).maybeSingle();
    if (!prof) throw new Error("No account with that email. Ask them to register first.");
    const { error } = await supabaseAdmin.from("user_roles").upsert({ user_id: prof.user_id, role: data.role }, { onConflict: "user_id,role" });
    if (error) throw new Error("Could not assign role");
    await supabaseAdmin.from("audit_logs").insert({ admin_user_id: (context as Ctx).userId, action: `Granted role ${data.role}`, target_type: "user", target_id: prof.user_id, metadata: { email: data.email } });
    return { ok: true };
  });
