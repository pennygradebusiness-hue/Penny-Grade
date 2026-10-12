import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
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

function pub() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

const PARTNER_COLS =
  "id,business_name,slug,description,logo_url,cover_image_url,phone,email,website,address,city,latitude,longitude,business_hours,featured,category:categories(id,name,slug)";
const OFFER_COLS =
  "id,title,description,discount_type,discount_value,max_discount,minimum_bill,valid_from,valid_until,valid_days,terms_conditions,usage_limit_type";

export type PublicOffer = {
  id: string; title: string; description: string | null;
  discount_type: "PERCENTAGE" | "FIXED"; discount_value: number; max_discount: number | null;
  minimum_bill: number; valid_from: string | null; valid_until: string | null; valid_days: number[];
  terms_conditions: string | null; usage_limit_type: string;
};
export type PublicPartner = {
  id: string; business_name: string; slug: string; description: string | null;
  logo_url: string | null; cover_image_url: string | null; phone: string | null; email: string | null;
  website: string | null; address: string | null; city: string | null;
  latitude: number | null; longitude: number | null; business_hours: string | null; featured: boolean;
  category: { id: string; name: string; slug: string } | null;
  offers: PublicOffer[];
};
export type PublicCategory = { id: string; name: string; slug: string; icon: string | null; sort_order: number };

function currentOffers(offers: PublicOffer[]) {
  const today = new Date().toISOString().slice(0, 10);
  return offers.filter((o) => (!o.valid_from || o.valid_from <= today) && (!o.valid_until || o.valid_until >= today));
}

export const getCategories = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await pub().from("categories").select("id,name,slug,icon,sort_order").order("sort_order");
  if (error) { console.error(error); return [] as PublicCategory[]; }
  return data as PublicCategory[];
});

export const getPartners = createServerFn({ method: "GET" }).handler(async () => {
  // Fetch existing offers from Supabase if available to attach
  const dbOffersMap = new Map<string, PublicOffer[]>();
  try {
    const { data: dbPartners } = await pub()
      .from("partners")
      .select(`id,slug,offers(${OFFER_COLS})`);
    if (dbPartners) {
      for (const p of dbPartners) {
        if (p.offers && p.offers.length > 0) {
          dbOffersMap.set(p.id, p.offers as unknown as PublicOffer[]);
          dbOffersMap.set(p.slug, p.offers as unknown as PublicOffer[]);
        }
      }
    }
  } catch {
    // ignore
  }

  if (store.partners && store.partners.size > 0) {
    const activePartners = Array.from(store.partners.values())
      .filter((p) => p.status === "ACTIVE")
      .sort((a, b) => {
        if (a.featured !== b.featured) return a.featured ? -1 : 1;
        return a.business_name.localeCompare(b.business_name);
      });

    return activePartners.map((p) => {
      const offers = dbOffersMap.get(p.id) || dbOffersMap.get(p.slug) || [
        {
          id: `offer-${p.id}`,
          title: "10% Off",
          description: "Exclusive discount with PennyGrade membership",
          discount_type: "PERCENTAGE" as const,
          discount_value: 10,
          max_discount: 500,
          minimum_bill: 300,
          valid_from: null,
          valid_until: null,
          valid_days: [0, 1, 2, 3, 4, 5, 6],
          terms_conditions: "Valid on presentation of active PennyGrade membership.",
          usage_limit_type: "UNLIMITED",
        },
      ];

      return {
        id: p.id,
        business_name: p.business_name,
        slug: p.slug,
        description: p.description || null,
        logo_url: p.logo_url || null,
        cover_image_url: p.cover_image_url || null,
        phone: p.phone || null,
        email: p.email || null,
        website: p.website || null,
        address: p.address || null,
        city: p.city || "Daltonganj",
        latitude: p.latitude ?? null,
        longitude: p.longitude ?? null,
        business_hours: p.business_hours || null,
        featured: p.featured,
        category: {
          id: p.category_id,
          name: p.category_name || "General",
          slug: (p.category_name || "general").toLowerCase().replace(/\s+/g, "-"),
        },
        offers: currentOffers(offers),
      };
    });
  }

  const { data, error } = await pub()
    .from("partners")
    .select(`${PARTNER_COLS},offers(${OFFER_COLS})`)
    .order("featured", { ascending: false })
    .order("business_name");
  if (error) { console.error(error); return [] as PublicPartner[]; }
  return (data as unknown as PublicPartner[]).map((p) => ({ ...p, offers: currentOffers(p.offers ?? []) }));
});

export const getPartner = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => z.object({ slug: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data }) => {
    if (store.partners && store.partners.size > 0) {
      for (const p of store.partners.values()) {
        if (p.slug === data.slug && p.status === "ACTIVE") {
          let offers: PublicOffer[] = [];
          try {
            const { data: dbP } = await pub()
              .from("partners")
              .select(`offers(${OFFER_COLS})`)
              .eq("slug", data.slug)
              .maybeSingle();
            if (dbP?.offers) offers = dbP.offers as unknown as PublicOffer[];
          } catch {
            // ignore
          }

          if (offers.length === 0) {
            offers = [
              {
                id: `offer-${p.id}`,
                title: "10% Off",
                description: "Exclusive discount with PennyGrade membership",
                discount_type: "PERCENTAGE" as const,
                discount_value: 10,
                max_discount: 500,
                minimum_bill: 300,
                valid_from: null,
                valid_until: null,
                valid_days: [0, 1, 2, 3, 4, 5, 6],
                terms_conditions: "Valid on presentation of active PennyGrade membership.",
                usage_limit_type: "UNLIMITED",
              },
            ];
          }

          return {
            id: p.id,
            business_name: p.business_name,
            slug: p.slug,
            description: p.description || null,
            logo_url: p.logo_url || null,
            cover_image_url: p.cover_image_url || null,
            phone: p.phone || null,
            email: p.email || null,
            website: p.website || null,
            address: p.address || null,
            city: p.city || "Daltonganj",
            latitude: p.latitude ?? null,
            longitude: p.longitude ?? null,
            business_hours: p.business_hours || null,
            featured: p.featured,
            category: {
              id: p.category_id,
              name: p.category_name || "General",
              slug: (p.category_name || "general").toLowerCase().replace(/\s+/g, "-"),
            },
            offers: currentOffers(offers),
          };
        }
      }
    }

    const { data: p, error } = await pub()
      .from("partners")
      .select(`${PARTNER_COLS},offers(${OFFER_COLS})`)
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) console.error(error);
    if (!p) return null;
    const partner = p as unknown as PublicPartner;
    return { ...partner, offers: currentOffers(partner.offers ?? []) };
  });

// --- PENNYGRADE V1 VERIFICATION FUNCTIONS ---

// Helper to look up member by membership number or card number
function findActiveMember(inputNumber: string): V1Member | null {
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

// 1. Verify membership number (server-side, generic errors, rate limited)
export const verifyMemberInput = createServerFn({ method: "POST" })
  .inputValidator((d: { membershipNumber: string }) =>
    z.object({ membershipNumber: z.string().min(3).max(30) }).parse(d)
  )
  .handler(async ({ data }) => {
    const ipKey = `verify-mem-${data.membershipNumber.slice(0, 8)}`;
    if (!checkRateLimit(ipKey, 10, 60_000)) {
      return {
        ok: false,
        message: "Too many verification attempts. Please wait a minute and try again.",
      };
    }

    const member = findActiveMember(data.membershipNumber);
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
  });

// 2. Create unauthenticated verification session (server-side calculation only)
export const createPublicVerification = createServerFn({ method: "POST" })
  .inputValidator((d: { partnerSlug: string; membershipNumber: string; billAmount: number }) =>
    z.object({
      partnerSlug: z.string().min(1).max(120),
      membershipNumber: z.string().min(3).max(30),
      billAmount: z.number().positive().max(10_000_000),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const rateKey = `create-verif-${data.partnerSlug}`;
    if (!checkRateLimit(rateKey, 12, 60_000)) {
      return {
        ok: false,
        message: "Too many verification attempts. Please wait a minute and try again.",
      };
    }

    const member = findActiveMember(data.membershipNumber);
    if (!member) {
      return {
        ok: false,
        message: "Unable to verify membership. Please check your membership number and try again.",
      };
    }

    // Retrieve partner from Supabase
    const { data: p, error: pErr } = await pub()
      .from("partners")
      .select(`${PARTNER_COLS},offers(${OFFER_COLS})`)
      .eq("slug", data.partnerSlug)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (pErr || !p) {
      return {
        ok: false,
        message: "This PennyGrade partner could not be found.",
      };
    }

    const today = new Date().toISOString().slice(0, 10);
    // India time day-of-week 0 (Sun) - 6 (Sat)
    const dow = new Date().getDay();

    const offers = (p.offers ?? []) as PublicOffer[];
    const activeOffer = offers.find(
      (o) =>
        (!o.valid_from || o.valid_from <= today) &&
        (!o.valid_until || o.valid_until >= today)
    );

    if (!activeOffer) {
      return {
        ok: false,
        message: "This offer is currently unavailable.",
      };
    }

    if (activeOffer.valid_days && !activeOffer.valid_days.includes(dow)) {
      return {
        ok: false,
        message: "This offer is not valid today.",
      };
    }

    const bill = Math.round(data.billAmount * 100) / 100;
    if (activeOffer.minimum_bill && bill < activeOffer.minimum_bill) {
      return {
        ok: false,
        message: `This offer requires a minimum bill of ₹${activeOffer.minimum_bill.toLocaleString("en-IN")}.`,
      };
    }

    // SERVER-SIDE DISCOUNT CALCULATION
    let discount = 0;
    if (activeOffer.discount_type === "PERCENTAGE") {
      discount = Math.round((bill * activeOffer.discount_value) / 100 * 100) / 100;
    } else {
      discount = activeOffer.discount_value;
    }

    if (activeOffer.max_discount && discount > activeOffer.max_discount) {
      discount = activeOffer.max_discount;
    }

    if (discount > bill) {
      discount = bill;
    }

    const finalAmount = Math.max(0, Math.round((bill - discount) * 100) / 100);
    const sessionId = safeRandomUUID();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes validity
    const createdAt = new Date().toISOString();

    const session: V1VerificationSession = {
      id: sessionId,
      membership_id: member.id,
      membership_number: member.membership_number,
      member_name: member.full_name,
      partner_id: p.id,
      partner_name: p.business_name,
      partner_slug: p.slug,
      offer_id: activeOffer.id,
      discount_type: activeOffer.discount_type,
      discount_value: activeOffer.discount_value,
      bill_amount: bill,
      discount_amount: discount,
      final_amount: finalAmount,
      status: "ACTIVE",
      expires_at: expiresAt,
      created_at: createdAt,
    };

    const log: V1VerificationLog = {
      id: safeRandomUUID(),
      verification_session_id: sessionId,
      membership_id: member.id,
      membership_number: member.membership_number,
      partner_id: p.id,
      partner_name: p.business_name,
      offer_id: activeOffer.id,
      offer_title: activeOffer.title,
      bill_amount: bill,
      discount_amount: discount,
      final_amount: finalAmount,
      status: "VERIFIED",
      created_at: createdAt,
    };

    store.sessions.set(sessionId, session);
    store.logs.unshift(log);

    return {
      ok: true,
      session_id: sessionId,
    };
  });

// 3. Get live verification session data (publicly readable for live display, sanitized)
export const getPublicVerificationSession = createServerFn({ method: "GET" })
  .inputValidator((d: { sessionId: string }) =>
    z.object({ sessionId: z.string().uuid() }).parse(d)
  )
  .handler(async ({ data }) => {
    const s = store.sessions.get(data.sessionId);
    if (!s) return null;

    // Check expiry
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
  });

// 4. Public customer history lookup (Membership Number + Registered Mobile)
export const getPublicCustomerHistory = createServerFn({ method: "POST" })
  .inputValidator((d: { membershipNumber: string; mobile: string }) =>
    z.object({
      membershipNumber: z.string().min(3).max(30),
      mobile: z.string().min(8).max(16),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const rateKey = `hist-${data.membershipNumber.slice(0, 8)}`;
    if (!checkRateLimit(rateKey, 8, 60_000)) {
      return {
        ok: false,
        message: "Too many lookup attempts. Please wait a minute and try again.",
      };
    }

    const normalizedNum = normalizeMembershipNumber(data.membershipNumber);
    const normalizedMob = normalizeMobile(data.mobile);

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

    // Find verifications for this member
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
  });
