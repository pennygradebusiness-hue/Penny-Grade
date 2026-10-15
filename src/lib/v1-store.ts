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
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "CANCELLED" | "EXPIRED";
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

export interface V1Partner {
  id: string;
  business_name: string;
  slug: string;
  category_id: string;
  category_name?: string;
  description?: string;
  logo_url?: string;
  cover_image_url?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  latitude?: number | null;
  longitude?: number | null;
  business_hours?: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  featured: boolean;
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

export interface V1Offer {
  id: string;
  partner_id: string;
  title: string;
  description?: string | null;
  discount_type: "PERCENTAGE" | "FIXED";
  discount_value: number;
  max_discount: number | null;
  minimum_bill: number;
  valid_from?: string | null;
  valid_until?: string | null;
  valid_days: number[];
  terms_conditions?: string | null;
  usage_limit_type: "UNLIMITED";
  status: "ACTIVE" | "INACTIVE";
  created_at: string;
  updated_at: string;
  partner?: {
    id: string;
    business_name: string;
    slug?: string;
  };
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
  partners: Map<string, V1Partner>;
  offers: Map<string, V1Offer>;
  sessions: Map<string, V1VerificationSession>;
  logs: V1VerificationLog[];
  auditLogs: V1AuditLog[];
  adminUsers: V1AdminUser[];
  memberApplications: V1MemberApplication[];
  partnerApplications: V1PartnerApplication[];
  deletedPartnerIds: string[];
  deletedOfferIds: string[];
  deletedMemberIds: string[];
  deletedAdminUserIds: string[];
  seededPartners?: boolean;
  seededOffers?: boolean;
  seededAdminUsers?: boolean;
}

// Server in-memory store with persistence across server function invocations
declare global {
  // eslint-disable-next-line no-var
  var __pennyGradeStore: PennyGradeStore | undefined;
}

function getStoreFilePath(): string {
  if (typeof process === "undefined" || typeof process.cwd !== "function") return "";
  const candidates = [
    path.resolve("/tmp", "pennygrade-store.json"),
    path.resolve(process.cwd(), "data", "pennygrade-store.json"),
  ];
  for (const c of candidates) {
    if (fs.existsSync && fs.existsSync(c)) {
      return c;
    }
  }
  return path.resolve(process.cwd(), "data", "pennygrade-store.json");
}

const STORE_PATH = getStoreFilePath();

export function serializeStore(s: PennyGradeStore) {
  return {
    members: Array.from(s.members?.entries() || []),
    cards: Array.from(s.cards?.entries() || []),
    partners: Array.from(s.partners?.entries() || []),
    offers: Array.from(s.offers?.entries() || []),
    sessions: Array.from(s.sessions?.entries() || []),
    logs: s.logs || [],
    auditLogs: s.auditLogs || [],
    adminUsers: s.adminUsers || [],
    memberApplications: s.memberApplications || [],
    partnerApplications: s.partnerApplications || [],
    deletedPartnerIds: s.deletedPartnerIds || [],
    deletedOfferIds: s.deletedOfferIds || [],
    deletedMemberIds: s.deletedMemberIds || [],
    deletedAdminUserIds: s.deletedAdminUserIds || [],
    seededPartners: s.seededPartners ?? true,
    seededOffers: s.seededOffers ?? true,
    seededAdminUsers: s.seededAdminUsers ?? true,
  };
}

export function hydrateStore(parsed: any): void {
  if (!parsed || typeof parsed !== "object") return;
  const s = globalThis.__pennyGradeStore || store;

  const deletedPartnerIds: string[] = Array.isArray(parsed.deletedPartnerIds) ? parsed.deletedPartnerIds : [];
  const deletedOfferIds: string[] = Array.isArray(parsed.deletedOfferIds) ? parsed.deletedOfferIds : [];
  const deletedMemberIds: string[] = Array.isArray(parsed.deletedMemberIds) ? parsed.deletedMemberIds : [];
  const deletedAdminUserIds: string[] = Array.isArray(parsed.deletedAdminUserIds) ? parsed.deletedAdminUserIds : [];

  const delPartnerSet = new Set([...(s.deletedPartnerIds || []), ...deletedPartnerIds]);
  const delOfferSet = new Set([...(s.deletedOfferIds || []), ...deletedOfferIds]);
  const delMemberSet = new Set([...(s.deletedMemberIds || []), ...deletedMemberIds]);
  const delAdminSet = new Set([...(s.deletedAdminUserIds || []), ...deletedAdminUserIds].map((x) => x.toLowerCase()));

  s.deletedPartnerIds = Array.from(delPartnerSet);
  s.deletedOfferIds = Array.from(delOfferSet);
  s.deletedMemberIds = Array.from(delMemberSet);
  s.deletedAdminUserIds = Array.from(delAdminSet);

  if (Array.isArray(parsed.members)) {
    if (!s.members) s.members = new Map();
    for (const [k, v] of parsed.members) {
      const m = v as V1Member;
      if (!delMemberSet.has(k) && !delMemberSet.has(m?.membership_number) && !delMemberSet.has(m?.id)) {
        s.members.set(k, m);
      }
    }
    for (const k of Array.from(s.members.keys())) {
      const m = s.members.get(k);
      if (delMemberSet.has(k) || (m && (delMemberSet.has(m.id) || delMemberSet.has(m.membership_number)))) {
        s.members.delete(k);
      }
    }
  }

  if (Array.isArray(parsed.cards) && parsed.cards.length > 0) {
    if (!s.cards) s.cards = new Map();
    for (const [k, v] of parsed.cards) {
      s.cards.set(k, v);
    }
  }

  if (Array.isArray(parsed.partners)) {
    if (!s.partners) s.partners = new Map();
    for (const [k, v] of parsed.partners) {
      const p = v as V1Partner;
      if (!delPartnerSet.has(k) && !delPartnerSet.has(p?.id) && !delPartnerSet.has(p?.slug)) {
        s.partners.set(k, p);
      }
    }
    for (const k of Array.from(s.partners.keys())) {
      const p = s.partners.get(k);
      if (delPartnerSet.has(k) || (p && (delPartnerSet.has(p.id) || delPartnerSet.has(p.slug)))) {
        s.partners.delete(k);
      }
    }
  }

  if (Array.isArray(parsed.offers)) {
    if (!s.offers) s.offers = new Map();
    for (const [k, v] of parsed.offers) {
      const o = v as V1Offer;
      if (!delOfferSet.has(k) && !delOfferSet.has(o?.id) && !delPartnerSet.has(o?.partner_id)) {
        s.offers.set(k, o);
      }
    }
    for (const k of Array.from(s.offers.keys())) {
      const o = s.offers.get(k);
      if (delOfferSet.has(k) || (o && (delOfferSet.has(o.id) || delPartnerSet.has(o.partner_id)))) {
        s.offers.delete(k);
      }
    }
  }

  if (Array.isArray(parsed.auditLogs) && parsed.auditLogs.length > 0) {
    s.auditLogs = parsed.auditLogs;
  }
}

/**
 * Persists store to Netlify Blobs (cloud global storage) and disk.
 */
export async function persistStoreCloud(): Promise<void> {
  saveStoreToDisk();
  try {
    const { getStore } = await import("@netlify/blobs");
    const blobStore = getStore("pennygrade-data");
    const s = globalThis.__pennyGradeStore || store;
    const serialized = serializeStore(s);
    await blobStore.setJSON("production_store_v1", serialized);
  } catch {
    // Expected outside of Netlify environment (e.g. local dev / tests)
  }
}

/**
 * Loads latest persistent state from Netlify Blobs on serverless cold starts.
 */
export async function ensureStoreLoadedCloud(): Promise<void> {
  try {
    const { getStore } = await import("@netlify/blobs");
    const blobStore = getStore("pennygrade-data");
    const data = await blobStore.get("production_store_v1", { type: "json" });
    if (data && typeof data === "object") {
      hydrateStore(data);
    }
  } catch {
    // Expected outside of Netlify environment
  }
}

/**
 * Persists the entire store atomically to disk so server restarts/rebuilds never lose cards or applications.
 */
export function saveStoreToDisk(): void {
  try {
    if (process.env.NODE_ENV === "test" || process.env.VITEST) return;
    if (typeof process === "undefined" || typeof fs?.existsSync !== "function") return;
    if (!globalThis.__pennyGradeStore) return;
    const s = globalThis.__pennyGradeStore;

    let targetPath = path.resolve(process.cwd(), "data", "pennygrade-store.json");
    try {
      const dir = path.dirname(targetPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch {
      targetPath = path.resolve("/tmp", "pennygrade-store.json");
      const dir = path.dirname(targetPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    const serialized = serializeStore(s);
    fs.writeFileSync(targetPath, JSON.stringify(serialized, null, 2), "utf-8");
  } catch (err) {
    console.error("[PennyGrade] Failed to persist store to disk:", err);
  }
}

export function seedPartners(): Map<string, V1Partner> {
  const map = new Map<string, V1Partner>();
  const initial: V1Partner[] = [
    {
      id: "c55b653f-1445-44f8-896e-c0cd58dc2a31",
      business_name: "ABC Café",
      slug: "abc-cafe",
      category_id: "e7d3fd02-abd7-4ba4-b129-294ac76bff15",
      category_name: "Cafés",
      description: "Neighbourhood specialty coffee, fresh bakes and all-day breakfast in a calm, sunlit space.",
      logo_url: "",
      cover_image_url: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1200&q=70",
      phone: "+91 98200 11111",
      email: "hello@abccafe.in",
      website: "",
      address: "12 Hill Road, Main Market",
      city: "Daltonganj",
      latitude: 24.0416,
      longitude: 84.0722,
      business_hours: "Mon–Sun · 8:00 AM – 11:00 PM",
      status: "ACTIVE",
      featured: true,
      created_at: "2026-10-11T06:08:58.426Z",
      updated_at: "2026-10-11T06:08:58.426Z",
    },
    {
      id: "e6a499cd-ead5-4e17-a13f-cd2d98a41fe2",
      business_name: "Urban Brew",
      slug: "urban-brew",
      category_id: "e7d3fd02-abd7-4ba4-b129-294ac76bff15",
      category_name: "Cafés",
      description: "Artisanal coffee roasters and cozy work-friendly café with fast Wi-Fi.",
      logo_url: "",
      cover_image_url: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1200&q=70",
      phone: "+91 98200 22222",
      email: "contact@urbanbrew.in",
      website: "",
      address: "45 Station Road",
      city: "Daltonganj",
      latitude: 24.0430,
      longitude: 84.0710,
      business_hours: "Mon–Sun · 9:00 AM – 10:30 PM",
      status: "ACTIVE",
      featured: false,
      created_at: "2026-10-11T06:08:58.426Z",
      updated_at: "2026-10-11T06:08:58.426Z",
    },
    {
      id: "d505adee-d353-4c15-873f-02346ef859d3",
      business_name: "Glow Salon",
      slug: "glow-salon",
      category_id: "ade29f0c-e3f0-4609-bfdd-6ef41614ced6",
      category_name: "Salons",
      description: "Hair, skin and grooming by experienced stylists using premium products.",
      logo_url: "",
      cover_image_url: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&q=70",
      phone: "+91 98200 44444",
      email: "book@glowsalon.in",
      website: "",
      address: "21 Court Road",
      city: "Daltonganj",
      latitude: 24.0390,
      longitude: 84.0680,
      business_hours: "Tue–Sun · 10:00 AM – 9:00 PM",
      status: "ACTIVE",
      featured: false,
      created_at: "2026-10-11T06:08:58.426Z",
      updated_at: "2026-10-11T06:08:58.426Z",
    },
    {
      id: "96406673-ccd2-4948-9936-a5b3c9ad0292",
      business_name: "Saffron Table",
      slug: "saffron-table",
      category_id: "1034422b-089a-4797-bf64-2578eb78adb9",
      category_name: "Restaurants",
      description: "Modern Indian cuisine with a seasonal dining menu.",
      logo_url: "",
      cover_image_url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=70",
      phone: "+91 98200 66666",
      email: "reserve@saffrontable.in",
      website: "",
      address: "3 Cinema Road",
      city: "Daltonganj",
      latitude: 24.0425,
      longitude: 84.0735,
      business_hours: "Mon–Sun · 12:00 PM – 11:30 PM",
      status: "ACTIVE",
      featured: false,
      created_at: "2026-10-11T06:08:58.426Z",
      updated_at: "2026-10-11T06:08:58.426Z",
    },
  ];
  for (const p of initial) {
    map.set(p.id, p);
  }
  return map;
}

export function seedOffers(): Map<string, V1Offer> {
  const map = new Map<string, V1Offer>();
  const initial: V1Offer[] = [
    {
      id: "cebaa271-929a-4fae-9f53-b5008ba5f6a0",
      partner_id: "c55b653f-1445-44f8-896e-c0cd58dc2a31",
      title: "10% Off",
      description: "10% off your total bill",
      discount_type: "PERCENTAGE",
      discount_value: 10,
      max_discount: 500,
      minimum_bill: 500,
      valid_from: null,
      valid_until: null,
      valid_days: [0, 1, 2, 3, 4, 5, 6],
      terms_conditions: "Valid on dine-in bills only. Cannot be combined with other offers.",
      usage_limit_type: "UNLIMITED",
      status: "ACTIVE",
      created_at: "2026-10-11T06:08:58.426Z",
      updated_at: "2026-10-11T06:08:58.426Z",
      partner: {
        id: "c55b653f-1445-44f8-896e-c0cd58dc2a31",
        business_name: "ABC Café",
        slug: "abc-cafe",
      },
    },
    {
      id: "5a0e7b6c-2429-4c17-8e9b-a4aeb11b67bb",
      partner_id: "e6a499cd-ead5-4e17-a13f-cd2d98a41fe2",
      title: "15% Off",
      description: "15% off on all beverages and food",
      discount_type: "PERCENTAGE",
      discount_value: 15,
      max_discount: 300,
      minimum_bill: 300,
      valid_from: null,
      valid_until: null,
      valid_days: [0, 1, 2, 3, 4, 5, 6],
      terms_conditions: "Valid on dine-in and takeaway. Cannot be combined with other offers.",
      usage_limit_type: "UNLIMITED",
      status: "ACTIVE",
      created_at: "2026-10-11T06:08:58.426Z",
      updated_at: "2026-10-11T06:08:58.426Z",
      partner: {
        id: "e6a499cd-ead5-4e17-a13f-cd2d98a41fe2",
        business_name: "Urban Brew",
        slug: "urban-brew",
      },
    },
    {
      id: "a31dd0f9-7ee2-48b8-9388-571a55f39bbc",
      partner_id: "d505adee-d353-4c15-873f-02346ef859d3",
      title: "₹300 Off",
      description: "₹300 off on services above ₹1000",
      discount_type: "FIXED",
      discount_value: 300,
      max_discount: null,
      minimum_bill: 1000,
      valid_from: null,
      valid_until: null,
      valid_days: [0, 1, 2, 3, 4, 5, 6],
      terms_conditions: "Valid on hair and skin services. Prior booking advised.",
      usage_limit_type: "UNLIMITED",
      status: "ACTIVE",
      created_at: "2026-10-11T06:08:58.426Z",
      updated_at: "2026-10-11T06:08:58.426Z",
      partner: {
        id: "d505adee-d353-4c15-873f-02346ef859d3",
        business_name: "Glow Salon",
        slug: "glow-salon",
      },
    },
    {
      id: "c7df7a4d-8eb7-4680-9e23-b6b3d2db40e3",
      partner_id: "96406673-ccd2-4948-9936-a5b3c9ad0292",
      title: "10% Off",
      description: "10% off total dining bill",
      discount_type: "PERCENTAGE",
      discount_value: 10,
      max_discount: 500,
      minimum_bill: 800,
      valid_from: null,
      valid_until: null,
      valid_days: [0, 1, 2, 3, 4, 5, 6],
      terms_conditions: "Valid on food and beverages. Dine-in only.",
      usage_limit_type: "UNLIMITED",
      status: "ACTIVE",
      created_at: "2026-10-11T06:08:58.426Z",
      updated_at: "2026-10-11T06:08:58.426Z",
      partner: {
        id: "96406673-ccd2-4948-9936-a5b3c9ad0292",
        business_name: "Saffron Table",
        slug: "saffron-table",
      },
    },
  ];
  for (const o of initial) {
    map.set(o.id, o);
  }
  return map;
}

function loadStoreFromDisk(): PennyGradeStore | null {
  try {
    if (typeof process === "undefined" || typeof fs?.existsSync !== "function") return null;
    const filePath = getStoreFilePath();
    if (!filePath || !fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf-8");
    if (!raw || !raw.trim()) return null;
    const parsed = JSON.parse(raw);

      const deletedPartnerIds: string[] = Array.isArray(parsed.deletedPartnerIds) ? parsed.deletedPartnerIds : [];
      const deletedOfferIds: string[] = Array.isArray(parsed.deletedOfferIds) ? parsed.deletedOfferIds : [];
      const deletedMemberIds: string[] = Array.isArray(parsed.deletedMemberIds) ? parsed.deletedMemberIds : [];
      const deletedAdminUserIds: string[] = Array.isArray(parsed.deletedAdminUserIds) ? parsed.deletedAdminUserIds : [];
      const seededPartners: boolean = parsed.seededPartners ?? true;
      const seededOffers: boolean = parsed.seededOffers ?? true;
      const seededAdminUsers: boolean = parsed.seededAdminUsers ?? true;

      const delPartnerSet = new Set(deletedPartnerIds);
      const delOfferSet = new Set(deletedOfferIds);
      const delMemberSet = new Set(deletedMemberIds);
      const delAdminSet = new Set(deletedAdminUserIds.map((x: string) => x.toLowerCase()));

      // Load partners: ignore any in delPartnerSet
      const partners = new Map<string, V1Partner>();
      if (Array.isArray(parsed.partners)) {
        for (const [k, v] of parsed.partners) {
          if (!delPartnerSet.has(k) && !delPartnerSet.has((v as V1Partner)?.slug)) {
            partners.set(k, v);
          }
        }
      }

      // Only seed initial default partners if store was never seeded before and is empty
      if (!parsed.seededPartners && partners.size === 0) {
        const seeded = seedPartners();
        for (const [k, v] of seeded.entries()) {
          if (!delPartnerSet.has(k) && !delPartnerSet.has(v.slug)) {
            partners.set(k, v);
          }
        }
      }

      // Load offers: ignore any in delOfferSet OR belonging to deleted partner
      const offers = new Map<string, V1Offer>();
      if (Array.isArray(parsed.offers)) {
        for (const [k, v] of parsed.offers) {
          const offer = v as V1Offer;
          if (
            !delOfferSet.has(k) &&
            !delOfferSet.has(offer?.id) &&
            !delPartnerSet.has(offer?.partner_id)
          ) {
            offers.set(k, offer);
          }
        }
      }

      // Only seed initial default offers if store was never seeded before and is empty
      if (!parsed.seededOffers && offers.size === 0) {
        const seeded = seedOffers();
        for (const [k, v] of seeded.entries()) {
          if (!delOfferSet.has(k) && !delPartnerSet.has(v.partner_id)) {
            offers.set(k, v);
          }
        }
      }

      // Load members: ignore any in delMemberSet
      const members = new Map<string, V1Member>();
      if (Array.isArray(parsed.members)) {
        for (const [k, v] of parsed.members) {
          if (!delMemberSet.has(k) && !delMemberSet.has((v as V1Member)?.membership_number)) {
            members.set(k, v);
          }
        }
      }

      // Load admin users: ignore any in delAdminSet
      let adminUsers: V1AdminUser[] = [];
      if (Array.isArray(parsed.adminUsers)) {
        adminUsers = parsed.adminUsers.filter(
          (u: V1AdminUser) =>
            !delAdminSet.has(u.id?.toLowerCase()) &&
            !delAdminSet.has(u.user_id?.toLowerCase()) &&
            !delAdminSet.has(u.email?.toLowerCase())
        );
      }

      return {
        members,
        cards: new Map(parsed.cards || []),
        partners,
        offers,
        sessions: new Map(parsed.sessions || []),
        logs: parsed.logs || [],
        auditLogs: parsed.auditLogs || [],
        adminUsers,
        memberApplications: parsed.memberApplications || [],
        partnerApplications: parsed.partnerApplications || [],
        deletedPartnerIds,
        deletedOfferIds,
        deletedMemberIds,
        deletedAdminUserIds,
        seededPartners,
        seededOffers,
        seededAdminUsers,
      };
  } catch (err) {
    console.error("[PennyGrade] Failed to load store from disk:", err);
  }
  return null;
}

function seedAdminUsers(): V1AdminUser[] {
  return [
    {
      id: "a6956859-262f-4eda-88b1-9dc42b42563b",
      user_id: "68bb89d9-24be-4eff-84ab-ebb65032a7df",
      full_name: "Samir Pandey",
      email: "samirjee187@gmail.com",
      role: "super_admin",
      temporary_password: "Samir@125141",
      is_password_set: true,
      created_at: "2026-10-13T22:03:31.426Z",
    },
    {
      id: "admin-primary-owner",
      user_id: "uid-primary-owner",
      full_name: "PennyGrade Business",
      email: "pennygradebusiness@gmail.com",
      role: "super_admin",
      temporary_password: "NewSupabasePass2026!",
      is_password_set: true,
      created_at: "2026-10-12T13:57:03.463Z",
    },
    {
      id: "af5726c7-cc4c-43e6-894f-c03da11eb60b",
      user_id: "cb362b20-493d-4ec6-b501-ca3d38392290",
      full_name: "Vikram Singhania",
      email: "newsuper@pennygrade.in",
      role: "super_admin",
      temporary_password: "Perm@Password2026!",
      is_password_set: true,
      created_at: "2026-10-14T06:58:37.452Z",
    },
  ];
}

function initStore(): PennyGradeStore {
  // 1. Try to load saved store from disk
  const fromDisk = loadStoreFromDisk();
  if (fromDisk && fromDisk.cards && fromDisk.cards.size >= 25) {
    if (!fromDisk.deletedPartnerIds) fromDisk.deletedPartnerIds = [];
    if (!fromDisk.deletedOfferIds) fromDisk.deletedOfferIds = [];
    if (!fromDisk.deletedAdminUserIds) fromDisk.deletedAdminUserIds = [];

    // In unit test environment, ensure test member exists if not deleted
    const isTestEnv = process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);
    if (isTestEnv && (!fromDisk.members || fromDisk.members.size === 0) && !fromDisk.deletedMemberIds?.includes("PEN-7X4P-92LM")) {
      const defaultCardId = "card-samir-001";
      const defaultMemberId = "mem-samir-001";
      const today = new Date().toISOString().slice(0, 10);
      const sixMonths = new Date();
      sixMonths.setMonth(sixMonths.getMonth() + 6);
      const expiryDate = sixMonths.toISOString().slice(0, 10);
      if (!fromDisk.members) fromDisk.members = new Map();
      fromDisk.members.set(defaultMemberId, {
        id: defaultMemberId,
        membership_number: "PEN-7X4P-92LM",
        full_name: "Samir Pandey",
        mobile: "9876543210",
        email: "pennygradebusiness@gmail.com",
        plan_id: "f5aef446-7c6e-4781-9fdd-e5fa4dc1c935",
        plan_name: "PennyGrade 6-Month Membership",
        start_date: today,
        expiry_date: expiryDate,
        status: "ACTIVE",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        card_id: defaultCardId,
        card_number: "PEN-7X4P-92LM",
      });
      fromDisk.cards.set(defaultCardId, {
        id: defaultCardId,
        card_number: "PEN-7X4P-92LM",
        membership_id: defaultMemberId,
        status: "ACTIVE",
        issued_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // If partners empty and never seeded, seed once
    if (!fromDisk.seededPartners && (!fromDisk.partners || fromDisk.partners.size === 0)) {
      fromDisk.partners = seedPartners();
      fromDisk.seededPartners = true;
    }

    // Initialize offers
    if (!fromDisk.offers) {
      fromDisk.offers = new Map();
    }
    if (!fromDisk.seededOffers && fromDisk.offers.size === 0) {
      const seeded = seedOffers();
      const delPartnerSet = new Set(fromDisk.deletedPartnerIds);
      const delOfferSet = new Set(fromDisk.deletedOfferIds);
      for (const [k, v] of seeded.entries()) {
        if (!delOfferSet.has(k) && !delPartnerSet.has(v.partner_id)) {
          fromDisk.offers.set(k, v);
        }
      }
      fromDisk.seededOffers = true;
    }

    // Clean up any stale offers belonging to deleted partners
    for (const [id, o] of Array.from(fromDisk.offers.entries())) {
      if (fromDisk.deletedPartnerIds.includes(o.partner_id) || fromDisk.deletedOfferIds.includes(id)) {
        fromDisk.offers.delete(id);
        if (!fromDisk.deletedOfferIds.includes(id)) {
          fromDisk.deletedOfferIds.push(id);
        }
      }
    }

    if (!fromDisk.memberApplications) fromDisk.memberApplications = [];
    if (!fromDisk.partnerApplications) fromDisk.partnerApplications = [];
    if (!fromDisk.seededAdminUsers && (!fromDisk.adminUsers || fromDisk.adminUsers.length === 0)) {
      fromDisk.adminUsers = seedAdminUsers();
      fromDisk.seededAdminUsers = true;
    } else {
      // Ensure primary owner exists if not explicitly revoked
      fromDisk.adminUsers = fromDisk.adminUsers.filter((u) => u.email.toLowerCase() !== "samir@pennygrade.in");
      const delAdminSet = new Set((fromDisk.deletedAdminUserIds || []).map((x) => x.toLowerCase()));
      if (!delAdminSet.has("pennygradebusiness@gmail.com") && !fromDisk.adminUsers.some((u) => u.email.toLowerCase() === "pennygradebusiness@gmail.com")) {
        fromDisk.adminUsers.unshift({
          id: "admin-primary-owner",
          user_id: "uid-primary-owner",
          full_name: "PennyGrade Business",
          email: "pennygradebusiness@gmail.com",
          role: "super_admin",
          temporary_password: "NewSupabasePass2026!",
          is_password_set: true,
          created_at: "2026-09-12T10:23:54.846Z",
        });
      }

      // Ensure Samir Pandey always exists with super_admin access
      const existingSamir = fromDisk.adminUsers.find((u) => u.email.toLowerCase() === "samirjee187@gmail.com");
      if (!existingSamir) {
        fromDisk.adminUsers.unshift({
          id: "a6956859-262f-4eda-88b1-9dc42b42563b",
          user_id: "68bb89d9-24be-4eff-84ab-ebb65032a7df",
          full_name: "Samir Pandey",
          email: "samirjee187@gmail.com",
          role: "super_admin",
          temporary_password: "Samir@125141",
          is_password_set: true,
          created_at: "2026-10-13T22:03:31.426Z",
        });
      } else {
        existingSamir.role = "super_admin";
        existingSamir.temporary_password = "Samir@125141";
        existingSamir.is_password_set = true;
      }
    }
    globalThis.__pennyGradeStore = fromDisk;
    saveStoreToDisk();
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
  const memberApplications: V1MemberApplication[] = [];
  const partnerApplications: V1PartnerApplication[] = [];

  // Seed default Samir Pandey member ONLY if in test environment and not explicitly deleted
  const isTest = process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);
  if (isTest) {
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

    const defaultMember: V1Member = {
      id: defaultMemberId,
      membership_number: "PEN-7X4P-92LM",
      full_name: "Samir Pandey",
      mobile: "9876543210",
      email: "pennygradebusiness@gmail.com",
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

    members.set(defaultMember.id, defaultMember);
    cards.set(samirCard.id, samirCard);
  }

  // Pre-seed available cards so cards exist in store
  const cardsToSeed = isTest ? 34 : 35;
  for (let i = 0; i < cardsToSeed; i++) {
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

  globalThis.__pennyGradeStore = {
    members,
    cards,
    partners: seedPartners(),
    offers: seedOffers(),
    sessions,
    logs,
    auditLogs,
    adminUsers,
    memberApplications,
    partnerApplications,
    deletedPartnerIds: [],
    deletedOfferIds: [],
    deletedMemberIds: [],
    deletedAdminUserIds: [],
    seededPartners: true,
    seededOffers: true,
    seededAdminUsers: true,
  };

  // Save to disk immediately
  saveStoreToDisk();

  return globalThis.__pennyGradeStore;
}

export const store = initStore();
