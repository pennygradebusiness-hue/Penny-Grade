import { randomInt } from "node:crypto";
import {
  store,
  safeRandomUUID,
  generatePenCode,
  saveStoreToDisk,
  normalizeMembershipNumber,
  normalizeMobile,
  checkRateLimit,
  type V1Member,
  type V1PhysicalCard,
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

  if (!user.temporary_password || !data.current_temporary_password || user.temporary_password !== data.current_temporary_password.trim()) {
    throw new Error("The initial temporary password entered is incorrect.");
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
  const code = randomInt(100000, 1000000).toString();
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
  // Do not log recovery codes; delivery is handled by the Supabase Auth flow.

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

// Partner archive logic: preserve the partner and history while disabling future activity.
export async function archivePartnerLogic(
  partnerId: string,
  adminWho?: string
): Promise<{ ok: boolean; archivedOfferIds: string[] }> {
  if (!store.partners) store.partners = new Map();
  if (!store.offers) store.offers = new Map();

  const partner = store.partners.get(partnerId);
  if (!partner) throw new Error("Partner not found");
  const partnerName = partner.business_name || "Partner";
  const now = new Date().toISOString();
  partner.status = "INACTIVE";
  partner.featured = false;
  partner.updated_at = now;

  const archivedOfferIds: string[] = [];
  for (const offer of store.offers.values()) {
    if (offer.partner_id === partnerId) {
      offer.status = "INACTIVE";
      offer.updated_at = now;
      archivedOfferIds.push(offer.id);
    }
  }

  if (store.auditLogs) {
    store.auditLogs.unshift({
      id: safeRandomUUID(),
      admin_user_id: "admin",
      action: `Archived Partner: ${partnerName}`,
      target_type: "partner",
      target_id: partnerId,
      metadata: { name: partnerName, slug: partner.slug, archivedOfferCount: archivedOfferIds.length },
      created_at: new Date().toISOString(),
      who: adminWho || "Administrator",
    });
  }

  saveStoreToDisk();
  return { ok: true, archivedOfferIds };
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
    const { getServerSupabase } = await import("./supabase-admin.server");
    const sb = getServerSupabase();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(offerId);
    if (isUuid) {
      await sb.from("verification_logs").delete().eq("offer_id", offerId);
      await sb.from("offers").delete().eq("id", offerId);
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

// Generate Card Batch Business Logic
export async function generateCardBatchLogic(
  count: number,
  adminUser: { id: string; full_name?: string; email: string }
): Promise<{ ok: boolean; count: number }> {
  if (!store.cards) store.cards = new Map();
  if (!store.members) store.members = new Map();

  let persistedCount = 0;
  if (process.env.NODE_ENV !== "test") {
    try {
      const { getServerSupabase } = await import("./supabase-admin.server");
      const sb = getServerSupabase();
      const { data: rpcRes, error: rpcErr } = await sb.rpc("generate_physical_cards", {
        p_count: count,
      });
      if (!rpcErr && rpcRes?.ok) {
        persistedCount = rpcRes.count;
      }
    } catch (err) {
      console.warn("[PennyGrade] Database card generation fallback:", err);
    }
  }

  const existingCodes = new Set<string>();
  for (const c of store.cards.values()) {
    existingCodes.add(c.card_number);
  }
  for (const m of store.members.values()) {
    existingCodes.add(m.membership_number);
    if (m.card_number) existingCodes.add(m.card_number);
  }

  const createdCards: string[] = [];
  const now = new Date().toISOString();
  const countToGenerate = persistedCount > 0 ? 0 : count;

  for (let i = 0; i < countToGenerate; i++) {
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

  const totalCreated = persistedCount > 0 ? persistedCount : createdCards.length;

  if (store.auditLogs) {
    store.auditLogs.unshift({
      id: safeRandomUUID(),
      admin_user_id: adminUser.id,
      action: `Generated Batch (${totalCreated} Cards)`,
      target_type: "cards",
      target_id: `batch-${Date.now()}`,
      metadata: { count: totalCreated },
      created_at: now,
      who: adminUser.full_name || adminUser.email,
    });
  }

  saveStoreToDisk();
  return { ok: true, count: totalCreated };
}

// Create Member Business Logic
export async function createMemberLogic(
  data: {
    full_name: string;
    mobile: string;
    email: string;
    plan_id: string;
    start_date: string;
    expiry_date: string;
    card_id?: string;
  },
  adminUser: { id: string; full_name?: string; email: string }
): Promise<{ ok: boolean; id: string; membership_number: string; card_number: string }> {
  if (!store.members) store.members = new Map();
  if (!store.cards) store.cards = new Map();

  let dbCreated: any = null;
  if (process.env.NODE_ENV !== "test") {
    try {
      const { getServerSupabase } = await import("./supabase-admin.server");
      const sb = getServerSupabase();
      const { data: res, error } = await sb.rpc("admin_create_member", {
        p_full_name: data.full_name,
        p_mobile: data.mobile,
        p_email: data.email,
        p_plan_id: data.plan_id,
        p_start_date: data.start_date,
        p_expiry_date: data.expiry_date,
        p_card_id: data.card_id || null,
      });
      if (!error && res?.ok) {
        dbCreated = res;
      }
    } catch (err) {
      console.warn("[PennyGrade] Database member creation fallback:", err);
    }
  }

  const membershipNumber = dbCreated?.membership_number || generatePenCode();
  const memberId = dbCreated?.id || safeRandomUUID();
  const now = new Date().toISOString();

  let assignedCardNumber: string | undefined = dbCreated?.card_number;

  if (!dbCreated) {
    if (data.card_id && store.cards.has(data.card_id)) {
      const card = store.cards.get(data.card_id)!;
      card.membership_id = memberId;
      card.status = "ACTIVE";
      card.issued_at = now;
      card.updated_at = now;
      assignedCardNumber = card.card_number;
    } else {
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
    card_id: (dbCreated?.card_id || data.card_id) || undefined,
    card_number: assignedCardNumber || membershipNumber,
  };

  store.members.set(memberId, member);

  if (store.auditLogs) {
    store.auditLogs.unshift({
      id: safeRandomUUID(),
      admin_user_id: adminUser.id,
      action: "Created Member",
      target_type: "member",
      target_id: memberId,
      metadata: { name: member.full_name, membership_number: member.membership_number },
      created_at: now,
      who: adminUser.full_name || adminUser.email,
    });
  }

  saveStoreToDisk();
  return {
    ok: true,
    id: memberId,
    membership_number: member.membership_number,
    card_number: member.card_number || member.membership_number,
  };
}

// Assign Card To Member Business Logic
export async function assignCardToMemberLogic(
  data: { memberId: string; cardId: string; oldCardStatus?: "LOST" | "CANCELLED" },
  adminUser: { id: string; full_name?: string; email: string }
): Promise<{ ok: boolean; card_number: string }> {
  if (!store.members) store.members = new Map();
  if (!store.cards) store.cards = new Map();

  let dbAssignedCardNumber: string | undefined;
  if (process.env.NODE_ENV !== "test") {
    try {
      const { getServerSupabase } = await import("./supabase-admin.server");
      const sb = getServerSupabase();
      const { data: res, error } = await sb.rpc("admin_assign_card", {
        p_member_id: data.memberId,
        p_card_id: data.cardId,
        p_old_card_status: data.oldCardStatus || "LOST",
      });
      if (!error && res?.ok) {
        dbAssignedCardNumber = res.card_number;
      }
    } catch (err) {
      console.warn("[PennyGrade] Database card assignment fallback:", err);
    }
  }

  const member = store.members.get(data.memberId);
  if (!member && !dbAssignedCardNumber) throw new Error("Member not found");

  const newCard = store.cards.get(data.cardId);
  const now = new Date().toISOString();

  if (member && newCard) {
    if (member.card_id && store.cards.has(member.card_id)) {
      const oldCard = store.cards.get(member.card_id)!;
      oldCard.status = data.oldCardStatus ?? "LOST";
      oldCard.updated_at = now;
    }

    newCard.membership_id = member.id;
    newCard.status = "ACTIVE";
    newCard.issued_at = now;
    newCard.updated_at = now;

    member.card_id = newCard.id;
    member.card_number = newCard.card_number;
    member.updated_at = now;
  }

  const assignedNumber = dbAssignedCardNumber || newCard?.card_number || "";

  if (store.auditLogs) {
    store.auditLogs.unshift({
      id: safeRandomUUID(),
      admin_user_id: adminUser.id,
      action: "Assigned Physical Card",
      target_type: "card",
      target_id: data.cardId,
      metadata: { card_number: assignedNumber, member: member?.full_name },
      created_at: now,
      who: adminUser.full_name || adminUser.email,
    });
  }

  saveStoreToDisk();
  return { ok: true, card_number: assignedNumber };
}

// Get Admin Cards Business Logic
export async function getAdminCardsLogic(): Promise<
  (V1PhysicalCard & { member: string; membership_number: string })[]
> {
  if (!store.cards) store.cards = new Map();
  if (!store.members) store.members = new Map();

  if (process.env.NODE_ENV !== "test") {
    try {
      const { getServerSupabase } = await import("./supabase-admin.server");
      const sb = getServerSupabase();
      const { data: rpcCards, error: rpcErr } = await sb.rpc("get_all_physical_cards");
      if (!rpcErr && Array.isArray(rpcCards) && rpcCards.length > 0) {
        for (const c of rpcCards) {
          if (!store.cards.has(c.id)) {
            store.cards.set(c.id, {
              id: c.id,
              card_number: c.card_number,
              membership_id: c.membership_id,
              status: c.status,
              issued_at: c.issued_at,
              created_at: c.created_at,
              updated_at: c.updated_at,
            });
          }
        }
        return rpcCards;
      }
    } catch {
      // fallback
    }
  }

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
}

// Get Admin Members Business Logic
export async function getAdminMembersLogic(): Promise<V1Member[]> {
  if (!store.members) store.members = new Map();
  if (!store.deletedMemberIds) store.deletedMemberIds = [];

  const delMemberSet = new Set(store.deletedMemberIds);

  if (process.env.NODE_ENV !== "test") {
    try {
      const { getServerSupabase } = await import("./supabase-admin.server");
      const sb = getServerSupabase();
      const { data: rpcMembers, error: rpcErr } = await sb.rpc("get_all_memberships");
      if (!rpcErr && Array.isArray(rpcMembers) && rpcMembers.length > 0) {
        for (const m of rpcMembers) {
          if (!delMemberSet.has(m.id) && !delMemberSet.has(m.membership_number)) {
            store.members.set(m.id, m);
          }
        }
        return rpcMembers.filter((m: any) => !delMemberSet.has(m.id) && !delMemberSet.has(m.membership_number));
      }
    } catch {
      // fallback
    }
  }

  return Array.from(store.members.values())
    .filter((m) => !delMemberSet.has(m.id) && !delMemberSet.has(m.membership_number))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

