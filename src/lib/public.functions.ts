import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { getRealtimeTransport } from "./config";
import { getServiceRoleClient } from "./supabase-admin.server";
import {
  store,
  normalizeMembershipNumber,
  normalizeMobile,
  checkRateLimit,
  type V1Member,
} from "./v1-store";

export function pub() {
  const projectId =
    process.env.SUPABASE_PROJECT_ID ||
    process.env.VITE_SUPABASE_PROJECT_ID ||
    (typeof import.meta !== "undefined" && import.meta.env?.["VITE_SUPABASE_PROJECT_ID"]);

  const url =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    (typeof import.meta !== "undefined" && import.meta.env?.["VITE_SUPABASE_URL"]) ||
    (projectId ? `https://${projectId}.supabase.co` : undefined) ||
    "https://placeholder.supabase.co";

  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    (typeof import.meta !== "undefined" && import.meta.env?.["VITE_SUPABASE_PUBLISHABLE_KEY"]) ||
    "placeholder-key";

  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    realtime: {
      transport: getRealtimeTransport(),
    },
  });
}

const DEFAULT_CATEGORIES: PublicCategory[] = [
  { id: "cat-dining", name: "Dining & Cafés", slug: "dining", icon: "UtensilsCrossed", sort_order: 1 },
  { id: "cat-wellness", name: "Wellness & Salons", slug: "wellness", icon: "Scissors", sort_order: 2 },
  { id: "cat-retail", name: "Shopping & Retail", slug: "retail", icon: "ShoppingBag", sort_order: 3 },
  { id: "cat-entertainment", name: "Entertainment & Gaming", slug: "entertainment", icon: "Clapperboard", sort_order: 4 },
  { id: "cat-fitness", name: "Gym & Fitness", slug: "fitness", icon: "Dumbbell", sort_order: 5 },
  { id: "cat-hotels", name: "Hotels & Stays", slug: "hotels", icon: "BedDouble", sort_order: 6 },
];

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
  try {
    const { data, error } = await pub()
      .from("categories")
      .select("id,name,slug,icon,sort_order")
      .order("sort_order");
    if (error || !data || data.length === 0) {
      return DEFAULT_CATEGORIES;
    }
    return data as PublicCategory[];
  } catch (err) {
    console.warn("[getCategories] Falling back to default categories:", err);
    return DEFAULT_CATEGORIES;
  }
});

export const getPartners = createServerFn({ method: "GET" }).handler(async () => {
  const delSet = new Set(store.deletedPartnerIds || []);
  const delOfferSet = new Set(store.deletedOfferIds || []);

  try {
    const { data, error } = await pub()
      .from("partners")
      .select(`${PARTNER_COLS},offers(${OFFER_COLS})`)
      .order("featured", { ascending: false })
      .order("business_name");
    if (!error && data) {
      return (data as unknown as PublicPartner[])
        .filter((p) => !delSet.has(p.id) && !delSet.has(p.slug))
        .map((p) => ({
          ...p,
          offers: currentOffers((p.offers ?? []).filter((o) => !delOfferSet.has(o.id))),
        }));
    }
  } catch {
    // Fall back to the local store only when the database is unavailable.
  }

  // Fetch existing offers from Supabase if available to attach
  const dbOffersMap = new Map<string, PublicOffer[]>();
  try {
    const { data: dbPartners } = await pub()
      .from("partners")
      .select(`id,slug,offers(${OFFER_COLS})`);
    if (dbPartners) {
      for (const p of dbPartners) {
        if (!delSet.has(p.id) && !delSet.has(p.slug) && p.offers && p.offers.length > 0) {
          const filteredOffers = (p.offers as unknown as PublicOffer[]).filter(
            (o) => !delOfferSet.has(o.id)
          );
          dbOffersMap.set(p.id, filteredOffers);
          dbOffersMap.set(p.slug, filteredOffers);
        }
      }
    }
  } catch {
    // ignore
  }

  // Also attach offers from store.offers
  if (store.offers) {
    for (const off of store.offers.values()) {
      if (!delOfferSet.has(off.id) && !delSet.has(off.partner_id)) {
        const po: PublicOffer = {
          id: off.id,
          title: off.title,
          description: off.description || null,
          discount_type: off.discount_type,
          discount_value: off.discount_value,
          max_discount: off.max_discount ?? null,
          minimum_bill: off.minimum_bill,
          valid_from: off.valid_from ?? null,
          valid_until: off.valid_until ?? null,
          valid_days: off.valid_days,
          terms_conditions: off.terms_conditions ?? null,
          usage_limit_type: off.usage_limit_type,
        };
        const list = dbOffersMap.get(off.partner_id) || [];
        if (!list.some((x) => x.id === off.id)) {
          list.push(po);
          dbOffersMap.set(off.partner_id, list);
        }
      }
    }
  }

  if (store.partners && store.partners.size > 0) {
    const activePartners = Array.from(store.partners.values())
      .filter((p) => p.status === "ACTIVE" && !delSet.has(p.id) && !delSet.has(p.slug))
      .sort((a, b) => {
        if (a.featured !== b.featured) return a.featured ? -1 : 1;
        return a.business_name.localeCompare(b.business_name);
      });

    return activePartners.map((p) => {
      const rawOffers = dbOffersMap.get(p.id) || dbOffersMap.get(p.slug) || [];
      const offers = rawOffers.filter((o) => !delOfferSet.has(o.id));

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

  return [] as PublicPartner[];
});

export const getPartner = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => z.object({ slug: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data }) => {
    const delSet = new Set(store.deletedPartnerIds || []);
    const delOfferSet = new Set(store.deletedOfferIds || []);

    if (delSet.has(data.slug)) {
      return null;
    }

    try {
      const { data: p, error } = await pub()
        .from("partners")
        .select(`${PARTNER_COLS},offers(${OFFER_COLS})`)
        .eq("slug", data.slug)
        .maybeSingle();
      if (!error) {
        if (!p || delSet.has(p.id) || delSet.has(p.slug)) return null;
        const partner = p as unknown as PublicPartner;
        return { ...partner, offers: currentOffers((partner.offers ?? []).filter((o) => !delOfferSet.has(o.id))) };
      }
    } catch {
      // Fall back to the local store only when the database is unavailable.
    }

    if (store.partners && store.partners.size > 0) {
      for (const p of store.partners.values()) {
        if (p.slug === data.slug && p.status === "ACTIVE" && !delSet.has(p.id) && !delSet.has(p.slug)) {
          let offers: PublicOffer[] = [];
          try {
            const { data: dbP } = await pub()
              .from("partners")
              .select(`offers(${OFFER_COLS})`)
              .eq("slug", data.slug)
              .maybeSingle();
            if (dbP?.offers) offers = (dbP.offers as unknown as PublicOffer[]).filter((o) => !delOfferSet.has(o.id));
          } catch {
            // ignore
          }

          if (store.offers) {
            for (const off of store.offers.values()) {
              if (off.partner_id === p.id && !delOfferSet.has(off.id)) {
                if (!offers.some((x) => x.id === off.id)) {
                  offers.push({
                    id: off.id,
                    title: off.title,
                    description: off.description || null,
                    discount_type: off.discount_type,
                    discount_value: off.discount_value,
                    max_discount: off.max_discount ?? null,
                    minimum_bill: off.minimum_bill,
                    valid_from: off.valid_from ?? null,
                    valid_until: off.valid_until ?? null,
                    valid_days: off.valid_days,
                    terms_conditions: off.terms_conditions ?? null,
                    usage_limit_type: off.usage_limit_type,
                  });
                }
              }
            }
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
            offers: currentOffers(offers.filter((o) => !delOfferSet.has(o.id))),
          };
        }
      }
    }

    return null;
  });

// --- PENNYGRADE V1 VERIFICATION FUNCTIONS ---

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

    const db = getServiceRoleClient();
    if (db) {
      const normalized = normalizeMembershipNumber(data.membershipNumber);
      const { data: member, error } = await db.from("memberships")
        .select("id,membership_number,full_name,status,expiry_date")
        .eq("membership_number", normalized).maybeSingle();
      if (!error && member && member.status === "ACTIVE" && member.expiry_date >= new Date().toISOString().slice(0, 10)) {
        return { ok: true, membership_number: member.membership_number, member_name: member.full_name || "Member" };
      }
      if (!member) {
        const { data: card } = await db.from("physical_cards").select("membership:memberships(id,membership_number,full_name,status,expiry_date)")
          .eq("card_number", normalized).eq("status", "ACTIVE").maybeSingle();
        const linked = card?.membership as unknown as { membership_number: string; full_name: string | null; status: string; expiry_date: string } | null;
        if (linked?.status === "ACTIVE" && linked.expiry_date >= new Date().toISOString().slice(0, 10)) {
          return { ok: true, membership_number: linked.membership_number, member_name: linked.full_name || "Member" };
        }
      }
    }
    return { ok: false, message: "Unable to verify membership. Please check your membership number and try again." };
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

    const db = getServiceRoleClient();
    if (!db) {
      return { ok: false, message: "Verification is temporarily unavailable. Please contact PennyGrade support." };
    }
    const { data: result, error } = await db.rpc("create_verification", {
      _partner_slug: data.partnerSlug,
      _membership_number: normalizeMembershipNumber(data.membershipNumber),
      _bill: Math.round(data.billAmount * 100) / 100,
    });
    if (error) {
      console.error("[createPublicVerification] Database operation failed:", error.message);
      return { ok: false, message: "Verification is temporarily unavailable. Please try again." };
    }
    return result as { ok: boolean; session_id?: string; message?: string };
  });

// 3. Get live verification session data (publicly readable for live display, sanitized)
export const getPublicVerificationSession = createServerFn({ method: "GET" })
  .inputValidator((d: { sessionId: string }) =>
    z.object({ sessionId: z.string().uuid() }).parse(d)
  )
  .handler(async ({ data }) => {
    const db = getServiceRoleClient();
    if (db) {
      const { data: session, error } = await db.from("verification_sessions")
        .select("id,bill_amount,discount_amount,final_amount,status,expires_at,created_at,membership:memberships(full_name,membership_number),partner:partners(business_name,slug),offer:offers(discount_type,discount_value)")
        .eq("id", data.sessionId).maybeSingle();
      if (error || !session) return null;
      const member = session.membership as unknown as { full_name: string; membership_number: string } | null;
      const partner = session.partner as unknown as { business_name: string; slug: string } | null;
      const offer = session.offer as unknown as { discount_type: "PERCENTAGE" | "FIXED"; discount_value: number } | null;
      return {
        id: session.id,
        partner_name: partner?.business_name || "Partner",
        partner_slug: partner?.slug || "",
        member_name: member?.full_name || "Member",
        membership_number: member?.membership_number || "",
        discount_type: offer?.discount_type || "PERCENTAGE",
        discount_value: Number(offer?.discount_value || 0),
        bill_amount: Number(session.bill_amount),
        discount_amount: Number(session.discount_amount),
        final_amount: Number(session.final_amount),
        status: new Date(session.expires_at).getTime() < Date.now() ? "EXPIRED" : session.status,
        expires_at: session.expires_at,
        created_at: session.created_at,
      };
    }
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

    const db = getServiceRoleClient();
    if (db) {
      const { data: member, error } = await db.from("memberships")
        .select("id,full_name,membership_number,status,expiry_date,mobile,plan:membership_plans(name)")
        .eq("membership_number", normalizedNum).maybeSingle();
      if (error || !member || normalizeMobile(member.mobile || "") !== normalizedMob) {
        return { ok: false, message: "Unable to verify membership details. Please check your membership number and registered mobile number." };
      }
      const { data: logs, error: logError } = await db.from("verification_logs")
        .select("id,verification_session_id,bill_amount,discount_amount,final_amount,created_at,partner:partners(business_name),offer:offers(title)")
        .eq("membership_id", member.id).order("created_at", { ascending: false }).limit(50);
      if (logError) return { ok: false, message: "Unable to load membership history. Please try again." };
      const today = new Date().toISOString().slice(0, 10);
      const effectiveStatus = member.status === "ACTIVE" && member.expiry_date < today ? "EXPIRED" : member.status;
      const plan = member.plan as unknown as { name: string } | null;
      return {
        ok: true,
        member: { full_name: member.full_name || "Member", membership_number: member.membership_number, status: effectiveStatus, expiry_date: member.expiry_date, plan_name: plan?.name || "PennyGrade Membership" },
        history: (logs || []).map((log: any) => ({
          id: log.id,
          verification_session_id: log.verification_session_id,
          partner_name: log.partner?.business_name || "Partner",
          offer_title: log.offer?.title || "Offer",
          bill_amount: Number(log.bill_amount),
          discount_amount: Number(log.discount_amount),
          final_amount: Number(log.final_amount),
          created_at: log.created_at,
        })),
      };
    }

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
