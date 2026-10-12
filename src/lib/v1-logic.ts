import {
  store,
  safeRandomUUID,
  saveStoreToDisk,
  normalizeMembershipNumber,
  normalizeMobile,
  checkRateLimit,
  type V1Member,
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
    if (cleanEmail === "admin@pennygrade.com" && data.password === "admin123") {
      return {
        ok: true,
        user: {
          id: "super-admin-01",
          user_id: "uid-super-01",
          email: "admin@pennygrade.com",
          full_name: "Primary Administrator",
          role: "super_admin",
        },
      };
    }
    return { ok: false, message: "No administrator account found with this email." };
  }

  const expectedPass = user.temporary_password || (user.role === "super_admin" ? "admin123" : "Penny@2026");
  if (data.password !== expectedPass) {
    return { ok: false, message: "Incorrect password for this administrator account." };
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
