import { createServerFn } from "@tanstack/react-start";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import {
  store,
  generatePenCode,
  safeRandomUUID,
  saveStoreToDisk,
  persistStoreCloud,
  ensureStoreLoadedCloud,
  seedPartners,
  seedOffers,
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
import { createAdminSessionToken, requireAdminAuth } from "./admin-auth.server";
import { supabase } from "@/integrations/supabase/client";
import { getServiceRoleClient as getRawServiceRoleClient } from "./supabase-admin.server";

const memberSchema = z.object({
  full_name: z.string().trim().min(2, "Full name is required").max(100),
  mobile: z.string().trim().min(10, "Valid 10-digit mobile is required").max(16)
    .regex(/^\+?[0-9\s()-]{10,16}$/, "Enter a valid mobile number"),
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

type AdminVerificationLog = {
  id: string;
  verification_session_id: string | null;
  user_id: string | null;
  bill_amount: number;
  discount_amount: number;
  final_amount: number;
  status: string;
  created_at: string;
  partner: { id: string; business_name: string; category: { name: string } | null } | null;
  offer: { title: string } | null;
  membership: { membership_number: string } | null;
};

function getServiceRoleClient() {
  const db = getRawServiceRoleClient();
  if (!db && process.env.NODE_ENV === "production") {
    throw new Error("Admin database is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server.");
  }
  return db;
}

// Admin Create Member — NO customer password, NO customer Supabase Auth account, Email optional
export const createMember = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => memberSchema.parse(d))
  .handler(async ({ data }) => {
    const admin = requireAdminAuth(["super_admin", "membership_manager"]);
    if (data.expiry_date < data.start_date) {
      throw new Error("Expiry date must be after start date");
    }

    // Use the database transaction as the source of truth in deployed environments.
    const db = getServiceRoleClient();
    if (db) {
      const { data: result, error } = await db.rpc("admin_create_member", {
        p_full_name: data.full_name,
        p_mobile: data.mobile,
        p_email: data.email?.trim() || null,
        p_plan_id: data.plan_id,
        p_start_date: data.start_date,
        p_expiry_date: data.expiry_date,
        p_card_id: data.card_id || null,
      });
      if (error) throw new Error(`Could not create member: ${error.message}`);
      const payload = result as { ok?: boolean; id: string; membership_number: string; card_number: string; card_id: string | null } | null;
      if (!payload?.ok) throw new Error("Could not create member");
      return payload;
    }

    await ensureStoreLoadedCloud();

    if (!store.members) store.members = new Map();
    if (!store.cards) store.cards = new Map();
    if (!store.auditLogs) store.auditLogs = [];

    const memberId = safeRandomUUID();
    const membershipNumber = generatePenCode();
    const cleanEmail = data.email?.trim() || "";
    const now = new Date().toISOString();

    let assignedCardNumber = "";
    let assignedCardId = data.card_id || "";

    if (assignedCardId) {
      const card = store.cards.get(assignedCardId);
      if (!card || card.status !== "AVAILABLE") {
        throw new Error("Selected card is not available");
      }
      card.membership_id = memberId;
      card.status = "ACTIVE";
      card.issued_at = now;
      card.updated_at = now;
      assignedCardNumber = card.card_number;
    } else {
      // Find first available card
      for (const c of store.cards.values()) {
        if (c.status === "AVAILABLE") {
          c.membership_id = memberId;
          c.status = "ACTIVE";
          c.issued_at = now;
          c.updated_at = now;
          assignedCardNumber = c.card_number;
          assignedCardId = c.id;
          break;
        }
      }
      // If still no card available, generate one
      if (!assignedCardNumber) {
        const newCardCode = generatePenCode();
        const newCardId = safeRandomUUID();
        const newCard: V1PhysicalCard = {
          id: newCardId,
          card_number: newCardCode,
          membership_id: memberId,
          status: "ACTIVE",
          issued_at: now,
          created_at: now,
          updated_at: now,
        };
        store.cards.set(newCardId, newCard);
        assignedCardNumber = newCardCode;
        assignedCardId = newCardId;
      }
    }

    const newMember: V1Member = {
      id: memberId,
      membership_number: membershipNumber,
      full_name: data.full_name,
      mobile: data.mobile,
      email: cleanEmail,
      plan_id: data.plan_id || "fd6de953-c15d-4b7f-aae4-b97b6d21b043",
      plan_name: "PennyGrade 6-Month Membership",
      start_date: data.start_date,
      expiry_date: data.expiry_date,
      status: "ACTIVE",
      created_at: now,
      updated_at: now,
      card_id: assignedCardId,
      card_number: assignedCardNumber || membershipNumber,
    };

    store.members.set(memberId, newMember);

    // Audit log
    store.auditLogs.unshift({
      id: safeRandomUUID(),
      admin_user_id: admin.id,
      action: "Created Member",
      target_type: "membership",
      target_id: memberId,
      metadata: {
        full_name: data.full_name,
        mobile: data.mobile,
        membership_number: membershipNumber,
        card_number: assignedCardNumber,
      },
      created_at: now,
      who: admin.full_name || "Admin",
    });

    await persistStoreCloud();

    return {
      ok: true,
      id: memberId,
      membership_number: membershipNumber,
      card_number: assignedCardNumber || membershipNumber,
    };
  });

// Admin Generate Card Batch
export const generateCardBatch = createServerFn({ method: "POST" })
  .inputValidator((d: { count: number }) =>
    z.object({ count: z.number().int().min(1).max(2000) }).parse(d)
  )
  .handler(async ({ data }) => {
    const admin = requireAdminAuth(["super_admin", "membership_manager"]);
    const db = getServiceRoleClient();
    if (db) {
      const { data: result, error } = await db.rpc("generate_physical_cards", { p_count: data.count });
      if (error) throw new Error(`Could not generate cards: ${error.message}`);
      const payload = result as { ok?: boolean; count: number } | null;
      if (!payload?.ok) throw new Error("Could not generate cards");
      return payload;
    }
    await ensureStoreLoadedCloud();
    if (!store.cards) store.cards = new Map();
    if (!store.auditLogs) store.auditLogs = [];

    const now = new Date().toISOString();
    for (let i = 0; i < data.count; i++) {
      const id = safeRandomUUID();
      const code = generatePenCode();
      store.cards.set(id, {
        id,
        card_number: code,
        membership_id: null,
        status: "AVAILABLE",
        issued_at: null,
        created_at: now,
        updated_at: now,
      });
    }

    store.auditLogs.unshift({
      id: safeRandomUUID(),
      admin_user_id: admin.id,
      action: "Generated Card Batch",
      target_type: "cards",
      target_id: `batch-${Date.now()}`,
      metadata: { count: data.count, status: "AVAILABLE" },
      created_at: now,
      who: admin.full_name || "Admin",
    });

    await persistStoreCloud();
    return { ok: true, count: data.count };
  });

// Admin Get Cards
export const getAdminCards = createServerFn({ method: "GET" }).handler(async () => {
  requireAdminAuth(["super_admin", "membership_manager"]);
  const db = getServiceRoleClient();
  if (db) {
    const { data, error } = await db.rpc("get_all_physical_cards");
    if (error) throw new Error(`Could not load cards: ${error.message}`);
    return (data || []) as Array<{ id: string; card_number: string; status: string; created_at: string; issued_at: string | null; membership_id: string | null; member: string; membership_number: string }>;
  }
  await ensureStoreLoadedCloud();

  if (!store.cards) store.cards = new Map();
  if (!store.members) store.members = new Map();

  const cardsList = Array.from(store.cards.values()).map((c) => {
    const member = c.membership_id ? store.members.get(c.membership_id) : undefined;
    return {
      id: c.id,
      card_number: c.card_number,
      status: c.status,
      created_at: c.created_at,
      issued_at: c.issued_at,
      membership_id: c.membership_id,
      member: member?.full_name || "",
      membership_number: member?.membership_number || "",
    };
  });

  return cardsList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
});

// Admin Get Members
export const getAdminMembers = createServerFn({ method: "GET" }).handler(async () => {
  requireAdminAuth(["super_admin", "membership_manager"]);
  const db = getServiceRoleClient();
  if (db) {
    const { data, error } = await db.rpc("get_all_memberships");
    if (error) throw new Error(`Could not load members: ${error.message}`);
    return (data || []) as Array<Record<string, string | null>>;
  }
  await ensureStoreLoadedCloud();

  if (!store.members) store.members = new Map();
  if (!store.deletedMemberIds) store.deletedMemberIds = [];

  const delSet = new Set(store.deletedMemberIds);

  const membersList = Array.from(store.members.values())
    .filter((m) => !delSet.has(m.id) && !delSet.has(m.membership_number))
    .map((m) => ({
      id: m.id,
      membership_number: m.membership_number,
      full_name: m.full_name || "",
      mobile: m.mobile || "",
      email: m.email || "",
      plan_id: m.plan_id || "fd6de953-c15d-4b7f-aae4-b97b6d21b043",
      plan_name: m.plan_name || "PennyGrade 6-Month Membership",
      start_date: m.start_date,
      expiry_date: m.expiry_date,
      status: m.status,
      created_at: m.created_at,
      updated_at: m.updated_at,
      card_number: m.card_number || m.membership_number,
      card_id: m.card_id || "",
    }));

  return membersList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
});

// Admin Update Member Status
export const updateMemberStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "CANCELLED" }) =>
    z.object({
      id: z.string(),
      status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "CANCELLED"]),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const admin = requireAdminAuth(["super_admin", "membership_manager"]);
    const db = getServiceRoleClient();
    if (db) {
      const { error } = await db.from("memberships").update({ status: data.status }).eq("id", data.id);
      if (error) throw new Error(`Could not update member: ${error.message}`);
      return { ok: true };
    }
    await ensureStoreLoadedCloud();

    let targetMember: V1Member | undefined;
    for (const m of store.members.values()) {
      if (m.id === data.id || m.membership_number === data.id) {
        m.status = data.status;
        m.updated_at = new Date().toISOString();
        targetMember = m;
        break;
      }
    }

    if (!targetMember) throw new Error("Member not found");

    store.auditLogs.unshift({
      id: safeRandomUUID(),
      admin_user_id: admin.id,
      action: "Updated Member Status",
      target_type: "membership",
      target_id: targetMember.id,
      metadata: { status: data.status, name: targetMember.full_name },
      created_at: new Date().toISOString(),
      who: admin.full_name || "Admin",
    });

    await persistStoreCloud();
    return { ok: true };
  });

// Admin Delete Member
export const deleteMember = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const admin = requireAdminAuth(["super_admin", "membership_manager"]);
    const db = getServiceRoleClient();
    if (db) {
      const { error } = await db.rpc("admin_delete_member", { p_member_id: data.id });
      if (error) throw new Error(`Could not delete member: ${error.message}`);
      return { ok: true };
    }
    await ensureStoreLoadedCloud();

    if (!store.deletedMemberIds) store.deletedMemberIds = [];

    let targetKey: string | null = null;
    let memberRecord: V1Member | null = null;

    for (const [k, v] of store.members.entries()) {
      if (k === data.id || v.id === data.id || v.membership_number === data.id) {
        targetKey = k;
        memberRecord = v;
        break;
      }
    }

    if (memberRecord) {
      store.deletedMemberIds.push(memberRecord.id);
      if (memberRecord.membership_number) {
        store.deletedMemberIds.push(memberRecord.membership_number);
      }
    } else {
      store.deletedMemberIds.push(data.id);
    }

    if (targetKey) {
      store.members.delete(targetKey);
    }

    // Free associated physical card
    for (const card of store.cards.values()) {
      if (
        card.membership_id === data.id ||
        (memberRecord && card.membership_id === memberRecord.id) ||
        (memberRecord && card.card_number === memberRecord.card_number)
      ) {
        card.membership_id = null;
        card.status = "AVAILABLE";
        card.updated_at = new Date().toISOString();
      }
    }

    store.auditLogs.unshift({
      id: safeRandomUUID(),
      admin_user_id: admin.id,
      action: "Deleted Member",
      target_type: "membership",
      target_id: data.id,
      metadata: { deleted_name: memberRecord?.full_name || "Member" },
      created_at: new Date().toISOString(),
      who: admin.full_name || "Admin",
    });

    await persistStoreCloud();
    return { ok: true };
  });

// Admin Renew Membership
export const renewMember = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; durationDays?: number }) =>
    z.object({ id: z.string(), durationDays: z.number().optional() }).parse(d)
  )
  .handler(async ({ data }) => {
    const admin = requireAdminAuth(["super_admin", "membership_manager"]);
    const db = getServiceRoleClient();
    if (db) {
      const { data: member, error: readError } = await db.from("memberships").select("expiry_date").eq("id", data.id).maybeSingle();
      if (readError) throw new Error(`Could not load membership: ${readError.message}`);
      if (!member) throw new Error("Member not found");
      const days = data.durationDays ?? 180;
      if (!Number.isInteger(days) || days < 1 || days > 3650) throw new Error("Renewal duration must be between 1 and 3650 days");
      const expiry = new Date(Math.max(Date.now(), new Date(`${member.expiry_date}T00:00:00`).getTime()));
      expiry.setDate(expiry.getDate() + days);
      const newExpiry = expiry.toISOString().slice(0, 10);
      const { error } = await db.from("memberships").update({ expiry_date: newExpiry, status: "ACTIVE" }).eq("id", data.id);
      if (error) throw new Error(`Could not renew membership: ${error.message}`);
      return { ok: true, new_expiry: newExpiry };
    }
    await ensureStoreLoadedCloud();

    let targetMember: V1Member | undefined;
    for (const m of store.members.values()) {
      if (m.id === data.id || m.membership_number === data.id) {
        targetMember = m;
        break;
      }
    }

    if (!targetMember) throw new Error("Member not found");

    const days = data.durationDays ?? 180;
    const currentExpiry = new Date(Math.max(Date.now(), new Date(targetMember.expiry_date).getTime()));
    currentExpiry.setDate(currentExpiry.getDate() + days);
    const newExpiry = currentExpiry.toISOString().slice(0, 10);

    targetMember.expiry_date = newExpiry;
    targetMember.status = "ACTIVE";
    targetMember.updated_at = new Date().toISOString();

    store.auditLogs.unshift({
      id: safeRandomUUID(),
      admin_user_id: admin.id,
      action: "Renewed Membership",
      target_type: "membership",
      target_id: targetMember.id,
      metadata: { new_expiry: newExpiry, duration_days: days, name: targetMember.full_name },
      created_at: new Date().toISOString(),
      who: admin.full_name || "Admin",
    });

    await persistStoreCloud();
    return { ok: true, new_expiry: newExpiry };
  });

// Admin Assign / Replace Card
export const assignCardToMember = createServerFn({ method: "POST" })
  .inputValidator((d: { memberId: string; cardId: string; oldCardStatus?: "LOST" | "CANCELLED" }) =>
    z.object({
      memberId: z.string(),
      cardId: z.string(),
      oldCardStatus: z.enum(["LOST", "CANCELLED"]).optional(),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const admin = requireAdminAuth(["super_admin", "membership_manager"]);
    const db = getServiceRoleClient();
    if (db) {
      const { data: result, error } = await db.rpc("admin_assign_card", {
        p_member_id: data.memberId,
        p_card_id: data.cardId,
        p_old_card_status: data.oldCardStatus || "LOST",
      });
      if (error) throw new Error(`Could not assign card: ${error.message}`);
      const payload = result as { ok?: boolean; card_number: string } | null;
      if (!payload?.ok) throw new Error("Could not assign card");
      return payload;
    }
    await ensureStoreLoadedCloud();

    let targetMember: V1Member | undefined;
    for (const m of store.members.values()) {
      if (m.id === data.memberId || m.membership_number === data.memberId) {
        targetMember = m;
        break;
      }
    }

    if (!targetMember) throw new Error("Member not found");

    const newCard = store.cards.get(data.cardId);
    if (!newCard) throw new Error("Card not found");
    if (newCard.status !== "AVAILABLE") throw new Error("Selected card is not available");

    // If member already had a card, mark it
    for (const c of store.cards.values()) {
      if (c.membership_id === targetMember.id && c.id !== newCard.id) {
        c.status = data.oldCardStatus || "CANCELLED";
        c.membership_id = null;
        c.updated_at = new Date().toISOString();
      }
    }

    const now = new Date().toISOString();
    newCard.status = "ACTIVE";
    newCard.membership_id = targetMember.id;
    newCard.issued_at = now;
    newCard.updated_at = now;

    targetMember.card_id = newCard.id;
    targetMember.card_number = newCard.card_number;
    targetMember.updated_at = now;

    store.auditLogs.unshift({
      id: safeRandomUUID(),
      admin_user_id: admin.id,
      action: "Assigned Card",
      target_type: "cards",
      target_id: newCard.id,
      metadata: { card_number: newCard.card_number, member: targetMember.full_name },
      created_at: now,
      who: admin.full_name || "Admin",
    });

    await persistStoreCloud();
    return { ok: true, card_number: newCard.card_number };
  });

// Admin Get Admin Users (Server Function)
export const getAdminUsers = createServerFn({ method: "GET" }).handler(async (): Promise<V1AdminUser[]> => {
  requireAdminAuth(["super_admin"]);
  const db = getServiceRoleClient();
  if (db) {
    const { data: roles, error } = await db.from("user_roles").select("id,user_id,role,created_at");
    if (error) throw new Error(`Could not load administrator roles: ${error.message}`);
    const userIds = [...new Set((roles || []).map((r) => r.user_id))];
    const { data: profiles, error: profileError } = userIds.length
      ? await db.from("profiles").select("user_id,full_name,email").in("user_id", userIds)
      : { data: [], error: null };
    if (profileError) throw new Error(`Could not load administrator profiles: ${profileError.message}`);
    const profileById = new Map((profiles || []).map((p) => [p.user_id, p]));
    return (roles || []).map((r) => {
      const profile = profileById.get(r.user_id);
      return {
        id: r.id,
        user_id: r.user_id,
        full_name: profile?.full_name || "Administrator",
        email: profile?.email || "",
        role: r.role as V1AdminUser["role"],
        created_at: r.created_at,
      };
    });
  }
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
    const db = getServiceRoleClient();
    if (db) {
      if (data.email.trim().toLowerCase() === "pennygradebusiness@gmail.com" && data.role !== "super_admin") {
        throw new Error("Action Forbidden: The primary system owner role cannot be demoted.");
      }
      const tempPassword = data.temporary_password?.trim() || randomBytes(18).toString("base64url");
      const { data: created, error: createError } = await db.auth.admin.createUser({
        email: data.email.trim().toLowerCase(),
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: data.full_name?.trim() || data.email.split("@")[0] },
      });
      if (createError || !created.user) throw new Error(`Could not create administrator: ${createError?.message || "Auth user was not created"}`);
      const { error: roleError } = await db.from("user_roles").insert({ user_id: created.user.id, role: data.role });
      if (roleError) {
        await db.auth.admin.deleteUser(created.user.id);
        throw new Error(`Could not grant administrator role: ${roleError.message}`);
      }
      const adminUser: V1AdminUser = {
        id: created.user.id,
        user_id: created.user.id,
        full_name: data.full_name?.trim() || data.email.split("@")[0],
        email: created.user.email || data.email,
        role: data.role,
        is_password_set: true,
        created_at: created.user.created_at,
      };
      return { ok: true, message: `Role ${data.role.replace(/_/g, " ")} granted to ${adminUser.email}`, admin: adminUser, temporary_password: tempPassword };
    }
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
    const db = getServiceRoleClient();
    if (db) {
      const { data: role, error: lookupError } = await db.from("user_roles").select("user_id").eq("id", data.id).maybeSingle();
      if (lookupError) throw new Error(`Could not find administrator: ${lookupError.message}`);
      if (!role) throw new Error("Administrator not found");
      const newPassword = data.new_password || randomBytes(18).toString("base64url");
      const { error } = await db.auth.admin.updateUserById(role.user_id, { password: newPassword });
      if (error) throw new Error(`Could not reset administrator password: ${error.message}`);
      const { data: authUser } = await db.auth.admin.getUserById(role.user_id);
      return { ok: true, email: authUser.user?.email || "", temporary_password: newPassword };
    }
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
    const result = verifyAdminLoginCredentialsLogic(data);
    if (result.ok && result.user) {
      return { ...result, session_token: createAdminSessionToken(result.user) };
    }
    return result;
  });

export const createSupabaseAdminSession = createServerFn({ method: "POST" })
  .inputValidator((d: { access_token: string }) => z.object({ access_token: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const db = getServiceRoleClient();
    if (!db) throw new Error("Admin session service is not configured");
    const { data: authData, error: authError } = await db.auth.getUser(data.access_token);
    if (authError || !authData.user) throw new Error("Unauthorized: Invalid Supabase session");
    const [{ data: roles, error: roleError }, { data: profile }] = await Promise.all([
      db.from("user_roles").select("role").eq("user_id", authData.user.id),
      db.from("profiles").select("full_name,email").eq("user_id", authData.user.id).maybeSingle(),
    ]);
    if (roleError) throw new Error(`Could not verify administrator role: ${roleError.message}`);
    const rolesPriority = ["super_admin", "manager", "membership_manager", "support"];
    const role = rolesPriority.find((candidate) => roles?.some((entry) => entry.role === candidate));
    if (!role) {
      throw new Error("Forbidden: Administrator role required");
    }
    return {
      session_token: createAdminSessionToken({
        id: authData.user.id,
        email: authData.user.email || profile?.email || "",
        role: role as V1AdminUser["role"],
        full_name: profile?.full_name || authData.user.email || "Administrator",
      }, "supabase"),
    };
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
    // Recovery is handled by Supabase Auth email links. Do not expose the
    // legacy code/phone reset flow, which kept codes in process memory/logs.
    void data;
    return { ok: true, message: "If the account is eligible, a password recovery link will be sent to its registered email." };
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
    void data;
    throw new Error("Use the password recovery link sent to the administrator email address.");
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
    void data;
    throw new Error("Supabase Auth is the password source of truth. Use its verified recovery link to change this password.");
  });

// Admin Remove Role
export const removeAdminRole = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const admin = requireAdminAuth(["super_admin"]);
    const db = getServiceRoleClient();
    if (db) {
      const { data: role, error: lookupError } = await db.from("user_roles").select("id,user_id,role").eq("id", data.id).maybeSingle();
      if (lookupError) throw new Error(`Could not find administrator role: ${lookupError.message}`);
      if (!role) throw new Error("Administrator role not found");
      const { data: profile } = await db.from("profiles").select("email").eq("user_id", role.user_id).maybeSingle();
      if (profile?.email?.toLowerCase() === "pennygradebusiness@gmail.com") {
        throw new Error("Action Forbidden: The primary system owner role cannot be removed.");
      }
      if (role.role === "super_admin") {
        const { count, error: countError } = await db.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "super_admin");
        if (countError) throw new Error(`Could not verify administrator count: ${countError.message}`);
        if ((count || 0) <= 1) throw new Error("The last super administrator cannot be removed.");
      }
      const { error } = await db.from("user_roles").delete().eq("id", data.id);
      if (error) throw new Error(`Could not remove administrator role: ${error.message}`);
      return { ok: true };
    }
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
  .handler(async ({ data }): Promise<AdminVerificationLog[]> => {
    requireAdminAuth(["super_admin", "manager"]);
    const days = data?.sinceDays ?? 365;
    const since = new Date(Date.now() - days * 864e5).toISOString();

    // Admin verification history is private. Read it with the server-only
    // service role after the signed admin session has been validated above;
    // the server's publishable client has no browser Auth session attached.
    const db = getServiceRoleClient();
    if (db) {
      const { data: dbData, error } = await db
        .from("verification_logs")
        .select("id,verification_session_id,user_id,bill_amount,discount_amount,final_amount,status,created_at,partner:partners(id,business_name,category:categories(name)),offer:offers(title),membership:memberships(membership_number)")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5000);

      if (error) throw new Error(`Could not load verification history: ${error.message}`);
      // Supabase's generated join type models these many-to-one relations as
      // arrays, while PostgREST returns one object (or null) for each FK.
      return (dbData ?? []) as unknown as AdminVerificationLog[];
    }

    if (process.env.NODE_ENV === "production") {
      throw new Error("Could not load verification history: server database credentials are not configured");
    }

    await ensureStoreLoadedCloud();

    const storeLogs: AdminVerificationLog[] = (store.logs || [])
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

    return storeLogs.sort((a, b) => b.created_at.localeCompare(a.created_at));
  });

// Admin Get Audit Logs (Server Function)
export const getAdminAuditLogs = createServerFn({ method: "GET" }).handler(async (): Promise<V1AuditLog[]> => {
  requireAdminAuth(["super_admin", "manager"]);
  const db = getServiceRoleClient();
  if (db) {
    const [{ data: rows, error }, { data: profiles, error: profileError }] = await Promise.all([
      db.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(500),
      db.from("profiles").select("user_id,full_name,email"),
    ]);
    if (error) throw new Error(`Could not load audit history: ${error.message}`);
    if (profileError) throw new Error(`Could not load audit actors: ${profileError.message}`);
    const profileById = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]));
    return (rows ?? []).map((row) => ({
      id: row.id,
      admin_user_id: row.admin_user_id,
      action: row.action,
      target_type: row.target_type ?? "general",
      target_id: row.target_id,
      metadata: (row.metadata ?? {}) as Record<string, unknown>,
      created_at: row.created_at,
      who: profileById.get(row.admin_user_id)?.full_name || profileById.get(row.admin_user_id)?.email || "Administrator",
    }));
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("Could not load audit history: server database credentials are not configured");
  }
  await ensureStoreLoadedCloud();
  if (!store.auditLogs) store.auditLogs = [];
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
    const db = getServiceRoleClient();
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

    if (db) {
      const { error } = await db.from("audit_logs").insert({
        admin_user_id: auditEntry.admin_user_id,
        action: auditEntry.action,
        target_type: auditEntry.target_type,
        target_id: auditEntry.target_id,
        metadata: auditEntry.metadata as never,
      });
      if (error) throw new Error(`Could not save audit entry: ${error.message}`);
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
  requireAdminAuth(["super_admin", "membership_manager"]);
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
    const admin = requireAdminAuth(["super_admin", "membership_manager"]);
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
    const admin = requireAdminAuth(["super_admin", "membership_manager"]);
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
  requireAdminAuth(["super_admin", "manager"]);
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
    const admin = requireAdminAuth(["super_admin", "manager"]);
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

// ---------------- PARTNERS & OFFERS MANAGEMENT (Cloud Persisted) ----------------

export const getAdminPartners = createServerFn({ method: "GET" }).handler(async () => {
  requireAdminAuth(["super_admin", "manager", "support"]);
  const db = getServiceRoleClient();
  if (db) {
    const { data, error } = await db.from("partners").select("*, category:categories(name)").order("business_name");
    if (error) throw new Error(`Could not load partners: ${error.message}`);
    return (data || []).map((p: any) => ({ ...p, category_name: p.category?.name || "General" }));
  }
  await ensureStoreLoadedCloud();

  if (!store.partners) store.partners = seedPartners();
  if (!store.deletedPartnerIds) store.deletedPartnerIds = [];

  const delSet = new Set(store.deletedPartnerIds);

  const partnersList = Array.from(store.partners.values())
    .filter((p) => !delSet.has(p.id) && !delSet.has(p.slug))
    .map((p) => ({
      id: p.id,
      business_name: p.business_name,
      slug: p.slug,
      category_id: p.category_id,
      category_name: p.category_name || "General",
      description: p.description || "",
      logo_url: p.logo_url || "",
      cover_image_url: p.cover_image_url || "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1200&q=70",
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

  return partnersList.sort((a, b) => a.business_name.localeCompare(b.business_name));
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
    const admin = requireAdminAuth(["super_admin", "manager"]);
    const db = getServiceRoleClient();
    if (db) {
      const partnerId = data.id || safeRandomUUID();
      const { data: partner, error } = await db.from("partners").upsert({
        id: partnerId,
        business_name: data.business_name,
        slug: data.slug.trim().toLowerCase(),
        category_id: data.category_id,
        description: data.description || null,
        logo_url: data.logo_url || null,
        cover_image_url: data.cover_image_url || null,
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
      }).select().single();
      if (error) throw new Error(`Could not save partner: ${error.message}`);
      return { ok: true, partner };
    }
    await ensureStoreLoadedCloud();

    if (!store.partners) store.partners = new Map();
    if (!store.auditLogs) store.auditLogs = [];

    const partnerId = data.id || safeRandomUUID();
    const now = new Date().toISOString();

    const partnerRecord: V1Partner = {
      id: partnerId,
      business_name: data.business_name,
      slug: data.slug.trim().toLowerCase(),
      category_id: data.category_id,
      category_name: data.category_name || "General",
      description: data.description || "",
      logo_url: data.logo_url || "",
      cover_image_url: data.cover_image_url || "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1200&q=70",
      phone: data.phone || "",
      email: data.email || "",
      website: data.website || "",
      address: data.address || "",
      city: data.city || "Daltonganj",
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      business_hours: data.business_hours || "",
      status: data.status,
      featured: data.featured,
      created_at: now,
      updated_at: now,
    };

    store.partners.set(partnerId, partnerRecord);

    store.auditLogs.unshift({
      id: safeRandomUUID(),
      admin_user_id: admin.id,
      action: data.id ? "Updated Partner" : "Created Partner",
      target_type: "partner",
      target_id: partnerId,
      metadata: { name: data.business_name, slug: partnerRecord.slug },
      created_at: now,
      who: admin.full_name || "Admin",
    });

    await persistStoreCloud();

    // Background attempt to mirror to Supabase if configured
    try {
      const { getServerSupabase } = await import("./supabase-admin.server");
      const sb = getServerSupabase();
      await sb.from("partners").upsert({
        id: partnerId,
        business_name: data.business_name,
        slug: partnerRecord.slug,
        category_id: data.category_id,
        description: data.description || null,
        logo_url: data.logo_url || null,
        cover_image_url: partnerRecord.cover_image_url,
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
      });
    } catch {
      // Non-blocking mirror
    }

    return { ok: true, partner: partnerRecord };
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
    const admin = requireAdminAuth(["super_admin", "manager"]);
    const db = getServiceRoleClient();
    if (db) {
      const patch: Record<string, unknown> = {};
      if (data.status !== undefined) patch.status = data.status;
      if (data.featured !== undefined) patch.featured = data.featured;
      const { error } = await db.from("partners").update(patch).eq("id", data.id);
      if (error) throw new Error(`Could not update partner: ${error.message}`);
      return { ok: true };
    }
    await ensureStoreLoadedCloud();

    const partner = store.partners?.get(data.id);
    if (!partner) throw new Error("Partner not found");

    if (data.status !== undefined) partner.status = data.status;
    if (data.featured !== undefined) partner.featured = data.featured;
    partner.updated_at = new Date().toISOString();

    store.auditLogs.unshift({
      id: safeRandomUUID(),
      admin_user_id: admin.id,
      action: "Updated Partner Status",
      target_type: "partner",
      target_id: data.id,
      metadata: { status: data.status, featured: data.featured, name: partner.business_name },
      created_at: new Date().toISOString(),
      who: admin.full_name || "Admin",
    });

    await persistStoreCloud();

    try {
      const { getServerSupabase } = await import("./supabase-admin.server");
      const sb = getServerSupabase();
      const patch: any = {};
      if (data.status !== undefined) patch.status = data.status;
      if (data.featured !== undefined) patch.featured = data.featured;
      await sb.from("partners").update(patch).eq("id", data.id);
    } catch {
      // Non-blocking
    }

    return { ok: true };
  });

export const deletePartner = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const admin = requireAdminAuth(["super_admin", "manager"]);
    const db = getServiceRoleClient();
    if (db) {
      const { error } = await db.from("partners").delete().eq("id", data.id);
      if (error) throw new Error(`Could not delete partner: ${error.message}`);
      return { ok: true };
    }
    await ensureStoreLoadedCloud();

    if (!store.deletedPartnerIds) store.deletedPartnerIds = [];
    if (!store.deletedOfferIds) store.deletedOfferIds = [];

    const partner = store.partners?.get(data.id);
    store.deletedPartnerIds.push(data.id);
    if (partner?.slug) {
      store.deletedPartnerIds.push(partner.slug);
    }

    if (store.partners) {
      store.partners.delete(data.id);
    }

    // Cascade delete partner's offers
    if (store.offers) {
      for (const [offerId, offer] of Array.from(store.offers.entries())) {
        if (offer.partner_id === data.id) {
          store.offers.delete(offerId);
          store.deletedOfferIds.push(offerId);
        }
      }
    }

    store.auditLogs.unshift({
      id: safeRandomUUID(),
      admin_user_id: admin.id,
      action: "Deleted Partner",
      target_type: "partner",
      target_id: data.id,
      metadata: { deleted_name: partner?.business_name || "Partner" },
      created_at: new Date().toISOString(),
      who: admin.full_name || "Admin",
    });

    await persistStoreCloud();

    try {
      const { getServerSupabase } = await import("./supabase-admin.server");
      const sb = getServerSupabase();
      await sb.from("offers").delete().eq("partner_id", data.id);
      await sb.from("partners").delete().eq("id", data.id);
    } catch {
      // Non-blocking
    }

    return { ok: true };
  });

// Admin Get Offers
export const getAdminOffers = createServerFn({ method: "GET" }).handler(async () => {
  requireAdminAuth(["super_admin", "manager", "support"]);
  const db = getServiceRoleClient();
  if (db) {
    const { data, error } = await db.from("offers").select("*, partner:partners(id,business_name,slug)").order("created_at", { ascending: false });
    if (error) throw new Error(`Could not load offers: ${error.message}`);
    return data || [];
  }
  await ensureStoreLoadedCloud();

  if (!store.offers) store.offers = seedOffers();
  if (!store.partners) store.partners = seedPartners();
  if (!store.deletedOfferIds) store.deletedOfferIds = [];
  if (!store.deletedPartnerIds) store.deletedPartnerIds = [];

  const delOffers = new Set(store.deletedOfferIds);
  const delPartners = new Set(store.deletedPartnerIds);

  const offersList = Array.from(store.offers.values())
    .filter((o) => !delOffers.has(o.id) && !delPartners.has(o.partner_id))
    .map((o) => {
      const partner = store.partners.get(o.partner_id);
      return {
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
        partner: partner ? { id: partner.id, business_name: partner.business_name, slug: partner.slug } : undefined,
      };
    });

  return offersList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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

// Admin Save Offer
export const saveOffer = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => saveOfferSchema.parse(d))
  .handler(async ({ data }) => {
    const admin = requireAdminAuth(["super_admin", "manager"]);
    const db = getServiceRoleClient();
    if (db) {
      const { data: offer, error } = await db.from("offers").upsert({
        id: data.id || safeRandomUUID(),
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
        usage_limit_type: "UNLIMITED",
        status: data.status,
      }).select().single();
      if (error) throw new Error(`Could not save offer: ${error.message}`);
      return { ok: true, offer };
    }
    await ensureStoreLoadedCloud();

    if (!store.offers) store.offers = new Map();
    if (!store.auditLogs) store.auditLogs = [];

    const offerId = data.id || safeRandomUUID();
    const now = new Date().toISOString();

    const partner = store.partners?.get(data.partner_id);

    const offerRecord: V1Offer = {
      id: offerId,
      partner_id: data.partner_id,
      title: data.title,
      description: data.description || "",
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      max_discount: data.max_discount ?? null,
      minimum_bill: data.minimum_bill,
      valid_from: data.valid_from || null,
      valid_until: data.valid_until || null,
      valid_days: data.valid_days,
      terms_conditions: data.terms_conditions || "",
      usage_limit_type: "UNLIMITED",
      status: data.status,
      created_at: now,
      updated_at: now,
      partner: partner ? { id: partner.id, business_name: partner.business_name, slug: partner.slug } : undefined,
    };

    store.offers.set(offerId, offerRecord);

    store.auditLogs.unshift({
      id: safeRandomUUID(),
      admin_user_id: admin.id,
      action: data.id ? "Updated Offer" : "Created Offer",
      target_type: "offer",
      target_id: offerId,
      metadata: { title: data.title, partner: partner?.business_name },
      created_at: now,
      who: admin.full_name || "Admin",
    });

    await persistStoreCloud();

    try {
      const { getServerSupabase } = await import("./supabase-admin.server");
      const sb = getServerSupabase();
      await sb.from("offers").upsert({
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
      });
    } catch {
      // Non-blocking
    }

    return { ok: true, offer: offerRecord };
  });

// Admin Delete Offer
export const deleteOffer = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const admin = requireAdminAuth(["super_admin", "manager"]);
    const db = getServiceRoleClient();
    if (db) {
      const { error } = await db.from("offers").delete().eq("id", data.id);
      if (error) throw new Error(`Could not delete offer: ${error.message}`);
      return { ok: true };
    }
    await ensureStoreLoadedCloud();

    if (!store.deletedOfferIds) store.deletedOfferIds = [];

    const offer = store.offers?.get(data.id);
    store.deletedOfferIds.push(data.id);
    if (store.offers) {
      store.offers.delete(data.id);
    }

    store.auditLogs.unshift({
      id: safeRandomUUID(),
      admin_user_id: admin.id,
      action: "Deleted Offer",
      target_type: "offer",
      target_id: data.id,
      metadata: { title: offer?.title || "Offer" },
      created_at: new Date().toISOString(),
      who: admin.full_name || "Admin",
    });

    await persistStoreCloud();

    try {
      const { getServerSupabase } = await import("./supabase-admin.server");
      const sb = getServerSupabase();
      await sb.from("offers").delete().eq("id", data.id);
    } catch {
      // Non-blocking
    }

    return { ok: true };
  });

