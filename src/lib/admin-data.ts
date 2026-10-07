import { supabase } from "@/integrations/supabase/client";

export async function fetchLogs(sinceDays = 365) {
  const since = new Date(Date.now() - sinceDays * 864e5).toISOString();
  const { data, error } = await supabase
    .from("verification_logs")
    .select("id,verification_session_id,user_id,bill_amount,discount_amount,final_amount,status,created_at,partner:partners(id,business_name,category:categories(name)),offer:offers(title),membership:memberships(membership_number)")
    .gte("created_at", since).order("created_at", { ascending: false }).limit(5000);
  if (error) throw error;
  return data ?? [];
}

export function monthKey(d: string) {
  const x = new Date(d);
  return x.toLocaleString("en-IN", { month: "short", year: "2-digit" });
}

export function lastMonths(n: number) {
  const out: string[] = [];
  const d = new Date(); d.setDate(1);
  for (let i = n - 1; i >= 0; i--) { const x = new Date(d); x.setMonth(d.getMonth() - i); out.push(monthKey(x.toISOString())); }
  return out;
}

export function groupSum<T>(rows: T[], key: (r: T) => string, val: (r: T) => number = () => 1) {
  const m = new Map<string, number>();
  rows.forEach((r) => m.set(key(r), (m.get(key(r)) ?? 0) + val(r)));
  return m;
}
