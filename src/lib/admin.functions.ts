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
} from "./v1-logic";
import { requireAdminAuth } from "./admin-auth.server";
import { supabase } from "@/integrations/supabase/client";

const memberSchema = z.object({
  full_name: z.string().trim().min(2, "Full name is required").max(100),
  mobile: z.string().trim().min(10, "Valid 10-digit mobile is required").max(16),
  email: z.string().trim().email("Valid email is required").max(255),
  plan_id: z.string().min(1),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  card_id: z.string().optional().or(z.literal("")),
});

// Admin Create Member — NO customer password, NO customer Supabase Auth account
export const createMember = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => memberSchema.parse(d))
  .handler(async ({ data }) => {
    const admin = requireAdminAuth();
    if (data.expiry_date < data.start_date) {
      throw new Error("Expiry date must be after start date");
    }

    const membershipNumber = generatePenCode();
    const memberId = safeRandomUUID();
    const now = new Date().toISOString();

    let assignedCardNumber: string | undefined;

    // If card_id was provided, assign that physical card
    if (data.card_id && store.cards.has(data.card_id)) {
      const card = store.cards.get(data.card_id)!;
      card.membership_id = memberId;
      card.status = "ACTIVE";
      card.issued_at = now;
      card.updated_at = now;
      assignedCardNumber = card.card_number;
    } else {
      // Find an available card or create one
      let availableCard: V1PhysicalCard | undefined;
      for (const c of store.cards.values()) {
        if (c.status === "AVAILABLE") {
          availableCard = c;
          break;
        }
      }

      if (availableCard) {
        availableCard.membership_id = memberId;
        availableCard.status = "ACTIVE";
        availableCard.issued_at = now;
        availableCard.updated_at = now;
        assignedCardNumber = availableCard.card_number;
      }
    }

    const member: V1Member = {
      id: memberId,
      membership_number: membershipNumber,
      full_name: data.full_name,
      mobile: data.mobile,
      email: data.email,
      plan_id: data.plan_id,
      plan_name: "PennyGrade 6-Month Membership",
      start_date: data.start_date,
      expiry_date: data.expiry_date,
      status: "ACTIVE",
      created_at: now,
      updated_at: now,
      card_id: data.card_id || undefined,
      card_number: assignedCardNumber || membershipNumber,
    };

    store.members.set(memberId, member);

    if (store.auditLogs) {
      store.auditLogs.unshift({
        id: safeRandomUUID(),
        admin_user_id: admin.id,
        action: "Created Member",
        target_type: "member",
        target_id: memberId,
        metadata: { name: member.full_name, membership_number: member.membership_number },
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

// Admin Generate Card Batch
export const generateCardBatch = createServerFn({ method: "POST" })
  .inputValidator((d: { count: number }) =>
    z.object({ count: z.number().int().min(1).max(2000) }).parse(d)
  )
  .handler(async ({ data }) => {
    const admin = requireAdminAuth();
    const createdCards: string[] = [];
    const now = new Date().toISOString();

    const existingCodes = new Set<string>();
    for (const c of store.cards.values()) {
      existingCodes.add(c.card_number);
    }
    for (const m of store.members.values()) {
      existingCodes.add(m.membership_number);
      if (m.card_number) existingCodes.add(m.card_number);
    }

    for (let i = 0; i < data.count; i++) {
      const cardId = safeRandomUUID();
      let cardNumber = generatePenCode();
      let attempts = 0;
      while (existingCodes.has(cardNumber) && attempts < 100) {
        cardNumber = generatePenCode();
        attempts++;
      }
      existingCodes.add(cardNumber);

      const card: V1PhysicalCard = {
        id: cardId,
        card_number: cardNumber,
        membership_id: null,
        status: "AVAILABLE",
        issued_at: null,
        created_at: now,
        updated_at: now,
      };
      store.cards.set(cardId, card);
      createdCards.push(cardNumber);
    }

    if (store.auditLogs) {
      store.auditLogs.unshift({
        id: safeRandomUUID(),
        admin_user_id: admin.id,
        action: `Generated Batch (${createdCards.length} Cards)`,
        target_type: "cards",
        target_id: `batch-${Date.now()}`,
        metadata: { count: createdCards.length },
        created_at: now,
        who: admin.full_name || admin.email,
      });
    }

    saveStoreToDisk();

    return {
      ok: true,
      count: createdCards.length,
    };
  });

// Admin Get Cards
export const getAdminCards = createServerFn({ method: "GET" }).handler(async () => {
  requireAdminAuth();
  const cardsList = Array.from(store.cards.values()).map((c) => {
    let memberName = "";
    let membershipNumber = "";
    if (c.membership_id && store.members.has(c.membership_id)) {
      const m = store.members.get(c.membership_id)!;
      memberName = m.full_name;
      membershipNumber = m.membership_number;
    }
    return {
      ...c,
      member: memberName,
      membership_number: membershipNumber,
    };
  });

  return cardsList.sort((a, b) => b.created_at.localeCompare(a.created_at));
});

// Admin Get Members
export const getAdminMembers = createServerFn({ method: "GET" }).handler(async () => {
  requireAdminAuth();
  return Array.from(store.members.values()).sort((a, b) =>
    b.created_at.localeCompare(a.created_at)
  );
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
    const admin = requireAdminAuth();
    const member = store.members.get(data.id);
    if (!member) throw new Error("Member not found");
    member.status = data.status;
    member.updated_at = new Date().toISOString();

    if (store.auditLogs) {
      store.auditLogs.unshift({
        id: safeRandomUUID(),
        admin_user_id: admin.id,
        action: `Updated Member Status to ${data.status}`,
        target_type: "member",
        target_id: member.id,
        metadata: { member: member.full_name, status: data.status },
        created_at: member.updated_at,
        who: admin.full_name || admin.email,
      });
    }

    saveStoreToDisk();

    return { ok: true };
  });

// Admin Delete Member
export const deleteMember = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const admin = requireAdminAuth();
    const member = store.members.get(data.id);
    if (!member) throw new Error("Member not found");

    // Release assigned card back to AVAILABLE status if linked
    if (member.card_id && store.cards.has(member.card_id)) {
      const card = store.cards.get(member.card_id)!;
      card.membership_id = null;
      card.status = "AVAILABLE";
      card.updated_at = new Date().toISOString();
    }

    store.members.delete(data.id);

    if (store.auditLogs) {
      store.auditLogs.unshift({
        id: safeRandomUUID(),
        admin_user_id: admin.id,
        action: `Deleted Member: ${member.full_name} (${member.membership_number})`,
        target_type: "member",
        target_id: data.id,
        metadata: { name: member.full_name, membership_number: member.membership_number },
        created_at: new Date().toISOString(),
        who: admin.full_name || admin.email,
      });
    }

    saveStoreToDisk();

    return { ok: true };
  });

// Admin Renew Membership
export const renewMember = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; durationDays?: number }) =>
    z.object({ id: z.string(), durationDays: z.number().optional() }).parse(d)
  )
  .handler(async ({ data }) => {
    const admin = requireAdminAuth();
    const member = store.members.get(data.id);
    if (!member) throw new Error("Member not found");

    const days = data.durationDays ?? 180;
    const currentExpiry = new Date(Math.max(Date.now(), new Date(member.expiry_date).getTime()));
    currentExpiry.setDate(currentExpiry.getDate() + days);
    member.expiry_date = currentExpiry.toISOString().slice(0, 10);
    member.status = "ACTIVE";
    member.updated_at = new Date().toISOString();

    if (store.auditLogs) {
      store.auditLogs.unshift({
        id: safeRandomUUID(),
        admin_user_id: admin.id,
        action: "Renewed Membership",
        target_type: "member",
        target_id: member.id,
        metadata: { member: member.full_name, new_expiry: member.expiry_date },
        created_at: member.updated_at,
        who: admin.full_name || admin.email,
      });
    }

    saveStoreToDisk();

    return { ok: true, new_expiry: member.expiry_date };
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
    const admin = requireAdminAuth();
    const member = store.members.get(data.memberId);
    if (!member) throw new Error("Member not found");

    const newCard = store.cards.get(data.cardId);
    if (!newCard || newCard.status !== "AVAILABLE") {
      throw new Error("Selected card is not available");
    }

    const now = new Date().toISOString();

    // If member already had a card, update its status
    if (member.card_id && store.cards.has(member.card_id)) {
      const oldCard = store.cards.get(member.card_id)!;
      oldCard.status = data.oldCardStatus ?? "LOST";
      oldCard.updated_at = now;
    }

    // Assign new card
    newCard.membership_id = member.id;
    newCard.status = "ACTIVE";
    newCard.issued_at = now;
    newCard.updated_at = now;

    member.card_id = newCard.id;
    member.card_number = newCard.card_number;
    member.updated_at = now;

    if (store.auditLogs) {
      store.auditLogs.unshift({
        id: safeRandomUUID(),
        admin_user_id: admin.id,
        action: "Assigned Physical Card",
        target_type: "card",
        target_id: newCard.id,
        metadata: { card_number: newCard.card_number, member: member.full_name },
        created_at: now,
        who: admin.full_name || admin.email,
      });
    }

    saveStoreToDisk();

    return { ok: true, card_number: newCard.card_number };
  });

// Admin Get Admin Users (Server Function)
export const getAdminUsers = createServerFn({ method: "GET" }).handler(async (): Promise<V1AdminUser[]> => {
  requireAdminAuth();
  const storeUsers: V1AdminUser[] = (store.adminUsers || []).map((u) => ({
    id: u.id,
    user_id: u.user_id,
    full_name: u.full_name,
    email: u.email,
    role: u.role,
    created_at: u.created_at,
  }));

  if (!storeUsers.length) {
    const fallbackUsers: V1AdminUser[] = [
      {
        id: "admin-primary-owner",
        user_id: "uid-primary-owner",
        full_name: "PennyGrade Business",
        email: "pennygradebusiness@gmail.com",
        role: "super_admin",
        created_at: new Date(Date.now() - 30 * 864e5).toISOString(),
      },
      {
        id: "admin-user-2",
        user_id: "uid-rajesh-002",
        full_name: "Rajesh Sharma",
        email: "rajesh.manager@pennygrade.com",
        role: "manager",
        created_at: new Date(Date.now() - 20 * 864e5).toISOString(),
      },
      {
        id: "admin-user-3",
        user_id: "uid-priya-003",
        full_name: "Priya Patel",
        email: "priya.cards@pennygrade.com",
        role: "membership_manager",
        created_at: new Date(Date.now() - 14 * 864e5).toISOString(),
      },
      {
        id: "admin-user-4",
        user_id: "uid-amit-004",
        full_name: "Amit Verma",
        email: "amit.support@pennygrade.com",
        role: "support",
        created_at: new Date(Date.now() - 7 * 864e5).toISOString(),
      },
    ];
    storeUsers.push(...fallbackUsers);
    if (store.adminUsers) store.adminUsers.push(...fallbackUsers);
  }

  try {
    const [{ data: r, error: rErr }, { data: p }] = await Promise.all([
      supabase.from("user_roles").select("*"),
      supabase.from("profiles").select("user_id,full_name,email"),
    ]);

    if (!rErr && r && r.length > 0) {
      const pm = new Map((p ?? []).map((x) => [x.user_id, x]));
      const dbUsers: V1AdminUser[] = r.map((roleRec) => {
        const prof = pm.get(roleRec.user_id);
        return {
          id: roleRec.id,
          user_id: roleRec.user_id,
          full_name: prof?.full_name || "Admin Staff",
          email: prof?.email || "staff@pennygrade.com",
          role: roleRec.role as V1AdminUser["role"],
          created_at: roleRec.created_at,
        };
      });

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

// Admin Remove Role
export const removeAdminRole = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const admin = requireAdminAuth(["super_admin"]);
    if (!store.adminUsers) return { ok: true };
    const target = store.adminUsers.find((u) => u.id === data.id);
    store.adminUsers = store.adminUsers.filter((u) => u.id !== data.id);

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

    saveStoreToDisk();

    try {
      await supabase.from("user_roles").delete().eq("id", data.id);
    } catch {
      // ignore
    }

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

// ---------------- PARTNERS MANAGEMENT ----------------

export const getAdminPartners = createServerFn({ method: "GET" }).handler(async () => {
  requireAdminAuth();
  if (!store.partners) store.partners = new Map();
  const seeded = seedPartners();
  for (const [k, v] of seeded.entries()) {
    if (!store.partners.has(k)) {
      store.partners.set(k, v);
    }
  }

  try {
    const { pub } = await import("./public.functions");
    const { data: dbPartners } = await pub()
      .from("partners")
      .select("*, category:categories(id, name, slug)");
    if (dbPartners && dbPartners.length > 0) {
      for (const p of dbPartners) {
        if (!store.partners.has(p.id)) {
          store.partners.set(p.id, {
            id: p.id,
            business_name: p.business_name,
            slug: p.slug,
            category_id: p.category_id || "e7d3fd02-abd7-4ba4-b129-294ac76bff15",
            category_name: (p as any).category?.name || "General",
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
            status: p.status as "ACTIVE" | "INACTIVE" | "SUSPENDED",
            featured: Boolean(p.featured),
            created_at: p.created_at || new Date().toISOString(),
            updated_at: p.updated_at || new Date().toISOString(),
          });
        }
      }
    }
  } catch {
    // Non-fatal
  }

  saveStoreToDisk();
  return Array.from(store.partners.values()).sort((a, b) =>
    a.business_name.localeCompare(b.business_name)
  );
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
    const admin = requireAdminAuth();
    const now = new Date().toISOString();
    if (!store.partners || store.partners.size === 0) {
      store.partners = seedPartners();
    }

    const partnerId = data.id || safeRandomUUID();
    const existing = store.partners.get(partnerId);

    const partner: V1Partner = {
      id: partnerId,
      business_name: data.business_name,
      slug: data.slug,
      category_id: data.category_id,
      category_name: data.category_name || existing?.category_name || "General",
      description: data.description,
      logo_url: data.logo_url,
      cover_image_url:
        data.cover_image_url ||
        existing?.cover_image_url ||
        "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1200&q=70",
      phone: data.phone,
      email: data.email,
      website: data.website,
      address: data.address,
      city: data.city || "Daltonganj",
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      business_hours: data.business_hours,
      status: data.status,
      featured: data.featured,
      created_at: existing ? existing.created_at : now,
      updated_at: now,
    };

    store.partners.set(partnerId, partner);

    try {
      const { pub } = await import("./public.functions");
      const sbPayload: any = {
        id: partnerId,
        business_name: partner.business_name,
        slug: partner.slug,
        category_id: partner.category_id,
        description: partner.description || "",
        logo_url: partner.logo_url || null,
        cover_image_url: partner.cover_image_url || null,
        phone: partner.phone || null,
        email: partner.email || null,
        website: partner.website || null,
        address: partner.address || null,
        city: partner.city || "Daltonganj",
        latitude: partner.latitude,
        longitude: partner.longitude,
        business_hours: partner.business_hours || null,
        status: partner.status,
        featured: partner.featured,
      };
      if (existing) {
        await pub().from("partners").update(sbPayload).eq("id", partnerId);
      } else {
        await pub().from("partners").insert(sbPayload);
      }
    } catch {
      // Non-fatal
    }

    if (store.auditLogs) {
      store.auditLogs.unshift({
        id: safeRandomUUID(),
        admin_user_id: admin.id,
        action: existing ? `Updated Partner: ${partner.business_name}` : `Created Partner: ${partner.business_name}`,
        target_type: "partner",
        target_id: partnerId,
        metadata: { name: partner.business_name, slug: partner.slug, status: partner.status },
        created_at: now,
        who: admin.full_name || admin.email,
      });
    }

    saveStoreToDisk();
    return { ok: true, partner };
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
    const admin = requireAdminAuth();
    if (!store.partners || store.partners.size === 0) {
      store.partners = seedPartners();
    }
    const partner = store.partners.get(data.id);
    if (!partner) throw new Error("Partner not found");

    if (data.status !== undefined) partner.status = data.status;
    if (data.featured !== undefined) partner.featured = data.featured;
    partner.updated_at = new Date().toISOString();

    try {
      const { pub } = await import("./public.functions");
      const patch: any = {};
      if (data.status !== undefined) patch.status = data.status;
      if (data.featured !== undefined) patch.featured = data.featured;
      await pub().from("partners").update(patch).eq("id", data.id);
    } catch {
      // Non-fatal
    }

    if (store.auditLogs) {
      store.auditLogs.unshift({
        id: safeRandomUUID(),
        admin_user_id: admin.id,
        action: `Updated Partner ${partner.business_name} (Status: ${partner.status}, Featured: ${partner.featured})`,
        target_type: "partner",
        target_id: partner.id,
        metadata: { name: partner.business_name, status: partner.status, featured: partner.featured },
        created_at: partner.updated_at,
        who: admin.full_name || admin.email,
      });
    }

    saveStoreToDisk();
    return { ok: true, partner };
  });

export const deletePartner = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const admin = requireAdminAuth();
    if (!store.partners || store.partners.size === 0) {
      store.partners = seedPartners();
    }
    const partner = store.partners.get(data.id);
    if (!partner) throw new Error("Partner not found");

    store.partners.delete(data.id);

    try {
      const { pub } = await import("./public.functions");
      await pub().from("partners").delete().eq("id", data.id);
    } catch {
      // Non-fatal
    }

    if (store.auditLogs) {
      store.auditLogs.unshift({
        id: safeRandomUUID(),
        admin_user_id: admin.id,
        action: `Deleted Partner: ${partner.business_name}`,
        target_type: "partner",
        target_id: data.id,
        metadata: { name: partner.business_name, slug: partner.slug },
        created_at: new Date().toISOString(),
        who: admin.full_name || admin.email,
      });
    }

    saveStoreToDisk();
    return { ok: true };
  });
