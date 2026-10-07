import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

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
