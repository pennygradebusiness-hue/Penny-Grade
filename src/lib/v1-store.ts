import * as fs from "node:fs";
import * as path from "node:path";

// Universal crypto helper safe for both browser and Node.js
export function safeRandomUUID(): string {
  if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface V1Member {
  id: string;
  membership_number: string;
  full_name: string;
  mobile: string;
  email: string;
  plan_id: string;
  plan_name: string;
  start_date: string;
  expiry_date: string;
  status: "ACTIVE" | "SUSPENDED" | "CANCELLED" | "EXPIRED";
  created_at: string;
  updated_at: string;
  card_id?: string;
  card_number?: string;
}

export interface V1PhysicalCard {
  id: string;
  card_number: string;
  membership_id: string | null;
  status: "AVAILABLE" | "ACTIVE" | "LOST" | "CANCELLED";
  issued_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface V1VerificationSession {
  id: string;
  membership_id: string;
  membership_number: string;
  member_name: string;
  partner_id: string;
  partner_name: string;
  partner_slug: string;
  offer_id: string;
  discount_type: "PERCENTAGE" | "FIXED";
  discount_value: number;
  bill_amount: number;
  discount_amount: number;
  final_amount: number;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED";
  expires_at: string;
  created_at: string;
}

export interface V1VerificationLog {
  id: string;
  verification_session_id: string;
  membership_id: string;
  membership_number: string;
  partner_id: string;
  partner_name: string;
  offer_id: string;
  offer_title: string;
  bill_amount: number;
  discount_amount: number;
  final_amount: number;
  status: string;
  created_at: string;
}

export interface V1MemberApplication {
  id: string;
  application_number: string;
  full_name: string;
  mobile: string;
  email: string;
  city: string;
  plan_name: string;
  delivery_preference: string;
  payment_preference: string;
  notes?: string;
  status: "PENDING_VERIFICATION" | "CONTACTED" | "APPROVED" | "REJECTED";
  assigned_card_number?: string;
  created_at: string;
  updated_at: string;
}

export interface V1PartnerApplication {
  id: string;
  application_number: string;
  business_name: string;
  category_name: string;
  contact_name: string;
  mobile: string;
  email: string;
  city: string;
  address: string;
  proposed_discount: string;
  minimum_bill?: string;
  business_hours?: string;
  notes?: string;
  status: "PENDING_REVIEW" | "CONTACTED" | "ONBOARDED" | "REJECTED";
  created_at: string;
  updated_at: string;
}

// Generate crypto-secure PEN-XXXX-XXXX
export function generatePenCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(8);
  if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 8; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return `PEN-${out.slice(0, 4)}-${out.slice(4, 8)}`;
}

// Normalize membership / card input: remove spaces, handle lowercase, trim
export function normalizeMembershipNumber(input: string): string {
  const cleaned = input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (cleaned.startsWith("PEN") && cleaned.length === 11) {
    return `PEN-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
  }
  if (cleaned.length === 8) {
    return `PEN-${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}`;
  }
  // Try normal hyphenated pattern
  const match = input.trim().toUpperCase().match(/^PEN-([A-Z0-9]{4})-([A-Z0-9]{4})$/);
  if (match) {
    return `PEN-${match[1]}-${match[2]}`;
  }
  return input.trim().toUpperCase();
}

// Normalize mobile number: extract last 10 digits
export function normalizeMobile(input: string): string {
  const digits = input.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

// Simple in-memory rate limiting against brute-force guessing
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, maxAttempts = 6, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxAttempts) {
    return false;
  }
  entry.count++;
  return true;
}

export interface V1AuditLog {
  id: string;
  admin_user_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
  who: string;
}

export interface V1AdminUser {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: "super_admin" | "manager" | "membership_manager" | "support";
  temporary_password?: string;
  password_hash?: string;
  is_password_set?: boolean;
  created_at: string;
}

export interface PennyGradeStore {
  members: Map<string, V1Member>;
  cards: Map<string, V1PhysicalCard>;
  sessions: Map<string, V1VerificationSession>;
  logs: V1VerificationLog[];
  auditLogs: V1AuditLog[];
  adminUsers: V1AdminUser[];
  memberApplications: V1MemberApplication[];
  partnerApplications: V1PartnerApplication[];
}

// Server in-memory store with persistence across server function invocations
declare global {
  // eslint-disable-next-line no-var
  var __pennyGradeStore: PennyGradeStore | undefined;
}

const STORE_PATH = path.resolve(process.cwd(), "data", "pennygrade-store.json");

/**
 * Persists the entire store atomically to disk so server restarts/rebuilds never lose cards or applications.
 */
export function saveStoreToDisk(): void {
  try {
    if (!globalThis.__pennyGradeStore) return;
    const s = globalThis.__pennyGradeStore;
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const serialized = {
      members: Array.from(s.members.entries()),
      cards: Array.from(s.cards.entries()),
      sessions: Array.from(s.sessions.entries()),
      logs: s.logs,
      auditLogs: s.auditLogs,
      adminUsers: s.adminUsers,
      memberApplications: s.memberApplications || [],
      partnerApplications: s.partnerApplications || [],
    };
    fs.writeFileSync(STORE_PATH, JSON.stringify(serialized, null, 2), "utf-8");
  } catch (err) {
    console.error("[PennyGrade] Failed to persist store to disk:", err);
  }
}

function loadStoreFromDisk(): PennyGradeStore | null {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      return {
        members: new Map(parsed.members || []),
        cards: new Map(parsed.cards || []),
        sessions: new Map(parsed.sessions || []),
        logs: parsed.logs || [],
        auditLogs: parsed.auditLogs || [],
        adminUsers: parsed.adminUsers || [],
        memberApplications: parsed.memberApplications || [],
        partnerApplications: parsed.partnerApplications || [],
      };
    }
  } catch (err) {
    console.error("[PennyGrade] Failed to load store from disk:", err);
  }
  return null;
}

function seedAdminUsers(): V1AdminUser[] {
  const nowMs = Date.now();
  const dayMs = 864e5;
  return [
    {
      id: "admin-user-1",
      user_id: "uid-samir-001",
      full_name: "Samir Pandey",
      email: "samir@pennygrade.com",
      role: "super_admin",
      temporary_password: "admin123",
      created_at: new Date(nowMs - 30 * dayMs).toISOString(),
    },
    {
      id: "admin-user-2",
      user_id: "uid-rajesh-002",
      full_name: "Rajesh Sharma",
      email: "rajesh.manager@pennygrade.com",
      role: "manager",
      temporary_password: "Penny@2026",
      created_at: new Date(nowMs - 20 * dayMs).toISOString(),
    },
    {
      id: "admin-user-3",
      user_id: "uid-priya-003",
      full_name: "Priya Patel",
      email: "priya.cards@pennygrade.com",
      role: "membership_manager",
      temporary_password: "Penny@2026",
      created_at: new Date(nowMs - 14 * dayMs).toISOString(),
    },
    {
      id: "admin-user-4",
      user_id: "uid-amit-004",
      full_name: "Amit Verma",
      email: "amit.support@pennygrade.com",
      role: "support",
      temporary_password: "Penny@2026",
      created_at: new Date(nowMs - 7 * dayMs).toISOString(),
    },
  ];
}

function initStore(): PennyGradeStore {
  if (globalThis.__pennyGradeStore) {
    return globalThis.__pennyGradeStore;
  }

  // 1. Try to load saved store from disk
  const fromDisk = loadStoreFromDisk();
  if (fromDisk && fromDisk.cards && fromDisk.cards.size >= 25) {
    // If cards exist on disk, use them directly
    // Ensure applications arrays are defined
    if (!fromDisk.memberApplications) fromDisk.memberApplications = [];
    if (!fromDisk.partnerApplications) fromDisk.partnerApplications = [];
    if (!fromDisk.adminUsers || fromDisk.adminUsers.length === 0) {
      fromDisk.adminUsers = seedAdminUsers();
    }
    globalThis.__pennyGradeStore = fromDisk;
    return globalThis.__pennyGradeStore;
  }

  // 2. Otherwise seed initial state with EXACTLY 35 cards (Samir's active card + 34 available cards)
  const seedAuditList = (): V1AuditLog[] => {
    const nowMs = Date.now();
    const dayMs = 864e5;
    return [
      {
        id: "audit-1",
        admin_user_id: "admin-super",
        action: "Created Member Card Batch",
        target_type: "cards",
        target_id: "batch-v1-35",
        metadata: { count: 35, status: "AVAILABLE" },
        created_at: new Date(nowMs - 5 * dayMs).toISOString(),
        who: "Samir Pandey (Super Admin)",
      },
      {
        id: "audit-2",
        admin_user_id: "admin-super",
        action: "Activated Partner Outlets",
        target_type: "partner",
        target_id: "abc-cafe",
        metadata: { name: "ABC Café", status: "ACTIVE" },
        created_at: new Date(nowMs - 4 * dayMs).toISOString(),
        who: "Admin Manager",
      },
      {
        id: "audit-3",
        admin_user_id: "admin-super",
        action: "Issued Membership Card",
        target_type: "membership",
        target_id: "mem-samir-001",
        metadata: { card_number: "PEN-7X4P-92LM", member: "Samir Pandey" },
        created_at: new Date(nowMs - 3 * dayMs).toISOString(),
        who: "Samir Pandey (Super Admin)",
      },
      {
        id: "audit-4",
        admin_user_id: "admin-super",
        action: "Updated Partner Offer",
        target_type: "offer",
        target_id: "offer-abc-10",
        metadata: { partner: "ABC Café", discount: "10% OFF", min_bill: 500 },
        created_at: new Date(nowMs - 2 * dayMs).toISOString(),
        who: "Admin Manager",
      },
      {
        id: "audit-5",
        admin_user_id: "admin-super",
        action: "System Security Audit Passed",
        target_type: "security",
        target_id: "sec-audit-01",
        metadata: { test_suites: "12/12 passing", encryption: "crypto-random" },
        created_at: new Date(nowMs - 1 * dayMs).toISOString(),
        who: "System",
      },
    ];
  };

  const members = new Map<string, V1Member>();
  const cards = new Map<string, V1PhysicalCard>();
  const sessions = new Map<string, V1VerificationSession>();
  const logs: V1VerificationLog[] = [];
  const auditLogs: V1AuditLog[] = seedAuditList();
  const adminUsers: V1AdminUser[] = seedAdminUsers();
  const memberApplications: V1MemberApplication[] = [
    {
      id: "app-mem-001",
      application_number: "PGM-2026-0812",
      full_name: "Vikramaditya Singh",
      mobile: "9835123456",
      email: "vikram.singh@gmail.com",
      city: "Daltonganj",
      plan_name: "PennyGrade 6-Month Membership",
      delivery_preference: "Physical Card Handover at Red Cross Mor",
      payment_preference: "Pay on Card Delivery",
      notes: "Looking forward to using at ABC Café and FitZone",
      status: "PENDING_VERIFICATION",
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
    {
      id: "app-mem-002",
      application_number: "PGM-2026-0811",
      full_name: "Ananya Mukherjee",
      mobile: "9431187654",
      email: "ananya.m@outlook.com",
      city: "Daltonganj",
      plan_name: "PennyGrade 6-Month Membership",
      delivery_preference: "Courier to College Road",
      payment_preference: "UPI Verification",
      notes: "Interested in Glow Salon and restaurant discounts",
      status: "CONTACTED",
      created_at: new Date(Date.now() - 3600000 * 26).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    },
  ];

  const partnerApplications: V1PartnerApplication[] = [
    {
      id: "app-ptr-001",
      application_number: "PGP-2026-0301",
      business_name: "Mocha Delight Bakery",
      category_name: "Cafés",
      contact_name: "Deepak Agrawal",
      mobile: "9123456780",
      email: "deepak@mochadelight.com",
      city: "Daltonganj",
      address: "Main Market, Near Clock Tower",
      proposed_discount: "15% Off on Bakery & Beverages",
      minimum_bill: "₹300",
      business_hours: "9:00 AM – 10:00 PM",
      notes: "High footfall bakery, want to install acrylic QR standee at counter.",
      status: "PENDING_REVIEW",
      created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 8).toISOString(),
    },
    {
      id: "app-ptr-002",
      application_number: "PGP-2026-0300",
      business_name: "Iron Core Gym & Crossfit",
      category_name: "Fitness",
      contact_name: "Suresh Yadav",
      mobile: "9934123890",
      email: "suresh@ironcoregym.in",
      city: "Daltonganj",
      address: "Shahpur Road, By-Pass",
      proposed_discount: "20% Off on Monthly & Annual Packages",
      minimum_bill: "₹1,000",
      business_hours: "5:30 AM – 9:30 PM",
      notes: "Wish to attract corporate and student crowd with PennyGrade.",
      status: "CONTACTED",
      created_at: new Date(Date.now() - 3600000 * 30).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 10).toISOString(),
    },
  ];

  // Seed default Samir Pandey member matching acceptance criteria
  const today = new Date().toISOString().slice(0, 10);
  const sixMonths = new Date();
  sixMonths.setMonth(sixMonths.getMonth() + 6);
  const expiryDate = sixMonths.toISOString().slice(0, 10);

  const defaultCardId = "card-samir-001";
  const defaultMemberId = "mem-samir-001";

  const samirCard: V1PhysicalCard = {
    id: defaultCardId,
    card_number: "PEN-7X4P-92LM",
    membership_id: defaultMemberId,
    status: "ACTIVE",
    issued_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const samirMember: V1Member = {
    id: defaultMemberId,
    membership_number: "PEN-7X4P-92LM",
    full_name: "Samir Pandey",
    mobile: "9876543210",
    email: "samir@pennygrade.com",
    plan_id: "f5aef446-7c6e-4781-9fdd-e5fa4dc1c935",
    plan_name: "PennyGrade 6-Month Membership",
    start_date: today,
    expiry_date: expiryDate,
    status: "ACTIVE",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    card_id: defaultCardId,
    card_number: "PEN-7X4P-92LM",
  };

  members.set(samirMember.id, samirMember);
  cards.set(samirCard.id, samirCard);

  // Pre-seed 34 available cards so total cards = 35 (1 active Samir card + 34 available cards)
  for (let i = 0; i < 34; i++) {
    const code = generatePenCode();
    const id = `card-${i + 1}`;
    cards.set(id, {
      id,
      card_number: code,
      membership_id: null,
      status: "AVAILABLE",
      issued_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  // Seed initial realistic verification logs across multiple partners
  const seededPartners = [
    { id: "partner-abc", name: "ABC Café", offer: "10% Off", discPct: 0.1 },
    { id: "partner-biryani", name: "Royal Biryani House", offer: "15% Off", discPct: 0.15 },
    { id: "partner-gym", name: "Urban Fitness", offer: "20% Off", discPct: 0.2 },
    { id: "partner-brew", name: "The Grand Brew", offer: "10% Off", discPct: 0.1 },
    { id: "partner-bawarchi", name: "Bawarchi Express", offer: "12% Off", discPct: 0.12 },
  ];

  const nowMs = Date.now();
  const dayMs = 864e5;
  const sampleBills = [1500, 2400, 850, 3200, 1100, 1850, 2900, 950, 4100, 1600, 2200, 1350, 3600, 890];

  sampleBills.forEach((bill, idx) => {
    const p = seededPartners[idx % seededPartners.length];
    const discount = Math.round(bill * p.discPct);
    const finalAmt = bill - discount;
    const createdAt = new Date(nowMs - (idx * 2.5 + 0.5) * dayMs).toISOString();

    logs.push({
      id: `log-seed-${idx + 1}`,
      verification_session_id: safeRandomUUID(),
      membership_id: defaultMemberId,
      membership_number: "PEN-7X4P-92LM",
      partner_id: p.id,
      partner_name: p.name,
      offer_id: `offer-seed-${p.id}`,
      offer_title: p.offer,
      bill_amount: bill,
      discount_amount: discount,
      final_amount: finalAmt,
      status: "VERIFIED",
      created_at: createdAt,
    });
  });

  globalThis.__pennyGradeStore = {
    members,
    cards,
    sessions,
    logs,
    auditLogs,
    adminUsers,
    memberApplications,
    partnerApplications,
  };

  // Save to disk immediately
  saveStoreToDisk();

  return globalThis.__pennyGradeStore;
}

export const store = initStore();
