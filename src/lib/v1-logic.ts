import {
  store,
  safeRandomUUID,
  normalizeMembershipNumber,
  normalizeMobile,
  checkRateLimit,
  type V1Member,
  type V1VerificationSession,
  type V1VerificationLog,
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
    if (m.membership_number === normalizedNum) {
      if (normalizeMobile(m.mobile) === normalizedMob) {
        foundMember = m;
      }
      break;
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
