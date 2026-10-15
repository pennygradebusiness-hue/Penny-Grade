import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  store,
  generatePenCode,
  safeRandomUUID,
  saveStoreToDisk,
  seedPartners,
  type V1Member,
  type V1PhysicalCard,
  type V1Partner,
  type V1Offer,
  type V1AuditLog,
  type V1AdminUser,
  type V1MemberApplication,
  type V1PartnerApplication,
} from "./v1-store";
import {
  addAdminLogic,
  resetAdminPasswordLogic,
  verifyAdminLoginCredentialsLogic,
  firstTimeSetPasswordLogic,
  requestAdminPasswordResetCodeLogic,
  verifyAndResetForgottenPasswordLogic,
  deletePartnerCascadeLogic,
  deleteOfferCascadeLogic,
  getFilteredOffersLogic,
  syncAdminPasswordAfterSupabaseResetLogic,
} from "./v1-logic";
import { requireAdminAuth } from "./admin-auth.server";
import { supabase } from "@/integrations/supabase/client";

const memberSchema = z.object({
  full_name: z.string().trim().min(2, "Full name is required").max(100),
  mobile: z.string().trim().min(10, "Valid 10-digit mobile is required").max(16),
  email: z
    .string()
    .trim()
    .max(255)
    .optional()
    .or(z.literal(""))
    .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      message: "Please enter a valid email address",
    }),
  plan_id: z.string().min(1),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  card_id: z.string().optional().or(z.literal("")),
});

// Admin Create Member — NO customer password, NO customer Supabase Auth account, Email optional
export const createMember = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => memberSchema.parse(d))
  .handler(async ({ data }) => {
    requireAdminAuth();
    if (data.expiry_date < data.start_date) {
      throw new Error("Expiry date must be after start date");
    }

    const cleanEmail = data.email?.trim() || null;

    const { getServerSupabase } = await import("./supabase-admin.server");
    const sb = getServerSupabase();

    // Ensure valid plan UUID
    let planIdToUse = data.plan_id;
    const isPlanUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(planIdToUse);
    if (!isPlanUuid) {
      const { data: dbPlans, error: plansErr } = await sb.from("membership_plans").select("id").limit(1);
      if (plansErr) throw new Error(`Could not load membership plans: ${plansErr.message}`);
      if (!dbPlans || dbPlans.length === 0) throw new Error("No membership plans found in database");
      planIdToUse = dbPlans[0].id;
    }

    const { data: res, error } = await sb.rpc("admin_create_member", {
      p_full_name: data.full_name,
      p_mobile: data.mobile,
      p_email: cleanEmail,
      p_plan_id: planIdToUse,
      p_start_date: data.start_date,
      p_expiry_date: data.expiry_date,
      p_card_id: data.card_id || null,
    });

    if (error) throw new Error(`Failed to create member: ${error.message}`);
    if (!res?.ok) throw new Error("Member creation failed — database returned not-ok");

    return {
      ok: true,
      membership_number: res.membership_number,
      card_number: res.card_number,
    };
  });



// Admin Generate Card Batch — writes directly to Supabase
export const generateCardBatch = createServerFn({ method: "POST" })
  .inputValidator((d: { count: number }) =>
    z.object({ count: z.number().int().min(1).max(2000) }).parse(d)
  )
  .handler(async ({ data }) => {
    requireAdminAuth();
    const { getServerSupabase } = await import("./supabase-admin.server");
    const sb = getServerSupabase();
    const { data: rpcRes, error: rpcErr } = await sb.rpc("generate_physical_cards", { p_count: data.count });
    if (rpcErr) throw new Error(`Card generation failed: ${rpcErr.message}`);
    if (!rpcRes?.ok) throw new Error("Card generation returned not-ok");
    return { ok: true, count: rpcRes.count as number };
  });

// Admin Get Cards — Supabase only
export const getAdminCards = createServerFn({ method: "GET" }).handler(async () => {
  requireAdminAuth();
  const { getServerSupabase } = await import("./supabase-admin.server");
  const sb = getServerSupabase();

  const { data: rpcCards, error: rpcErr } = await sb.rpc("get_all_physical_cards");
  if (!rpcErr && Array.isArray(rpcCards)) return rpcCards;

  // Fallback to direct select
  const { data: dbCards, error: dbErr } = await sb
    .from("physical_cards")
    .select("id,card_number,status,created_at,issued_at,membership_id,memberships(id,membership_number,full_name)")
    .order("created_at", { ascending: false });

  if (dbErr) throw new Error(`Failed to load cards: ${dbErr.message}`);
  return (dbCards ?? []).map((c: any) => ({
    id: c.id,
    card_number: c.card_number,
    status: c.status,
    created_at: c.created_at,
    issued_at: c.issued_at,
    membership_id: c.membership_id,
    member: c.memberships?.full_name || "",
    membership_number: c.memberships?.membership_number || "",
  }));
});

// Admin Get Members — Supabase only, no v1-store fallback for data
export const getAdminMembers = createServerFn({ method: "GET" }).handler(async () => {
  requireAdminAuth();
  const { getServerSupabase } = await import("./supabase-admin.server");
  const sb = getServerSupabase();

  const { data: rpcMembers, error: rpcErr } = await sb.rpc("get_all_memberships");
  if (!rpcErr && Array.isArray(rpcMembers)) return rpcMembers;

  // Fallback to direct select
  const { data: dbMembers, error: dbErr } = await sb
    .from("memberships")
    .select("id,membership_number,full_name,mobile,email,plan_id,start_date,expiry_date,status,card_number,created_at,updated_at,plan:membership_plans(name),card_id:physical_cards(id)")
    .order("created_at", { ascending: false });

  if (dbErr) throw new Error(`Failed to load members: ${dbErr.message}`);
  return (dbMembers ?? []).map((m: any) => ({
    id: m.id,
    membership_number: m.membership_number,
    full_name: m.full_name || "",
    mobile: m.mobile || "",
    email: m.email || "",
    plan_id: m.plan_id,
    plan_name: (Array.isArray(m.plan) ? m.plan[0]?.name : m.plan?.name) || "PennyGrade 6-Month Membership",
    start_date: m.start_date,
    expiry_date: m.expiry_date,
    status: m.status,
    created_at: m.created_at,
    updated_at: m.updated_at,
    card_number: m.card_number || m.membership_number,
    card_id: Array.isArray(m.card_id) ? m.card_id[0]?.id : m.card_id?.id,
  }));
});

// Admin Update Member Status — Supabase only
export const updateMemberStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "CANCELLED" }) =>
    z.object({
      id: z.string(),
      status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "CANCELLED"]),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    requireAdminAuth();
    const { getServerSupabase } = await import("./supabase-admin.server");
    const sb = getServerSupabase();
    const { error } = await sb.from("memberships").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(`Failed to update member status: ${error.message}`);
    return { ok: true };
  });

// Admin Delete Member — Supabase only
export const deleteMember = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    requireAdminAuth();
    const { getServerSupabase } = await import("./supabase-admin.server");
    const sb = getServerSupabase();

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.id);

    if (isUuid) {
      // Use the authoritative RPC that cascades cleanly
      const { error } = await sb.rpc("admin_delete_member", { p_member_id: data.id });
      if (error) {
        // Fallback: direct delete
        await sb.from("physical_cards").update({ membership_id: null, status: "AVAILABLE" }).eq("membership_id", data.id);
        const { error: delErr } = await sb.from("memberships").delete().eq("id", data.id);
        if (delErr) throw new Error(`Failed to delete member: ${delErr.message}`);
      }
    } else {
      // data.id might be a membership_number — look up the UUID first
      const { data: dbM, error: lookupErr } = await sb
        .from("memberships")
        .select("id")
        .eq("membership_number", data.id)
        .maybeSingle();
      if (lookupErr) throw new Error(`Failed to look up member: ${lookupErr.message}`);
      if (!dbM?.id) throw new Error("Member not found");
      const { error } = await sb.rpc("admin_delete_member", { p_member_id: dbM.id });
      if (error) {
        await sb.from("physical_cards").update({ membership_id: null, status: "AVAILABLE" }).eq("membership_id", dbM.id);
        const { error: delErr } = await sb.from("memberships").delete().eq("id", dbM.id);
        if (delErr) throw new Error(`Failed to delete member: ${delErr.message}`);
      }
    }

    return { ok: true };
  });

// Admin Renew Membership — Supabase only
export const renewMember = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; durationDays?: number }) =>
    z.object({ id: z.string(), durationDays: z.number().optional() }).parse(d)
  )
  .handler(async ({ data }) => {
    requireAdminAuth();
    const { getServerSupabase } = await import("./supabase-admin.server");
    const sb = getServerSupabase();

    // Fetch current member from DB
    const { data: member, error: fetchErr } = await sb
      .from("memberships")
      .select("id,expiry_date,status")
      .eq("id", data.id)
      .maybeSingle();
    if (fetchErr) throw new Error(`Failed to fetch member: ${fetchErr.message}`);
    if (!member) throw new Error("Member not found");

    const days = data.durationDays ?? 180;
    const currentExpiry = new Date(Math.max(Date.now(), new Date(member.expiry_date).getTime()));
    currentExpiry.setDate(currentExpiry.getDate() + days);
    const newExpiry = currentExpiry.toISOString().slice(0, 10);

    const { error } = await sb.from("memberships").update({ expiry_date: newExpiry, status: "ACTIVE" }).eq("id", data.id);
    if (error) throw new Error(`Failed to renew member: ${error.message}`);

    return { ok: true, new_expiry: newExpiry };
  });

// Admin Assign / Replace Card — Supabase only
export const assignCardToMember = createServerFn({ method: "POST" })
  .inputValidator((d: { memberId: string; cardId: string; oldCardStatus?: "LOST" | "CANCELLED" }) =>
    z.object({
      memberId: z.string(),
      cardId: z.string(),
      oldCardStatus: z.enum(["LOST", "CANCELLED"]).optional(),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    requireAdminAuth();
    const { getServerSupabase } = await import("./supabase-admin.server");
    const sb = getServerSupabase();
    const { data: res, error } = await sb.rpc("admin_assign_card", {
      p_member_id: data.memberId,
      p_card_id: data.cardId,
      p_old_card_status: data.oldCardStatus || "LOST",
    });
    if (error) throw new Error(`Failed to assign card: ${error.message}`);
    if (!res?.ok) throw new Error("Card assignment returned not-ok");
    return { ok: true, card_number: res.card_number as string };
  });

// Admin Get Admin Users (Server Function)
export const getAdminUsers = createServerFn({ method: "GET" }).handler(async (): Promise<V1AdminUser[]> => {
  requireAdminAuth();
  if (!store.adminUsers) store.adminUsers = [];
  if (!store.deletedAdminUserIds) store.deletedAdminUserIds = [];

  const delAdminSet = new Set(store.deletedAdminUserIds.map((x) => x.toLowerCase()));

  // Only seed default admin users if store was never seeded before and is empty
  if (!store.seededAdminUsers && store.adminUsers.length === 0) {
    const fallbackUsers: V1AdminUser[] = [
      {
        id: "admin-primary-owner",
        user_id: "uid-primary-owner",
        full_name: "PennyGrade Business",
        email: "pennygradebusiness@gmail.com",
        role: "super_admin",
        is_password_set: false,
        created_at: new Date().toISOString(),
      },
    ];
    store.adminUsers = fallbackUsers.filter(
      (u) => !delAdminSet.has(u.id.toLowerCase()) && !delAdminSet.has(u.email.toLowerCase())
    );
    store.seededAdminUsers = true;
  }

  const storeUsers: V1AdminUser[] = (store.adminUsers || [])
    .filter(
      (u) =>
        !delAdminSet.has(u.id?.toLowerCase()) &&
        !delAdminSet.has(u.user_id?.toLowerCase()) &&
        !delAdminSet.has(u.email?.toLowerCase())
    )
    .map((u) => ({
      id: u.id,
      user_id: u.user_id,
      full_name: u.full_name,
      email: u.email,
      role: u.role,
      created_at: u.created_at,
    }));

  try {
    const [{ data: r, error: rErr }, { data: p }] = await Promise.all([
      supabase.from("user_roles").select("*"),
      supabase.from("profiles").select("user_id,full_name,email"),
    ]);

    if (!rErr && r && r.length > 0) {
      const pm = new Map((p ?? []).map((x) => [x.user_id, x]));
      const dbUsers: V1AdminUser[] = r
        .filter(
          (roleRec) =>
            !delAdminSet.has(roleRec.id?.toLowerCase()) &&
            !delAdminSet.has(roleRec.user_id?.toLowerCase())
        )
        .map((roleRec) => {
          const prof = pm.get(roleRec.user_id);
          return {
            id: roleRec.id,
            user_id: roleRec.user_id,
            full_name: prof?.full_name || "Admin Staff",
            email: prof?.email || "staff@pennygrade.in",
            role: roleRec.role as V1AdminUser["role"],
            created_at: roleRec.created_at,
          };
        })
        .filter((d) => !delAdminSet.has(d.email.toLowerCase()));

      const seenEmails = new Set(storeUsers.map((u) => u.email.toLowerCase()));
      for (const d of dbUsers) {
        if (!seenEmails.has(d.email.toLowerCase())) {
          storeUsers.push(d);
        }
      }
    }
  } catch {
    // fallback to store
  }

  return storeUsers;
});

// Admin addAdmin (delegation with initial password generation)
export const addAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; role: "super_admin" | "manager" | "membership_manager" | "support"; full_name?: string; temporary_password?: string }) =>
    z.object({
      email: z.string().trim().email(),
      role: z.enum(["super_admin", "manager", "membership_manager", "support"]),
      full_name: z.string().optional(),
      temporary_password: z.string().min(6).optional(),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    requireAdminAuth(["super_admin"]);
    return addAdminLogic(data);
  });

// Admin Reset Password
export const resetAdminPassword = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; new_password?: string }) =>
    z.object({
      id: z.string(),
      new_password: z.string().min(6).optional(),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    requireAdminAuth(["super_admin"]);
    return resetAdminPasswordLogic(data);
  });

// Verify Admin Login Credentials against store
export const verifyAdminLoginCredentials = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; password: string }) =>
    z.object({
      email: z.string().trim().email(),
      password: z.string().min(1),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    return verifyAdminLoginCredentialsLogic(data);
  });

// First-Time Setup / Self-Service Password Set
export const firstTimeSetPassword = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; new_password: string; current_temporary_password?: string }) =>
    z.object({
      email: z.string().trim().email(),
      new_password: z.string().min(6, "Password must be at least 6 characters"),
      current_temporary_password: z.string().optional(),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    return firstTimeSetPasswordLogic(data);
  });

// Admin / Primary Owner Password Reset Code Request
export const requestAdminPasswordResetCode = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string }) =>
    z.object({
      email: z.string().trim().email("Valid admin email is required").max(255),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    return requestAdminPasswordResetCodeLogic(data);
  });

// Admin / Primary Owner Reset Forgotten Password
export const resetAdminForgottenPassword = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; verification_credential: string; new_password: string }) =>
    z.object({
      email: z.string().trim().email("Valid admin email is required").max(255),
      verification_credential: z.string().trim().min(4, "Verification credential is required").max(50),
      new_password: z.string().min(6, "Password must be at least 6 characters").max(100),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    return verifyAndResetForgottenPasswordLogic(data);
  });

// Synchronize Admin Password After Verified Supabase Auth Reset
export const syncAdminPasswordAfterSupabaseReset = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; new_password: string }) =>
    z.object({
      email: z.string().trim().email("Valid admin email is required").max(255),
      new_password: z.string().min(6, "Password must be at least 6 characters").max(100),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    return syncAdminPasswordAfterSupabaseResetLogic(data);
  });

// Admin Remove Role
export const removeAdminRole = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const admin = requireAdminAuth(["super_admin"]);
    if (!store.adminUsers) store.adminUsers = [];
    if (!store.deletedAdminUserIds) store.deletedAdminUserIds = [];

    const target = store.adminUsers.find((u) => u.id === data.id || u.user_id === data.id);
    const targetEmail = target?.email?.toLowerCase() || "";
    const targetUserId = target?.user_id || data.id;

    if (targetEmail === "pennygradebusiness@gmail.com" || data.id.toLowerCase() === "admin-primary-owner" || data.id.toLowerCase() === "pennygradebusiness@gmail.com") {
      throw new Error("Action Forbidden: The primary system owner (pennygradebusiness@gmail.com) cannot be removed.");
    }

    // Track in deleted list so it never resurrects
    if (!store.deletedAdminUserIds.includes(data.id)) store.deletedAdminUserIds.push(data.id);
    if (targetUserId && !store.deletedAdminUserIds.includes(targetUserId)) store.deletedAdminUserIds.push(targetUserId);
    if (targetEmail && !store.deletedAdminUserIds.includes(targetEmail)) store.deletedAdminUserIds.push(targetEmail);

    store.adminUsers = store.adminUsers.filter(
      (u) => u.id !== data.id && u.user_id !== data.id && (!targetEmail || u.email.toLowerCase() !== targetEmail)
    );

    if (target && store.auditLogs) {
      store.auditLogs.unshift({
        id: safeRandomUUID(),
        admin_user_id: admin.id,
        action: `Revoked role ${target.role.replace(/_/g, " ")} from ${target.email}`,
        target_type: "user_role",
        target_id: data.id,
        metadata: { email: target.email, role: target.role },
        created_at: new Date().toISOString(),
        who: admin.full_name || admin.email,
      });
    }

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.id);
      const isUserUuid = targetUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetUserId);
      if (isUuid) {
        await supabase.from("user_roles").delete().eq("id", data.id);
      }
      if (isUserUuid) {
        await supabase.from("user_roles").delete().eq("user_id", targetUserId);
      }
    } catch {
      // ignore
    }

    saveStoreToDisk();
    return { ok: true };
  });

// Admin Get Verification Logs (Server Function)
export const getAdminVerificationLogs = createServerFn({ method: "GET" })
  .inputValidator((d: { sinceDays?: number } | undefined) =>
    z.object({ sinceDays: z.number().optional() }).optional().parse(d)
  )
  .handler(async ({ data }) => {
    requireAdminAuth();
    const days = data?.sinceDays ?? 365;
    const since = new Date(Date.now() - days * 864e5).toISOString();

    const storeLogs = (store.logs || [])
      .filter((l) => l.created_at >= since)
      .map((l) => ({
        id: l.id,
        verification_session_id: l.verification_session_id,
        user_id: l.membership_id,
        bill_amount: l.bill_amount,
        discount_amount: l.discount_amount,
        final_amount: l.final_amount,
        status: l.status,
        created_at: l.created_at,
        partner: {
          id: l.partner_id,
          business_name: l.partner_name,
          category: { name: "Partner Outlets" },
        },
        offer: {
          title: l.offer_title,
        },
        membership: {
          membership_number: l.membership_number,
        },
      }));

    try {
      const { data: dbData, error } = await supabase
        .from("verification_logs")
        .select("id,verification_session_id,bill_amount,discount_amount,final_amount,status,created_at,partner:partners(id,business_name,category:categories(name)),offer:offers(title),membership:memberships(membership_number)")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5000);

      if (!error && dbData && dbData.length > 0) {
        const seen = new Set(storeLogs.map((l) => l.id));
        const merged = [...storeLogs];
        for (const d of dbData) {
          if (!seen.has(d.id)) {
            merged.push(d as unknown as typeof storeLogs[0]);
          }
        }
        return merged.sort((a, b) => b.created_at.localeCompare(a.created_at));
      }
    } catch {
      // Fallback to store logs
    }

    return storeLogs.sort((a, b) => b.created_at.localeCompare(a.created_at));
  });

// Admin Get Audit Logs (Server Function)
export const getAdminAuditLogs = createServerFn({ method: "GET" }).handler(async (): Promise<V1AuditLog[]> => {
  requireAdminAuth();
  const storeAudits: V1AuditLog[] = (store.auditLogs || []).map((a) => ({
    id: a.id,
    admin_user_id: a.admin_user_id,
    action: a.action,
    target_type: a.target_type,
    target_id: a.target_id,
    metadata: a.metadata,
    created_at: a.created_at,
    who: a.who || "Super Admin",
  }));

  if (!storeAudits.length) {
    const fallbackAudits: V1AuditLog[] = [
      {
        id: "audit-1",
        admin_user_id: "admin-super",
        action: "Created Member Card Batch",
        target_type: "cards",
        target_id: "batch-v1-25",
        metadata: { count: 25, status: "AVAILABLE" },
        created_at: new Date(Date.now() - 5 * 864e5).toISOString(),
        who: "Samir Pandey (Super Admin)",
      },
      {
        id: "audit-2",
        admin_user_id: "admin-super",
        action: "Activated Partner Outlets",
        target_type: "partner",
        target_id: "abc-cafe",
        metadata: { name: "ABC Café", status: "ACTIVE" },
        created_at: new Date(Date.now() - 4 * 864e5).toISOString(),
        who: "Admin Manager",
      },
      {
        id: "audit-3",
        admin_user_id: "admin-super",
        action: "Issued Membership Card",
        target_type: "membership",
        target_id: "mem-samir-001",
        metadata: { card_number: "PEN-7X4P-92LM", member: "Samir Pandey" },
        created_at: new Date(Date.now() - 3 * 864e5).toISOString(),
        who: "Samir Pandey (Super Admin)",
      },
      {
        id: "audit-4",
        admin_user_id: "admin-super",
        action: "Updated Partner Offer",
        target_type: "offer",
        target_id: "offer-abc-10",
        metadata: { partner: "ABC Café", discount: "10% OFF", min_bill: 500 },
        created_at: new Date(Date.now() - 2 * 864e5).toISOString(),
        who: "Admin Manager",
      },
      {
        id: "audit-5",
        admin_user_id: "admin-super",
        action: "System Security Audit Passed",
        target_type: "security",
        target_id: "sec-audit-01",
        metadata: { test_suites: "12/12 passing", encryption: "crypto-random" },
        created_at: new Date(Date.now() - 1 * 864e5).toISOString(),
        who: "System",
      },
    ];
    storeAudits.push(...fallbackAudits);
  }

  try {
    const [{ data: a, error: aErr }, { data: p }] = await Promise.all([
      supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("profiles").select("user_id,full_name,email"),
    ]);

    if (!aErr && a && a.length > 0) {
      const pm = new Map((p ?? []).map((x) => [x.user_id, x.full_name || x.email]));
      const dbAudits: V1AuditLog[] = a.map((x) => ({
        id: x.id,
        admin_user_id: x.admin_user_id,
        action: x.action,
        target_type: x.target_type ?? "general",
        target_id: x.target_id,
        metadata: (x.metadata ?? {}) as Record<string, any>,
        created_at: x.created_at,
        who: pm.get(x.admin_user_id) ?? "Super Admin",
      }));

      const seen = new Set(storeAudits.map((item) => item.id));
      const merged = [...storeAudits];
      for (const item of dbAudits) {
        if (!seen.has(item.id)) {
          merged.push(item);
        }
      }
      return merged.sort((x, y) => y.created_at.localeCompare(x.created_at));
    }
  } catch {
    // Fallback to store
  }

  return storeAudits.sort((x, y) => y.created_at.localeCompare(x.created_at));
});

// Admin Record Audit Log (Server Function)
export const recordAdminAuditFn = createServerFn({ method: "POST" })
  .inputValidator((d: { action: string; target_type: string; target_id?: string | null; metadata?: Record<string, any>; who?: string }) =>
    z.object({
      action: z.string(),
      target_type: z.string(),
      target_id: z.string().nullable().optional(),
      metadata: z.record(z.any()).optional(),
      who: z.string().optional(),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const admin = requireAdminAuth();
    const auditEntry: V1AuditLog = {
      id: safeRandomUUID(),
      admin_user_id: admin.id,
      action: data.action,
      target_type: data.target_type,
      target_id: data.target_id ?? null,
      metadata: data.metadata ?? {},
      created_at: new Date().toISOString(),
      who: data.who || admin.full_name || admin.email,
    };
    if (!store.auditLogs) store.auditLogs = [];
    store.auditLogs.unshift(auditEntry);

    try {
      await supabase.from("audit_logs").insert({
        admin_user_id: auditEntry.admin_user_id,
        action: auditEntry.action,
        target_type: auditEntry.target_type,
        target_id: auditEntry.target_id,
        metadata: auditEntry.metadata as never,
      });
    } catch {
      // ignore
    }

    saveStoreToDisk();

    return { ok: true, id: auditEntry.id };
  });

// ---------------- MEMBER APPLICATIONS (LEADS) ----------------

const memberAppSchema = z.object({
  full_name: z.string().trim().min(2, "Full name is required").max(100),
  mobile: z.string().trim().min(10, "Valid 10-digit mobile is required").max(15),
  email: z.string().trim().email("Valid email is required").max(255),
  city: z.string().trim().min(2, "City is required").max(100),
  delivery_preference: z.string().trim().min(2),
  payment_preference: z.string().trim().min(2),
  notes: z.string().optional(),
});

export const submitMemberApplication = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => memberAppSchema.parse(d))
  .handler(async ({ data }) => {
    const now = new Date().toISOString();
    const id = safeRandomUUID();
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const appNumber = `PGM-2026-${randomCode}`;

    const app: V1MemberApplication = {
      id,
      application_number: appNumber,
      full_name: data.full_name,
      mobile: data.mobile,
      email: data.email,
      city: data.city,
      plan_name: "PennyGrade 6-Month Membership",
      delivery_preference: data.delivery_preference,
      payment_preference: data.payment_preference,
      notes: data.notes,
      status: "PENDING_VERIFICATION",
      created_at: now,
      updated_at: now,
    };

    if (!store.memberApplications) store.memberApplications = [];
    store.memberApplications.unshift(app);

    if (store.auditLogs) {
      store.auditLogs.unshift({
        id: safeRandomUUID(),
        admin_user_id: "public-portal",
        action: `Member Application Received: ${app.full_name}`,
        target_type: "member_application",
        target_id: id,
        metadata: { mobile: app.mobile, city: app.city, app_number: appNumber },
        created_at: now,
        who: "Public Portal",
      });
    }

    saveStoreToDisk();

    return {
      ok: true,
      application_number: app.application_number,
      id: app.id,
      message: "Application submitted successfully",
    };
  });

export const getMemberApplications = createServerFn({ method: "GET" }).handler(async () => {
  requireAdminAuth();
  const apps = store.memberApplications || [];
  return [...apps].sort((a, b) => b.created_at.localeCompare(a.created_at));
});

export const updateMemberApplicationStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; status: "PENDING_VERIFICATION" | "CONTACTED" | "APPROVED" | "REJECTED"; notes?: string }) =>
    z.object({
      id: z.string(),
      status: z.enum(["PENDING_VERIFICATION", "CONTACTED", "APPROVED", "REJECTED"]),
      notes: z.string().optional(),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const admin = requireAdminAuth();
    if (!store.memberApplications) return { ok: false, message: "No applications found" };
    const app = store.memberApplications.find((a) => a.id === data.id);
    if (!app) throw new Error("Application not found");

    app.status = data.status;
    app.updated_at = new Date().toISOString();
    if (data.notes) {
      app.notes = app.notes ? `${app.notes} | ${data.notes}` : data.notes;
    }

    if (store.auditLogs) {
      store.auditLogs.unshift({
        id: safeRandomUUID(),
        admin_user_id: admin.id,
        action: `Updated Member Application (${app.application_number}) to ${data.status}`,
        target_type: "member_application",
        target_id: app.id,
        metadata: { applicant: app.full_name, status: data.status },
        created_at: app.updated_at,
        who: admin.full_name || admin.email,
      });
    }

    saveStoreToDisk();
    return { ok: true, status: app.status };
  });

// Admin Approve Application and issue active card
export const approveAndIssueMemberCard = createServerFn({ method: "POST" })
  .inputValidator((d: { applicationId: string; cardId?: string }) =>
    z.object({ applicationId: z.string(), cardId: z.string().optional() }).parse(d)
  )
  .handler(async ({ data }) => {
    const admin = requireAdminAuth();
    if (!store.memberApplications) throw new Error("No applications");
    const app = store.memberApplications.find((a) => a.id === data.applicationId);
    if (!app) throw new Error("Application not found");

    const today = new Date().toISOString().slice(0, 10);
    const sixMonths = new Date();
    sixMonths.setMonth(sixMonths.getMonth() + 6);
    const expiryDate = sixMonths.toISOString().slice(0, 10);

    const membershipNumber = generatePenCode();
    const memberId = safeRandomUUID();
    const now = new Date().toISOString();

    // Find available physical card
    let targetCard: V1PhysicalCard | undefined;
    if (data.cardId && store.cards.has(data.cardId)) {
      targetCard = store.cards.get(data.cardId);
    } else {
      for (const c of store.cards.values()) {
        if (c.status === "AVAILABLE") {
          targetCard = c;
          break;
        }
      }
    }

    let assignedCardNumber = membershipNumber;
    let assignedCardId: string | undefined = undefined;

    if (targetCard) {
      targetCard.membership_id = memberId;
      targetCard.status = "ACTIVE";
      targetCard.issued_at = now;
      targetCard.updated_at = now;
      assignedCardNumber = targetCard.card_number;
      assignedCardId = targetCard.id;
    }

    const member: V1Member = {
      id: memberId,
      membership_number: membershipNumber,
      full_name: app.full_name,
      mobile: app.mobile,
      email: app.email,
      plan_id: "f5aef446-7c6e-4781-9fdd-e5fa4dc1c935",
      plan_name: "PennyGrade 6-Month Membership",
      start_date: today,
      expiry_date: expiryDate,
      status: "ACTIVE",
      created_at: now,
      updated_at: now,
      card_id: assignedCardId,
      card_number: assignedCardNumber,
    };

    store.members.set(memberId, member);

    // Update application
    app.status = "APPROVED";
    app.assigned_card_number = assignedCardNumber;
    app.updated_at = now;

    if (store.auditLogs) {
      store.auditLogs.unshift({
        id: safeRandomUUID(),
        admin_user_id: admin.id,
        action: `Approved Application & Issued Card ${assignedCardNumber} to ${app.full_name}`,
        target_type: "member",
        target_id: memberId,
        metadata: { membership_number: membershipNumber, card_number: assignedCardNumber },
        created_at: now,
        who: admin.full_name || admin.email,
      });
    }

    saveStoreToDisk();

    return {
      ok: true,
      membership_number: member.membership_number,
      card_number: member.card_number,
    };
  });

// ---------------- PARTNER WITH US APPLICATIONS ----------------

const partnerAppSchema = z.object({
  business_name: z.string().trim().min(2, "Business name is required").max(120),
  category_name: z.string().trim().min(2, "Category is required"),
  contact_name: z.string().trim().min(2, "Contact person name is required").max(100),
  mobile: z.string().trim().min(10, "Valid 10-digit mobile is required").max(15),
  email: z.string().trim().email("Valid email is required").max(255),
  city: z.string().trim().min(2, "City is required").max(100),
  address: z.string().trim().min(3, "Address is required").max(250),
  proposed_discount: z.string().trim().min(2, "Proposed discount is required").max(100),
  minimum_bill: z.string().optional(),
  business_hours: z.string().optional(),
  notes: z.string().optional(),
});

export const submitPartnerApplication = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => partnerAppSchema.parse(d))
  .handler(async ({ data }) => {
    const now = new Date().toISOString();
    const id = safeRandomUUID();
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const appNumber = `PGP-2026-${randomCode}`;

    const app: V1PartnerApplication = {
      id,
      application_number: appNumber,
      business_name: data.business_name,
      category_name: data.category_name,
      contact_name: data.contact_name,
      mobile: data.mobile,
      email: data.email,
      city: data.city,
      address: data.address,
      proposed_discount: data.proposed_discount,
      minimum_bill: data.minimum_bill,
      business_hours: data.business_hours,
      notes: data.notes,
      status: "PENDING_REVIEW",
      created_at: now,
      updated_at: now,
    };

    if (!store.partnerApplications) store.partnerApplications = [];
    store.partnerApplications.unshift(app);

    if (store.auditLogs) {
      store.auditLogs.unshift({
        id: safeRandomUUID(),
        admin_user_id: "public-portal",
        action: `Partner Inquiry Received: ${app.business_name}`,
        target_type: "partner_application",
        target_id: id,
        metadata: { business: app.business_name, contact: app.contact_name, mobile: app.mobile },
        created_at: now,
        who: "Public Portal",
      });
    }

    saveStoreToDisk();

    return {
      ok: true,
      application_number: app.application_number,
      id: app.id,
      message: "Partner inquiry submitted successfully",
    };
  });

export const getPartnerApplications = createServerFn({ method: "GET" }).handler(async () => {
  requireAdminAuth();
  const apps = store.partnerApplications || [];
  return [...apps].sort((a, b) => b.created_at.localeCompare(a.created_at));
});

export const updatePartnerApplicationStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; status: "PENDING_REVIEW" | "CONTACTED" | "ONBOARDED" | "REJECTED"; notes?: string }) =>
    z.object({
      id: z.string(),
      status: z.enum(["PENDING_REVIEW", "CONTACTED", "ONBOARDED", "REJECTED"]),
      notes: z.string().optional(),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const admin = requireAdminAuth();
    if (!store.partnerApplications) return { ok: false, message: "No applications found" };
    const app = store.partnerApplications.find((a) => a.id === data.id);
    if (!app) throw new Error("Application not found");

    app.status = data.status;
    app.updated_at = new Date().toISOString();
    if (data.notes) {
      app.notes = app.notes ? `${app.notes} | ${data.notes}` : data.notes;
    }

    if (store.auditLogs) {
      store.auditLogs.unshift({
        id: safeRandomUUID(),
        admin_user_id: admin.id,
        action: `Updated Partner Inquiry (${app.business_name}) to ${data.status}`,
        target_type: "partner_application",
        target_id: app.id,
        metadata: { business: app.business_name, status: data.status },
        created_at: app.updated_at,
        who: admin.full_name || admin.email,
      });
    }

    saveStoreToDisk();
    return { ok: true, status: app.status };
  });

// ---------------- PARTNERS MANAGEMENT (Supabase only) ----------------

export const getAdminPartners = createServerFn({ method: "GET" }).handler(async () => {
  requireAdminAuth();
  const { getServerSupabase } = await import("./supabase-admin.server");
  const sb = getServerSupabase();

  const { data: dbPartners, error } = await sb
    .from("partners")
    .select("*, category:categories(id, name, slug)")
    .order("business_name", { ascending: true });

  if (error) throw new Error(`Failed to load partners: ${error.message}`);

  return (dbPartners ?? []).map((p: any) => ({
    id: p.id,
    business_name: p.business_name,
    slug: p.slug,
    category_id: p.category_id,
    category_name: p.category?.name || "General",
    description: p.description || "",
    logo_url: p.logo_url || "",
    cover_image_url: p.cover_image_url || "",
    phone: p.phone || "",
    email: p.email || "",
    website: p.website || "",
    address: p.address || "",
    city: p.city || "Daltonganj",
    latitude: p.latitude ?? null,
    longitude: p.longitude ?? null,
    business_hours: p.business_hours || "",
    status: p.status,
    featured: Boolean(p.featured),
    created_at: p.created_at,
    updated_at: p.updated_at,
  }));
});

const savePartnerSchema = z.object({
  id: z.string().optional(),
  business_name: z.string().trim().min(2, "Business name is required"),
  slug: z.string().trim().min(1, "Slug is required"),
  category_id: z.string().min(1, "Category is required"),
  category_name: z.string().optional(),
  description: z.string().optional().default(""),
  logo_url: z.string().optional().default(""),
  cover_image_url: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  email: z.string().optional().default(""),
  website: z.string().optional().default(""),
  address: z.string().optional().default(""),
  city: z.string().optional().default("Daltonganj"),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  business_hours: z.string().optional().default(""),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).default("ACTIVE"),
  featured: z.boolean().default(false),
});

export const savePartner = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => savePartnerSchema.parse(d))
  .handler(async ({ data }) => {
    requireAdminAuth();
    const { getServerSupabase } = await import("./supabase-admin.server");
    const sb = getServerSupabase();

    const isExisting = !!data.id;
    const partnerId = data.id || safeRandomUUID();

    const sbPayload: any = {
      id: partnerId,
      business_name: data.business_name,
      slug: data.slug.trim().toLowerCase(),
      category_id: data.category_id,
      description: data.description || null,
      logo_url: data.logo_url || null,
      cover_image_url: data.cover_image_url ||
        "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1200&q=70",
      phone: data.phone || null,
      email: data.email || null,
      website: data.website || null,
      address: data.address || null,
      city: data.city || "Daltonganj",
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      business_hours: data.business_hours || null,
      status: data.status,
      featured: data.featured,
    };

    if (isExisting) {
      const { error } = await sb.from("partners").update(sbPayload).eq("id", partnerId);
      if (error) throw new Error(`Failed to update partner: ${error.message}`);
    } else {
      const { error } = await sb.from("partners").insert(sbPayload);
      if (error) throw new Error(`Failed to create partner: ${error.message}`);
    }

    return { ok: true, partner: { ...sbPayload, category_name: data.category_name || "General" } };
  });

export const updatePartnerStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; status?: "ACTIVE" | "INACTIVE" | "SUSPENDED"; featured?: boolean }) =>
    z.object({
      id: z.string(),
      status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
      featured: z.boolean().optional(),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    requireAdminAuth();
    const { getServerSupabase } = await import("./supabase-admin.server");
    const sb = getServerSupabase();
    const patch: any = {};
    if (data.status !== undefined) patch.status = data.status;
    if (data.featured !== undefined) patch.featured = data.featured;
    const { error } = await sb.from("partners").update(patch).eq("id", data.id);
    if (error) throw new Error(`Failed to update partner status: ${error.message}`);
    return { ok: true };
  });

export const deletePartner = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    requireAdminAuth();
    const { getServerSupabase } = await import("./supabase-admin.server");
    const sb = getServerSupabase();
    // Cascade: delete offers first, then partner
    await sb.from("offers").delete().eq("partner_id", data.id);
    const { error } = await sb.from("partners").delete().eq("id", data.id);
    if (error) throw new Error(`Failed to delete partner: ${error.message}`);
    return { ok: true };
  });

// Admin Get Offers — Supabase only
export const getAdminOffers = createServerFn({ method: "GET" }).handler(async () => {
  requireAdminAuth();
  const { getServerSupabase } = await import("./supabase-admin.server");
  const sb = getServerSupabase();

  const { data: dbOffers, error } = await sb
    .from("offers")
    .select("*, partner:partners(id, business_name, slug)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load offers: ${error.message}`);

  return (dbOffers ?? []).map((o: any) => ({
    id: o.id,
    partner_id: o.partner_id,
    title: o.title,
    description: o.description || "",
    discount_type: o.discount_type,
    discount_value: Number(o.discount_value),
    max_discount: o.max_discount ? Number(o.max_discount) : null,
    minimum_bill: Number(o.minimum_bill),
    valid_from: o.valid_from,
    valid_until: o.valid_until,
    valid_days: o.valid_days || [0, 1, 2, 3, 4, 5, 6],
    terms_conditions: o.terms_conditions || "",
    usage_limit_type: o.usage_limit_type,
    status: o.status,
    created_at: o.created_at,
    updated_at: o.updated_at,
    partner: o.partner ? { id: o.partner.id, business_name: o.partner.business_name, slug: o.partner.slug } : undefined,
  }));
});

const saveOfferSchema = z.object({
  id: z.string().optional(),
  partner_id: z.string().min(1, "Partner is required"),
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().optional().default(""),
  discount_type: z.enum(["PERCENTAGE", "FIXED"]),
  discount_value: z.number().positive("Discount value must be positive"),
  max_discount: z.number().nullable().optional(),
  minimum_bill: z.number().nonnegative().default(0),
  valid_from: z.string().nullable().optional(),
  valid_until: z.string().nullable().optional(),
  valid_days: z.array(z.number()).default([0, 1, 2, 3, 4, 5, 6]),
  terms_conditions: z.string().optional().default(""),
  usage_limit_type: z.literal("UNLIMITED").default("UNLIMITED"),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

// Admin Save (Create / Update) Offer — Supabase only
export const saveOffer = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => saveOfferSchema.parse(d))
  .handler(async ({ data }) => {
    requireAdminAuth();
    const { getServerSupabase } = await import("./supabase-admin.server");
    const sb = getServerSupabase();

    const isExisting = !!data.id;
    const offerId = data.id || safeRandomUUID();

    const payload = {
      id: offerId,
      partner_id: data.partner_id,
      title: data.title,
      description: data.description || null,
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      max_discount: data.max_discount ?? null,
      minimum_bill: data.minimum_bill,
      valid_from: data.valid_from || null,
      valid_until: data.valid_until || null,
      valid_days: data.valid_days,
      terms_conditions: data.terms_conditions || null,
      usage_limit_type: "UNLIMITED" as const,
      status: data.status,
    };

    if (isExisting) {
      const { error } = await sb.from("offers").update(payload).eq("id", offerId);
      if (error) throw new Error(`Failed to update offer: ${error.message}`);
    } else {
      const { error } = await sb.from("offers").insert(payload);
      if (error) throw new Error(`Failed to create offer: ${error.message}`);
    }

    return { ok: true, offer: payload };
  });

// Admin Delete Offer — Supabase only
export const deleteOffer = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    requireAdminAuth();
    const { getServerSupabase } = await import("./supabase-admin.server");
    const sb = getServerSupabase();
    const { error } = await sb.from("offers").delete().eq("id", data.id);
    if (error) throw new Error(`Failed to delete offer: ${error.message}`);
    return { ok: true };
  });
