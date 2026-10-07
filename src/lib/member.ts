import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const myMemberQuery = queryOptions({
  queryKey: ["me", "member"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return null;
    const [{ data: profile }, { data: memberships }] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", u.user.id).maybeSingle(),
      supabase.from("memberships").select("*, plan:membership_plans(name), cards:physical_cards(card_number,status,issued_at)")
        .eq("user_id", u.user.id).order("expiry_date", { ascending: false }),
    ]);
    const list = memberships ?? [];
    const membership = list.find((m) => m.status === "ACTIVE") ?? list[0] ?? null;
    const card = membership?.cards?.find((c) => c.status === "ACTIVE") ?? null;
    return { user: u.user, profile, membership, card };
  },
});

export const myHistoryQuery = (limit = 100) =>
  queryOptions({
    queryKey: ["me", "history", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("verification_logs")
        .select("id, verification_session_id, bill_amount, discount_amount, final_amount, created_at, partner:partners(business_name, slug)")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
