import {
  store,
  safeRandomUUID,
  saveStoreToDisk,
  normalizeMembershipNumber,
  normalizeMobile,
  checkRateLimit,
  type V1Member,
  type V1Partner,
  type V1Offer,
  type V1VerificationSession,
  type V1VerificationLog,
  type V1AdminUser,
} from "./v1-store";

// Helper to look up active member by membership number or card number
export function findActiveMember(inputNumber: string): V1Member | null {
  const normalized = normalizeMembershipNumber(inputNumber);
  const today = new Date().toISOString().slice(0, 10);

  // Check directly by membership_number
  for (const m of store.members.values()) {
    if (m.membership_number === normalized) {
      if (m.status === "ACTIVE" && m.expiry_date >= today) {
        return m;
      }
      return null;
    }
  }

  // Check by physical card number
  for (const card of store.cards.values()) {
    if (card.card_number === normalized) {
      if (card.status !== "ACTIVE" && card.status !== "AVAILABLE") return null;
      if (card.membership_id && store.members.has(card.membership_id)) {
        const m = store.members.get(card.membership_id)!;
        if (m.status === "ACTIVE" && m.expiry_date >= today) {
          return m;
        }
      }
      return null;
    }
  }

  return null;
}

// 1. Verify Member Input
export function verifyMemberInputLogic(membershipNumber: string): {
  ok: boolean;
  message?: string;
  membership_number?: string;
  member_name?: string;
} {
  const ipKey = `verify-mem-${membershipNumber.slice(0, 8)}`;
  if (!checkRateLimit(ipKey, 10, 60_000)) {
    return {
      ok: false,
      message: "Too many verification attempts. Please wait a minute and try again.",
    };
  }

  const member = findActiveMember(membershipNumber);
  if (!member) {
    return {
      ok: false,
      message: "Unable to verify membership. Please check your membership number and try again.",
    };
  }

  return {
    ok: true,
    membership_number: member.membership_number,
    member_name: member.full_name,
  };
}

// 2. Server-Side Discount Calculation
export interface OfferCalculationRule {
  id: string;
  title: string;
  discount_type: "PERCENTAGE" | "FIXED";
  discount_value: number;
  max_discount: number | null;
  minimum_bill: number;
}

export function calculateDiscount(
  billAmount: number,
  offer: OfferCalculationRule
): {
  eligible: boolean;
  message?: string;
  bill: number;
  discount: number;
  finalAmount: number;
} {
  const bill = Math.round(billAmount * 100) / 100;
  if (!Number.isFinite(bill) || bill <= 0) {
    return { eligible: false, message: "Please enter a valid bill amount.", bill, discount: 0, finalAmount: 0 };
  }

  if (offer.minimum_bill && bill < offer.minimum_bill) {
    return {
      eligible: false,
      message: `This offer requires a minimum bill of ₹${offer.minimum_bill.toLocaleString("en-IN")}.`,
      bill,
      discount: 0,
      finalAmount: bill,
    };
  }

  let discount = 0;
  if (offer.discount_type === "PERCENTAGE") {
    discount = Math.round((bill * offer.discount_value) / 100 * 100) / 100;
  } else {
    discount = offer.discount_value;
  }

  if (offer.max_discount && discount > offer.max_discount) {
    discount = offer.max_discount;
  }

  if (discount > bill) {
    discount = bill;
  }

  const finalAmount = Math.max(0, Math.round((bill - discount) * 100) / 100);

  return {
    eligible: true,
    bill,
    discount,
    finalAmount,
  };
}

// 3. Create Verification Session & Log
export function createVerificationSessionLogic(params: {
  partner: { id: string; business_name: string; slug: string };
  offer: OfferCalculationRule;
  membershipNumber: string;
  billAmount: number;
}): {
  ok: boolean;
  message?: string;
  session_id?: string;
} {
  const rateKey = `create-verif-${params.partner.slug}`;
  if (!checkRateLimit(rateKey, 12, 60_000)) {
    return {
      ok: false,
      message: "Too many verification attempts. Please wait a minute and try again.",
    };
  }

  const member = findActiveMember(params.membershipNumber);
  if (!member) {
    return {
      ok: false,
      message: "Unable to verify membership. Please check your membership number and try again.",
    };
  }

  const calc = calculateDiscount(params.billAmount, params.offer);
  if (!calc.eligible) {
    return {
      ok: false,
      message: calc.message ?? "This bill amount is not eligible.",
    };
  }

  const sessionId = safeRandomUUID();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const createdAt = new Date().toISOString();

  const session: V1VerificationSession = {
    id: sessionId,
    membership_id: member.id,
    membership_number: member.membership_number,
    member_name: member.full_name,
    partner_id: params.partner.id,
    partner_name: params.partner.business_name,
    partner_slug: params.partner.slug,
    offer_id: params.offer.id,
    discount_type: params.offer.discount_type,
    discount_value: params.offer.discount_value,
    bill_amount: calc.bill,
    discount_amount: calc.discount,
    final_amount: calc.finalAmount,
    status: "ACTIVE",
    expires_at: expiresAt,
    created_at: createdAt,
  };

  const log: V1VerificationLog = {
    id: safeRandomUUID(),
    verification_session_id: sessionId,
    membership_id: member.id,
    membership_number: member.membership_number,
    partner_id: params.partner.id,
    partner_name: params.partner.business_name,
    offer_id: params.offer.id,
    offer_title: params.offer.title,
    bill_amount: calc.bill,
    discount_amount: calc.discount,
    final_amount: calc.finalAmount,
    status: "VERIFIED",
    created_at: createdAt,
  };

  store.sessions.set(sessionId, session);
  store.logs.unshift(log);

  return {
    ok: true,
    session_id: sessionId,
  };
}

// 4. Get Public Verification Session
export function getVerificationSessionLogic(sessionId: string) {
  const s = store.sessions.get(sessionId);
  if (!s) return null;

  const isExpired = new Date(s.expires_at).getTime() < Date.now();
  const status = isExpired ? ("EXPIRED" as const) : s.status;

  return {
    id: s.id,
    partner_name: s.partner_name,
    partner_slug: s.partner_slug,
    member_name: s.member_name,
    membership_number: s.membership_number,
    discount_type: s.discount_type,
    discount_value: s.discount_value,
    bill_amount: s.bill_amount,
    discount_amount: s.discount_amount,
    final_amount: s.final_amount,
    status,
    expires_at: s.expires_at,
    created_at: s.created_at,
  };
}

// 5. Get Public Customer History
export function getCustomerHistoryLogic(params: {
  membershipNumber: string;
  mobile: string;
}) {
  const rateKey = `hist-${params.membershipNumber.slice(0, 8)}`;
  if (!checkRateLimit(rateKey, 8, 60_000)) {
    return {
      ok: false,
      message: "Too many lookup attempts. Please wait a minute and try again.",
    };
  }

  const normalizedNum = normalizeMembershipNumber(params.membershipNumber);
  const normalizedMob = normalizeMobile(params.mobile);

  let foundMember: V1Member | null = null;
  for (const m of store.members.values()) {
    const matchesNum =
      m.membership_number === normalizedNum ||
      (m.card_number && normalizeMembershipNumber(m.card_number) === normalizedNum);
    if (matchesNum) {
      if (normalizeMobile(m.mobile) === normalizedMob) {
        foundMember = m;
      }
      break;
    }
  }

  if (!foundMember) {
    for (const card of store.cards.values()) {
      if (normalizeMembershipNumber(card.card_number) === normalizedNum && card.membership_id) {
        const m = store.members.get(card.membership_id);
        if (m && normalizeMobile(m.mobile) === normalizedMob) {
          foundMember = m;
        }
        break;
      }
    }
  }

  if (!foundMember) {
    return {
      ok: false,
      message: "Unable to verify membership details. Please check your membership number and registered mobile number.",
    };
  }

  const memberLogs = store.logs
    .filter((l) => l.membership_id === foundMember!.id)
    .slice(0, 50);

  const today = new Date().toISOString().slice(0, 10);
  const effectiveStatus =
    foundMember.status === "ACTIVE" && foundMember.expiry_date < today
      ? "EXPIRED"
      : foundMember.status;

  return {
    ok: true,
    member: {
      full_name: foundMember.full_name,
      membership_number: foundMember.membership_number,
      status: effectiveStatus,
      expiry_date: foundMember.expiry_date,
      plan_name: foundMember.plan_name,
    },
    history: memberLogs.map((l) => ({
      id: l.id,
      verification_session_id: l.verification_session_id,
      partner_name: l.partner_name,
      offer_title: l.offer_title,
      bill_amount: l.bill_amount,
      discount_amount: l.discount_amount,
      final_amount: l.final_amount,
      created_at: l.created_at,
    })),
  };
}

// Admin Creation & Delegation Logic
export function addAdminLogic(data: {
  email: string;
  role: "super_admin" | "manager" | "membership_manager" | "support";
  full_name?: string;
  temporary_password?: string;
}): {
  ok: boolean;
  message: string;
  admin: V1AdminUser;
  temporary_password: string;
} {
  const now = new Date().toISOString();
  if (data.email.toLowerCase() === "pennygradebusiness@gmail.com" && data.role !== "super_admin") {
    throw new Error("Action Forbidden: The primary system owner role cannot be demoted.");
  }

  const id = safeRandomUUID();
  const name =
    data.full_name?.trim() ||
    data.email
      .split("@")[0]
      .replace(/[._]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

  const tempPassword =
    data.temporary_password?.trim() ||
    `Penny@${safeRandomUUID().slice(0, 4).toUpperCase()}!`;

  const newAdmin: V1AdminUser = {
    id,
    user_id: safeRandomUUID(),
    full_name: name,
    email: data.email.toLowerCase(),
    role: data.role,
    temporary_password: tempPassword,
    is_password_set: !!data.temporary_password,
    created_at: now,
  };

  if (!store.adminUsers) store.adminUsers = [];
  store.adminUsers = store.adminUsers.filter((u) => u.email.toLowerCase() !== data.email.toLowerCase());
  store.adminUsers.unshift(newAdmin);

  if (store.auditLogs) {
    store.auditLogs.unshift({
      id: safeRandomUUID(),
      admin_user_id: "admin-super",
      action: `Granted role ${data.role.replace(/_/g, " ")} to ${data.email} with initial credentials`,
      target_type: "user_role",
      target_id: id,
      metadata: { email: data.email, role: data.role, name },
      created_at: now,
      who: "Super Admin",
    });
  }

  saveStoreToDisk();

  return {
    ok: true,
    message: `Role ${data.role.replace(/_/g, " ")} granted to ${data.email}`,
    admin: newAdmin,
    temporary_password: tempPassword,
  };
}

// Admin Password Reset Logic
export function resetAdminPasswordLogic(data: {
  id: string;
  new_password?: string;
}): { ok: boolean; email: string; temporary_password: string } {
  if (!store.adminUsers) store.adminUsers = [];
  const target = store.adminUsers.find((u) => u.id === data.id);
  if (!target) throw new Error("Administrator not found");

  const newPass = data.new_password?.trim() || `Penny@${safeRandomUUID().slice(0, 4).toUpperCase()}!`;
  target.temporary_password = newPass;
  target.is_password_set = false;

  if (store.auditLogs) {
    store.auditLogs.unshift({
      id: safeRandomUUID(),
      admin_user_id: "admin-super",
      action: `Reset administrator password for ${target.email}`,
      target_type: "user_role",
      target_id: target.id,
      metadata: { email: target.email },
      created_at: new Date().toISOString(),
      who: "Super Admin",
    });
  }

  saveStoreToDisk();
  return { ok: true, email: target.email, temporary_password: newPass };
}

// Verify Admin Login Credentials against store
export function verifyAdminLoginCredentialsLogic(data: {
  email: string;
  password: string;
}): {
  ok: boolean;
  message?: string;
  user?: {
    id: string;
    user_id: string;
    email: string;
    full_name: string;
    role: "super_admin" | "manager" | "membership_manager" | "support";
    requires_password_change?: boolean;
  };
} {
  const cleanEmail = data.email.trim().toLowerCase();
  if (!store.adminUsers) store.adminUsers = [];
  const user = store.adminUsers.find((u) => u.email.toLowerCase() === cleanEmail);

  if (!user) {
    return { ok: false, message: "Invalid administrator credentials." };
  }

  if (!user.temporary_password || data.password !== user.temporary_password) {
    return { ok: false, message: "Invalid administrator credentials." };
  }

  return {
    ok: true,
    user: {
      id: user.id,
      user_id: user.user_id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      requires_password_change: !user.is_password_set,
    },
  };
}

// First-Time Setup / Self-Service Password Set Logic
export function firstTimeSetPasswordLogic(data: {
  email: string;
  new_password: string;
  current_temporary_password?: string;
}): { ok: boolean; message: string } {
  const cleanEmail = data.email.trim().toLowerCase();
  if (!store.adminUsers) store.adminUsers = [];
  const user = store.adminUsers.find((u) => u.email.toLowerCase() === cleanEmail);
  if (!user) {
    throw new Error("No administrator account registered with this email address.");
  }

  if (user.temporary_password && data.current_temporary_password) {
    if (user.temporary_password !== data.current_temporary_password.trim()) {
      throw new Error("The initial temporary password entered is incorrect.");
    }
  }

  user.temporary_password = data.new_password.trim();
  user.is_password_set = true;
  saveStoreToDisk();

  if (store.auditLogs) {
    store.auditLogs.unshift({
      id: safeRandomUUID(),
      admin_user_id: user.id,
      action: `Administrator set permanent password (${user.email})`,
      target_type: "user_role",
      target_id: user.id,
      metadata: { email: user.email },
      created_at: new Date().toISOString(),
      who: user.full_name || "Admin",
    });
  }

  return {
    ok: true,
    message: "Permanent password successfully configured. You can now sign in.",
  };
}

// In-memory verification code registry for admin password recovery
export interface AdminPasswordResetRecord {
  code: string;
  expiresAt: number;
  attempts: number;
}
export const adminPasswordResetCodes = new Map<string, AdminPasswordResetRecord>();

function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, "").slice(-10);
}

const AUTHORIZED_OWNER_PHONES = new Set([
  "9356897893", // Canonical PennyGrade Owner Helpline (+91 93568 97893)
  "9876543210", // Primary Founding Member Mobile
]);

/**
 * Request password recovery code for an administrator or primary owner.
 */
export function requestAdminPasswordResetCodeLogic(data: { email: string }): {
  ok: boolean;
  message: string;
  hint?: string;
  code?: string;
} {
  const cleanEmail = data.email.trim().toLowerCase();
  if (!cleanEmail) {
    throw new Error("Admin email is required.");
  }

  if (!store.adminUsers) store.adminUsers = [];
  const user = store.adminUsers.find((u) => u.email.toLowerCase() === cleanEmail);
  const isPrimaryOwner = cleanEmail === "pennygradebusiness@gmail.com";

  if (!user && !isPrimaryOwner) {
    throw new Error("No administrator account registered with this email address.");
  }

  // Generate secure 6-digit random code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

  adminPasswordResetCodes.set(cleanEmail, {
    code,
    expiresAt,
    attempts: 0,
  });

  if (store.auditLogs) {
    store.auditLogs.unshift({
      id: safeRandomUUID(),
      admin_user_id: user?.id || "admin-primary-owner",
      action: `Admin password reset code requested for ${cleanEmail}`,
      target_type: "user_role",
      target_id: user?.id || "admin-primary-owner",
      metadata: { email: cleanEmail },
      created_at: new Date().toISOString(),
      who: isPrimaryOwner ? "Primary Owner" : user?.full_name || "Admin",
    });
  }

  // In test and server environments, log code clearly
  console.log(`[PennyGrade Security] Admin password recovery code for ${cleanEmail}: ${code}`);

  return {
    ok: true,
    message: isPrimaryOwner
      ? "Verification code generated! You can verify instantly with your registered mobile (+91 93568 97893) or the security code."
      : "Verification code generated. Please enter the 6-digit code to reset your password.",
    hint: isPrimaryOwner ? "Owner mobile ending in 7893" : undefined,
    code: process.env.NODE_ENV !== "production" ? code : undefined,
  };
}

/**
 * Verify recovery credential (phone or 6-digit code) and reset forgotten password.
 */
export function verifyAndResetForgottenPasswordLogic(data: {
  email: string;
  verification_credential: string;
  new_password: string;
}): {
  ok: boolean;
  message: string;
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
  };
} {
  const cleanEmail = data.email.trim().toLowerCase();
  const credential = data.verification_credential.trim();
  const newPass = data.new_password.trim();

  if (!cleanEmail) {
    throw new Error("Admin email is required.");
  }
  if (!credential) {
    throw new Error("Security verification code or registered mobile number is required.");
  }
  if (!newPass || newPass.length < 6) {
    throw new Error("Password must be at least 6 characters long.");
  }

  if (!store.adminUsers) store.adminUsers = [];
  let user = store.adminUsers.find((u) => u.email.toLowerCase() === cleanEmail);

  // If primary owner is not yet initialized in store.adminUsers, ensure they are present
  const isPrimaryOwner = cleanEmail === "pennygradebusiness@gmail.com";
  if (!user && isPrimaryOwner) {
    user = {
      id: "admin-primary-owner",
      user_id: "uid-primary-owner",
      full_name: "PennyGrade Business",
      email: "pennygradebusiness@gmail.com",
      role: "super_admin",
      is_password_set: false,
      created_at: new Date().toISOString(),
    };
    store.adminUsers.unshift(user);
  }

  if (!user) {
    throw new Error("No administrator account registered with this email address.");
  }

  // Check 1: 6-digit active reset code
  const activeRecord = adminPasswordResetCodes.get(cleanEmail);
  const isValidCode =
    activeRecord &&
    Date.now() <= activeRecord.expiresAt &&
    activeRecord.code === credential;

  // Check 2: Owner registered phone verification
  const normalizedInput = normalizePhone(credential);
  const isAuthorizedOwnerPhone = isPrimaryOwner && AUTHORIZED_OWNER_PHONES.has(normalizedInput);

  if (!isValidCode && !isAuthorizedOwnerPhone) {
    if (activeRecord) {
      activeRecord.attempts++;
      if (activeRecord.attempts >= 5) {
        adminPasswordResetCodes.delete(cleanEmail);
        throw new Error("Too many failed attempts. Please request a new security code.");
      }
    }
    throw new Error(
      isPrimaryOwner
        ? "Invalid verification code or mobile number. Enter the 6-digit security code or your registered mobile (+91 93568 97893)."
        : "Invalid verification code. Please check the code or request a new one."
    );
  }

  // Update password in store
  user.temporary_password = newPass;
  user.is_password_set = true;
  adminPasswordResetCodes.delete(cleanEmail);

  saveStoreToDisk();

  if (store.auditLogs) {
    store.auditLogs.unshift({
      id: safeRandomUUID(),
      admin_user_id: user.id,
      action: `Password reset successfully via recovery (${user.email})`,
      target_type: "user_role",
      target_id: user.id,
      metadata: {
        email: user.email,
        method: isAuthorizedOwnerPhone ? "phone_verification" : "security_code",
      },
      created_at: new Date().toISOString(),
      who: isPrimaryOwner ? "Primary Owner" : user.full_name || "Admin",
    });
  }

  return {
    ok: true,
    message: "Password reset successfully. You can now sign in.",
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
    },
  };
}

// Partner Cascade Deletion Logic: permanently removes partner and all associated offers
export async function deletePartnerCascadeLogic(
  partnerId: string,
  adminWho?: string
): Promise<{ ok: boolean; deletedOfferIds: string[] }> {
  if (!store.partners) store.partners = new Map();
  if (!store.offers) store.offers = new Map();
  if (!store.deletedPartnerIds) store.deletedPartnerIds = [];
  if (!store.deletedOfferIds) store.deletedOfferIds = [];

  const partner = store.partners.get(partnerId);
  const partnerName = partner?.business_name || "Partner";
  const partnerSlug = partner?.slug || "";

  // 1. Add partner ID and slug to deleted tracking list
  if (!store.deletedPartnerIds.includes(partnerId)) {
    store.deletedPartnerIds.push(partnerId);
  }
  if (partnerSlug && !store.deletedPartnerIds.includes(partnerSlug)) {
    store.deletedPartnerIds.push(partnerSlug);
  }

  // 2. Cascade delete all related offers in the store and track their IDs
  const relatedOfferIds: string[] = [];
  for (const [oId, offer] of Array.from(store.offers.entries())) {
    if (offer.partner_id === partnerId || (partnerSlug && offer.partner_id === partnerSlug)) {
      relatedOfferIds.push(oId);
      store.offers.delete(oId);
      if (!store.deletedOfferIds.includes(oId)) {
        store.deletedOfferIds.push(oId);
      }
    }
  }

  // Always blacklist synthetic/fallback offer IDs for this partner
  const syntheticOfferIds = [`offer-${partnerId}`, `offer-${partnerSlug}`];
  for (const synId of syntheticOfferIds) {
    if (!store.deletedOfferIds.includes(synId)) {
      store.deletedOfferIds.push(synId);
    }
  }

  // 3. Remove partner from in-memory store
  store.partners.delete(partnerId);

  // 4. Remove any active verification sessions for this partner
  if (store.sessions) {
    for (const [sId, sess] of store.sessions.entries()) {
      if (sess.partner_id === partnerId || sess.partner_slug === partnerSlug) {
        store.sessions.delete(sId);
      }
    }
  }

  // 5. Synchronize cascade deletion with Supabase in strict FK dependency order
  if (process.env.NODE_ENV !== "test") {
    try {
      const { pub } = await import("./public.functions");
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(partnerId);

      const targetPartnerDbIds: string[] = isUuid ? [partnerId] : [];
      if (partnerSlug) {
        const { data: dbPartner } = await pub()
          .from("partners")
          .select("id")
          .eq("slug", partnerSlug)
          .maybeSingle();

        if (dbPartner?.id && !targetPartnerDbIds.includes(dbPartner.id)) {
          targetPartnerDbIds.push(dbPartner.id);
        }
      }

      for (const pId of targetPartnerDbIds) {
        if (!store.deletedPartnerIds.includes(pId)) {
          store.deletedPartnerIds.push(pId);
        }

        // Query all database offers under this partner to record their IDs as permanently deleted
        const { data: dbOffers } = await pub().from("offers").select("id").eq("partner_id", pId);
        if (dbOffers) {
          for (const dbo of dbOffers) {
            if (!store.deletedOfferIds.includes(dbo.id)) {
              store.deletedOfferIds.push(dbo.id);
            }
            relatedOfferIds.push(dbo.id);
          }
        }

        // Deletion cascade in proper foreign key order
        await pub().from("verification_logs").delete().eq("partner_id", pId);
        await pub().from("verification_sessions").delete().eq("partner_id", pId);
        await pub().from("offers").delete().eq("partner_id", pId);
        await pub().from("partners").delete().eq("id", pId);
      }
    } catch (sbErr) {
      console.warn("[PennyGrade] Supabase partner/offers delete sync:", sbErr);
    }
  }

  if (store.auditLogs) {
    store.auditLogs.unshift({
      id: safeRandomUUID(),
      admin_user_id: "admin",
      action: `Deleted Partner: ${partnerName} & ${relatedOfferIds.length} related offers`,
      target_type: "partner",
      target_id: partnerId,
      metadata: { name: partnerName, slug: partnerSlug, deletedOfferCount: relatedOfferIds.length },
      created_at: new Date().toISOString(),
      who: adminWho || "Administrator",
    });
  }

  saveStoreToDisk();
  return { ok: true, deletedOfferIds: relatedOfferIds };
}

// Offer Deletion Logic: permanently removes offer from store and Supabase
export async function deleteOfferCascadeLogic(
  offerId: string,
  adminWho?: string
): Promise<{ ok: boolean }> {
  if (!store.offers) store.offers = new Map();
  if (!store.deletedOfferIds) store.deletedOfferIds = [];

  const offer = store.offers.get(offerId);
  const offerTitle = offer?.title || "Offer";

  if (!store.deletedOfferIds.includes(offerId)) {
    store.deletedOfferIds.push(offerId);
  }

  store.offers.delete(offerId);

  if (store.sessions) {
    for (const [sId, sess] of store.sessions.entries()) {
      if (sess.offer_id === offerId) {
        store.sessions.delete(sId);
      }
    }
  }

  try {
    const { pub } = await import("./public.functions");
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(offerId);
    if (isUuid) {
      await pub().from("verification_logs").delete().eq("offer_id", offerId);
      await pub().from("offers").delete().eq("id", offerId);
    }
  } catch (sbErr) {
    console.warn("[PennyGrade] Supabase offer delete sync:", sbErr);
  }

  if (store.auditLogs) {
    store.auditLogs.unshift({
      id: safeRandomUUID(),
      admin_user_id: "admin",
      action: `Deleted Offer: ${offerTitle}`,
      target_type: "offer",
      target_id: offerId,
      metadata: { title: offerTitle, id: offerId },
      created_at: new Date().toISOString(),
      who: adminWho || "Administrator",
    });
  }

  saveStoreToDisk();
  return { ok: true };
}

// Get Filtered Offers Logic: returns all offers excluding deleted offers and deleted partners
export async function getFilteredOffersLogic(): Promise<V1Offer[]> {
  if (!store.offers) store.offers = new Map();
  if (!store.deletedOfferIds) store.deletedOfferIds = [];
  if (!store.deletedPartnerIds) store.deletedPartnerIds = [];

  const delOfferSet = new Set(store.deletedOfferIds);
  const delPartnerSet = new Set(store.deletedPartnerIds);

  const result: V1Offer[] = [];
  for (const offer of store.offers.values()) {
    if (delOfferSet.has(offer.id) || delPartnerSet.has(offer.partner_id)) {
      continue;
    }
    const partner = store.partners?.get(offer.partner_id);
    result.push({
      ...offer,
      partner: offer.partner || (partner ? { id: partner.id, business_name: partner.business_name, slug: partner.slug } : undefined),
    });
  }

  return result.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

// Synchronize Admin Password Logic after verified Supabase Auth reset
export function syncAdminPasswordAfterSupabaseResetLogic(data: {
  email: string;
  new_password: string;
}): { ok: boolean; message: string } {
  const cleanEmail = data.email.trim().toLowerCase();
  if (!store.adminUsers) store.adminUsers = [];
  let user = store.adminUsers.find((u) => u.email.toLowerCase() === cleanEmail);
  const isPrimaryOwner = cleanEmail === "pennygradebusiness@gmail.com";
  if (!user && isPrimaryOwner) {
    user = {
      id: "admin-primary-owner",
      user_id: "uid-primary-owner",
      full_name: "PennyGrade Business",
      email: "pennygradebusiness@gmail.com",
      role: "super_admin",
      is_password_set: false,
      created_at: new Date().toISOString(),
    };
    store.adminUsers.unshift(user);
  }
  if (user) {
    user.temporary_password = data.new_password;
    user.is_password_set = true;
    saveStoreToDisk();
  }
  return { ok: true, message: "Admin store synchronized." };
}
